import { useMemo, useState } from 'react'
import { COCO_CATEGORIES, COCO_CLASSES } from '../lib/cocoClasses'

export default function ClassFilter({ selected, onChange }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const categories = useMemo(() => {
    if (!q) return COCO_CATEGORIES
    return COCO_CATEGORIES.map((c) => ({
      ...c,
      classes: c.classes.filter((name) => name.includes(q)),
    })).filter((c) => c.classes.length > 0)
  }, [q])

  const toggleClass = (name) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange(next)
  }

  const toggleCategory = (classes) => {
    const allSelected = classes.every((c) => selected.has(c))
    const next = new Set(selected)
    for (const c of classes) {
      if (allSelected) next.delete(c)
      else next.add(c)
    }
    onChange(next)
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Classes</h2>
        <span className="panel__timing">
          {selected.size}/{COCO_CLASSES.length}
        </span>
      </div>

      <div className="classfilter__actions">
        <button
          type="button"
          className="btn btn--mini"
          onClick={() => onChange(new Set(COCO_CLASSES))}
        >
          Select all
        </button>
        <button
          type="button"
          className="btn btn--mini btn--ghost"
          onClick={() => onChange(new Set())}
        >
          Clear
        </button>
      </div>

      <input
        type="search"
        className="classfilter__search"
        placeholder="Search classes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="classfilter__list">
        {categories.map((category) => {
          const allSelected = category.classes.every((c) => selected.has(c))
          const someSelected = category.classes.some((c) => selected.has(c))
          return (
            <div key={category.name} className="classfilter__group">
              <label className="classfilter__category">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected
                  }}
                  onChange={() => toggleCategory(category.classes)}
                />
                <span>{category.name}</span>
              </label>
              <div className="classfilter__classes">
                {category.classes.map((name) => (
                  <label key={name} className="classfilter__item">
                    <input
                      type="checkbox"
                      checked={selected.has(name)}
                      onChange={() => toggleClass(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
        {categories.length === 0 && (
          <p className="muted">No classes match “{query}”.</p>
        )}
      </div>
    </section>
  )
}
