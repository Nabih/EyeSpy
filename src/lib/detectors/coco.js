import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

const models = new Map()

async function load(accel) {
  if (!models.has(accel)) {
    models.set(
      accel,
      (async () => {
        const ok = await tf.setBackend(accel)
        if (!ok) await tf.setBackend('cpu')
        await tf.ready()
        return cocoSsd.load({ base: 'mobilenet_v2' })
      })(),
    )
  }
  return models.get(accel)
}

export function preload(options = {}) {
  return load(options.accel || 'cpu')
}

export async function detect(image, { accel = 'cpu', maxResults = 100, minScore = 0.05 } = {}) {
  const model = await load(accel)

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
