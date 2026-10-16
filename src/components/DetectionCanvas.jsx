import { useEffect, useRef } from 'react'
import { drawDetections } from '../lib/draw'

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
    drawDetections(ctx, detections)
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
