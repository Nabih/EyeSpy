export const YOLO_INPUT_SIZE = 640

/**
 * Compute the letterbox transform used to fit an image into a square input.
 */
export function letterboxTransform(imgW, imgH, size = YOLO_INPUT_SIZE) {
  const scale = Math.min(size / imgW, size / imgH)
  const newW = Math.round(imgW * scale)
  const newH = Math.round(imgH * scale)
  const padX = (size - newW) / 2
  const padY = (size - newH) / 2
  return { scale, newW, newH, padX, padY, size }
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.width * a.height + b.width * b.height - inter
  return union <= 0 ? 0 : inter / union
}

/**
 * Decode a raw YOLOv8 output tensor ([1, 4 + numClasses, numAnchors], box format
 * cx,cy,w,h with no objectness) into detections in original-image coordinates.
 * Pure function so it can be unit-tested outside the browser.
 */
export function decodeYolo(
  data,
  {
    classNames,
    numAnchors = 8400,
    confThreshold = 0.25,
    iouThreshold = 0.45,
    scale = 1,
    padX = 0,
    padY = 0,
    imgW,
    imgH,
    maxDetections = 100,
  } = {},
) {
  const numClasses = classNames.length
  const boxes = []

  for (let i = 0; i < numAnchors; i++) {
    let bestScore = 0
    let bestClass = -1
    for (let c = 0; c < numClasses; c++) {
      const s = data[(4 + c) * numAnchors + i]
      if (s > bestScore) {
        bestScore = s
        bestClass = c
      }
    }
    if (bestScore < confThreshold) continue

    const cx = data[i]
    const cy = data[numAnchors + i]
    const w = data[2 * numAnchors + i]
    const h = data[3 * numAnchors + i]

    const x1 = Math.max(0, Math.min((cx - w / 2 - padX) / scale, imgW))
    const y1 = Math.max(0, Math.min((cy - h / 2 - padY) / scale, imgH))
    const x2 = Math.max(0, Math.min((cx + w / 2 - padX) / scale, imgW))
    const y2 = Math.max(0, Math.min((cy + h / 2 - padY) / scale, imgH))

    boxes.push({
      classId: bestClass,
      score: bestScore,
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    })
  }

  boxes.sort((a, b) => b.score - a.score)

  const kept = []
  const perClass = new Map()
  for (const box of boxes) {
    const list = perClass.get(box.classId) || []
    let suppressed = false
    for (const k of list) {
      if (iou(box, k) > iouThreshold) {
        suppressed = true
        break
      }
    }
    if (suppressed) continue
    list.push(box)
    perClass.set(box.classId, list)
    kept.push(box)
    if (kept.length >= maxDetections) break
  }

  return kept.map((b) => ({
    class: classNames[b.classId],
    score: b.score,
    bbox: { x: b.x, y: b.y, width: b.width, height: b.height },
  }))
}
