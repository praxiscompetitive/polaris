import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type * as ThreeNS from 'three'
type T3 = typeof ThreeNS
import { EASE, isSmall, reduced } from '../motion'
import Kinetic from './Kinetic'

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
  vec3 c = mix(texture2D(night, vUv).rgb * 1.6 + texture2D(day, vUv).rgb * 0.16, texture2D(day, vUv).rgb, smoothstep(-0.12, 0.18, d));
  gl_FragColor = vec4(c, 1.0);
}`
const ATMO_V = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`
const ATMO_F = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() { float f = pow(1.0 - abs(dot(vN, vV)), 4.0); gl_FragColor = vec4(0.22, 0.78, 0.91, f * 0.32); }`

type Opts = { onPoint?: (ll: { lat: number; lon: number } | null) => void; focus?: { lat: number; lon: number } }

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
      cam.position.z = 4.4

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

      // start facing the featured region
      let spin = f ? Math.PI / 2 - (f.lon + 180) * RAD : 0
      earth.rotation.x = 0.28
      const size = () => {
        const r = cv.parentElement!.getBoundingClientRect()
        renderer.setSize(r.width, r.height, false)
        cam.aspect = r.width / r.height
        cam.position.z = r.width / r.height < 1 ? 4.4 / Math.max(0.62, r.width / r.height) : 4.4
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

export default function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [noGL, setNoGL] = useState(false)
  const [pt, setPt] = useState<{ lat: number; lon: number } | null>(null)
  const sun = subsolar()
  useEarth(canvas, () => setNoGL(true), { onPoint: setPt, focus: { lat: 7.8, lon: 80.7 } })

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: EASE.out } })
    tl.from('.hero__stmt, .hero__sub, .hero__row', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.1 }, 0.3)
    return () => { tl.kill() }
  }, [])

  return (
    <section id="home" data-section="home" className="hero" aria-label="POLARIS">
      <div className="hero__copy">
        <h1 className="hero__word"><Kinetic text="POLARIS" magnet="vf" className="wordmark" reveal /></h1>
        <p className="hero__stmt">An open window into our planet.</p>
        <p className="hero__sub">Real satellite, ocean and climate data from NASA, NOAA and Copernicus, on a live 3D globe.</p>
        <div className="hero__row">
          <a className="btn btn--solid" href="#app/explorer" data-magnetic>Open the globe</a>
          <a className="btn" href="#region">Sri Lanka</a>
        </div>
      </div>
      <figure className="hero__stage">
        {noGL
          ? <img className="hero__fallback" src="/earth-day.jpg" alt="Blue Marble: cloud-free Earth, NASA" width={2048} height={1024} />
          : <canvas ref={canvas} className="hero__canvas" aria-label="Interactive Earth. Drag to rotate." />}
        <figcaption className="readout" aria-live="off">
          <span>{pt ? fmtLL(pt.lat, pt.lon) : 'Drag to rotate'}</span>
          <span className="muted">Sun overhead near {fmtLL(sun.lat, sun.lon)}</span>
        </figcaption>
      </figure>
    </section>
  )
}
