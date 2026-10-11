import { Link, createFileRoute } from '@tanstack/react-router'
import { READINGS } from '../../data/readings'
import { LEVELS } from '../../data/verbs'
import { useData } from '../../lib/store'

export const Route = createFileRoute('/letture/')({ component: Readings })

function Readings() {
  const { seen, settings } = useData()
  const read = new Set(seen)
  return (
    <div className="stack">
      <h1>Lecturas</h1>
      <p className="muted">
        Textos cortos por nivel. Tocá cualquier palabra para ver qué significa y sumarla al repaso. Leer mucho de lo que
        casi entendés es de lo que más ayuda a aprender un idioma.
      </p>
      {LEVELS.map((lv) => {
        const list = READINGS.filter((r) => r.level === lv)
        if (!list.length) return null
        return (
          <section key={lv}>
            <h3 className="section-title">
              Nivel {lv} {lv === settings.startLevel && <span className="pill small">tu nivel</span>}
            </h3>
            <div className="list">
              {list.map((r) => (
                <Link key={r.id} to="/letture/$id" params={{ id: r.id }} className="list-item">
                  <span>
                    <strong>{r.title}</strong>
                    <span className="muted small"> · {r.titleEs}</span>
                  </span>
                  <span className="muted small nowrap">{read.has(`r:${r.id}`) ? '✓ leída' : `${r.text.split(/\s+/).length} pal.`}</span>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
