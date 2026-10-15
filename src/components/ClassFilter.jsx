import { useMemo, useState } from 'react'

export default function ClassFilter({ selected, onChange, classes, categories }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const groups = useMemo(() => {
    const base =
      categories && categories.length
        ? categories
        : [{ name: 'All classes', classes, flat: true }]
    if (!q) return base
    return base
      .map((c) => ({ ...c, classes: c.classes.filter((name) => name.includes(q)) }))
      .filter((c) => c.classes.length > 0)
  }, [q, classes, categories])

  const toggleClass = (name) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange(next)
  }

  const toggleCategory = (names) => {
    const allSelected = names.every((c) => selected.has(c))
    const next = new Set(selected)
    for (const c of names) {
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
          {selected.size}/{classes.length}
        </span>
      </div>

      <div className="classfilter__actions">
        <button
          type="button"
          className="btn btn--mini"
          onClick={() => onChange(new Set(classes))}
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
        {groups.map((group) => {
          const allSelected = group.classes.every((c) => selected.has(c))
          const someSelected = group.classes.some((c) => selected.has(c))
          return (
            <div key={group.name} className="classfilter__group">
              {!group.flat && (
                <label className="classfilter__category">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected
                    }}
                    onChange={() => toggleCategory(group.classes)}
                  />
                  <span>{group.name}</span>
                </label>
              )}
              <div className="classfilter__classes">
                {group.classes.map((name) => (
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
        {groups.length === 0 && (
          <p className="muted">No classes match “{query}”.</p>
        )}
      </div>
    </section>
  )
}
