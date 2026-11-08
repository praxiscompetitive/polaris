# POLARIS

**An open window into our planet.**

POLARIS is an open-source Earth observation platform: real satellite, ocean and climate data from NASA, NOAA, USGS,
Copernicus and others, on a live 3D globe. It has no backend server. It runs as a static site plus three small
serverless functions.

[![CI](https://github.com/praxiscompetitive/polaris/actions/workflows/ci.yml/badge.svg)](https://github.com/praxiscompetitive/polaris/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Features

- **Eight fixed pages**, one per header icon, with no scrolling: Home, Explorer, Ocean, Monitor, Events, Observatory,
  Sri Lanka and Sources. One circular transition connects pages, the map, and the map's own views.
- **Explorer**: a Cesium globe with Google Earth-style navigation (compass, zoom, 3D tilt, live coordinates and eye altitude), base imagery, land layers, hazards and reference layers, any date back to 2000, live
  NASA EONET events and point readouts.
- **Weather**: OpenWeatherMap clouds, precipitation, wind, temperature and pressure on the globe (needs a key).
- **Ocean**: sea surface temperature and anomaly, chlorophyll, salinity, Copernicus surface currents, sea readouts.
- **Monitor**: split-screen comparison of one layer on two dates, with ready-made stories (monsoon greening, forest
  clearing, growing night lights).
- **Events**: EONET natural events, USGS earthquakes and NASA FIRMS fires, with category filters.
- **Observatory**: GISTEMP temperature, Mauna Loa CO₂ and daily world sea surface temperature. Every card states its
  source, period and method.
- **Featured region**: a report on Sri Lanka. A new region is just data (see [CONTRIBUTING.md](CONTRIBUTING.md)).
- **Shareable views**: every map view is a link, and the address bar is always up to date.
- **Phone site**: a separate, touch-first tree with a bottom icon dock and the same data.

## Quick start

Requires Node.js 20 or newer.

```bash
git clone https://github.com/praxiscompetitive/polaris.git
cd polaris
npm install
npm run dev      # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Deeplink and CSV checks (`node --test`) |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build |

## Configuration

Both variables are optional. Copy `.env.example` to `.env` for local use.

| Variable | Where | Effect |
|---|---|---|
| `VITE_CESIUM_TOKEN` | build | Cesium World Terrain (real relief). Without it the globe is a smooth ellipsoid. |
| `OPENWEATHER_API_KEY` | server | OpenWeatherMap weather layers in Explorer (clouds, precipitation, wind, temperature, pressure), proxied by `api/owm.ts`. Without it the Weather layers stay blank. [Free key](https://home.openweathermap.org/api_keys). |
| `FIRMS_MAP_KEY` | server | NASA FIRMS fire hotspots. Without it those panels say "not configured". [Free key](https://firms.modaps.eosdis.nasa.gov/api/map_key/). |

## Rate limits and keys

- **FIRMS key (server):** NASA allows 5000 requests per 10 minutes per key. Every function in `api/` goes through
  `api/_guard.ts`: responses are cached at the CDN (`s-maxage`) and in memory, concurrent requests share one upstream
  call, each instance makes at most 12 upstream calls per 10 minutes (stale data is served beyond that), and each client
  is limited to 30 requests per minute (HTTP 429). Limits are per function instance; for a hard global limit move the
  counters to Vercel KV or Upstash.
- **OpenWeather key (server):** the free plan allows 60 calls per minute and 1,000,000 per month. Tiles are proxied by
  `api/owm.ts`, cached for 10 minutes at the CDN and in memory, and each instance makes at most 50 upstream calls per
  minute (stale tiles beyond that). Each client is limited to 300 tile requests per minute.
- **Cesium token (browser):** it ships in the bundle, so it cannot be limited in code. In the
  [Cesium ion dashboard](https://ion.cesium.com/tokens), restrict the token to the *assets:read* scope, to the World
  Terrain asset only, and to your site's domain under *Allowed URLs*. Terrain only loads when a map view opens.
- Keyless sources (GIBS, EONET, USGS, Open-Meteo, NOAA) are called from the browser, with a per-session request cache.

## Map links

Every map view lives in the URL hash:

```
#app/<view>?l=<layers>&t=<date>&cmp=<date>&c=<lon,lat,height,heading,pitch>&o=<opacity>&r=<region>
```

Views are `explorer`, `ocean`, `monitor`, `events`, `observatory` and `region`. **Share view** copies the link.

## Deploy

Import the repository into Vercel; it detects Vite. Add the two optional variables. Files in `api/` become functions
and set `s-maxage`, so upstream sources are hit at most every 30 minutes to 12 hours.

## Data and honesty rules

- Imagery is pictures, not numbers. Numeric readouts come only from APIs (Open-Meteo, NOAA, NASA, USGS) and are
  labelled as model or measurement. Nothing is read off tile colours.
- Every number on screen traces to an entry in `src/data/sources.ts`, shown on the Sources page.
- Legends are the providers' own, not redrawn.
- Data belongs to its providers and is used under their terms (see the Sources page). The code is MIT.

## Project layout

| Path | What |
|---|---|
| `src/data/` | Layer registry (`layers.ts`), sources, regions, and every data fetcher (`feeds.ts`) |
| `src/components/` | Site shell: `Header`, `Page` (fits a page to the screen), `Transition`, `Hero` (three.js Earth), `Landing` (the pages), `Chart`, `MissionGate` |
| `src/mission/` | Lazy chunk with everything Cesium: shell, URL state, readouts, `Globe`, `views/*` |
| `src/mobile/` | The phone tree: same pages and map views, touch-first |
| `src/lib/` | Deeplink parsing, CSV, WMS helpers, request cache |
| `api/` | Vercel functions: `gistemp`, `sst`, `firms` |
| `docs/` | Original build plan and UX audit |

Design notes: the site is a light "aurora" with glass chrome and one card style; the map stays midnight because
satellite imagery reads best on dark. Colour and spacing tokens are CSS custom properties at the top of
`src/styles.css`; the map re-declares them under `.mission`.

## Contributing

Contributions are welcome: new layers, regions, data sources, fixes, accessibility and translations. Read
[CONTRIBUTING.md](CONTRIBUTING.md) first, and our [Code of Conduct](CODE_OF_CONDUCT.md). To report a vulnerability, see
[SECURITY.md](SECURITY.md).

## Acknowledgements

Imagery and data from NASA GIBS and EONET, NASA GISS, NASA FIRMS, NOAA, USGS, Copernicus Marine, Open-Meteo, Climate
Reanalyzer and Cesium ion. Thank you to every provider who publishes open data.

## Licence

[MIT](LICENSE), © 2026 Praxis.
