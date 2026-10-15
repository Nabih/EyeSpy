import { useEffect, useRef } from 'react'
import { colorForClass } from '../lib/detect'

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

    detections.forEach((d) => {
      const { x, y, width, height } = d.bbox
      const color = colorForClass(d.class)

      ctx.strokeStyle = color
      ctx.strokeRect(x, y, width, height)

      const label = `${d.class} ${(d.score * 100).toFixed(0)}%`
      const textWidth = ctx.measureText(label).width
      const padX = fontSize * 0.4
      const padY = fontSize * 0.25
      const boxH = fontSize + padY * 2
      const labelY = y - boxH < 0 ? y : y - boxH

      ctx.fillStyle = color
      ctx.fillRect(x, labelY, textWidth + padX * 2, boxH)

      ctx.fillStyle = '#000'
      ctx.fillText(label, x + padX, labelY + padY)
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
