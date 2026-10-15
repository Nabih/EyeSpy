import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const models = new Map()

async function load(backend) {
  if (!models.has(backend)) {
    models.set(
      backend,
      (async () => {
        await tf.setBackend(backend)
        await tf.ready()
        return cocoSsd.load({ base: 'mobilenet_v2' })
      })(),
    )
  }
  return models.get(backend)
}

export function preload(options = {}) {
  return load(options.backend || 'cpu')
}

export async function detect(image, { backend = 'cpu', maxResults = 100, minScore = 0.05 } = {}) {
  const model = await load(backend)

  const start = performance.now()
  const predictions = await model.detect(image, maxResults, minScore)
  const elapsed = performance.now() - start

  return {
    elapsed,
    detections: predictions.map((p) => ({
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
