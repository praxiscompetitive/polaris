# Contributing to POLARIS

Thanks for helping. POLARIS is open source (MIT) and welcomes contributions of every size: a typo, a new layer, a whole region report. By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

```bash
git clone https://github.com/<you>/polaris.git   # your fork
cd polaris
npm install
npm run dev
```

Before opening a pull request, both of these must pass:

```bash
npm test
npm run build
```

CI runs the same two commands.

## Ways to contribute

- **Report a bug or suggest an idea**: open an issue using a template. Include the link from **Share view** when it
  concerns the map.
- **Add a layer or region**: the easiest first contribution, and mostly data. See below.
- **Fix something**: issues labelled `good first issue` are a gentle start. Comment before starting large work so we
  can agree on the approach.

## Pull requests

1. Fork, then branch from `main`: `git checkout -b feat/short-name`.
2. Keep each PR to one change. Small PRs are reviewed faster.
3. Describe what changed and why; add before/after screenshots for anything visual (desktop and phone).
4. Commit messages: a short imperative summary (`Add snow cover layer`), details in the body if needed.
5. Make sure `npm test` and `npm run build` pass.

A maintainer will review. We may ask for changes; that is normal and not a judgement of you.

## Adding a layer

1. Find the dataset's source in `src/data/sources.ts`, or add one (name, provider, URL, licence).
2. Add an entry to `LAYERS` in `src/data/layers.ts`:

```ts
{ id: 'snow', title: 'Snow cover', group: 'land', src: 'gibs', kind: 'gibs',
  ref: 'MODIS_Terra_NDSI_Snow_Cover', ext: 'png', max: 8, overlay: true,
  from: '2000-02-24', step: 'P1D', legend: LEG('MODIS_NDSI_Snow_Cover'),
  res: '500 m', period: 'Daily', method: 'MODIS normalised difference snow index.' }
```

- **GIBS layers:** take `ref`, the tile matrix set level (`max`, from `GoogleMapsCompatible_Level<max>`), the format and the first date from `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml`. The legend file name is in the same document (`legends/<name>_H.svg`). Do not guess these; a wrong level returns HTTP 400 for every
  tile.
- **Other tile servers:** `kind: 'xyz'` with a `{z}/{x}/{y}` template, or extend `tileUrl()` for a new protocol.
- `overlay: false` makes it a base layer (radio button). `from`/`step` make it temporal (date picker, Monitor).

That is all: Explorer, Ocean, Monitor, legends and the Sources page read the registry.

## Adding a region

Add an object to `REGIONS` in `src/data/regions.ts`: camera, offshore sample points (Open-Meteo Marine only answers over water), inland points, relevant layers and "where to look" items with dates. Open it with `#app/region?r=<id>`.

## Code guidelines

- TypeScript, React function components, plain CSS. No new dependency for something a few lines or the platform can do.
- **No unlabelled numbers.** A value is either fetched live (with its source shown) or a cited, dated snapshot.
- Event and chart colours come from validated palettes (see comments in `views/Events.tsx` and `components/Chart.tsx`).
  Add a category to the end of the fixed order; do not cycle colours.
- Desktop pages must fit one screen without scrolling. `Page` scales content down as a safety net, so design to fit
  rather than rely on it. Phone pages may scroll. Check both when you change layout.
- Use the colour and spacing tokens in `src/styles.css` rather than literal values. The site is light and the map is
  dark; the tokens switch under `.mission`.
- Respect `prefers-reduced-motion`, keep controls keyboard reachable, give images and icons text alternatives, and keep
  touch targets at least 44 px on phones.
- Add or update a test in `src/lib/*.test.ts` when you change parsing or data helpers.

## Reporting security issues

Do not open a public issue. See [SECURITY.md](SECURITY.md).

## Licence

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
