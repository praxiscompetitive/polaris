import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Layer, tileUrl } from '../data/layers'
import { source } from '../data/sources'
import type { Cam } from '../lib/deeplink'

export { Cesium }
export type Stack = { layer: Layer; t?: string; side?: 'left' | 'right' }[]
type Props = {
  stack: Stack
  opacity: number
  cam?: Cam
  camKey: string // change it to fly to `cam`
  split: number // 0..1, used when any layer has a side
  mobile: boolean
  onReady: (v: Cesium.Viewer) => void
  onCamera: (c: Cam) => void
  onPick: (p: { lat: number; lon: number; id?: unknown }) => void
}

const TOKEN = import.meta.env.VITE_CESIUM_TOKEN as string | undefined
const DEG = Cesium.Math.toDegrees

/**
 * The Cesium viewer with every default widget removed. Imagery comes from the layer registry,
 * rendering is on demand (idle globe = idle GPU), credits stay visible as the providers require.
 */
export default function Globe({ stack, opacity, cam, camKey, split, mobile, onReady, onCamera, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const credits = useRef<HTMLDivElement>(null)
  const viewer = useRef<Cesium.Viewer | null>(null)
  const cb = useRef({ onCamera, onPick })
  cb.current = { onCamera, onPick }

  useEffect(() => {
    if (TOKEN) Cesium.Ion.defaultAccessToken = TOKEN
    const v = new Cesium.Viewer(el.current!, {
      baseLayer: false, animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false,
      sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
      requestRenderMode: true, maximumRenderTimeChange: Infinity, creditContainer: credits.current!,
      terrain: TOKEN ? Cesium.Terrain.fromWorldTerrain() : undefined,
      skyBox: false, skyAtmosphere: new Cesium.SkyAtmosphere(),
    })
    const s = v.scene
    s.backgroundColor = Cesium.Color.fromCssColorString('#071526')
    s.globe.baseColor = Cesium.Color.fromCssColorString('#0c2238')
    s.globe.showGroundAtmosphere = true
    if (s.sun) s.sun.show = false
    if (s.moon) s.moon.show = false
    s.fog.enabled = true
    if (mobile) { v.resolutionScale = 0.85; s.globe.maximumScreenSpaceError = 3 }
    s.screenSpaceCameraController.minimumZoomDistance = 2000

    let t = 0
    const moved = () => {
      clearTimeout(t)
      t = window.setTimeout(() => {
        const c = v.camera.positionCartographic
        cb.current.onCamera([DEG(c.longitude), DEG(c.latitude), c.height, v.camera.heading, v.camera.pitch])
      }, 250)
    }
    v.camera.moveEnd.addEventListener(moved)

    const h = new Cesium.ScreenSpaceEventHandler(s.canvas)
    h.setInputAction((e: { position: Cesium.Cartesian2 }) => {
      const picked = s.pick(e.position)
      const p = v.camera.pickEllipsoid(e.position, s.globe.ellipsoid)
      if (!p) return
      const c = Cesium.Cartographic.fromCartesian(p)
      cb.current.onPick({ lat: DEG(c.latitude), lon: DEG(c.longitude), id: picked?.id })
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewer.current = v
    onReady(v)
    return () => { clearTimeout(t); h.destroy(); v.destroy(); viewer.current = null }
  }, [])

  // imagery: rebuild the stack when it changes. Tiles are HTTP-cached, so switching back is cheap.
  const key = stack.map((s) => `${s.layer.id}@${s.t ?? ''}:${s.side ?? ''}`).join('|')
  useEffect(() => {
    const v = viewer.current!
    v.imageryLayers.removeAll()
    for (const { layer, t, side } of stack) {
      const il = v.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: tileUrl(layer, t), maximumLevel: layer.max, credit: new Cesium.Credit(`${layer.title}: ${source(layer.src).provider}`),
      }))
      if (layer.overlay) il.alpha = opacity
      if (side) il.splitDirection = side === 'left' ? Cesium.SplitDirection.LEFT : Cesium.SplitDirection.RIGHT
    }
    v.scene.requestRender()
  }, [key])

  useEffect(() => {
    const v = viewer.current!
    for (let i = 0; i < v.imageryLayers.length; i++) if (stack[i]?.layer.overlay) v.imageryLayers.get(i).alpha = opacity
    v.scene.requestRender()
  }, [opacity, key])

  useEffect(() => {
    const v = viewer.current!
    v.scene.splitPosition = split
    v.scene.requestRender()
  }, [split])

  useEffect(() => {
    const v = viewer.current!
    if (!cam) return
    const [lon, lat, height, heading = 0, pitch = -Math.PI / 2] = cam
    const dest = { destination: Cesium.Cartesian3.fromDegrees(lon, lat, height), orientation: { heading, pitch, roll: 0 } }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) v.camera.setView(dest)
    else v.camera.flyTo({ ...dest, duration: 1.8 })
  }, [camKey])

  return (
    <div className="globe">
      <div ref={el} className="globe__canvas" />
      <div ref={credits} className="globe__credits" />
    </div>
  )
}
