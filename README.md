# EyeSpy

Object detection in the browser. Drop in an image and EyeSpy draws boxes around
the objects it finds — all processing runs locally on your machine, with no
uploads and no GPU required.

EyeSpy is a React port of a Node.js `detect.js` CLI, and ships with four
selectable detection backends:

| Backend | Model | Notes |
| --- | --- | --- |
| **COCO-SSD · CPU** | TensorFlow.js COCO-SSD (MobileNet v2) | Default. 80 classes, pure CPU. |
| **COCO-SSD · WebGL** | Same model, GPU backend | Faster where WebGL is available. |
| **YOLOv8 · ONNX/WASM** | YOLOv8n (ONNX Runtime Web) | 80 classes, runs on the WASM execution provider. |
| **OWLv2 · zero-shot** | `Xenova/owlv2-base-patch16` (transformers.js) | Detect **anything** by typing labels — no fixed classes. |

## Features

- Runs entirely in the browser — images never leave your device
- CPU by default; WebGL and ONNX/WASM options where you want them
- Zero-shot detection: describe what to look for in plain text
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
  dynamically, so TensorFlow.js, transformers.js and onnxruntime-web are
  code-split and only downloaded when that backend is first used.
- `src/lib/detectors/coco.js` — TensorFlow.js COCO-SSD.
- `src/lib/detectors/yolo.js` — YOLOv8n via onnxruntime-web: letterbox
  preprocessing, raw-tensor decoding and class-wise NMS (`yoloPost.js`).
- `src/lib/detectors/zeroshot.js` — OWLv2 zero-shot detection via transformers.js.
- `src/App.jsx` loads the image into an `HTMLImageElement`, runs detection, and
  keeps raw predictions so the confidence slider filters instantly.
- `src/components/DetectionCanvas.jsx` renders the image and boxes;
  `src/components/ResultsPanel.jsx` lists detections and the summary.

### Model & WASM hosting

- The YOLOv8n weights live in `public/models/yolov8n.onnx` so the ONNX backend
  works without a remote download.
- onnxruntime-web needs its WASM binaries at runtime. Rather than commit ~42 MB
  or rely on a CDN that doesn't carry the pinned ORT version, a small Vite plugin
  (`vite.config.js`) serves `node_modules/onnxruntime-web/dist` at `/ort` in dev
  and copies the required files into `dist/ort` at build time.
- The zero-shot and YOLO backends use **different** ORT WASM builds, so both the
  `jsep` and plain binaries are hosted. The transformers.js/OWLv2 path points at
  the `jsep` build, whose WASM execution provider computes correct scores (the
  older OWL-ViT export produces degenerate scores there).
- OWLv2 weights (~150 MB quantized) are fetched from the Hugging Face CDN on
  first use and cached by the browser.

## Notes

- On first use of a backend its weights are downloaded from a CDN and cached.
- The `webgl` backend needs a WebGL-capable browser; `cpu` works everywhere.
- The ONNX/WASM backend needs SIMD (available in all current evergreen browsers).

## Credits

Built with [React](https://react.dev), [Vite](https://vite.dev),
[TensorFlow.js](https://www.tensorflow.org/js) / COCO-SSD,
[transformers.js](https://github.com/huggingface/transformers.js) / OWLv2, and
[ONNX Runtime Web](https://onnxruntime.ai) / YOLOv8.
