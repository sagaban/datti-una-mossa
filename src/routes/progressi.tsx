import { Link, createFileRoute } from '@tanstack/react-router'
import { AREA_LABEL, type Area, describeCard } from '../lib/cards'
import { allDays, areaProgress, streak, today, useData, weakCards } from '../lib/store'

export const Route = createFileRoute('/progressi')({ component: Progress })

function Progress() {
  const { cards } = useData()
  const weak = weakCards(10)
  const dayLogs = allDays()
  const progress = areaProgress()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const key = today(d)
    return { key, label: d.toLocaleDateString('es', { weekday: 'narrow' }), log: dayLogs[key] }
  })
  const max = Math.max(10, ...days.map((d) => d.log?.reviews ?? 0))

  const last30 = Object.entries(dayLogs).filter(([k]) => k >= today(new Date(Date.now() - 30 * 864e5)))
  const reviews = last30.reduce((s, [, d]) => s + d.reviews, 0)
  const correct = last30.reduce((s, [, d]) => s + d.correct, 0)
  const minutes = Math.round(Object.values(dayLogs).reduce((s, d) => s + d.seconds, 0) / 60)

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

      <section className="card stack">
        <h3 className="section-title">Tus puntos débiles</h3>
        {weak.length ? (
          <>
            <p className="muted small">Lo que más te cuesta: tarjetas que fallaste varias veces o que FSRS ve difíciles.</p>
            <div className="list">
              {weak.map((def) => {
                const { title, subtitle } = describeCard(def)
                const lapses = cards[def.id]?.lapses ?? 0
                return (
                  <div key={def.id} className="list-item col">
                    <span className="row-between weak-title">
                      <strong>{title}</strong>
                      {lapses > 0 && <span className="pill small">{lapses}× fallada</span>}
                    </span>
                    <span className="muted small">{subtitle}</span>
                  </div>
                )
              })}
            </div>
            <Link to="/repaso" search={{ weak: true }} className="btn primary">
              Repasarlos ahora
            </Link>
          </>
        ) : (
          <p className="muted small">Todavía no hay: acá aparecen las tarjetas que fallás seguido.</p>
        )}
      </section>
    </div>
  )
}
