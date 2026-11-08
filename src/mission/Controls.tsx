import { useEffect, useRef } from 'react'
import { Compass, Minus, Plus } from '@phosphor-icons/react'
import { Cesium } from './Globe'
import { fmtLL } from '../components/Hero'

const DEG = Cesium.Math.toDegrees
const fmtAlt = (m: number) => (m >= 1e5 ? `${Math.round(m / 1000).toLocaleString('en')} km` : m >= 1e4 ? `${(m / 1000).toFixed(0)} km` : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`)

/**
 * Google Earth-style navigation: a compass that points north and resets on click, zoom in/out, a 2D/3D tilt toggle
 * that pivots about the middle of the screen, and a status line with the pointer's coordinates and the eye altitude.
 * Everything updates through refs, so moving the camera never re-renders React.
 */
export default function Controls({ viewer }: { viewer: Cesium.Viewer }) {
  const needle = useRef<HTMLSpanElement>(null)
  const status = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const cam = viewer.camera, canvas = viewer.scene.canvas, ell = viewer.scene.globe.ellipsoid
    let at: { lat: number; lon: number } | null = null
    let raf = 0
    const paint = () => {
      raf = 0
      if (needle.current) needle.current.style.transform = `rotate(${-cam.heading}rad)`
      if (status.current) status.current.textContent = `${at ? fmtLL(at.lat, at.lon) : 'Move over the globe'}   Eye altitude ${fmtAlt(cam.positionCartographic.height)}`
    }
    const queue = () => { raf ||= requestAnimationFrame(paint) }
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const p = cam.pickEllipsoid(new Cesium.Cartesian2(e.clientX - r.left, e.clientY - r.top), ell)
      at = p ? (({ latitude, longitude }) => ({ lat: DEG(latitude), lon: DEG(longitude) }))(Cesium.Cartographic.fromCartesian(p)) : null
      queue()
    }
    cam.percentageChanged = 0.002
    cam.changed.addEventListener(queue)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', () => { at = null; queue() })
    paint()
    return () => { cam.changed.removeEventListener(queue); canvas.removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [viewer])

  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const dur = () => (reduce() ? 0 : 0.6)

  const zoom = (f: number) => {
    const c = viewer.camera, h = c.positionCartographic.height
    const step = f > 1 ? -(h - 1500) * 0.45 : h * 0.8 // in: close 45% of the way to the ground; out: 80% further
    const to = Cesium.Cartesian3.add(c.position, Cesium.Cartesian3.multiplyByScalar(c.direction, -step, new Cesium.Cartesian3()), new Cesium.Cartesian3())
    c.flyTo({ destination: to, orientation: { heading: c.heading, pitch: c.pitch, roll: 0 }, duration: dur(), easingFunction: Cesium.EasingFunction.QUADRATIC_OUT })
  }
  const north = () => {
    const c = viewer.camera
    c.flyTo({ destination: c.position.clone(), orientation: { heading: 0, pitch: c.pitch, roll: 0 }, duration: dur() })
  }
  const tilt = () => {
    const c = viewer.camera, s = viewer.scene
    const mid = c.pickEllipsoid(new Cesium.Cartesian2(s.canvas.clientWidth / 2, s.canvas.clientHeight / 2), s.globe.ellipsoid)
    if (!mid) return
    const flat = c.pitch < Cesium.Math.toRadians(-80)
    c.flyToBoundingSphere(new Cesium.BoundingSphere(mid, 0), {
      offset: new Cesium.HeadingPitchRange(c.heading, Cesium.Math.toRadians(flat ? -45 : -90), Cesium.Cartesian3.distance(c.position, mid)),
      duration: dur(),
    })
  }

  return (
    <>
      <nav className="mapctl" aria-label="Map navigation">
        <button onClick={north} aria-label="Reset north" title="Reset north"><span ref={needle} className="mapctl__needle"><Compass size={22} weight="light" /></span></button>
        <button onClick={() => zoom(2)} aria-label="Zoom in" title="Zoom in"><Plus size={20} /></button>
        <button onClick={() => zoom(0.5)} aria-label="Zoom out" title="Zoom out"><Minus size={20} /></button>
        <button onClick={tilt} aria-label="Toggle 3D tilt" title="Toggle 3D tilt" className="mapctl__tilt">3D</button>
      </nav>
      <p ref={status} className="mapstatus mono" aria-live="off" />
    </>
  )
}
