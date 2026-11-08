import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import type * as ThreeNS from 'three'
type T3 = typeof ThreeNS
import { EASE, isSmall, reduced } from '../motion'
import { eonet } from '../data/feeds'
import { useData } from '../lib/api'

const RAD = Math.PI / 180
/** lat/lon → point on three's SphereGeometry (u = 0 at 180°W). */
const ll2v = (THREE: T3, lat: number, lon: number, r = 1) => {
  const t = (90 - lat) * RAD, p = (lon + 180) * RAD
  return new THREE.Vector3(-Math.cos(p) * Math.sin(t) * r, Math.cos(t) * r, Math.sin(p) * Math.sin(t) * r)
}

/** Where the sun is overhead right now. ponytail: ignores the equation of time (up to ~4° of longitude), fine for a hero shadow. */
export function subsolar(d = new Date()) {
  const day = (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5
  const lat = -23.44 * Math.cos((2 * Math.PI / 365) * (day + 10))
  const lon = -((d.getUTCHours() + d.getUTCMinutes() / 60) - 12) * 15
  return { lat, lon }
}
export const fmtLL = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vN;
void main() { vUv = uv; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const FRAG = /* glsl */ `
uniform sampler2D day; uniform sampler2D night; uniform vec3 sun;
varying vec2 vUv; varying vec3 vN;
void main() {
  float d = dot(normalize(vN), sun);
  // night side keeps a trace of the day texture so continents still read under the city lights
  vec3 c = mix(texture2D(night, vUv).rgb * 1.6 + texture2D(day, vUv).rgb * 0.26, texture2D(day, vUv).rgb, smoothstep(-0.12, 0.18, d));
  gl_FragColor = vec4(c, 1.0);
}`
const ATMO_V = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`
const ATMO_F = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() { float f = pow(1.0 - abs(dot(vN, vV)), 4.0); gl_FragColor = vec4(0.22, 0.78, 0.91, f * 0.32); }`

export type Marker = { lat: number; lon: number; color: string }
type Opts = { onPoint?: (ll: { lat: number; lon: number } | null) => void; focus?: { lat: number; lon: number }; markers?: Marker[] }

/**
 * The landing Earth: Blue Marble by day, Black Marble by night, the terminator where the sun really is now.
 * Drag to spin; it settles back to slow rotation. three.js loads after first paint.
 */
export function useEarth(canvas: React.RefObject<HTMLCanvasElement | null>, onFail: () => void, opts: Opts = {}) {
  const o = useRef(opts)
  o.current = opts
  useEffect(() => {
    let dispose = () => {}
    let dead = false
    import('three').then((THREE) => { if (!dead) dispose = build(THREE) }).catch(onFail)
    return () => { dead = true; dispose() }

    function build(THREE: T3) {
      const cv = canvas.current!
      let renderer: ThreeNS.WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' })
      } catch { onFail(); return () => {} }
      const small = isSmall()
      renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2))
      const scene = new THREE.Scene()
      const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
      cam.position.z = 5.6

      const tex = new THREE.TextureLoader()
      const load = (u: string) => { const t = tex.load(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t }
      const s = subsolar()
      const mat = new THREE.ShaderMaterial({
        uniforms: { day: { value: load('/earth-day.jpg') }, night: { value: load('/earth-night.jpg') }, sun: { value: ll2v(THREE, s.lat, s.lon) } },
        vertexShader: VERT, fragmentShader: FRAG,
      })
      const earth = new THREE.Group()
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1, small ? 64 : 128, small ? 32 : 64), mat)
      earth.add(globe)

      // graticule every 30°: the scientific frame, kept faint
      const g: number[] = []
      for (let lat = -60; lat <= 60; lat += 30)
        for (let lon = -180; lon < 180; lon += 4) g.push(...ll2v(THREE, lat, lon, 1.003).toArray(), ...ll2v(THREE, lat, lon + 4, 1.003).toArray())
      for (let lon = -180; lon < 180; lon += 30)
        for (let lat = -88; lat < 88; lat += 4) g.push(...ll2v(THREE, lat, lon, 1.003).toArray(), ...ll2v(THREE, lat + 4, lon, 1.003).toArray())
      const grat = new THREE.BufferGeometry()
      grat.setAttribute('position', new THREE.Float32BufferAttribute(g, 3))
      earth.add(new THREE.LineSegments(grat, new THREE.LineBasicMaterial({ color: '#38c6e8', transparent: true, opacity: 0.14 })))

      // featured region marker
      const f = o.current.focus
      const pin = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.026, 32), new THREE.MeshBasicMaterial({ color: '#38c6e8', side: THREE.DoubleSide }))
      if (f) {
        const p = ll2v(THREE, f.lat, f.lon, 1.006)
        pin.position.copy(p)
        pin.lookAt(p.clone().multiplyScalar(2))
        earth.add(pin)
      }
      scene.add(earth)
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 32),
        new THREE.ShaderMaterial({ vertexShader: ATMO_V, fragmentShader: ATMO_F, transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })))

      // the logo, in 3D: a tilted orbit with a travelling satellite, and the pole star above the planet
      const orbit = new THREE.Group()
      orbit.rotation.set(1.22, 0, -0.38)
      const ring = new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 1.34, 1.34).getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0)))
      orbit.add(new THREE.LineLoop(ring, new THREE.LineBasicMaterial({ color: '#38c6e8', transparent: true, opacity: 0.5 })))
      const sat = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: '#dceaf2' }))
      orbit.add(sat)
      scene.add(orbit)
      const starTex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 128
        const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
        r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.08, 'rgba(220,234,242,.9)'); r.addColorStop(0.3, 'rgba(56,198,232,.12)'); r.addColorStop(1, 'rgba(56,198,232,0)')
        g.fillStyle = r; g.fillRect(0, 0, 128, 128)
        g.fillStyle = '#fff'; g.beginPath() // four-point star, as in the mark
        g.moveTo(64, 2); g.lineTo(68, 60); g.lineTo(126, 64); g.lineTo(68, 68); g.lineTo(64, 126); g.lineTo(60, 68); g.lineTo(2, 64); g.lineTo(60, 60); g.fill()
        return new THREE.CanvasTexture(c)
      })()
      const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
      star.scale.setScalar(0.34)
      star.position.set(0, 1.24, 0)
      scene.add(star)
      // faint fixed starfield far behind
      const sf: number[] = []
      for (let i = 0; i < 700; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(18); if (v.z < 2) sf.push(v.x, v.y, v.z) }
      const sfg = new THREE.BufferGeometry(); sfg.setAttribute('position', new THREE.Float32BufferAttribute(sf, 3))
      scene.add(new THREE.Points(sfg, new THREE.PointsMaterial({ color: '#dceaf2', size: 0.035, transparent: true, opacity: 0.45 })))

      // live markers (EONET), rebuilt whenever the caller passes a new array
      let shown: Marker[] | undefined
      let dots: ThreeNS.Points | null = null
      const syncMarkers = () => {
        const m = o.current.markers
        if (m === shown) return
        shown = m
        if (dots) { earth.remove(dots); dots.geometry.dispose() }
        if (!m?.length) return
        const pos: number[] = [], col: number[] = [], c = new THREE.Color()
        for (const k of m) { pos.push(...ll2v(THREE, k.lat, k.lon, 1.008).toArray()); c.set(k.color); col.push(c.r, c.g, c.b) }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
        dots = new THREE.Points(g, new THREE.PointsMaterial({ size: small ? 0.05 : 0.038, vertexColors: true }))
        earth.add(dots)
      }

      // start facing the featured region
      let spin = f ? Math.PI / 2 - (f.lon + 180) * RAD : 0
      earth.rotation.x = 0.28
      const size = () => {
        const r = cv.parentElement!.getBoundingClientRect()
        renderer.setSize(r.width, r.height, false)
        cam.aspect = r.width / r.height
        cam.position.z = r.width / r.height < 1 ? 5.6 / Math.max(0.62, r.width / r.height) : 5.6 // room for the orbit and the star
        cam.updateProjectionMatrix()
      }
      size()
      addEventListener('resize', size)

      // drag to spin, with momentum
      let vel = 0, dragging = false, lastX = 0
      const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId) }
      const up = () => { dragging = false }
      const ray = new THREE.Raycaster()
      const ndc = new THREE.Vector2()
      const move = (e: PointerEvent) => {
        if (dragging) { vel = (e.clientX - lastX) * 0.005; spin += vel; lastX = e.clientX }
        const r = cv.getBoundingClientRect()
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
        ray.setFromCamera(ndc, cam)
        const hit = ray.intersectObject(globe)[0]
        o.current.onPoint?.(hit?.uv ? { lat: hit.uv.y * 180 - 90, lon: hit.uv.x * 360 - 180 } : null)
      }
      const leave = () => o.current.onPoint?.(null)
      cv.addEventListener('pointerdown', down)
      cv.addEventListener('pointermove', move)
      cv.addEventListener('pointerleave', leave)
      addEventListener('pointerup', up)

      let visible = true
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
      io.observe(cv)
      const still = reduced()
      const t0 = performance.now()
      const frame = () => {
        if (!visible) return
        if (!dragging) { spin += vel; vel *= 0.94; if (!still) spin += 0.0006 }
        earth.rotation.y = spin
        syncMarkers()
        const ts = (performance.now() - t0) / 1000
        if (!still) { const a = ts * 0.12; sat.position.set(Math.cos(a) * 1.34, Math.sin(a) * 1.34, 0); star.material.rotation = Math.sin(ts * 0.4) * 0.06 }
        const k = 1 + Math.sin((performance.now() - t0) / 500) * 0.25
        pin.scale.setScalar(still ? 1 : k)
        if (renderer.info.render.frame % 600 === 0) { const n = subsolar(); mat.uniforms.sun.value.copy(ll2v(THREE, n.lat, n.lon)) }
        renderer.render(scene, cam)
      }
      gsap.ticker.add(frame)
      gsap.from(earth.scale, { x: 0.86, y: 0.86, z: 0.86, duration: still ? 0 : 1.6, ease: EASE.out })
      return () => {
        gsap.ticker.remove(frame)
        removeEventListener('resize', size)
        removeEventListener('pointerup', up)
        io.disconnect()
        scene.traverse((x) => { (x as ThreeNS.Mesh).geometry?.dispose?.() })
        renderer.dispose()
      }
    }
  }, [])
}

/** Open EONET events as hero markers: wildfires, storms, volcanoes, floods, other. Colours match the Events view. */
const EV_COLOR: Record<string, string> = { wildfires: '#d95926', floods: '#199e70', severeStorms: '#c98500', volcanoes: '#d55181' }
export function useMarkers() {
  const d = useData((s) => eonet(30, s), [])
  const open = d.data?.filter((e) => !e.closed)
  const list = useMemo(() => open?.map((e) => ({ lat: e.lat, lon: e.lon, color: EV_COLOR[e.cat] ?? '#2399ba' })), [d.data])
  return { list, open: open && new Set(open.map((e) => e.id)).size }
}

export default function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [noGL, setNoGL] = useState(false)
  const [pt, setPt] = useState<{ lat: number; lon: number } | null>(null)
  const sun = subsolar()
  const markers = useMarkers()
  useEarth(canvas, () => setNoGL(true), { onPoint: setPt, focus: { lat: 7.8, lon: 80.7 }, markers: markers.list })

  useEffect(() => {
    // context.revert() restores the elements, so a remount (React strict mode) animates from the real start, not from hidden
    const ctx = gsap.context(() => {
      gsap.from('.hero__stmt, .hero__sub, .hero__row', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.1, delay: 0.3, ease: EASE.out })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="home" data-section="home" className="hero" aria-label="POLARIS">
      <div className="hero__copy">
        <h1 className="hero__word"><img src="/brand/wordmark.png" alt="POLARIS" width={606} height={63} fetchPriority="high" /></h1>
        <p className="hero__stmt">An open window into our planet.</p>
        <p className="hero__sub">Real satellite, ocean and climate data from NASA, NOAA and Copernicus, on a live 3D globe.</p>
        <div className="hero__row">
          <a className="btn btn--solid" href="#app/explorer">Open the globe</a>
          <a className="btn" href="#region">Sri Lanka</a>
        </div>
      </div>
      <figure className="hero__stage">
        {noGL
          ? <img className="hero__fallback" src="/earth-day.jpg" alt="Blue Marble: cloud-free Earth, NASA" width={2048} height={1024} />
          : <canvas ref={canvas} className="hero__canvas" aria-label="Interactive Earth. Drag to rotate." />}
        <figcaption className="readout" aria-live="off">
          <span>{pt ? fmtLL(pt.lat, pt.lon) : 'Drag to rotate'}</span>
          {markers.list && <span className="legendline"><i className="swatch" style={{ background: '#d95926' }} /> {markers.open} natural events open now (NASA EONET)</span>}
          <span className="muted">Sun overhead near {fmtLL(sun.lat, sun.lon)}</span>
        </figcaption>
      </figure>
    </section>
  )
}
