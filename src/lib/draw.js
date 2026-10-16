import { colorForClass } from './detect'
import { layoutLabels } from './labelLayout'

/**
 * Draw detection boxes + labels onto a 2D context. Shared by the on-screen
 * canvas and the export renderer so they always match.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{class:string, score:number, bbox:{x:number,y:number,width:number,height:number}}>} detections
 * @param {{width?:number, height?:number, fontSize?:number, lineWidth?:number}} [opts]
 */
export function drawDetections(ctx, detections, opts = {}) {
  const width = opts.width ?? ctx.canvas.width
  const height = opts.height ?? ctx.canvas.height
  const fontSize = opts.fontSize ?? Math.max(14, Math.round(width / 45))
  const lineWidth = opts.lineWidth ?? Math.max(2, Math.round(width / 400))

  ctx.lineWidth = lineWidth
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`
  ctx.textBaseline = 'top'

  // Boxes first, so a later outline never crosses an earlier label.
  detections.forEach((d) => {
    ctx.strokeStyle = colorForClass(d.class)
    ctx.strokeRect(d.bbox.x, d.bbox.y, d.bbox.width, d.bbox.height)
  })

  // Then labels, nudged down so they never overlap each other.
  const labels = layoutLabels(detections, {
    measure: (text) => ctx.measureText(text).width,
    canvasWidth: width,
    canvasHeight: height,
    fontSize,
  })

  labels.forEach((l, i) => {
    ctx.fillStyle = colorForClass(detections[i].class)
    ctx.fillRect(l.x, l.y, l.width, l.height)
    ctx.fillStyle = '#000'
    ctx.fillText(l.label, l.x + l.padX, l.y + l.padY)
  })
}
