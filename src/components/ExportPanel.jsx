import { useState } from 'react'
import {
  renderAnnotated,
  canvasToBlob,
  detectionsToJSON,
  detectionsToCSV,
  downloadBlob,
  baseName,
} from '../lib/export'

export default function ExportPanel({ image, detections, meta, disabled }) {
  const [error, setError] = useState(null)
  const base = baseName(meta?.name)

  const exportImage = async () => {
    setError(null)
    try {
      const canvas = renderAnnotated(image, detections)
      const blob = await canvasToBlob(canvas)
      downloadBlob(blob, `${base}-annotated.png`)
    } catch (err) {
      setError(err.message)
    }
  }

  const exportJSON = () => {
    setError(null)
    const blob = new Blob([detectionsToJSON({ ...meta, image, detections })], {
      type: 'application/json',
    })
    downloadBlob(blob, `${base}-detections.json`)
  }

  const exportCSV = () => {
    setError(null)
    const blob = new Blob([detectionsToCSV({ detections })], { type: 'text/csv' })
    downloadBlob(blob, `${base}-detections.csv`)
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Export</h2>
      </div>
      <div className="export__actions">
        <button type="button" className="btn btn--mini" onClick={exportImage} disabled={disabled}>
          Annotated PNG
        </button>
        <button
          type="button"
          className="btn btn--mini btn--ghost"
          onClick={exportJSON}
          disabled={disabled}
        >
          JSON
        </button>
        <button
          type="button"
          className="btn btn--mini btn--ghost"
          onClick={exportCSV}
          disabled={disabled}
        >
          CSV
        </button>
      </div>
      {error && <p className="muted">{error}</p>}
    </section>
  )
}
