/**
 * LAYER REGISTRY. One entry per dataset; every view, legend, date picker and the Sources page reads from here.
 * To add a layer, see CONTRIBUTING.md. GIBS ids, tile matrix sets and start dates were checked against
 * https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml (Nov 2026).
 */
export type Group = 'base' | 'land' | 'ocean' | 'weather' | 'hazard' | 'reference'
export type Layer = {
  id: string
  title: string
  group: Group
  src: string // id in sources.ts
  /** gibs: NASA GIBS REST (EPSG:3857). xyz: plain {z}/{x}/{y}. cmems: Copernicus Marine WMTS KVP. */
  kind: 'gibs' | 'xyz' | 'cmems'
  ref: string // GIBS identifier, xyz template or CMEMS layer
  ext?: 'png' | 'jpeg'
  max: number // deepest zoom level the provider serves; for GIBS it also names the tile matrix set (GoogleMapsCompatible_Level<max>)
  /** temporal layers: first available date and composite step; absent = static */
  from?: string
  step?: 'P1D' | 'P8D' | 'P16D' | 'P1Y'
  years?: number[] // for sparse annual products
  legend?: string // provider-issued legend image
  res: string
  period: string
  method: string
  overlay?: boolean // drawn on top of a base, not instead of it
}

const LEG = (n: string) => `https://gibs.earthdata.nasa.gov/legends/${n}_H.svg`
const CMEMS_CUR = 'GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m_202406/sea_water_velocity'

export const LAYERS: Layer[] = [
  // base imagery
  { id: 'truecolor', title: 'True colour (MODIS Terra)', group: 'base', src: 'gibs', kind: 'gibs', ref: 'MODIS_Terra_CorrectedReflectance_TrueColor', ext: 'jpeg', max: 9,
    from: '2000-02-24', step: 'P1D', res: '250 m', period: 'Daily', method: 'Corrected reflectance, bands 1-4-3, as seen by eye.' },
  { id: 'viirs', title: 'True colour (VIIRS NOAA-20)', group: 'base', src: 'gibs', kind: 'gibs', ref: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', ext: 'jpeg', max: 9,
    from: '2018-01-05', step: 'P1D', res: '250 m', period: 'Daily', method: 'Corrected reflectance, bands I1-M4-M3.' },
  { id: 'bluemarble', title: 'Blue Marble', group: 'base', src: 'gibs', kind: 'gibs', ref: 'BlueMarble_NextGeneration', ext: 'jpeg', max: 8,
    res: '500 m', period: 'Cloud-free composite (2004)', method: 'MODIS monthly composite, clouds removed.' },
  { id: 'relief', title: 'Shaded relief and bathymetry', group: 'base', src: 'gibs', kind: 'gibs', ref: 'BlueMarble_ShadedRelief_Bathymetry', ext: 'jpeg', max: 8,
    res: '500 m', period: 'Static', method: 'Blue Marble with shaded relief and ocean depth.' },
  { id: 'nightlights', title: 'Night lights (Black Marble)', group: 'base', src: 'gibs', kind: 'gibs', ref: 'VIIRS_Black_Marble', ext: 'png', max: 8,
    from: '2012-01-01', step: 'P1Y', years: [2012, 2016], res: '500 m', period: 'Annual composite (2012, 2016)', method: 'VIIRS Day/Night Band, moonlight and clouds removed.' },

  // land
  { id: 'ndvi', title: 'Vegetation index (NDVI)', group: 'land', src: 'gibs', kind: 'gibs', ref: 'MODIS_Terra_L3_NDVI_16Day', ext: 'png', max: 9, overlay: true,
    from: '2000-03-05', step: 'P16D', legend: LEG('MODIS_L3_NDVI'), res: '250 m', period: '16-day composite', method: 'MODIS MOD13Q1 normalised difference vegetation index.' },
  { id: 'lst', title: 'Land surface temperature (day)', group: 'land', src: 'gibs', kind: 'gibs', ref: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day', ext: 'png', max: 7, overlay: true,
    from: '2000-02-26', step: 'P8D', legend: LEG('MODIS_Land_Surface_Temp'), res: '1 km', period: '8-day composite', method: 'MODIS MOD11A2 daytime skin temperature of the land surface.' },
  { id: 'treeloss', title: 'Tree cover loss', group: 'land', src: 'gfw', kind: 'xyz', ref: 'https://tiles.globalforestwatch.org/umd_tree_cover_loss/latest/dynamic/{z}/{x}/{y}.png', max: 12, overlay: true,
    res: '30 m', period: 'Annual, 2001 to the latest release', method: 'Landsat time series, stand-replacement disturbance (Hansen et al.).' },
  { id: 'mangroves', title: 'Mangrove forests (2000)', group: 'land', src: 'gibs', kind: 'gibs', ref: 'Mangrove_Forest_Distribution_2000', ext: 'png', max: 7, overlay: true,
    res: '30 m', period: 'Circa 2000', method: 'Landsat classification (Giri et al. 2011), via SEDAC.' },
  { id: 'population', title: 'Population density (2020)', group: 'land', src: 'gibs', kind: 'gibs', ref: 'GPW_Population_Density_2020', ext: 'png', max: 7, overlay: true,
    legend: LEG('GPW_Population_Density_2020'), res: '1 km', period: '2020 estimate', method: 'GPWv4 census-based gridded population, SEDAC.' },
  { id: 'elevation', title: 'Elevation (ASTER GDEM)', group: 'land', src: 'gibs', kind: 'gibs', ref: 'ASTER_GDEM_Color_Shaded_Relief', ext: 'jpeg', max: 12, overlay: true,
    res: '30 m', period: 'Static', method: 'ASTER global digital elevation model, colour shaded relief.' },

  // ocean
  { id: 'sst', title: 'Sea surface temperature', group: 'ocean', src: 'gibs', kind: 'gibs', ref: 'GHRSST_L4_MUR_Sea_Surface_Temperature', ext: 'png', max: 7, overlay: true,
    from: '2002-06-01', step: 'P1D', legend: LEG('GHRSST_Sea_Surface_Temperature'), res: '1 km', period: 'Daily', method: 'JPL MUR L4: multi-sensor blended analysis, gap-free.' },
  { id: 'ssta', title: 'Sea surface temperature anomaly', group: 'ocean', src: 'gibs', kind: 'gibs', ref: 'GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies', ext: 'png', max: 7, overlay: true,
    from: '2019-07-23', step: 'P1D', legend: LEG('GHRSST_Sea_Surface_Temperature_Anomalies'), res: '1 km', period: 'Daily', method: 'MUR SST minus its 2003-2014 daily climatology.' },
  { id: 'chl', title: 'Chlorophyll-a', group: 'ocean', src: 'gibs', kind: 'gibs', ref: 'MODIS_Aqua_L2_Chlorophyll_A', ext: 'png', max: 7, overlay: true,
    from: '2002-07-04', step: 'P1D', legend: LEG('MODIS_Chlorophyll'), res: '1 km', period: 'Daily swaths (gaps under cloud)', method: 'MODIS Aqua ocean colour, OCI algorithm.' },
  { id: 'sss', title: 'Sea surface salinity', group: 'ocean', src: 'gibs', kind: 'gibs', ref: 'SMAP_L3_Sea_Surface_Salinity_CAP_8Day_RunningMean', ext: 'png', max: 6, overlay: true,
    from: '2015-05-08', step: 'P1D', legend: LEG('SMAP_Sea_Surface_Salinity'), res: '~40 km', period: '8-day running mean', method: 'SMAP L-band radiometer, JPL CAP algorithm.' },
  { id: 'currents', title: 'Surface currents (latest)', group: 'ocean', src: 'cmems', kind: 'cmems', ref: CMEMS_CUR, max: 8, overlay: true,
    legend: `https://wmts.marine.copernicus.eu/teroWmts?SERVICE=WMTS&REQUEST=GetLegend&LAYER=${encodeURIComponent(CMEMS_CUR)}&STYLE=${encodeURIComponent('cmap:speed,vectorStyle:solidAndVector')}&FORMAT=image%2Fsvg%2Bxml`,
    res: '1/12° (~9 km)', period: 'Daily mean, latest analysis', method: 'NEMO ocean model with data assimilation. Model output, not observation.' },

  // weather: OpenWeatherMap tiles, proxied by api/owm.ts so the key stays on the server
  { id: 'clouds', title: 'Clouds', group: 'weather', src: 'owm', kind: 'xyz', ref: '/api/owm?l=clouds_new&z={z}&x={x}&y={y}', max: 8, overlay: true,
    res: '~10 km', period: 'Current, about every 10 min', method: 'Cloud cover, percent. Model analysis, not a satellite image.' },
  { id: 'rain', title: 'Precipitation', group: 'weather', src: 'owm', kind: 'xyz', ref: '/api/owm?l=precipitation_new&z={z}&x={x}&y={y}', max: 8, overlay: true,
    res: '~10 km', period: 'Current, about every 10 min', method: 'Precipitation rate, mm per hour. Model analysis.' },
  { id: 'wind', title: 'Wind speed', group: 'weather', src: 'owm', kind: 'xyz', ref: '/api/owm?l=wind_new&z={z}&x={x}&y={y}', max: 8, overlay: true,
    res: '~10 km', period: 'Current, about every 10 min', method: 'Wind speed at 10 m, metres per second. Model analysis.' },
  { id: 'airtemp', title: 'Air temperature', group: 'weather', src: 'owm', kind: 'xyz', ref: '/api/owm?l=temp_new&z={z}&x={x}&y={y}', max: 8, overlay: true,
    res: '~10 km', period: 'Current, about every 10 min', method: 'Air temperature at 2 m, degrees Celsius. Model analysis.' },
  { id: 'pressure', title: 'Sea-level pressure', group: 'weather', src: 'owm', kind: 'xyz', ref: '/api/owm?l=pressure_new&z={z}&x={x}&y={y}', max: 8, overlay: true,
    res: '~10 km', period: 'Current, about every 10 min', method: 'Pressure reduced to sea level, hectopascals. Model analysis.' },

  // hazards
  { id: 'flood', title: 'Flood (MODIS 2-day)', group: 'hazard', src: 'gibs', kind: 'gibs', ref: 'MODIS_Combined_Flood_2-Day', ext: 'png', max: 9, overlay: true,
    from: '2021-01-01', step: 'P1D', legend: LEG('MODIS_Flood'), res: '250 m', period: '2-day composite', method: 'Surface water beyond the reference water mask (LANCE NRT).' },

  // reference
  { id: 'coastlines', title: 'Coastlines', group: 'reference', src: 'gibs', kind: 'gibs', ref: 'Coastlines_15m', ext: 'png', max: 13, overlay: true,
    res: '15 m', period: 'Static', method: 'OpenStreetMap-derived coastlines.' },
  { id: 'labels', title: 'Place labels', group: 'reference', src: 'gibs', kind: 'gibs', ref: 'Reference_Labels_15m', ext: 'png', max: 13, overlay: true,
    res: '15 m', period: 'Static', method: 'OpenStreetMap place names.' },
]

export const layer = (id: string) => LAYERS.find((l) => l.id === id)
export const GROUPS: { id: Group; title: string }[] = [
  { id: 'base', title: 'Base imagery' }, { id: 'land', title: 'Land' }, { id: 'ocean', title: 'Ocean' }, { id: 'weather', title: 'Weather' },
  { id: 'hazard', title: 'Hazards' }, { id: 'reference', title: 'Reference' },
]

const iso = (d: Date) => d.toISOString().slice(0, 10)
/** Most recent date worth asking for: providers publish a day or two behind. */
export const latest = (l: Layer) => (l.years ? `${l.years.at(-1)}-01-01` : iso(new Date(Date.now() - 2 * 864e5)))

/** Snap a requested date into what the layer can serve. Static layers ignore dates. */
export function clampDate(l: Layer, t?: string) {
  if (!l.from) return undefined
  if (l.years) {
    const y = Number((t ?? latest(l)).slice(0, 4))
    const best = l.years.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a))
    return `${best}-01-01`
  }
  if (!t) return latest(l)
  return t < l.from ? l.from : t > latest(l) ? latest(l) : t
}

/** Tile URL template for Cesium's UrlTemplateImageryProvider ({z}/{x}/{y} placeholders). */
export function tileUrl(l: Layer, t?: string) {
  if (l.kind === 'xyz') return l.ref
  if (l.kind === 'cmems')
    return `https://wmts.marine.copernicus.eu/teroWmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${encodeURIComponent(l.ref)}` +
      `&STYLE=${encodeURIComponent('cmap:speed,vectorStyle:solidAndVector')}&TILEMATRIXSET=EPSG:3857&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png`
  const tms = `GoogleMapsCompatible_Level${l.max}`
  // no date chosen: daily layers ask for the latest complete day (GIBS's 'default' is today, still being assembled, and returns blank
  // tiles); composites keep 'default', the newest finished composite (today-2 can sit past the last 8/16-day one)
  const when = (t && clampDate(l, t)) || (l.step === 'P1D' ? latest(l) : 'default')
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.ref}/default/${when}/${tms}/{z}/{y}/{x}.${l.ext}`
}
