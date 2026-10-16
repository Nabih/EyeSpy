import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import ImageUploader from './components/ImageUploader'
import DetectionCanvas from './components/DetectionCanvas'
import LiveStage from './components/LiveStage'
import ResultsPanel from './components/ResultsPanel'
import ClassFilter from './components/ClassFilter'
import ExportPanel from './components/ExportPanel'
import {
  BACKENDS,
  getBackend,
  runDetection,
  classesForBackend,
  categoriesForBackend,
  accelerationFor,
} from './lib/detect'
import { COCO_CLASSES } from './lib/cocoClasses'
import { detectWebGPU } from './lib/capabilities'

const EMPTY_RESULT = {
  image: null,
  backend: null,
  accel: null,
  detections: [],
  elapsed: null,
}

const EMPTY_LIVE = { detections: [], elapsed: null }

const LIVE_STATUS = {
  starting: 'starting…',
  live: 'live',
  error: 'error',
  idle: 'idle',
}

export default function App() {
  const [source, setSource] = useState('image')
  const [backend, setBackend] = useState('coco')
  const [imageEl, setImageEl] = useState(null)
  const [result, setResult] = useState(EMPTY_RESULT)
  const [error, setError] = useState(null)
  const [imageName, setImageName] = useState(null)
  const [live, setLive] = useState(EMPTY_LIVE)
  const [liveStatus, setLiveStatus] = useState('idle')

  const [minConfidence, setMinConfidence] = useState(0.5)
  const [maxResults, setMaxResults] = useState(20)
  const [selectedClasses, setSelectedClasses] = useState(() => new Set(COCO_CLASSES))
  const [accel, setAccel] = useState('cpu')
  const [webgpuAvailable, setWebgpuAvailable] = useState(null)

  const imageUrlRef = useRef(null)

  const backendInfo = getBackend(backend)
  const backendClasses = useMemo(() => classesForBackend(backend), [backend])
  const backendCategories = useMemo(() => categoriesForBackend(backend), [backend])
  const accelConfig = accelerationFor(backend)
  const isYolo = backendInfo.family === 'yolo'
  const isCamera = source === 'camera'

  // Resolve the chosen acceleration to a concrete value: COCO's tf.js backend
  // (cpu/webgl) or the YOLO execution provider (wasm/webgpu, "auto" prefers a
  // real WebGPU adapter when one exists).
  const resolvedAccel = useMemo(() => {
    if (isYolo) return accel === 'wasm' || !webgpuAvailable ? 'wasm' : 'webgpu'
    return accel === 'webgl' ? 'webgl' : 'cpu'
  }, [isYolo, accel, webgpuAvailable])

  const runOptions = useMemo(
    () => (isYolo ? { ep: resolvedAccel } : { accel: resolvedAccel }),
    [isYolo, resolvedAccel],
  )

  const accelLabel = isYolo
    ? resolvedAccel === 'webgpu'
      ? 'WebGPU'
      : 'WASM'
    : resolvedAccel === 'webgl'
      ? 'WebGL'
      : 'CPU'

  useEffect(() => {
    let active = true
    detectWebGPU().then((ok) => active && setWebgpuAvailable(ok))
    return () => {
      active = false
    }
  }, [])

  const loadImage = useCallback((url, { revoke = false, name = null } = {}) => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    imageUrlRef.current = revoke ? url : null
    setError(null)
    setImageName(name)
    setResult(EMPTY_RESULT)
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.onerror = () => setError('Could not load that image.')
    img.src = url
  }, [])

  const handleSelect = useCallback(
    (file) => loadImage(URL.createObjectURL(file), { revoke: true, name: file.name }),
    [loadImage],
  )

  const handleSample = useCallback(
    () => loadImage(`${import.meta.env.BASE_URL}sample-cat.jpg`, { name: 'sample-cat.jpg' }),
    [loadImage],
  )

  const reset = useCallback(() => {
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    imageUrlRef.current = null
    setImageEl(null)
    setImageName(null)
    setResult(EMPTY_RESULT)
    setError(null)
  }, [])

  const handleBackendChange = useCallback((next) => {
    setError(null)
    setBackend(next)
    // Each backend emits a different class set, so reset the filter to "all".
    setSelectedClasses(new Set(classesForBackend(next)))
    // Acceleration means different things per family — start from its default.
    setAccel(accelerationFor(next).default)
  }, [])

  const handleSourceChange = useCallback((next) => {
    setError(null)
    if (next === 'image') setLiveStatus('idle')
    setSource(next)
  }, [])

  const handleLiveUpdate = useCallback((update) => setLive(update), [])

  useEffect(() => {
    if (!imageEl) return
    let cancelled = false
    runDetection(backend, imageEl, runOptions)
      .then((res) => {
        if (cancelled) return
        setResult({
          image: imageEl,
          backend,
          accel: resolvedAccel,
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
  }, [imageEl, backend, runOptions, resolvedAccel])

  const busy =
    !!imageEl &&
    (result.image !== imageEl || result.backend !== backend || result.accel !== resolvedAccel)

  const detections = useMemo(
    () =>
      result.detections
        .filter((d) => d.score >= minConfidence && selectedClasses.has(d.class))
        .slice(0, maxResults),
    [result.detections, minConfidence, maxResults, selectedClasses],
  )

  const statusLabel = isCamera
    ? LIVE_STATUS[liveStatus] ?? 'idle'
    : error
      ? 'error'
      : !imageEl
        ? 'idle'
        : busy
          ? 'detecting…'
          : 'ready'

  const statusKind = isCamera
    ? liveStatus === 'live'
      ? 'ready'
      : liveStatus === 'error'
        ? 'error'
        : liveStatus === 'starting'
          ? 'loading'
          : 'ready'
    : error
      ? 'error'
      : busy
        ? 'loading'
        : 'ready'

  const split = isCamera || !!imageEl

  const settingsPanel = (
    <section className="panel">
      <h2>Model &amp; settings</h2>
      <label className="field">
        <span>Backend</span>
        <select value={backend} onChange={(e) => handleBackendChange(e.target.value)}>
          {BACKENDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Acceleration</span>
        <select value={accel} onChange={(e) => setAccel(e.target.value)}>
          {accelConfig.options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              disabled={isYolo && o.value === 'webgpu' && !webgpuAvailable}
            >
              {isYolo && o.value === 'auto'
                ? `Auto${webgpuAvailable ? ' — WebGPU' : ' — WASM'}`
                : o.label}
            </option>
          ))}
        </select>
        {isYolo && webgpuAvailable === false && (
          <span className="field__hint">WebGPU unavailable in this browser — using WASM.</span>
        )}
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
  )

  const classFilter = (
    <ClassFilter
      selected={selectedClasses}
      onChange={setSelectedClasses}
      classes={backendClasses}
      categories={backendCategories}
    />
  )

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
          <span className="backend">{accelLabel}</span>
          <span className={`backend backend--${statusKind}`}>{statusLabel}</span>
        </div>
      </header>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="sourcetabs" role="group" aria-label="Detection source">
        <button
          type="button"
          className="sourcetabs__tab"
          aria-pressed={!isCamera}
          onClick={() => handleSourceChange('image')}
        >
          Image
        </button>
        <button
          type="button"
          className="sourcetabs__tab"
          aria-pressed={isCamera}
          onClick={() => handleSourceChange('camera')}
        >
          Live camera
        </button>
      </div>

      <main className={`app__main${split ? ' app__main--split' : ''}`}>
        {isCamera ? (
          <>
            <LiveStage
              backend={backend}
              options={runOptions}
              minConfidence={minConfidence}
              maxResults={maxResults}
              selectedClasses={selectedClasses}
              onUpdate={handleLiveUpdate}
              onStatus={setLiveStatus}
              onError={setError}
            />
            <aside className="sidebar">
              {settingsPanel}
              {classFilter}
              <ResultsPanel detections={live.detections} elapsed={live.elapsed} busy={false} />
            </aside>
          </>
        ) : !imageEl ? (
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
              {settingsPanel}
              {classFilter}
              <ResultsPanel detections={detections} elapsed={result.elapsed} busy={busy} />
              <ExportPanel
                image={imageEl}
                detections={detections}
                classes={backendClasses}
                meta={{ name: imageName, backend: backendInfo.label, elapsed: result.elapsed }}
                disabled={busy}
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
