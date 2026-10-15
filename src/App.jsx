import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ImageUploader from './components/ImageUploader'
import DetectionCanvas from './components/DetectionCanvas'
import ResultsPanel from './components/ResultsPanel'
import ClassFilter from './components/ClassFilter'
import { BACKENDS, getBackend, runDetection } from './lib/detect'
import { COCO_CLASSES } from './lib/cocoClasses'

const EMPTY_RESULT = {
  image: null,
  backend: null,
  detections: [],
  elapsed: null,
}

export default function App() {
  const [backend, setBackend] = useState('coco-cpu')
  const [imageEl, setImageEl] = useState(null)
  const [result, setResult] = useState(EMPTY_RESULT)
  const [error, setError] = useState(null)

  const [minConfidence, setMinConfidence] = useState(0.5)
  const [maxResults, setMaxResults] = useState(20)
  const [selectedClasses, setSelectedClasses] = useState(() => new Set(COCO_CLASSES))

  const imageUrlRef = useRef(null)

  const backendInfo = getBackend(backend)

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

  const reset = useCallback(() => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    imageUrlRef.current = null
    setImageEl(null)
    setResult(EMPTY_RESULT)
    setError(null)
  }, [])

  const handleBackendChange = useCallback((next) => {
    setError(null)
    setBackend(next)
  }, [])

  useEffect(() => {
    if (!imageEl) return
    let cancelled = false
    runDetection(backend, imageEl)
      .then((res) => {
        if (cancelled) return
        setResult({
          image: imageEl,
          backend,
          detections: res.detections,
          elapsed: res.elapsed,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [imageEl, backend])

  const busy = !!imageEl && (result.image !== imageEl || result.backend !== backend)

  const detections = useMemo(
    () =>
      result.detections
        .filter((d) => d.score >= minConfidence && selectedClasses.has(d.class))
        .slice(0, maxResults),
    [result.detections, minConfidence, maxResults, selectedClasses],
  )

  const statusLabel = error ? 'error' : !imageEl ? 'idle' : busy ? 'detecting…' : 'ready'

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">EyeSpy</h1>
          <p className="app__tagline">
            Object detection in your browser — runs locally, no uploads
          </p>
        </div>
        <div className="app__badges">
          <span className="backend">{backendInfo.label}</span>
          <span className={`backend backend--${error ? 'error' : busy ? 'loading' : 'ready'}`}>
            {statusLabel}
          </span>
        </div>
      </header>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <main className={`app__main${imageEl ? ' app__main--split' : ''}`}>
        {!imageEl ? (
          <ImageUploader onSelect={handleSelect} onSample={handleSample} />
        ) : (
          <>
            <div className="stage">
              <div className="stage__frame">
                <DetectionCanvas image={imageEl} detections={busy ? [] : detections} />
                {busy && (
                  <div className="stage__overlay" role="status" aria-live="polite">
                    <span className="spinner" aria-hidden="true" />
                    <span>Detecting with {backendInfo.label}…</span>
                  </div>
                )}
              </div>
              <button className="btn btn--ghost" onClick={reset}>
                Choose another image
              </button>
            </div>

            <aside className="sidebar">
              <section className="panel">
                <h2>Model &amp; settings</h2>
                <label className="field">
                  <span>Backend</span>
                  <select
                    value={backend}
                    onChange={(e) => handleBackendChange(e.target.value)}
                  >
                    {BACKENDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
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

              <ClassFilter selected={selectedClasses} onChange={setSelectedClasses} />

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
        COCO-SSD · YOLOv8 — all processing runs locally in your browser
      </footer>
    </div>
  )
}
