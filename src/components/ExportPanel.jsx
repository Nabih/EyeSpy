import { useState } from 'react'
import {
  renderAnnotated,
  canvasToBlob,
  detectionsToJSON,
  detectionsToCSV,
  downloadBlob,
  baseName,
  imageToBytes,
} from '../lib/export'
import { yoloLines, buildDatasetFiles } from '../lib/dataset'
import { createZip } from '../lib/zip'

export default function ExportPanel({ image, detections, meta, classes = [], disabled }) {
  const [error, setError] = useState(null)
  const base = baseName(meta?.name)
  const width = image?.naturalWidth || image?.width || 0
  const height = image?.naturalHeight || image?.height || 0

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

  const exportLabels = () => {
    setError(null)
    const lines = yoloLines(detections, classes, width, height)
    const blob = new Blob([lines.length ? `${lines.join('\n')}\n` : ''], { type: 'text/plain' })
    downloadBlob(blob, `${base}.txt`)
  }

  const exportDataset = async () => {
    setError(null)
    try {
      const { bytes, ext } = await imageToBytes(image, meta?.name)
      const files = buildDatasetFiles({
        base,
        ext,
        imageBytes: bytes,
        detections,
        classNames: classes,
        width,
        height,
      })
      downloadBlob(createZip(files), `${base}-dataset.zip`)
    } catch (err) {
      setError(err.message)
    }
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

      <div className="export__actions export__actions--stack">
        <button type="button" className="btn btn--mini" onClick={exportLabels} disabled={disabled}>
          YOLO labels (.txt)
        </button>
        <button type="button" className="btn btn--mini" onClick={exportDataset} disabled={disabled}>
          Dataset (.zip)
        </button>
      </div>

      {error && <p className="muted">{error}</p>}

      <p className="muted export__hint">
        Auto-label with the current detections. Labels use the backend&apos;s class list; the
        dataset bundles the image, labels, <code>classes.txt</code> and <code>data.yaml</code>.
      </p>
    </section>
  )
}
