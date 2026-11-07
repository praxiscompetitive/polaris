/** A single still image from GIBS WMS: real data, any bbox, any date. Used where a page needs a picture, not a globe. */
export function snapshot(layers: string[], bbox: [w: number, s: number, e: number, n: number], width: number, height: number, time?: string) {
  const [w, s, e, n] = bbox
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&CRS=EPSG:4326` +
    `&BBOX=${s},${w},${n},${e}&WIDTH=${width}&HEIGHT=${height}&LAYERS=${layers.join(',')}&FORMAT=image/jpeg${time ? `&TIME=${time}` : ''}`
}
export const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
