import { Link, createFileRoute } from '@tanstack/react-router'
import { AREA_LABEL, type Area } from '../lib/cards'
import { dueCards, newBudget, streak, today, useData } from '../lib/store'

export const Route = createFileRoute('/')({ component: Home })

const GREETINGS = ['Ciao!', 'Bentornato!', 'Forza!', 'Dai, si comincia!', 'Eccoti!']

function Home() {
  const data = useData()
  const due = dueCards()
  const fresh = newBudget()
  const todayLog = data.days[today()]
  const s = streak()
  const greeting = GREETINGS[new Date().getDate() % GREETINGS.length]

  const byArea = due.reduce<Partial<Record<Area, number>>>((acc, d) => ((acc[d.area] = (acc[d.area] ?? 0) + 1), acc), {})

  return (
    <div className="stack">
      <header className="home-head">
        <div>
          <h1>{greeting}</h1>
          <p className="muted">Datti una mossa — ponete las pilas con el italiano.</p>
        </div>
        <Link to="/impostazioni" className="icon-btn" aria-label="Ajustes">
          ⚙
        </Link>
      </header>

      <section className="stats-row">
        <div className="stat">
          <strong>{s}</strong>
          <span>{s === 1 ? 'día de racha' : 'días de racha'}</span>
        </div>
        <div className="stat">
          <strong>{todayLog?.reviews ?? 0}</strong>
          <span>repasos hoy</span>
        </div>
        <div className="stat">
          <strong>{Math.round((todayLog?.seconds ?? 0) / 60)}</strong>
          <span>min hoy</span>
        </div>
      </section>

      <section className="card hero">
        <h2>{due.length ? `${due.length} para repasar` : 'Al día con los repasos'}</h2>
        <p className="muted">
          {fresh > 0 ? `+ ${fresh} tarjetas nuevas disponibles hoy` : 'Ya viste todas las nuevas de hoy'}
        </p>
        <div className="btn-col">
          <Link to="/repaso" search={{ max: 12 }} className="btn primary big">
            Sesión rápida · ~3 min
          </Link>
          <Link to="/repaso" search={{}} className="btn big">
            Repasar todo
          </Link>
          {!due.length && fresh === 0 && (
            <Link to="/repaso" search={{ extra: 5 }} className="btn ghost">
              Quiero 5 nuevas más
            </Link>
          )}
        </div>
      </section>

      <section>
        <h3 className="section-title">Practicar sólo…</h3>
        <div className="chips">
          {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
            <Link key={a} to="/repaso" search={{ area: a, max: 15 }} className="chip">
              {AREA_LABEL[a]}
              {byArea[a] ? <span className="badge">{byArea[a]}</span> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="card tip">
        <strong>Cómo funciona</strong>
        <p>
          Cada tarjeta vuelve justo antes de que la olvides (algoritmo FSRS). Calificá con honestidad: “Otra vez” si
          no te salió, “Fácil” si fue inmediato. Pocos minutos todos los días rinden más que una hora el domingo.
        </p>
      </section>
    </div>
  )
}
