# The Barzan Atlas

An interactive engraved ink-on-paper 3D map of the Kurdish village of Barzan,
drawn from real survey data (OpenStreetMap footprints/roads, NASA SRTM relief,
and satellite-derived vegetation). Single-file three.js app.

- **Live map:** published via GitHub Pages (see the repo's Pages URL).
- **`index.html`** — the map. **`data/`** — terrain, scene, and vegetation grids.
  **`vendor/`** — vendored three.js. **`ci/`** — headless cloud-render.
- Press **1–4** for the four review framings, **0** to reset.

Every push cloud-renders the 3D map (headless software WebGL) into screenshots
(Actions → artifact `barzan-renders`) and republishes the live site — no local
GPU needed.
