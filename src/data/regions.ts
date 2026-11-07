/** Featured regions. A new region is just data: a camera, sample points and the layers worth looking at. */
export type Point = { name: string; lat: number; lon: number }
export type Region = {
  id: string
  title: string
  sub: string
  cam: [lon: number, lat: number, height: number]
  /** offshore points: Open-Meteo Marine returns sea values only over water */
  coast: Point[]
  land: Point[]
  layers: string[]
  /** things to look at yourself, each with the layer and dates that show it */
  look: { title: string; body: string; l: string; t: string; cmp?: string }[]
}

export const REGIONS: Region[] = [
  {
    id: 'sri-lanka',
    title: 'Sri Lanka',
    sub: 'Indian Ocean',
    cam: [80.7, 7.6, 1_100_000],
    coast: [
      { name: 'Colombo', lat: 6.93, lon: 79.75 },
      { name: 'Galle', lat: 5.95, lon: 80.2 },
      { name: 'Dondra Head', lat: 5.8, lon: 80.6 },
      { name: 'Batticaloa', lat: 7.75, lon: 81.85 },
      { name: 'Trincomalee', lat: 8.6, lon: 81.35 },
      { name: 'Gulf of Mannar', lat: 8.8, lon: 79.5 },
    ],
    land: [
      { name: 'Colombo', lat: 6.93, lon: 79.86 },
      { name: 'Kandy', lat: 7.29, lon: 80.63 },
      { name: 'Nuwara Eliya', lat: 6.97, lon: 80.78 },
      { name: 'Anuradhapura', lat: 8.31, lon: 80.4 },
      { name: 'Jaffna', lat: 9.66, lon: 80.02 },
    ],
    layers: ['sst', 'chl', 'ndvi', 'treeloss', 'mangroves'],
    look: [
      { title: 'Monsoon chlorophyll', l: 'chl', t: '2025-08-20', cmp: '2026-01-20',
        body: 'Compare the south coast in the southwest monsoon (August) with the northeast monsoon (January). Cloud leaves gaps in daily ocean colour.' },
      { title: 'Warm water around the island', l: 'sst', t: '2026-04-15', cmp: '2026-08-15',
        body: 'April against August sea surface temperature. The legend gives the scale; tap the sea for a model readout.' },
      { title: 'Green seasons', l: 'ndvi', t: '2026-01-01', cmp: '2026-07-12',
        body: 'Vegetation index in two seasons. The dry zone in the north and east responds most.' },
      { title: 'Forest loss since 2001', l: 'treeloss', t: '',
        body: 'Pink pixels mark tree cover lost between 2001 and the latest release. Zoom in: the data is 30 m.' },
    ],
  },
]

export const region = (id: string) => REGIONS.find((r) => r.id === id)
