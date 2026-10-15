/**
 * Detection facade. Each backend lives in its own module so the heavy
 * dependencies (TensorFlow.js, transformers.js, onnxruntime-web) are
 * code-split and only fetched when the backend is first used.
 */

export const BACKENDS = [
  {
    id: 'coco-cpu',
    label: 'COCO-SSD · CPU',
    family: 'coco',
    options: { backend: 'cpu' },
    zeroShot: false,
    needsLabels: false,
  },
  {
    id: 'coco-webgl',
    label: 'COCO-SSD · WebGL',
    family: 'coco',
    options: { backend: 'webgl' },
    zeroShot: false,
    needsLabels: false,
  },
  {
    id: 'zeroshot',
    label: 'OWLv2 · zero-shot',
    family: 'zeroshot',
    zeroShot: true,
    needsLabels: true,
  },
  {
    id: 'yolo',
    label: 'YOLOv8 · ONNX/WASM',
    family: 'yolo',
    options: {},
    zeroShot: false,
    needsLabels: false,
  },
]

const LOADERS = {
  coco: () => import('./detectors/coco.js'),
  zeroshot: () => import('./detectors/zeroshot.js'),
  yolo: () => import('./detectors/yolo.js'),
}

export function getBackend(id) {
  return BACKENDS.find((b) => b.id === id) || BACKENDS[0]
}

/**
 * Warm up a backend's model (used to show a loading indicator).
 */
export async function preload(id, onProgress) {
  const info = getBackend(id)
  const mod = await LOADERS[info.family]()
  if (mod.preload) return mod.preload({ ...info.options, onProgress })
}

/**
 * Run detection with the selected backend.
 * Returns { detections: [{ class, score, bbox }], elapsed }.
 */
export async function runDetection(id, image, options = {}) {
  const info = getBackend(id)
  const mod = await LOADERS[info.family]()
  return mod.detect(image, { ...info.options, ...options })
}

const PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
  '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
  '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
]

const colorCache = new Map()

export function colorForClass(name) {
  if (!colorCache.has(name)) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    }
    colorCache.set(name, PALETTE[hash % PALETTE.length])
  }
  return colorCache.get(name)
}
