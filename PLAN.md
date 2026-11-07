# POLARIS — build plan

> **Status (2026-11-08): phases 1-5 built and verified** (desktop 1440×900 and phone 390×760, scripted in Edge: every view opens,
> deep links survive reload, Esc/back/terminal routing work, zero console errors). Deviations from the plan are marked *Changed*.

> **POLARIS — An open window into our planet.**
> An open-source Earth observation platform by Praxis. Real scientific data, no backend server.
> Hosted on Vercel: static site plus a few serverless `/api` functions.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Codebase | Build on this repo. Keep Vite, React 19, TS, GSAP and three.js, plus the separate mobile tree (`src/main.tsx` split). |
| Praxis content | Replaced. Praxis stays as a credit ("an open-source project by Praxis") in the footer and on the About block. |
| Structure | A scrolling landing page (Orb nav, circular-mask transitions) introduces five experiences. Each opens a full-screen **Mission view**: a Cesium globe plus panels. |
| Globe | CesiumJS on desktop and mobile (mobile gets a lighter config). It loads lazily, only when a Mission view opens. |
| Hero | Lightweight three.js Earth: Blue Marble texture, atmosphere, cyan graticule, pointer-reactive. No Cesium on the landing page. |
| Terrain | Cesium World Terrain when `VITE_CESIUM_TOKEN` is set. Otherwise a smooth ellipsoid. Never a hard failure. |
| Data access | Browser-direct where CORS allows (GIBS, EONET, USGS). Vercel functions for blocked or keyed sources (GISTEMP, NOAA CO₂, FIRMS, ERDDAP, Climate Reanalyzer). |
| Palette | Midnight `#071526` · Deep Blue `#123456` · Electric Cyan `#38C6E8` · Ice `#DCEAF2` · Steel `#8799A8`. Dark only. |
| Type | Existing display face for headlines, a mono face for coordinates, units and readouts. |
| Events | EONET base, plus USGS earthquakes, NASA FIRMS hotspots and a timeline scrubber. |
| Extras | Sri Lanka featured region, compare slider, Sources & methodology page, shareable deep links. |
| OSS | MIT LICENSE, README, `git init`, `vercel.json`, layer-registry contributor docs. |

## Architecture

```
src/
  main.tsx                 desktop/mobile split (unchanged)
  store.ts                 SECTIONS → POLARIS sections; + mission state
  motion.ts                unchanged
  styles.css               re-skinned to POLARIS tokens
  data/
    layers.ts              LAYER REGISTRY: one object per dataset (see "Layer registry")
    sources.ts             provider, licence, citation, URL: one entry per source
    regions.ts             featured regions (Sri Lanka first)
  lib/
    deeplink.ts            parse/serialize #app/<view>?l=&t=&c=&cmp=  (+ deeplink.test.ts)
    csv.ts                 tiny CSV parser for GISTEMP/CO₂/FIRMS   (+ csv.test.ts)
    api.ts                 fetch helpers with timeout, abort, error states
  components/              existing: Orb, Transition, Cursor, Kinetic, Icons, Footer (terminal)
    Hero.tsx               gyroscope → three.js Earth
    Experiences.tsx        landing section per experience (replaces About/Services/Projects/Process)
    Region.tsx             landing teaser for INDIAN OCEAN / SRI LANKA
    Sources.tsx            sources & methodology (replaces Proof ledger)
  mission/                 lazy chunk: everything that imports Cesium
    Mission.tsx            full-screen shell: top bar, layer panel, legend, readout, date, share
    Globe.tsx              Cesium Viewer wrapper (no default widgets), imagery/terrain/entities
    views/Explorer.tsx
    views/Ocean.tsx
    views/Monitor.tsx      compare slider = Cesium ImageryLayer.splitDirection + scene.splitPosition
    views/Events.tsx       EONET + USGS + FIRMS + timeline scrubber
    views/Observatory.tsx  stats dashboard (inline SVG charts, no chart lib)
    views/Region.tsx       Sri Lanka report (globe flown to region + data cards)
  mobile/
    MobileApp.tsx          POLARIS landing for phones; reuses mission/ with mobile flags
    mobile.css
api/                       Vercel serverless functions (TS), each sets Cache-Control s-maxage
  gistemp.ts  sst.ts  firms.ts
  *Changed:* NOAA CO₂ sends CORS headers, so it is fetched from the browser. NOAA ERDDAP did not respond during the build,
  so point readouts use Open-Meteo Marine/Forecast (CORS-friendly, labelled as model data) instead of /api/erddap.
```

**Routing:** landing sections keep the current hash scheme (`#home`, `#explorer`, …). Mission views use
`#app/<view>?l=<layer,layer>&t=<YYYY-MM-DD>&c=<lon,lat,height,heading,pitch>&cmp=<YYYY-MM-DD>`,
the same pattern as the old `#projects/<slug>`. Back/forward, deep links and Esc-to-close work exactly like the old dossier.

**Cesium in Vite:** add the `cesium` dependency, plus `vite-plugin-static-copy` (dev) to copy `Build/Cesium/{Workers,Assets,Widgets,ThirdParty}`.
Set `CESIUM_BASE_URL`. Only `mission/` imports Cesium, so the landing chunk stays small.

**New dependencies:** `cesium`, `vite-plugin-static-copy` (dev), `@vercel/node` types (dev). Nothing else. Charts are inline SVG and the compare slider is native Cesium.

## Layer registry

A single file that contributors extend. Each entry:

```ts
{
  id: 'sst', title: 'Sea surface temperature', group: 'ocean',
  source: 'nasa-gibs', provider: 'NASA JPL MUR via GIBS',
  kind: 'wmts',                    // wmts | xyz | geojson | api
  url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{id}/default/{t}/{tms}/{z}/{y}/{x}.png',
  gibsId: 'GHRSST_L4_MUR_Sea_Surface_Temperature', tms: '1km', format: 'png',
  temporal: { from: '2002-06-01', step: 'day', latency: 2 },   // drives date picker + default date
  legend: { unit: '°C', min: -2, max: 32, ramp: [...] },
  resolution: '1 km', period: 'daily', method: 'L4 multi-sensor blended analysis',
  licence: 'NASA open data', cite: '…',
}
```

Planned layers. **GIBS IDs are verified against GetCapabilities in Phase 1**, and anything missing gets swapped for the closest equivalent and noted.

| Group | Layer | Source |
|---|---|---|
| Base | True colour (VIIRS SNPP / MODIS Terra), Blue Marble, Black Marble night lights | GIBS |
| Land | NDVI 8-day, Land surface temp (day), Population density (GPW), Shaded relief / elevation | GIBS |
| Land | Tree cover loss (Hansen/UMD) | Global Forest Watch tiles |
| Ocean | SST (MUR), SST anomaly, Chlorophyll-a, Sea surface salinity (SMAP) | GIBS |
| Ocean | Surface currents | Copernicus Marine WMTS (public); fallback is OSCAR via GIBS |
| Events | Fire detections (VIIRS 375 m) imagery | GIBS |
| Events | EONET events, USGS quakes, FIRMS hotspots | APIs (FIRMS via `/api/firms`) |

## Phases

### Phase 1 — Foundation & the experience
1. `git init`, `.gitignore`, MIT `LICENSE`, `vercel.json` (SPA rewrite + `/api`), `.env.example`
   (`VITE_CESIUM_TOKEN`, `FIRMS_MAP_KEY`).
2. Re-skin: POLARIS tokens in `styles.css`, Transition tints, Cursor and Orb colours, a mono readout style, and a new mark/favicon.
3. `store.ts`: sections become `home · explorer · ocean · monitor · events · observatory · region · sources`, plus new icons in `Icons.tsx`.
4. Hero: three.js Earth replaces the gyroscope, reusing the existing lazy-load and no-WebGL fallback. Live UTC clock and cursor lat/lon readout.
5. Landing: one section per experience (what it shows, the key datasets, an "Enter" button that opens `#app/<view>`).
   Remove About/Services/Projects/Process/Contact. Footer terminal is repurposed (`help`, `goto <view>`, `layers`, `sources`).
6. Cesium wiring, `Globe.tsx`, `Mission.tsx` shell, `deeplink.ts` + test.
7. **Explorer:** base imagery, land layers, opacity, date picker (respects each layer's temporal range), click-to-readout (lat/lon), search-free geographic nav (preset regions + coordinates input), share button.
8. **EONET layer** on Explorer: open events, category icons, click for details plus source link.

*Done when:* the landing page renders, Explorer opens from it and from a pasted deep link, layers toggle, dates change imagery, `npm run build` passes, and the landing chunk does not include Cesium.

### Phase 2 — Ocean & environmental change
1. **Ocean Intelligence:** SST, SST anomaly, chlorophyll, salinity and currents. Defaults to the Indian Ocean camera. Legends with units.
   Point readout of real SST values via `/api/erddap` (NOAA CoastWatch ERDDAP `jplMURSST41`).
2. **Environmental Monitor:** compare slider (two dates of the same layer, or two layers), with presets for deforestation, urban growth (night lights), vegetation, wildfire scars and water bodies. Tree cover loss with a year filter.

*Done when:* the slider drags smoothly, both sides honour their dates, deep links restore `cmp`, and the ERDDAP readout returns a value or a clear "no data" state.

### Phase 3 — Natural events
1. **Events view:** EONET (open plus closed within the window), USGS M2.5+ (day/week/month feeds), FIRMS 24 h hotspots via `/api/firms`.
2. Timeline scrubber (`<input type="range">`, 7–365 days, with play/pause) that filters every event source by date.
3. Filter by category, event list synced with the globe (click either one to fly there), counts per category.

*Done when:* all three feeds load or show an explicit per-source error, and the scrubber filters with no frame drops at ~5k points (points are billboards or primitives, not DOM).

### Phase 4 — Observatory & Sri Lanka
1. **Observatory:** global temperature anomaly (GISTEMP v4, monthly and annual), atmospheric CO₂ (NOAA Mauna Loa), daily global SST vs climatology (Climate Reanalyzer OISST),
   current active-fire count (FIRMS) and open-event counts (EONET). Every card shows the **source, measurement period, methodology and last-updated time**. Inline SVG line charts with accessible data tables.
2. **INDIAN OCEAN — SRI LANKA:** a fly-to plus a report covering coastal SST (ERDDAP time series), chlorophyll along the coast, NDVI, historical tree cover loss (GFW) and coastal observations.
   Region data lives in `regions.ts`, so more regions are just data. Any figure that can't be fetched live is a **cited snapshot with its date**, never an unlabeled number.
3. Landing Region teaser and Sources & methodology page (generated from `sources.ts` and `layers.ts`).

*Done when:* every number on screen traces to a source entry, and the functions return cached JSON with a sensible `s-maxage`.

### Phase 5 — Mobile, hardening, open source
1. **Mobile tree:** POLARIS landing (swipe rails, dock and sheet nav, reused), Mission views with a bottom-sheet layer picker, a lower Cesium resolution scale, one overlay layer at a time, and touch camera controls. Cesium downloads only when a view opens.
2. Accessibility: keyboard paths through panels, focus return on close, reduced-motion (no hero spin, instant camera flights), colour-blind-safe legends, data tables behind charts.
3. Performance: chunk audit, request render mode in Cesium, tile request limits, `fetch` abort on view change.
4. Docs: README (setup, env vars, deploy to Vercel, data attribution) and `CONTRIBUTING.md` / "Adding a layer" guide.
5. Verification: Edge scripted run on desktop and at 390×760. Every view opens, deep links round-trip, and there are zero page errors.

## Known risks / honesty notes
- **GIBS layer IDs and tile matrix sets** change occasionally. They're verified in Phase 1, not assumed.
- **Copernicus Marine** public WMTS availability has to be confirmed. If it's unavailable, currents come from GIBS OSCAR or are dropped (and noted).
- **FIRMS** needs a free `FIRMS_MAP_KEY`. Without it the Events view shows FIRMS as "not configured" and the GIBS fire imagery layer still works.
- **Imagery is pictures, not numbers.** Numeric readouts come only from ERDDAP/API sources, and the UI never derives values from tile colours.
- **Sri Lanka forest-loss statistics:** the GFW data API needs a key. The default is a cited snapshot with its date, and live data becomes optional if you add a key.
- Cesium is about 3 MB gz of assets. That's fine behind a lazy route, and it's the main mobile cost.

## Out of scope (until asked)
User accounts, our own raster processing (xarray/rasterio), PostGIS, MapLibre/deck.gl/ECharts, any languages other than English.
