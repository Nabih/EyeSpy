# EyeSpy

CPU object detection in the browser. Drop in an image and EyeSpy draws boxes
around the objects it recognises — all processing runs locally on your machine
with **TensorFlow.js**, so no GPU and no uploads are required.

This is a React port of the original Node.js `detect.js` CLI. It uses the same
**COCO-SSD** model (MobileNet v2 backbone, 80 object classes) and defaults to the
**CPU** backend.

## Features

- Runs entirely in the browser — images never leave your device
- CPU backend by default (optional WebGL backend for speed)
- Drag & drop or file picker, plus a bundled sample image
- Bounding boxes drawn on a canvas with per-class colours
- Live confidence-threshold and max-results controls
- Per-image summary with detection counts by class and inference time

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the printed URL (usually http://localhost:5173).

### Production build

```bash
npm run build
npm run preview
```

## How it works

1. `src/lib/detect.js` loads COCO-SSD on the selected backend and exposes
   `runDetection()`, which runs inference on an `<img>` element and normalises
   the prediction boxes.
2. `src/App.jsx` loads the chosen image into an `HTMLImageElement`, runs
   detection, and keeps the raw predictions so the confidence slider can filter
   them instantly without re-running the model.
3. `src/components/DetectionCanvas.jsx` renders the image and overlays the
   bounding boxes.
4. `src/components/ResultsPanel.jsx` lists detections and the per-class summary.

## Notes

- On first load the model weights (~ a few MB) are fetched from a CDN and cached
  by the browser.
- The `webgl` backend needs a GPU/WebGL-capable browser; `cpu` works everywhere.

## Credits

Built with [React](https://react.dev), [Vite](https://vite.dev), and
[TensorFlow.js](https://www.tensorflow.org/js) / COCO-SSD.
