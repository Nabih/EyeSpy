/**
 * Label placement for the detection overlay. Labels sit above their box, but
 * when two boxes are near each other the labels would overlap — so each one is
 * nudged downward until it clears the labels already placed. Pure and
 * canvas-free (text width comes in via `measure`) so it can be unit-tested.
 */

export function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/**
 * @param {Array<{class:string, score:number, bbox:{x:number,y:number}}>} detections
 * @param {object} opts
 * @param {(text: string) => number} opts.measure  rendered text width
 * @param {number} opts.canvasWidth
 * @param {number} opts.canvasHeight
 * @param {number} opts.fontSize
 * @returns {Array<{label:string, x:number, y:number, width:number, height:number}>}
 */
export function layoutLabels(detections, { measure, canvasWidth, canvasHeight, fontSize }) {
  const padX = fontSize * 0.4
  const padY = fontSize * 0.25
  const height = fontSize + padY * 2
  const placed = []

  return detections.map((d) => {
    const label = `${d.class} ${(d.score * 100).toFixed(0)}%`
    const width = measure(label) + padX * 2

    const x = Math.min(Math.max(d.bbox.x, 0), Math.max(0, canvasWidth - width))

    let y = d.bbox.y - height
    if (y < 0) y = d.bbox.y

    let guard = 0
    while (guard++ < 60 && placed.some((p) => overlaps({ x, y, width, height }, p))) {
      y += height + 2
      if (y + height > canvasHeight) break
    }

    const box = { x, y, width, height }
    placed.push(box)
    return { label, ...box, padX, padY }
  })
}
