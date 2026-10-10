import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { VERBS } from '../../data/verbs'
import { normalize, stripAccents } from '../../lib/answer'

export const Route = createFileRoute('/verbi/')({ component: Verbs })

function Verbs() {
  const [q, setQ] = useState('')
  const needle = stripAccents(normalize(q))
  const list = VERBS.filter((v) => !needle || v.inf.includes(needle) || stripAccents(v.es).includes(needle))
  return (
    <div className="stack">
      <h1>Verbos</h1>
      <input className="input" placeholder="Buscar (italiano o español)…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {list.map((v) => (
          <Link key={v.inf} to="/verbi/$inf" params={{ inf: v.inf }} className="list-item">
            <span>
              <strong>{v.inf}</strong> <span className="muted">· {v.es}</span>
            </span>
            {v.forms && <span className="pill small">irregular</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
