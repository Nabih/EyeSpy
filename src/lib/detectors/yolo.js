import * as ort from 'onnxruntime-web/wasm'
import { imageToCanvas } from '../canvas.js'
import { letterboxTransform, decodeYolo } from './yoloPost.js'
import { YOLO_MODELS, resolveModelUrl, numAnchorsOf } from './yoloModels.js'

ort.env.wasm.numThreads = 1

const sessions = new Map()

function getSession(model) {
  const url = resolveModelUrl(model)
  if (!sessions.has(url)) {
    sessions.set(
      url,
      ort.InferenceSession.create(url, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      }),
    )
  }
  return sessions.get(url)
}

export function preload({ model = YOLO_MODELS[0] } = {}) {
  return getSession(model)
}

function preprocess(image, size) {
  const source = imageToCanvas(image)
  const t = letterboxTransform(source.width, source.height, size)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = 'rgb(114, 114, 114)'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(source, t.padX, t.padY, t.newW, t.newH)

  const { data } = ctx.getImageData(0, 0, size, size)
  const area = size * size
  const tensor = new Float32Array(3 * area)
  for (let i = 0; i < area; i++) {
    tensor[i] = data[i * 4] / 255
    tensor[area + i] = data[i * 4 + 1] / 255
    tensor[2 * area + i] = data[i * 4 + 2] / 255
  }

  return {
    tensor,
    srcWidth: source.width,
    srcHeight: source.height,
    scale: t.scale,
    padX: t.padX,
    padY: t.padY,
  }
}

export async function detect(
  image,
  { model = YOLO_MODELS[0], confThreshold = 0.25, iouThreshold = 0.45, maxDetections = 100 } = {},
) {
  const session = await getSession(model)
  const size = model.inputSize
  const prep = preprocess(image, size)

  const feeds = {
    images: new ort.Tensor('float32', prep.tensor, [1, 3, size, size]),
  }

  const start = performance.now()
  const results = await session.run(feeds)
  const elapsed = performance.now() - start

  const output = results[session.outputNames[0]].data

  const detections = decodeYolo(output, {
    classNames: model.labels,
    numAnchors: numAnchorsOf(model),
    confThreshold,
    iouThreshold,
    scale: prep.scale,
    padX: prep.padX,
    padY: prep.padY,
    imgW: prep.srcWidth,
    imgH: prep.srcHeight,
    maxDetections,
  })

  return { elapsed, detections }
}
