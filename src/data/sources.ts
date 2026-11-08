/** Every number or pixel POLARIS shows traces back to one of these. Add a source before adding a layer that uses it. */
export type Source = { id: string; name: string; provider: string; url: string; licence: string; note?: string }

export const SOURCES: Source[] = [
  { id: 'gibs', name: 'Global Imagery Browse Services (GIBS)', provider: 'NASA ESDIS', url: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api',
    licence: 'NASA open data, no restrictions. Credit NASA.', note: 'Satellite and model imagery tiles. Each layer lists its own instrument and product.' },
  { id: 'eonet', name: 'Earth Observatory Natural Event Tracker (EONET v3)', provider: 'NASA', url: 'https://eonet.gsfc.nasa.gov/',
    licence: 'NASA open data. Event sources listed per event.', note: 'Curated natural events with links to the original reporting agency.' },
  { id: 'usgs', name: 'Earthquake Hazards real-time feeds', provider: 'U.S. Geological Survey', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
    licence: 'U.S. public domain.', note: 'M2.5+ events worldwide, updated every minute by USGS.' },
  { id: 'firms', name: 'Fire Information for Resource Management System (FIRMS)', provider: 'NASA LANCE', url: 'https://firms.modaps.eosdis.nasa.gov/',
    licence: 'NASA open data. Requires a free MAP_KEY.', note: 'VIIRS (NOAA-21) 375 m active fire detections, last 24 hours, near real time.' },
  { id: 'gistemp', name: 'GISS Surface Temperature Analysis (GISTEMP v4)', provider: 'NASA Goddard Institute for Space Studies', url: 'https://data.giss.nasa.gov/gistemp/',
    licence: 'NASA open data. Cite GISTEMP Team and Lenssen et al. (2019).', note: 'Global land-ocean temperature index, anomaly relative to 1951-1980.' },
  { id: 'noaa-co2', name: 'Mauna Loa CO₂ monthly mean', provider: 'NOAA Global Monitoring Laboratory', url: 'https://gml.noaa.gov/ccgg/trends/',
    licence: 'U.S. public domain. Cite NOAA GML (Lan, Tans and Thoning).', note: 'Dry-air mole fraction, ppm. Recent months are preliminary.' },
  { id: 'oisst', name: 'Daily sea surface temperature (NOAA OISST v2.1)', provider: 'Climate Reanalyzer, University of Maine', url: 'https://climatereanalyzer.org/clim/sst_daily/',
    licence: 'See Climate Reanalyzer terms. Underlying data: NOAA NCEI OISST v2.1.', note: 'Area-weighted mean over 60°S-60°N.' },
  { id: 'cmems', name: 'Global Ocean Physics Analysis and Forecast', provider: 'Copernicus Marine Service (EU)', url: 'https://marine.copernicus.eu/',
    licence: 'Copernicus Marine Service licence: free, attribution required.', note: 'Product GLOBAL_ANALYSISFORECAST_PHY_001_024, daily mean surface currents, 1/12°.' },
  { id: 'open-meteo', name: 'Marine and Forecast APIs', provider: 'Open-Meteo', url: 'https://open-meteo.com/',
    licence: 'CC BY 4.0.', note: 'Model data (not direct observation) for point readouts. Marine values come from Copernicus and ECMWF models.' },
  { id: 'gfw', name: 'Tree cover loss (Hansen et al. 2013, UMD)', provider: 'University of Maryland via Global Forest Watch', url: 'https://www.globalforestwatch.org/',
    licence: 'CC BY 4.0. Cite Hansen et al. 2013, Science 342: 850-853.', note: 'Annual stand-replacement loss at 30 m, from Landsat.' },
  { id: 'cesium', name: 'Cesium World Terrain', provider: 'Cesium ion', url: 'https://cesium.com/platform/cesium-ion/content/cesium-world-terrain/',
    licence: 'Cesium ion terms. Used only when a token is configured.' },
]

export const source = (id: string) => SOURCES.find((s) => s.id === id)!
