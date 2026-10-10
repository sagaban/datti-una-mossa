import { Link, createFileRoute } from '@tanstack/react-router'
import { GRAMMAR } from '../../data/grammar'
import { useData } from '../../lib/store'

export const Route = createFileRoute('/lezioni/')({ component: Lessons })

function Lessons() {
  const data = useData()
  const levels = ['A1', 'A2', 'B1'] as const
  return (
    <div className="stack">
      <h1>Gramática</h1>
      <p className="muted">Explicaciones cortas pensadas para hispanohablantes: qué es igual y qué cambia.</p>
      {levels.map((lv) => (
        <section key={lv}>
          <h3 className="section-title">Nivel {lv}</h3>
          <div className="list">
            {GRAMMAR.filter((g) => g.level === lv).map((g) => {
              const practiced = g.ex.filter((_, i) => data.cards[`g:${g.id}:${i}`]).length
              return (
                <Link key={g.id} to="/lezioni/$id" params={{ id: g.id }} className="list-item">
                  <span>{g.title}</span>
                  <span className="muted small">
                    {practiced}/{g.ex.length}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
