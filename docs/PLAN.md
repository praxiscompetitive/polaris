# POLARIS: plan v2

> **POLARIS: Open Earth Intelligence.** *Explore. Investigate. Understand.*
> An open-source Earth science platform by Praxis. Real scientific data, no accounts, no backend server.
> Hosted on Vercel: static site plus a few serverless `/api` functions.

**Status (2026-11-08):** v0 (the Earth observation viewer) is built and live. This plan covers v1: turning it into a research and teaching platform.
The v0 plan is kept at the bottom as history.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Audience | University students and lecturers. Rigour (provenance, exports) and guided learning matter more than spectacle. |
| Product | An open Earth science platform. **Geology and oceanography first**, other areas (atmosphere, hydrology, environment) added later. |
| v1 success | An **investigation workbench** (the Lab) that handles a real cross-domain study end to end. |
| Test case | **The 2004 Indian Ocean tsunami.** Earthquake, plate boundary, trench bathymetry, aftershocks over time, affected coasts including Sri Lanka. It becomes the first Academy practical. |
| Backend | Static site plus serverless functions. **No accounts.** |
| Saving and sharing | A deep link (extends `deeplink.ts`) plus an exportable and re-importable **JSON file**. |
| Source failures | The layer stays listed with a visible **live / degraded / down** badge and a clear message. |
| Look | **Keep the current visual identity** (the design tokens in `styles.css`). The navy/cyan palette is at most an accent for the Lab. |
| Navigation | Four doors: **Explore, Lab, Academy, Library**. Domains (Ocean, Geology, …) are filters inside them, not separate sections. |
| Existing views | Fold into the new doors (see Phase 6). |
| Growth | Each science area is a self-contained **domain bundle**, so adding one later is mostly data. |
| Deep time | **Out of v1** (no GPlates-style reconstruction). The time model must leave room for a geological-time axis. |
| Lab tools | Filter by magnitude/time · time series at a point · transect/cross-section · area statistics · layer comparison/swipe. |
| Extras | CSV + GeoJSON export · data cards with provenance · print-ready investigation report. |
| Positioning | Complementary to Copernicus, Macrostrat, USGS, NASA Worldview and GPlates, not a replacement. The gap is one cross-domain workspace with teaching built in. |

## Architecture

1. **Domain bundles.** Each domain (`ocean`, `geology`) declares its layers, regions, sources and practicals. The app renders from these. A new domain is a new bundle, not new components.
2. **One layer/dataset schema with provenance built in:**
   - provider and dataset ID
   - kind: `observed` · `satellite` · `modelled` · `event`
   - spatial and temporal resolution, units
   - latency class: `realtime` · `near-realtime` · `forecast` · `historical`
   - known limitations
   - status: `live` · `degraded` · `down`

   Data cards, the Library page and printed reports all read from this schema.
3. **Investigation state.** One serialisable object: region, time range and cursor, active layers, filters, selections, chart configs.
   It serialises to the URL and to a JSON file. The Lab, Academy practicals and reports all read and write this object.
4. **Time model.** An interval plus a cursor, generic enough to take a geological-time axis later.

Everything else from v0 stays: Vite, React 19, TS, GSAP, three.js hero, lazy Cesium chunk, the separate mobile tree, Vercel functions with `s-maxage`.

## To-do list

Work one phase at a time. Tick items as they land. Each phase ends with its **Done when** check.

### Phase 0: Data spikes (1–2 days)
Goal: find out which sources work from a browser before designing around them.
For each: CORS, rate limits, licence, latency, whether it needs a key or a proxy function. Record results in `docs/SPIKES.md`.
- [ ] USGS earthquakes (FDSN event API): query by magnitude, time and bounding box
- [ ] Plate boundaries: pick a static GeoJSON source and licence
- [ ] GEBCO bathymetry: tiles for display, and a way to **sample a depth profile along a line**
- [ ] Macrostrat: API and vector tiles, and **coverage over Sri Lanka**
- [ ] Faults dataset: source and licence
- [ ] Tsunami / sea-level data: is there any usable open source for 2004?
- [ ] Sea temperature time series at a point (ERDDAP or Open-Meteo Marine): confirm what works
- [ ] Decide which sources need a serverless proxy
- [ ] Cut or defer any source that fails

*Done when:* `SPIKES.md` lists every source as use / proxy / cut, and the tsunami case has data for every layer it needs.

### Phase 1: Foundation
- [ ] Define the layer schema (types, including provenance fields and status)
- [ ] Domain-bundle structure: `domains/ocean`, `domains/geology`, with a registry that merges them
- [ ] Migrate the existing 23 layers into the `ocean` bundle (plus land/weather/hazard as context)
- [ ] Data card panel: provider, dataset ID, kind badge, resolution, units, latency, limitations
- [ ] Status badges (live / degraded / down) and a simple health check per source
- [ ] Library page generated from the schema (replaces the Sources page)
- [ ] Update `sources.ts` to the new provenance fields
- [ ] Tests for schema validation and registry merging

*Done when:* every layer shows a data card, the Library lists them all from the registry, and `npm run build` and `npm test` pass.

### Phase 2: Geology bundle
- [ ] Earthquakes layer (USGS) with magnitude and time filters
- [ ] Plate boundaries layer
- [ ] Faults layer (if the spike allows)
- [ ] Macrostrat geological units layer, with click-for-formation readout
- [ ] Bathymetry and trenches (GEBCO display layer)
- [ ] Data cards and status for each
- [ ] Geology filter in Explore

*Done when:* the tsunami case's layers all display in Explore with provenance, and a failing source shows its badge instead of breaking the page.

### Phase 3: Lab core
- [ ] Investigation state object, type definitions, and URL + JSON serialisation (with tests)
- [ ] Lab layout: left (catalogue, region, time) · centre (globe) · right (data card, statistics) · bottom (charts)
- [ ] Magnitude/time filtering for event layers
- [ ] Time series at a point (click anywhere, get a chart)
- [ ] Transect: draw a line, get a profile (seafloor depth across the Sunda trench)
- [ ] Area statistics: draw a box or polygon, get counts and summaries
- [ ] Layer comparison/swipe (two layers or two dates), reusing the existing compare mode
- [ ] Chart component upgrades (axes, units, accessible data table)
- [ ] **Run the tsunami investigation end to end** and fix what breaks

*Done when:* a user can reproduce the 2004 tsunami investigation from a blank Lab, save it, reload it from the link, and get the same view.

### Phase 4: Export and reports
- [ ] CSV export for any chart or selection (reuse `csv.ts`)
- [ ] GeoJSON export for any spatial selection
- [ ] Investigation JSON export and import
- [ ] Print-ready report (print stylesheet): maps, charts, active layers with provenance, sources, date
- [ ] Tests for export formats

*Done when:* the tsunami investigation exports to CSV, GeoJSON and JSON, re-imports cleanly, and prints as a readable report with full citations.

### Phase 5: Academy
- [ ] Practical format: research question, background, an investigation state, guided steps, discussion questions (stored as data files)
- [ ] Academy page: list and open practicals into the Lab
- [ ] Practical 1: the 2004 Indian Ocean tsunami
- [ ] Convert the Sri Lanka "look" entries into practicals: monsoon chlorophyll, warm water around the island, green seasons, forest loss
- [ ] Practical: earthquakes along plate boundaries (magnitude filter and spatial relationship)
- [ ] Check each practical against the data it uses and note the limitations

*Done when:* at least 5 practicals open in the Lab with the right layers, dates and filters, and each can be completed using only the app.

### Phase 6: Fold in the old views
- [ ] Layers + Region → **Explore**
- [ ] Monitor, Events, Observatory → live-data panels inside Explore/Lab
- [ ] Region "looks" → Academy (done in Phase 5; remove the old copies)
- [ ] Sources → Library (done in Phase 1; remove the old page)
- [ ] Landing page: four doors (Explore, Lab, Academy, Library), new copy and tagline, and README / `package.json` text
- [ ] Add Indian Ocean regions as data: Bay of Bengal, Arabian Sea, Maldives, Andaman Sea, Equatorial Indian Ocean
- [ ] Update deep links, the footer terminal, and the nav (including mobile)
- [ ] Remove dead code and unused routes

*Done when:* there are exactly four top-level destinations, no duplicate pages remain, and old deep links still redirect somewhere sensible.

### Phase 7: Mobile, hardening, release
- [ ] Decide mobile scope for the Lab (default: desktop-first, read-only view on phones)
- [ ] Mobile Explore, Academy and Library at 390×760
- [ ] Accessibility: keyboard paths through the Lab, focus return, reduced motion, colour-blind-safe legends, data tables behind charts
- [ ] Performance: chunk audit, request limits, abort fetches on view change
- [ ] Scripted browser run on desktop and phone: every view opens, deep links round-trip, zero console errors
- [ ] README, `CONTRIBUTING.md` and "Adding a domain bundle" guide
- [ ] Deploy and check production endpoints

*Done when:* the scripted run passes on both sizes and the contributor guide lets someone add a layer or a practical without asking.

## Later (not v1)
Atmosphere and hydrology bundles · geological-time reconstruction · biodiversity (OBIS, Paleobiology Database) · Argo and in-situ observations · fishing activity · community contribution model · lecturer publishing (needs a backend).

## Risks
- **Macrostrat coverage in Sri Lanka** is unconfirmed. The Phase 0 spike decides whether the Sri Lanka geology story works.
- **Depth profiles in the browser:** needs a queryable bathymetry source. If GEBCO offers none, a small serverless function is required.
- **Source reliability:** in the last full test, 5 layers were rate-limited and 5 returned 502. Status badges are the mitigation, not a cure.
- **Scope:** the Lab is the product. If time runs short, cut Academy content before Lab tools.
- **Imagery is pictures, not numbers.** Numeric readouts come only from data APIs, never from tile colours.
- **Mobile Lab** is an open question until Phase 7.

## Out of scope (until asked)
User accounts, our own raster processing (xarray/rasterio), PostGIS, deep-time reconstruction, any language other than English.

---

# History: v0 plan (built)

v0 delivered the landing page, the Cesium Mission views (Explorer, Ocean, Monitor, Events, Observatory, Region), deep links, the Sri Lanka region, and the mobile tree.
Key v0 choices that still apply: browser-direct data where CORS allows; Vercel functions for blocked or keyed sources (GISTEMP, SST, FIRMS, OpenWeatherMap tiles);
Open-Meteo Marine for point readouts because NOAA ERDDAP did not respond during the build; Cesium loaded lazily only when a Mission view opens.
The full v0 text is in git history (`git log -- docs/PLAN.md`).
