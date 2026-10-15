import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ImageUploader from './components/ImageUploader'
import DetectionCanvas from './components/DetectionCanvas'
import ResultsPanel from './components/ResultsPanel'
import { BACKENDS, getBackend, runDetection } from './lib/detect'

const DEFAULT_LABELS = 'a photo of a cat, a photo of a dog'
const EMPTY_RESULT = {
  image: null,
  backend: null,
  labelsKey: '',
  runId: -1,
  detections: [],
  elapsed: null,
}

function parseLabels(text) {
  const seen = new Set()
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s) && seen.add(s))
}

function progressPercent(event) {
  if (event?.status === 'progress' && typeof event.progress === 'number') {
    return Math.round(event.progress)
  }
  return null
}

export default function App() {
  const [backend, setBackend] = useState('coco-cpu')
  const [imageEl, setImageEl] = useState(null)
  const [result, setResult] = useState(EMPTY_RESULT)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  const [minConfidence, setMinConfidence] = useState(0.5)
  const [maxResults, setMaxResults] = useState(20)

  const [labelsText, setLabelsText] = useState(DEFAULT_LABELS)
  const [committedLabels, setCommittedLabels] = useState(() => parseLabels(DEFAULT_LABELS))
  const [runId, setRunId] = useState(0)

  const imageUrlRef = useRef(null)

  const backendInfo = getBackend(backend)
  const labelsKey = committedLabels.join('\u0000')

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
    setProgress(null)
  }, [])

  const handleBackendChange = useCallback((next) => {
    setError(null)
    setProgress(null)
    setBackend(next)
  }, [])

  const applyLabels = useCallback(() => {
    setCommittedLabels(parseLabels(labelsText))
    setRunId((r) => r + 1)
  }, [labelsText])

  useEffect(() => {
    if (!imageEl) return
    let cancelled = false
    runDetection(backend, imageEl, {
      labels: labelsKey ? labelsKey.split('\u0000') : [],
      onProgress: (event) => {
        if (cancelled) return
        const pct = progressPercent(event)
        if (pct !== null) setProgress(pct)
      },
    })
      .then((res) => {
        if (cancelled) return
        setResult({
          image: imageEl,
          backend,
          labelsKey,
          runId,
          detections: res.detections,
          elapsed: res.elapsed,
        })
        setProgress(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setProgress(null)
      })
    return () => {
      cancelled = true
    }
  }, [imageEl, backend, labelsKey, runId])

  const busy =
    !!imageEl &&
    (result.image !== imageEl ||
      result.backend !== backend ||
      result.labelsKey !== labelsKey ||
      result.runId !== runId)

  const detections = useMemo(
    () =>
      result.detections
        .filter((d) => d.score >= minConfidence)
        .slice(0, maxResults),
    [result.detections, minConfidence, maxResults],
  )

  const statusLabel = error
    ? 'error'
    : !imageEl
      ? 'idle'
      : busy
        ? progress !== null
          ? `loading ${progress}%`
          : 'detecting…'
        : 'ready'

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
              <DetectionCanvas image={imageEl} detections={detections} />
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

                {backendInfo.needsLabels && (
                  <label className="field">
                    <span>Target labels (comma-separated)</span>
                    <textarea
                      rows={2}
                      value={labelsText}
                      onChange={(e) => setLabelsText(e.target.value)}
                      placeholder="a photo of a cat, a photo of a dog"
                    />
                    <small className="hint">
                      OWL-ViT matches text descriptions — try “a photo of …”.
                    </small>
                  </label>
                )}

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

                <button className="btn btn--ghost btn--block" type="button" onClick={applyLabels}>
                  Run detection
                </button>
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
        COCO-SSD · OWLv2 (zero-shot) · YOLOv8 — all processing runs locally in your browser
      </footer>
    </div>
  )
}
