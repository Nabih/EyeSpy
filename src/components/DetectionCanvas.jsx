import { useEffect, useRef } from 'react'
import { colorForClass } from '../lib/detect'
import { layoutLabels } from '../lib/labelLayout'

export default function DetectionCanvas({ image, detections }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return

    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0)

    const lineWidth = Math.max(2, Math.round(image.naturalWidth / 400))
    const fontSize = Math.max(14, Math.round(image.naturalWidth / 45))

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
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      fontSize,
    })

    labels.forEach((l, i) => {
      ctx.fillStyle = colorForClass(detections[i].class)
      ctx.fillRect(l.x, l.y, l.width, l.height)
      ctx.fillStyle = '#000'
      ctx.fillText(l.label, l.x + l.padX, l.y + l.padY)
    })
  }, [image, detections])

  if (!image) return null

  return (
    <canvas
      ref={canvasRef}
      className="detection-canvas"
      aria-label="Image with detected objects highlighted"
    />
  )
}
