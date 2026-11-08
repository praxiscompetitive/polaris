import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type * as ThreeNS from 'three'
type T3 = typeof ThreeNS
import { EASE, isSmall, reduced } from '../motion'

const RAD = Math.PI / 180
/** lat/lon → point on three's SphereGeometry (u = 0 at 180°W). */
const ll2v = (THREE: T3, lat: number, lon: number, r = 1) => {
  const t = (90 - lat) * RAD, p = (lon + 180) * RAD
  return new THREE.Vector3(-Math.cos(p) * Math.sin(t) * r, Math.cos(t) * r, Math.sin(p) * Math.sin(t) * r)
}

export const fmtLL = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

const ATMO_V = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`
const ATMO_F = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() { float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(.42, .66, 1., f * .55); }`

const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vN;
void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
// Light-mode Earth: the Blue Marble, lifted for a light page, with a soft key light from the upper left gives the sphere its volume. No night side.
const FRAG = /* glsl */ `
uniform sampler2D day;
varying vec2 vUv; varying vec3 vN;
void main() {
  vec3 t = texture2D(day, vUv).rgb;
  vec3 c = clamp(pow(t, vec3(.62)) * 1.25, 0., 1.); // the Blue Marble's own colours, just lifted for a light page
  float lit = .74 + .34 * clamp(dot(vN, normalize(vec3(-.45, .55, .70))), 0., 1.);
  c *= lit;
  gl_FragColor = vec4(c, 1.0);
}`

export type Marker = { lat: number; lon: number; color: string }
type Opts = { onPoint?: (ll: { lat: number; lon: number } | null) => void; focus?: { lat: number; lon: number }; markers?: Marker[] }

/**
 * The landing Earth: a bright, light-mode Blue Marble and nothing else. Drag to spin; it settles back to slow rotation.
 * three.js loads after first paint.
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
      const mat = new THREE.ShaderMaterial({
        uniforms: { day: { value: load('/earth-day.jpg') } },
        vertexShader: VERT, fragmentShader: FRAG,
      })
      const earth = new THREE.Group()
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1, small ? 64 : 128, small ? 32 : 64), mat)
      earth.add(globe)

      const f = o.current.focus
      scene.add(earth)
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 32),
        new THREE.ShaderMaterial({ vertexShader: ATMO_V, fragmentShader: ATMO_F, transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })))

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
      let spin = Math.PI / 2 - ((f ? f.lon : 40) + 180) * RAD // no featured region: start over Africa and Asia
      earth.rotation.x = 0.28
      const size = () => {
        const r = cv.parentElement!.getBoundingClientRect()
        renderer.setSize(r.width, r.height, false)
        cam.aspect = r.width / r.height
        cam.position.z = r.width / r.height < 1 ? 5.6 / Math.max(0.62, r.width / r.height) : 5.6
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
      const frame = () => {
        if (!visible) return
        if (!dragging) { spin += vel; vel *= 0.94; if (!still) {
          const lon = (((Math.PI / 2 - spin) / RAD - 180 + 540) % 360) - 180 // longitude facing the viewer
          spin += Math.abs(lon) > 150 || lon < -100 ? 0.004 : 0.0006 // hurry across the empty Pacific
        } }
        earth.rotation.y = spin
        syncMarkers()
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
  useEarth(canvas, () => setNoGL(true), { focus: { lat: 7.8, lon: 80.7 } })

  useEffect(() => {
    // context.revert() restores the elements, so a remount (React strict mode) animates from the real start, not from hidden
    const ctx = gsap.context(() => {
      gsap.from('.hero__stmt, .hero__sub, .hero__row', { autoAlpha: 0, y: 16, duration: 0.9, stagger: 0.1, delay: 0.3, ease: EASE.out })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section className="hero" aria-label="POLARIS">
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
      </figure>
    </section>
  )
}
