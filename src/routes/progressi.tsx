import { createFileRoute } from '@tanstack/react-router'
import { AREA_LABEL, type Area } from '../lib/cards'
import { areaProgress, streak, today, useData } from '../lib/store'

export const Route = createFileRoute('/progressi')({ component: Progress })

function Progress() {
  const data = useData()
  const progress = areaProgress()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const key = today(d)
    return { key, label: d.toLocaleDateString('es', { weekday: 'narrow' }), log: data.days[key] }
  })
  const max = Math.max(10, ...days.map((d) => d.log?.reviews ?? 0))

  const last30 = Object.entries(data.days).filter(([k]) => k >= today(new Date(Date.now() - 30 * 864e5)))
  const reviews = last30.reduce((s, [, d]) => s + d.reviews, 0)
  const correct = last30.reduce((s, [, d]) => s + d.correct, 0)
  const minutes = Math.round(Object.values(data.days).reduce((s, d) => s + d.seconds, 0) / 60)

  return (
    <div className="stack">
      <h1>Progreso</h1>
      <section className="stats-row">
        <div className="stat">
          <strong>{streak()}</strong>
          <span>racha</span>
        </div>
        <div className="stat">
          <strong>{reviews ? Math.round((correct / reviews) * 100) : 0}%</strong>
          <span>aciertos 30 d</span>
        </div>
        <div className="stat">
          <strong>{minutes}</strong>
          <span>min totales</span>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">Últimos 14 días</h3>
        <div className="chart" role="img" aria-label="Repasos por día en los últimos 14 días">
          {days.map((d) => (
            <div key={d.key} className="chart-col" title={`${d.key}: ${d.log?.reviews ?? 0} repasos`}>
              <div className="chart-bar" style={{ height: `${((d.log?.reviews ?? 0) / max) * 100}%` }} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">Por área</h3>
        <p className="muted small">Vistas / consolidadas (intervalo de 3 semanas o más)</p>
        {(Object.keys(AREA_LABEL) as Area[]).map((a) => {
          const p = progress[a]
          if (!p) return null
          return (
            <div key={a} className="bar-row">
              <span>{AREA_LABEL[a]}</span>
              <div className="bar stacked">
                <div className="seen" style={{ width: `${(p.seen / p.total) * 100}%` }} />
                <div className="mature" style={{ width: `${(p.mature / p.total) * 100}%` }} />
              </div>
              <span className="muted small">
                {p.seen}/{p.total}
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
