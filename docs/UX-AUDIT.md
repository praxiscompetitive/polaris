# POLARIS UX audit

Audited 2026-11-08 at desktop 1440×900 and phone 390×760, in a scripted Edge session: every section and every globe view,
with deep links, Esc, back and the terminal, plus a comparison against public guidance and similar products (sources below).

## Fixed in this pass

| # | Finding | Change |
|---|---|---|
| 1 | No brand anywhere: the logo existed only as a file. | Brand header (mark, wordmark once you scroll, one-line section links), wordmark as the hero H1, favicon, touch icon, social-share card, mark in the globe's top bar. |
| 2 | Landing felt empty: big dark gaps, a chip list, single numbers in tall cells. | Hero globe now echoes the logo (orbit, satellite, pole star, starfield) and shows live EONET events. Added a live-readings ticker, a layer gallery with real GIBS thumbnails, Monitor story tabs, a live quake and event map, and Observatory side indicators. Sections reveal in order as you scroll; spacing tightened. |
| 3 | **Bug:** NDVI and land temperature were blank by default. "Today minus 2 days" falls after the newest 8- or 16-day composite. | With no date chosen, the app asks GIBS for its `default` (newest) image. Chosen dates snap to the composite period on the server. |
| 4 | Phone: the hero call to action sat under the dock. | The hero reserves dock height; the globe scales to the viewport height. |
| 5 | No guidance on how to drive a 3D globe. | A first-visit hint (drag, zoom, tilt, click for a reading). It hides after the first interaction and is remembered. |
| 6 | The same feed was downloaded several times (hero, ticker, section, Observatory). | A per-session request cache, so each feed is fetched once. |
| 7 | Event-map colours had no key for "other" events. | Legend entries for every category drawn on the map. |

## Recommended next, by priority

### High
1. **Tell people when there is no imagery.** If a date falls in an orbit gap or has no data, the map goes blank with no explanation. Use Cesium's `tileLoadProgressEvent` to show "Loading tiles" and, once tiles finish loading empty, "No imagery for this date". Worldview added colored timeline bars to show [where each layer has data](https://www.earthdata.nasa.gov/news/feature-articles/layer-layer-nasa-worldview-continues-improve).
2. **Layer search and preview** in the panel once the registry grows past about 25 layers. This is Worldview's most-used [layer picker pattern](https://www.earthdata.nasa.gov/learn/articles/worldview-release-v3-5-0): keyword search, then a description and thumbnail before adding. The gallery thumbnails can be reused for this.
3. **Keyboard access to the globe.** The Cesium canvas can't be operated without a mouse. Arrow keys should pan, `+`/`-` should zoom, and a "Skip to controls" link should jump to the panel. Every map control [must be reachable by keyboard](https://mgifford.github.io/ACCESSIBILITY.md/examples/MAPS_ACCESSIBILITY_BEST_PRACTICES.html).
4. **Touch targets.** Panel checkboxes and radios are 15 px and pills are about 30 px tall. On phones, make whole rows at least 44×44 px, per the same map accessibility guidance.
5. **Hide controls for a full view.** Users of Windy's redesign [complained that panels covered the map](https://community.windy.com/topic/32400/i-do-not-like-the-new-interface/15). Add a desktop toggle (and the `H` key) that collapses the panel and legend.

### Medium
6. **Faster Events.** The 30-day EONET request can take 10 s or more. Fetch `status=open` first (small and fast), then load the full window in the background.
7. **Search places by name.** Today the panel offers presets and coordinates only. Add OpenStreetMap Nominatim geocoding, following its usage policy (rate limit, attribution).
8. **More comparison modes.** Add side-by-side and opacity fade alongside swipe. Swipe is hard to read for maps with large uniform areas.
9. **Readout history.** In the point readout, show a 30-day series for the clicked point. The Sri Lanka panel already fetches one.
10. **Native share on phones.** Use `navigator.share`, falling back to copying the link, which is what happens today.
11. **Link Observatory cards to the globe.** For example, "SST anomaly today" could open `#app/ocean?l=relief,ssta`.
12. **Hero lighting.** The hero shows the real sun position, so at some hours the visible side is in full night. Consider turning the globe to the daylit side on load, while keeping the terminator accurate.

### Low
13. **Absolute social-share URL.** `og:image` needs an absolute URL once the domain is known. Some crawlers ignore relative paths.
14. **Self-host the fonts.** Self-hosting Geist and Geist Mono removes the Google Fonts request, which helps both privacy and LCP.
15. **Lighter hero.** three.js is about 187 kB gzipped. The hero could paint the Blue Marble image first and switch to WebGL when the browser is idle.
16. **Installable app.** Add a web app manifest, so the existing icons make POLARIS installable.
17. **Local languages.** Sinhala and Tamil copy for the Sri Lanka region would reach the local audience it is built for.
18. **Pre-launch checks.** Run Lighthouse on the deployed site, and test the globe on a mid-range Android phone (Cesium cost).

## Sources consulted
- [NASA Earthdata: Worldview v3.5.0 release notes (layer picker search and preview)](https://www.earthdata.nasa.gov/learn/articles/worldview-release-v3-5-0)
- [NASA Earthdata: Layer by layer, Worldview continues to improve (timeline availability)](https://www.earthdata.nasa.gov/news/feature-articles/layer-layer-nasa-worldview-continues-improve)
- [NASA Earthdata: Embed Worldview to tell data-driven stories (minimal date widget)](https://earthdata.nasa.gov/learn/tutorials/embed-worldview-tell-data-driven-stories)
- [Maps accessibility best practices (keyboard, 44 px targets, text legends, aria-live)](https://mgifford.github.io/ACCESSIBILITY.md/examples/MAPS_ACCESSIBILITY_BEST_PRACTICES.html)
- [Engineered: UI patterns in existing web map widgets](https://engineered.at/articles/talk-ui-patterns-in-existing-web-map-widgets)
- [Earth Nullschool lets you watch the planet breathe (minimal controls, motion first)](https://webiano.digital/earth-nullschool-lets-you-watch-the-planet-breathe/)
- [Windy Community: feedback on the new interface (panels covering the map)](https://community.windy.com/topic/32400/i-do-not-like-the-new-interface/15)
