# POLARIS

**An open window into our planet.** An open-source Earth observation platform by Praxis: real satellite, ocean and
climate data from NASA, NOAA, USGS, Copernicus and others, on a live 3D globe. No backend server; it runs on Vercel as a
static site plus three small serverless functions.

```
npm install
npm run dev      # http://localhost:5173 (serves api/*.ts too)
npm test         # deeplink + csv checks (node --test)
npm run build    # typecheck, then dist/
```

## What is in it

| Where | What |
|---|---|
| Landing (`#home` … `#sources`) | three.js Earth with the real day/night terminator, then one section per experience, each with live data or a NASA snapshot |
| `#app/explorer` | Cesium globe: base imagery, land layers, hazards, reference, any date back to 2000, EONET events, point readouts |
| `#app/ocean` | SST, SST anomaly, chlorophyll, salinity, Copernicus surface currents, sea readouts |
| `#app/monitor` | split-screen comparison of one layer on two dates, with ready-made stories |
| `#app/events` | EONET + USGS earthquakes + NASA FIRMS fires, category filters, timeline scrubber |
| `#app/observatory` | GISTEMP temperature, Mauna Loa CO₂, daily world SST, active fires, open events. Every card states source, period and method |
| `#app/region?r=sri-lanka` | featured region report: coastal SST (30-day series), inland conditions, where to look |

Every Mission view is a shareable link: `#app/<view>?l=<layers>&t=<date>&cmp=<date>&c=<lon,lat,height,heading,pitch>&o=<opacity>`.
The address bar is always up to date; **Share view** copies it.

## Environment

| Variable | Where | Effect |
|---|---|---|
| `VITE_CESIUM_TOKEN` | build | Cesium World Terrain (real relief). Without it the globe is a smooth ellipsoid, everything else works. |
| `FIRMS_MAP_KEY` | server (Vercel) | NASA FIRMS fire hotspots in Events and Observatory. Without it those panels say "not configured". Free key: https://firms.modaps.eosdis.nasa.gov/api/map_key/ |

Copy `.env.example` to `.env` for local use.

## Deploy to Vercel

Import the repo; Vercel detects Vite. Add the two variables above (both optional). `api/*.ts` become functions
automatically; each sets `s-maxage` so upstream sources are hit at most every 30 min to 12 h.

## Data and honesty rules

- Imagery is pictures, not numbers. Numeric readouts come only from APIs (Open-Meteo, NOAA, NASA, USGS) and are labelled
  as model or measurement. Nothing is read off tile colours.
- Every number on screen traces to an entry in `src/data/sources.ts`, shown on the Sources section.
- Legends are the providers' own (GIBS and Copernicus legend images), not redrawn.
- Data belongs to its providers and is used under their terms (see Sources). The code is MIT.

## Map of the code

- `src/data/layers.ts` layer registry (see CONTRIBUTING.md) · `sources.ts` · `regions.ts` · `feeds.ts` (all fetchers)
- `src/components/` landing: `Hero` (three.js Earth), `Landing` (sections), `Chart` (SVG line chart), `Orb`, `Transition`, `Footer` (terminal), `MissionGate`
- `src/mission/` lazy chunk with everything Cesium: `Mission` (shell, URL state, readouts), `Globe`, `views/*`
- `src/mobile/` the phone tree: same sections and Mission views, dock navigation, one overlay at a time
- `api/` Vercel functions: `gistemp`, `sst` (Climate Reanalyzer), `firms`
