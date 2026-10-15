import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ImageUploader from './components/ImageUploader'
import DetectionCanvas from './components/DetectionCanvas'
import ResultsPanel from './components/ResultsPanel'
import { AVAILABLE_BACKENDS, initDetector, runDetection } from './lib/detect'

const EMPTY_RESULT = { image: null, backend: null, detections: [], elapsed: null }

export default function App() {
  const [backend, setBackend] = useState('cpu')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const [imageEl, setImageEl] = useState(null)
  const [result, setResult] = useState(EMPTY_RESULT)

  const [minConfidence, setMinConfidence] = useState(0.5)
  const [maxResults, setMaxResults] = useState(20)

  const imageUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    initDetector(backend)
      .then(() => !cancelled && setStatus('ready'))
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [backend])

  const loadImage = useCallback((url, { revoke = false } = {}) => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    imageUrlRef.current = revoke ? url : null
    setError(null)
    setResult(EMPTY_RESULT)
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.onerror = () => setError('Could not load that image.')
    img.src = url
  }, [])

  const handleSelect = useCallback(
    (file) => loadImage(URL.createObjectURL(file), { revoke: true }),
    [loadImage],
  )

  const handleSample = useCallback(
    () => loadImage(`${import.meta.env.BASE_URL}sample-cat.jpg`),
    [loadImage],
  )

  const handleBackendChange = useCallback((next) => {
    setError(null)
    setStatus('loading')
    setBackend(next)
  }, [])

  const reset = useCallback(() => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    imageUrlRef.current = null
    setImageEl(null)
    setResult(EMPTY_RESULT)
    setError(null)
  }, [])

  useEffect(() => {
    if (!imageEl || status !== 'ready') return
    let cancelled = false
    runDetection(imageEl, { maxResults: 100, minConfidence: 0.05 })
      .then((res) => {
        if (cancelled) return
        setResult({
          image: imageEl,
          backend,
          detections: res.detections,
          elapsed: res.elapsed,
        })
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [imageEl, status, backend])

  const busy =
    !!imageEl &&
    status === 'ready' &&
    (result.image !== imageEl || result.backend !== backend)

  const detections = useMemo(
    () =>
      result.detections
        .filter((d) => d.score >= minConfidence)
        .slice(0, maxResults),
    [result.detections, minConfidence, maxResults],
  )

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">EyeSpy</h1>
          <p className="app__tagline">
            CPU object detection in your browser — no GPU, no uploads
          </p>
        </div>
        <span className={`backend backend--${status}`}>
          {status === 'loading' && 'Loading model…'}
          {status === 'ready' && `ready · ${backend.toUpperCase()}`}
          {status === 'error' && 'model failed'}
        </span>
      </header>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <main className={`app__main${imageEl ? ' app__main--split' : ''}`}>
        {!imageEl ? (
          <ImageUploader
            disabled={status !== 'ready'}
            onSelect={handleSelect}
            onSample={handleSample}
          />
        ) : (
          <>
            <div className="stage">
              <DetectionCanvas image={imageEl} detections={detections} />
              <button className="btn btn--ghost" onClick={reset}>
                Choose another image
              </button>
            </div>

            <aside className="sidebar">
              <section className="panel">
                <h2>Settings</h2>
                <label className="field">
                  <span>
                    Backend <strong>{backend.toUpperCase()}</strong>
                  </span>
                  <select
                    value={backend}
                    onChange={(e) => handleBackendChange(e.target.value)}
                  >
                    {AVAILABLE_BACKENDS.map((b) => (
                      <option key={b} value={b}>
                        {b.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>
                    Min confidence <strong>{minConfidence.toFixed(2)}</strong>
                  </span>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  />
                </label>

                <label className="field">
                  <span>
                    Max results <strong>{maxResults}</strong>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value, 10))}
                  />
                </label>
              </section>

              <ResultsPanel
                detections={detections}
                elapsed={result.elapsed}
                busy={busy}
              />
            </aside>
          </>
        )}
      </main>

      <footer className="app__footer">
        COCO-SSD · MobileNet v2 · 80 classes · all processing runs locally
      </footer>
    </div>
  )
}
