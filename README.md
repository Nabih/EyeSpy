# EyeSpy

Object detection in the browser. Drop in an image and EyeSpy draws boxes around
the objects it finds — all processing runs locally on your machine, with no
uploads and no GPU required.

EyeSpy is a React port of a Node.js `detect.js` CLI, and ships with three
selectable detection backends:

| Backend | Model | Notes |
| --- | --- | --- |
| **COCO-SSD · CPU** | TensorFlow.js COCO-SSD (MobileNet v2) | Default. 80 classes, pure CPU. |
| **COCO-SSD · WebGL** | Same model, GPU backend | Faster where WebGL is available. |
| **YOLOv8 · ONNX/WASM** | YOLOv8n (ONNX Runtime Web) | 80 classes, runs on the WASM execution provider. |

## Features

- Runs entirely in the browser — images never leave your device
- CPU by default; WebGL and ONNX/WASM options where you want them
- Drag & drop or file picker, plus a bundled sample image
- Bounding boxes drawn on a canvas with per-class colours
- Live confidence-threshold and max-results controls
- Per-image summary with detection counts by class, and inference time

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the printed URL (usually http://localhost:5173). Click **Try a sample
image**, or drop in your own.

### Production build

```bash
npm run build
npm run preview
```

## How it works

- `src/lib/detect.js` is the facade: it maps a backend id to a detector module
  and exposes `runDetection(id, image, options)`. Each backend is imported
  dynamically, so TensorFlow.js and onnxruntime-web are code-split and only
  downloaded when that backend is first used.
- `src/lib/detectors/coco.js` — TensorFlow.js COCO-SSD.
- `src/lib/detectors/yolo.js` — YOLOv8n via onnxruntime-web: letterbox
  preprocessing, raw-tensor decoding and class-wise NMS (`yoloPost.js`).
- `src/App.jsx` loads the image into an `HTMLImageElement`, runs detection, and
  keeps raw predictions so the confidence slider filters instantly.
- `src/components/DetectionCanvas.jsx` renders the image and boxes;
  `src/components/ResultsPanel.jsx` lists detections and the summary.

### Model & WASM hosting

- The YOLOv8n weights live in `public/models/yolov8n.onnx` so the ONNX backend
  works without a remote download.
- onnxruntime-web is imported via its `/wasm` subpath, so Vite bundles the
  matching WASM binary as an asset and rewrites the runtime URL — no CDN and no
  manual WASM hosting required.

## Notes

- On first use of the COCO-SSD backend its weights are downloaded from a CDN and
  cached by the browser.
- The `webgl` backend needs a WebGL-capable browser; `cpu` works everywhere.
- The ONNX/WASM backend needs SIMD (available in all current evergreen browsers).

## Credits

Built with [React](https://react.dev), [Vite](https://vite.dev),
[TensorFlow.js](https://www.tensorflow.org/js) / COCO-SSD, and
[ONNX Runtime Web](https://onnxruntime.ai) / YOLOv8.
