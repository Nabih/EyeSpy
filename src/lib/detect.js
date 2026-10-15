import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

let model = null
let loadedBackend = null

export const AVAILABLE_BACKENDS = ['cpu', 'webgl']

/**
 * Load (or reuse) the COCO-SSD model on the requested backend.
 * Defaults to the CPU backend so no GPU is required.
 */
export async function initDetector(backend = 'cpu') {
  if (model && loadedBackend === backend) {
    return { model, backend: loadedBackend }
  }

  await tf.setBackend(backend)
  await tf.ready()

  model = await cocoSsd.load({ base: 'mobilenet_v2' })
  loadedBackend = tf.getBackend()

  return { model, backend: loadedBackend }
}

/**
 * Run detection on an HTMLImageElement / HTMLCanvasElement / tensor.
 * Uses a very low min-score so the UI can filter by the confidence slider
 * without re-running the model.
 */
export async function runDetection(image, { maxResults = 100, minConfidence = 0.05 } = {}) {
  if (!model) throw new Error('Model has not been loaded yet')

  const start = performance.now()
  const raw = await model.detect(image, maxResults, minConfidence)
  const elapsed = performance.now() - start

  return {
    elapsed,
    detections: raw.map((p) => ({
      class: p.class,
      score: p.score,
      bbox: {
        x: p.bbox[0],
        y: p.bbox[1],
        width: p.bbox[2],
        height: p.bbox[3],
      },
    })),
  }
}

export function getBackend() {
  return tf.getBackend()
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
