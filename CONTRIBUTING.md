# Contributing to POLARIS

## Adding a layer

1. Find the dataset's source in `src/data/sources.ts`, or add one (name, provider, URL, licence).
2. Add an entry to `LAYERS` in `src/data/layers.ts`:

```ts
{ id: 'snow', title: 'Snow cover', group: 'land', src: 'gibs', kind: 'gibs',
  ref: 'MODIS_Terra_NDSI_Snow_Cover', ext: 'png', max: 8, overlay: true,
  from: '2000-02-24', step: 'P1D', legend: LEG('MODIS_NDSI_Snow_Cover'),
  res: '500 m', period: 'Daily', method: 'MODIS normalised difference snow index.' }
```

- **GIBS layers:** take `ref`, the tile matrix set level (`max`, from `GoogleMapsCompatible_Level<max>`), the format and the
  first date from `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml`. The legend file name is in
  the same document (`legends/<name>_H.svg`). Do not guess these; a wrong level returns HTTP 400 for every tile.
- **Other tile servers:** `kind: 'xyz'` with a `{z}/{x}/{y}` template, or extend `tileUrl()` for a new protocol.
- `overlay: false` makes it a base layer (radio button). `from`/`step` make it temporal (date picker, Monitor).

That is all: Explorer, Ocean, Monitor, legends, the Sources section and the terminal's `layers` command read the registry.

## Adding a region

Add an object to `REGIONS` in `src/data/regions.ts`: camera, offshore sample points (Open-Meteo Marine only answers over
water), inland points, relevant layers and "where to look" items with dates. Open it with `#app/region?r=<id>`.

## Rules

- No unlabelled numbers. A value is either fetched live (and its source shown) or a cited, dated snapshot.
- Event and chart colours come from validated palettes (see comments in `views/Events.tsx`, `components/Chart.tsx`). Add a
  category to the end of the fixed order; do not cycle colours.
- `npm test` and `npm run build` pass before a PR.
