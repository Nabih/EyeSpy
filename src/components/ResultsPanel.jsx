import { colorForClass } from '../lib/detect'

export default function ResultsPanel({ detections, elapsed, busy }) {
  const byClass = detections.reduce((acc, d) => {
    acc[d.class] = (acc[d.class] || 0) + 1
    return acc
  }, {})

  const summary = Object.entries(byClass).sort((a, b) => b[1] - a[1])

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Results</h2>
        {typeof elapsed === 'number' && !busy && (
          <span className="panel__timing">{elapsed.toFixed(0)} ms</span>
        )}
      </div>

      {busy && <p className="muted">Analyzing…</p>}

      {!busy && detections.length === 0 && (
        <p className="muted">No objects detected above the confidence threshold.</p>
      )}

      {!busy && detections.length > 0 && (
        <>
          <ul className="detections">
            {detections.map((d, i) => (
              <li key={`${d.class}-${i}`} className="detections__item">
                <span
                  className="detections__swatch"
                  style={{ background: colorForClass(d.class) }}
                />
                <span className="detections__class">{d.class}</span>
                <span className="detections__score">{(d.score * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>

          <div className="summary">
            <h3>Summary</h3>
            <p className="muted">
              {detections.length} object{detections.length === 1 ? '' : 's'} detected
            </p>
            <ul className="summary__list">
              {summary.map(([cls, count]) => (
                <li key={cls}>
                  <span>{cls}</span>
                  <span className="summary__count">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
