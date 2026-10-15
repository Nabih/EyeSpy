import { pipeline, env, RawImage } from '@huggingface/transformers'
import { imageToCanvas } from '../canvas.js'

const ORT_BASE = `${import.meta.env.BASE_URL}ort/`

env.allowLocalModels = false
// transformers.js ships an onnxruntime-web "webgpu" build whose WASM binary must
// match; it also defaults to a CDN path that doesn't exist for our pinned
// version, so we point it at our self-hosted jsep build.
env.backends.onnx.wasm.wasmPaths = {
  mjs: `${ORT_BASE}ort-wasm-simd-threaded.jsep.mjs`,
  wasm: `${ORT_BASE}ort-wasm-simd-threaded.jsep.wasm`,
}
env.backends.onnx.wasm.numThreads = 1

// OWLv2 — a zero-shot detector driven by text queries. (OWL-ViT's ONNX export
// produces degenerate scores on the WASM execution provider; OWLv2 does not.)
const MODEL_ID = 'Xenova/owlv2-base-patch16'

function toRgbRawImage(image) {
  const canvas = imageToCanvas(image)
  const { data } = canvas
    .getContext('2d')
    .getImageData(0, 0, canvas.width, canvas.height)
  const rgb = new Uint8Array((data.length / 4) * 3)
  for (let i = 0, j = 0; i < data.length; i += 4) {
    rgb[j++] = data[i]
    rgb[j++] = data[i + 1]
    rgb[j++] = data[i + 2]
  }
  return new RawImage(rgb, canvas.width, canvas.height, 3)
}

let detectorPromise = null

export function preload({ onProgress } = {}) {
  if (!detectorPromise) {
    detectorPromise = pipeline('zero-shot-object-detection', MODEL_ID, {
      dtype: 'q8',
      progress_callback: onProgress,
    })
  }
  return detectorPromise
}

export async function detect(image, { labels = [], onProgress } = {}) {
  if (!labels.length) return { elapsed: 0, detections: [] }

  const detector = await preload({ onProgress })
  const raw = toRgbRawImage(image)

  const start = performance.now()
  const output = await detector(raw, labels, { threshold: 0.08, percentage: true })
  const elapsed = performance.now() - start

  const width = raw.width
  const height = raw.height

  return {
    elapsed,
    detections: output.map((o) => ({
      class: o.label,
      score: o.score,
      bbox: {
        x: o.box.xmin * width,
        y: o.box.ymin * height,
        width: (o.box.xmax - o.box.xmin) * width,
        height: (o.box.ymax - o.box.ymin) * height,
      },
    })),
  }
}
