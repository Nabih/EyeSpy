import { useEffect, useRef, useState } from 'react'
import { runDetection } from '../lib/detect'
import { drawDetections } from '../lib/draw'

function cameraMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was denied. Allow camera access and try again.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is already in use by another application.'
    default:
      return err?.message || 'Could not start the camera.'
  }
}

/**
 * Live webcam detection. Draws the video and overlays boxes on a canvas that
 * matches the video's native resolution, running detection as fast as the
 * backend allows (one frame in flight at a time).
 */
export default function LiveStage({
  backend,
  options,
  minConfidence,
  maxResults,
  selectedClasses,
  onUpdate,
  onStatus,
  onError,
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('starting')
  const [fps, setFps] = useState(0)

  // Latest detection settings, read by the loop without restarting the camera.
  const paramsRef = useRef({ backend, options, minConfidence, maxResults, selectedClasses })
  useEffect(() => {
    paramsRef.current = { backend, options, minConfidence, maxResults, selectedClasses }
  }, [backend, options, minConfidence, maxResults, selectedClasses])

  const fpsRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    let stream
    let raf
    let frames = 0
    let windowStart = performance.now()

    const set = (s) => {
      if (cancelled) return
      setStatus(s)
      onStatus?.(s)
    }

    async function loop() {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        raf = requestAnimationFrame(loop)
        return
      }

      const { backend, options, minConfidence, maxResults, selectedClasses } = paramsRef.current

      let res
      try {
        res = await runDetection(backend, video, options)
      } catch (err) {
        if (cancelled) return
        onError?.(err.message || 'Detection failed.')
        set('error')
        return
      }
      if (cancelled) return

      const width = video.videoWidth
      const height = video.videoHeight
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const filtered = res.detections
        .filter((d) => d.score >= minConfidence && selectedClasses.has(d.class))
        .slice(0, maxResults)

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, width, height)
      drawDetections(ctx, filtered)

      onUpdate?.({ detections: filtered, elapsed: res.elapsed })

      frames++
      const now = performance.now()
      if (now - windowStart >= 500) {
        fpsRef.current = (frames * 1000) / (now - windowStart)
        setFps(fpsRef.current)
        frames = 0
        windowStart = now
      }

      raf = requestAnimationFrame(loop)
    }

    async function start() {
      set('starting')
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      } catch (err) {
        if (cancelled) return
        onError?.(cameraMessage(err))
        set('error')
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const video = videoRef.current
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        /* autoplay of a muted stream is normally allowed; ignore */
      }
      set('live')
      loop()
    }

    start()

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onUpdate, onStatus, onError])

  return (
    <div className="stage">
      <div className="stage__frame">
        <video ref={videoRef} className="live-video" playsInline muted />
        <canvas
          ref={canvasRef}
          className="live-canvas"
          aria-label="Live camera with detected objects highlighted"
        />
        <div className="stage__hud">
          <span className="hud__chip">{fps.toFixed(1)} FPS</span>
        </div>
        {status === 'starting' && (
          <div className="stage__overlay" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>Starting camera…</span>
          </div>
        )}
      </div>
      <p className="muted">
        Detection runs continuously on the camera feed — switch back to Image to stop.
      </p>
    </div>
  )
}
