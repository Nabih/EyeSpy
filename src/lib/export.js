import { drawDetections } from './draw'
import { imageExtension } from './dataset.js'

/** Render the image + detections to an offscreen canvas at the image's natural size. */
export function renderAnnotated(image, detections) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, width, height)
  drawDetections(ctx, detections, { width, height })
  return canvas
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export the image.'))),
      type,
      quality,
    )
  })
}

/** Strip the extension so exports read `photo-annotated.png` etc. */
export function baseName(name) {
  return (name || 'image').replace(/\.[^./\\]+$/, '') || 'image'
}

function csvCell(value) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Serialize detections as pretty-printed JSON with image metadata.
 * @param {{name?:string, backend?:string, elapsed?:number, image?:HTMLImageElement, detections:Array}} data
 */
export function detectionsToJSON({ name, backend, elapsed, image, detections }) {
  return `${JSON.stringify(
    {
      image: name ?? null,
      backend: backend ?? null,
      elapsedMs: typeof elapsed === 'number' ? Math.round(elapsed) : null,
      width: image?.naturalWidth ?? null,
      height: image?.naturalHeight ?? null,
      detections: detections.map((d) => ({
        class: d.class,
        score: Number(d.score.toFixed(4)),
        bbox: {
          x: Math.round(d.bbox.x),
          y: Math.round(d.bbox.y),
          width: Math.round(d.bbox.width),
          height: Math.round(d.bbox.height),
        },
      })),
    },
    null,
    2,
  )}\n`
}

/** Serialize detections as CSV (class,score,x,y,width,height). */
export function detectionsToCSV({ detections }) {
  const rows = [['class', 'score', 'x', 'y', 'width', 'height']]
  detections.forEach((d) => {
    rows.push([
      d.class,
      d.score.toFixed(4),
      Math.round(d.bbox.x),
      Math.round(d.bbox.y),
      Math.round(d.bbox.width),
      Math.round(d.bbox.height),
    ])
  })
  return `${rows.map((r) => r.map(csvCell).join(',')).join('\n')}\n`
}

/**
 * Original bytes of an image element (so the dataset keeps the source file),
 * falling back to a PNG re-encode when the source can't be fetched.
 * @returns {Promise<{bytes: Uint8Array, ext: string}>}
 */
export async function imageToBytes(image, name) {
  try {
    const res = await fetch(image.src)
    if (res.ok) return { bytes: new Uint8Array(await res.arrayBuffer()), ext: imageExtension(name) }
  } catch {
    /* cross-origin or opaque source — fall through to canvas */
  }
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  canvas.getContext('2d').drawImage(image, 0, 0)
  const blob = await canvasToBlob(canvas)
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: '.png' }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
