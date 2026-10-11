import { Link, createFileRoute } from '@tanstack/react-router'
import { AREA_LABEL, type Area } from '../lib/cards'
import type { Level } from '../data/verbs'
import { allDays, dueCards, newBudget, reviewsLeft, streak, today, updateSettings, useData } from '../lib/store'

export const Route = createFileRoute('/')({ component: Home })

const GREETINGS = ['Ciao!', 'Bentornato!', 'Forza!', 'Dai, si comincia!', 'Eccoti!']

function Home() {
  const { settings, cards } = useData()
  const due = dueCards()
  const left = reviewsLeft()
  const toReview = Math.min(due.length, left)
  const capped = due.length > left
  const fresh = newBudget()
  const todayLog = allDays()[today()]
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

      {!settings.onboarded && Object.keys(cards).length === 0 && <Onboarding />}

      <section className="card hero">
        <h2>{toReview ? `${toReview} para repasar` : capped ? 'Tope diario cumplido' : 'Al día con los repasos'}</h2>
        <p className="muted">
          {capped
            ? `${due.length - toReview} quedan para mañana. Las tarjetas nuevas se pausan hasta que te pongas al día.`
            : fresh > 0
              ? `+ ${fresh} tarjetas nuevas disponibles hoy`
              : 'Ya viste todas las nuevas de hoy'}
        </p>
        <div className="btn-col">
          <Link to="/repaso" search={{ max: 12 }} className="btn primary big stacked">
            Sesión rápida · ~3 min
            <span className="btn-hint">Hasta 12 tarjetas: lo más atrasado primero y, si sobra lugar, alguna nueva</span>
          </Link>
          <Link to="/repaso" search={{}} className="btn big stacked">
            Repasar todo
            <span className="btn-hint">Todo lo pendiente de hoy más las nuevas que te quedan del día</span>
          </Link>
          {!due.length && fresh === 0 && (
            <Link to="/repaso" search={{ extra: 5 }} className="btn ghost stacked">
              Quiero 5 nuevas más
              <span className="btn-hint">Por encima del cupo diario: suman repasos en los próximos días</span>
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

const LEVEL_OPTIONS: { level: Level; label: string; hint: string }[] = [
  { level: 'A1', label: 'Empiezo de cero', hint: 'Saludos, números, lo básico' },
  { level: 'A2', label: 'Sé lo básico', hint: 'Me presento y entiendo frases simples' },
  { level: 'B1', label: 'Me defiendo', hint: 'Converso de temas cotidianos' },
  { level: 'B2', label: 'Nivel avanzado', hint: 'Leo y hablo con soltura' },
]

/** Primera visita: elegir desde qué nivel arrancan las tarjetas nuevas */
function Onboarding() {
  return (
    <section className="card stack onboarding">
      <h2>¿Cuánto italiano sabés?</h2>
      <p className="muted small">
        Las tarjetas nuevas arrancan desde ese nivel. Lo anterior no se pierde: queda para más adelante. Lo podés cambiar en
        Ajustes.
      </p>
      <div className="options">
        {LEVEL_OPTIONS.map((o) => (
          <button key={o.level} className="option" onClick={() => updateSettings({ startLevel: o.level, onboarded: true })}>
            <strong>{o.label}</strong> <span className="pill small">{o.level}</span>
            <div className="muted small">{o.hint}</div>
          </button>
        ))}
      </div>
      <Link to="/test" className="btn ghost">
        No sé: hacer un test de nivel
      </Link>
    </section>
  )
}
