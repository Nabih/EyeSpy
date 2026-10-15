import { COCO_CLASSES } from '../cocoClasses.js'

/**
 * Registry of selectable YOLO models. Every entry shows up in the Backend
 * dropdown, and its `labels` drive the Classes filter automatically.
 *
 * To add your own subjects:
 *   1. Train a YOLOv8 / YOLO11 detection model and export it to ONNX with a
 *      fixed square input, e.g.
 *        yolo export model=best.pt format=onnx imgsz=640 opset=12
 *      The output tensor must be [1, 4 + numClasses, numAnchors] (the standard
 *      Ultralytics detection export; no objectness channel).
 *   2. Copy the .onnx file into `public/models/`.
 *   3. Add an entry below with the file `url` and its `labels` array (one label
 *      per class, in the same order used at training time).
 *
 * That's it — no other code changes. `url` is relative to the site root.
 */
export const YOLO_MODELS = [
  {
    id: 'yolov8n',
    label: 'YOLOv8n · COCO',
    url: 'models/yolov8n.onnx',
    inputSize: 640,
    labels: COCO_CLASSES,
  },
]

/** Absolute, Vite-base-aware URL for a model's weights. */
export function resolveModelUrl(model) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${model.url.replace(/^\/+/, '')}`
}

/**
 * Anchor count for a square YOLOv8/11 input: (s/8)^2 + (s/16)^2 + (s/32)^2.
 * 640 -> 8400, 320 -> 2100, 1280 -> 33600.
 */
export function numAnchorsFor(inputSize) {
  return (inputSize / 8) ** 2 + (inputSize / 16) ** 2 + (inputSize / 32) ** 2
}

/** Anchor count for a model, honoring an explicit override if provided. */
export function numAnchorsOf(model) {
  return model.numAnchors ?? numAnchorsFor(model.inputSize)
}

// Dev-time sanity check for the registry.
if (import.meta.env?.DEV) {
  const ids = YOLO_MODELS.map((m) => m.id)
  if (new Set(ids).size !== ids.length) {
    console.error('[yoloModels] duplicate model id', ids)
  }
  for (const m of YOLO_MODELS) {
    if (!m.url || !m.inputSize || !Array.isArray(m.labels) || m.labels.length === 0) {
      console.error('[yoloModels] invalid model entry', m)
    }
  }
}
