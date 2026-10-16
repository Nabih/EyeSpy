# EyeSpy — Handoff / Working Notes

Fast-start context for future sessions. Read this first, then `git log --oneline -10`.

## What this is

- **EyeSpy** — a browser-only object-detection app (React + Vite). Images never leave the device.
- Originally a port of a Node CLI at `../Identify/detect.js` (a sibling project; unrelated to this app's runtime).
- Local path: `/Users/nabih/Desktop/CB/HLS/EyeSpy`
- Repo: https://github.com/Nabih/EyeSpy (public, default branch `main`)
- Deployed nowhere by default; run locally.

> Note: `/Users/nabih/Desktop/CB/HLS/CLAUDE.md` belongs to a *different* project (HLS downloader). Ignore it for EyeSpy work.

## Workflow rules (follow these)

1. **Pull before branching.** Always `git checkout main && git pull --ff-only` before starting new work. The user has repeatedly asked for this.
2. **One feature = one branch = one PR, based on `main`.** Do not stack PRs (PR #3 was stacked and merged into the wrong branch — avoid).
3. **Never commit to `main` directly.** Branch → commit → push → `gh pr create --base main`.
4. **Rebase + force-push the feature branch** to resolve conflicts after `main` moves (`git rebase origin/main`, then `git push --force-with-lease`). Force-pushing a *feature* branch is expected here; `main` was force-pushed once historically (already done).
5. **Commit only when asked / as part of an approved task.** This repo's flow assumes a PR per change.
6. Keep `npm run lint` and `npm run build` clean before committing.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # http://localhost:4173
npm run lint       # oxlint (must stay clean)
```

Requirements: Node 18+ (dev machine uses Node 24). `ffmpeg` not needed here.

## Architecture / file map

- `src/App.jsx` — orchestrator. Holds `source` (image|camera), `backend`, `imageEl`, `result`, `minConfidence`, `maxResults`, `selectedClasses`, `accel`, `webgpuAvailable`, `live`. Owns the settings panel, class filter, results, export. Detection effect + `busy` logic live here.
- `src/lib/detect.js` — **facade**. `BACKENDS` (one `coco` + one per YOLO model), `ACCELERATION`/`accelerationFor(id)` (per-family accel choices), `getBackend`, `classesForBackend`, `categoriesForBackend`, `preload`, `runDetection(id, image, options)`, `colorForClass`. Backends are dynamically imported (code-split).
- `src/lib/detectors/coco.js` — TensorFlow.js COCO-SSD. Option `accel` = tf.js backend (`cpu`/`webgl`); falls back to `cpu` if `tf.setBackend` returns false.
- `src/lib/detectors/yolo.js` — YOLO via onnxruntime-web. Option `ep` = execution provider (`wasm`/`webgpu`); sessions cached per `url|ep`; the `onnxruntime-web/webgpu` build is imported **lazily** (literal `import()` so Vite can analyze it).
- `src/lib/detectors/yoloModels.js` — `YOLO_MODELS` registry (id/label/url/inputSize/labels), `numAnchorsFor`/`numAnchorsOf`, `resolveModelUrl`. Adding an entry = a new backend.
- `src/lib/detectors/yoloPost.js` — `letterboxTransform`, `decodeYolo` (pure).
- `src/lib/cocoClasses.js` — `COCO_CLASSES` (80) + `COCO_CATEGORIES` (10 groups).
- `src/lib/capabilities.js` — `detectWebGPU()`: requires `navigator.gpu`, a real adapter, and **rejects `isFallbackAdapter`** (software adapters are slower than WASM and hung the page in tests).
- `src/lib/canvas.js` — `imageToCanvas` accepts image/canvas/video (`videoWidth`).
- `src/lib/draw.js` — `drawDetections` (boxes + nudged labels), shared by on-screen canvas and export.
- `src/lib/labelLayout.js` — `layoutLabels`, `overlaps`.
- `src/lib/export.js` — `renderAnnotated`, `canvasToBlob`, `detectionsToJSON`, `detectionsToCSV`, `downloadBlob`, `baseName`, `imageToBytes`.
- `src/lib/dataset.js` — `yoloLines`, `classesTxt`, `dataYaml`, `imageExtension`, `buildDatasetFiles` (auto-labeling).
- `src/lib/zip.js` — dependency-free STORE-mode ZIP writer (`crc32`, `createZip`).
- `src/components/` — `ImageUploader`, `DetectionCanvas`, `LiveStage`, `ResultsPanel`, `ClassFilter`, `ExportPanel`.
- `public/models/yolov8n.onnx` (committed, ~12.8 MB), `public/sample-cat.jpg`.
- `vite.config.js` — react plugin, `optimizeDeps.exclude: ['onnxruntime-web']`, `chunkSizeWarningLimit: 2000`.

## Key conventions

- **No comments unless they add real value**; no emojis. Keep lint clean.
- Backend ids: `coco`, `yolo:<modelId>`. Accel values: COCO `cpu`/`webgl`; YOLO `auto`/`wasm`/`webgpu`.
- `runDetection` receives a per-family options object: `{ accel }` for COCO, `{ ep }` for YOLO (App builds `runOptions`).
- Class lists are canonical per backend (COCO 80 in order) — dataset label indices rely on this.
- Exports operate on the **filtered** detections (confidence + class filter).

## Testing playbook

There is **no committed test suite** — tests are written as temp scripts, run, then deleted. Recreate as needed.

- **Node unit tests** for pure modules only (`dataset.js`, `zip.js`, `yoloPost.js`, `capabilities.js` logic). These have no DOM at import time, so Node can import them with a relative `.js` path. The app's other modules use extensionless imports and **cannot** be imported directly in Node.
- **Browser tests** use `puppeteer-core` with **system Chrome**:
  - Chrome path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - `puppeteer-core` must live in the **project dir** (deps resolution; `/tmp` fails).
  - Headless args: `--no-sandbox --use-gl=swiftshader`. For webcam add `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`.
  - **Do not** add `--enable-unsafe-webgpu` (it exposes a software adapter; combined with fake-media flags it made YOLO-on-WebGPU hang the page). Default to the WASM/CPU path for determinism.
  - Wait for readiness: `.app__badges .backend:last-child` text === `'ready'` (or `'live'` in camera mode).
  - The settings panel only renders **after an image is loaded** (or in camera mode) — load the sample first before querying `select`s.
  - `page.select('select', value)` picks the first `<select>` containing that option value; backend values are `coco`/`yolo:...`, accel values `cpu`/`webgl`/`auto`/`wasm`/`webgpu`.
  - **Downloads**: headless Chrome blocks multiple automatic downloads. Intercept instead:
    ```js
    await page.evaluateOnNewDocument(() => {
      window.__blobs = []
      const orig = URL.createObjectURL.bind(URL)
      URL.createObjectURL = (b) => { window.__blobs.push(b); return orig(b) }
      HTMLAnchorElement.prototype.click = function () {}
    })
    ```
    then read `window.__blobs.at(-1)` via `.text()` / `.arrayBuffer()`.
  - Dev-only module access: `page.evaluate(() => import('/src/lib/foo.js'))` works against the Vite dev server (5173), not the preview build.
  - Run tests against **both** dev (5173) and preview (4173).
- Start/stop dev server: `lsof -ti tcp:5173 | xargs kill; (npm run dev >/tmp/eyespy-dev.log 2>&1 &)`.

## Current state

- `main` HEAD: `62894c6` (merge of PR #11). No open PRs.
- Merged features so far:
  - #1 selectable backends (YOLOv8/ONNX-WASM)
  - #2 COCO class filter (categories + search)
  - #4 loading overlay
  - #5 YOLO model registry (custom subjects)
  - #6 label overlap fix
  - #7 export (annotated PNG / JSON / CSV)
  - #8 WebGPU execution provider
  - #9 live camera mode + FPS
  - #10 auto-labeling / YOLO dataset export
  - #11 backend + acceleration unification (single `COCO-SSD` backend, family-aware Acceleration dropdown)
- Merged branches safe to delete locally/remotely: `feat/detection-backends`, `feat/class-filter`, `feat/custom-models`, `fix/loading-overlay`, `fix/label-overlap`, `feat/export`, `feat/webgpu`, `feat/webcam`, `feat/autolabel`, `feat/accel-unify`.

## Roadmap ideas (not started)

- COCO-SSD WebGPU backend (needs `@tensorflow/tfjs-backend-webgpu` dep).
- Batch auto-labeling (multi-image queue → one dataset zip).
- Face/region redaction at export time (privacy).
- Persistent settings (backend/accel/confidence) across sessions.
- Sample images / drag-drop folders.

## Known gotchas

- Headless Chrome here exposes `navigator.gpu` but returns **no** adapter (and a software adapter when `--enable-unsafe-webgpu` is set). The real hardware WebGPU path needs a **manual** check in a WebGPU-capable browser.
- Vite dev cannot analyze a dynamic `import()` with a computed specifier — use literal specifiers in branches.
- macOS screenshot filenames use a narrow no-break space before AM/PM; match them with a glob (`~/Desktop/Screenshot*PM.png`), not a typed path.
- TF.js switching backends after a model load is unsafe — `coco.js` caches a model per accel and reloads per backend.
