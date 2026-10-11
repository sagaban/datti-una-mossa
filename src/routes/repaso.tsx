import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Grade, Rating } from 'ts-fsrs'
import { VERDICT_MSG, type Verdict, check } from '../lib/answer'
import { AREA_LABEL, type Area, type Prompt, buildIntro, buildPrompt } from '../lib/cards'
import { CardMenu } from '../components/CardMenu'
import { PronounceBtn } from '../components/PronounceBtn'
import { SpeakBtn } from '../components/SpeakBtn'
import { speak } from '../lib/speech'
import {
  type SessionItem,
  addSeconds,
  buildSession,
  dueCards,
  getData,
  markSeen,
  previewIntervals,
  review,
  reviewsLeft,
} from '../lib/store'

interface Search {
  max?: number
  area?: Area
  extra?: number
  extraReviews?: number
  weak?: boolean
}

export const Route = createFileRoute('/repaso')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    max: typeof s.max === 'number' ? s.max : undefined,
    area: typeof s.area === 'string' && s.area in AREA_LABEL ? (s.area as Area) : undefined,
    extra: typeof s.extra === 'number' ? s.extra : undefined,
    extraReviews: typeof s.extraReviews === 'number' ? s.extraReviews : undefined,
    weak: s.weak === true ? true : undefined,
  }),
  component: ReviewRoute,
})

/** Si cambian los parámetros sin salir de /repaso, la sesión se arma de nuevo */
function ReviewRoute() {
  const search = Route.useSearch()
  return <Review key={JSON.stringify(search)} />
}

type Phase = 'intro' | 'question' | 'answer'

interface QueueItem extends SessionItem {
  key: number
  /** ya se mostró la presentación */
  introduced?: boolean
  requeues: number
}

const SUGGESTED: Record<Verdict, Grade> = {
  correct: Rating.Good,
  accent: Rating.Good,
  article: Rating.Hard,
  typo: Rating.Hard,
  wrong: Rating.Again,
}

const GRADE_LABEL: Record<Grade, string> = {
  [Rating.Again]: 'Otra vez',
  [Rating.Hard]: 'Difícil',
  [Rating.Good]: 'Bien',
  [Rating.Easy]: 'Fácil',
}

let keySeq = 0

function makeQueue(search: Search): QueueItem[] {
  const { max, area, extra, extraReviews, weak } = search
  return buildSession({ max, area, extraNew: extra, extraReviews, weak }).map((it) => ({
    ...it,
    key: keySeq++,
    requeues: 0,
  }))
}

function Review() {
  const search = Route.useSearch()
  const [queue, setQueue] = useState<QueueItem[]>(() => makeQueue(search))
  const [stats, setStats] = useState({ done: 0, correct: 0, seconds: 0 })
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 3000)
    return () => clearTimeout(t)
  }, [notice])
  const total = useRef(queue.length)
  const current = queue[0]

  const restart = (opts: Search = {}) => {
    const q = makeQueue({ max: 12, area: search.area, ...opts })
    total.current = q.length
    setStats({ done: 0, correct: 0, seconds: 0 })
    setQueue(q)
  }

  if (!current) {
    // hay pendientes pero se llegó al tope diario
    const capped = reviewsLeft() === 0 && dueCards().some((d) => !search.area || d.area === search.area)
    return <Summary stats={stats} empty={total.current === 0} capped={capped} onRestart={restart} />
  }

  const finish = (grade: Grade | null, seconds: number) => {
    const rest = queue.slice(1)
    if (grade === null) {
      // presentación: la pregunta aparece unas tarjetas más adelante
      const pos = Math.min(rest.length, 2 + Math.floor(Math.random() * 2))
      rest.splice(pos, 0, { ...current, key: keySeq++, introduced: true })
      addSeconds(seconds)
      setQueue(rest)
      return
    }
    const next = review(current.def.id, grade, seconds)
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (grade === Rating.Again ? 0 : 1), seconds: s.seconds + seconds }))
    // pasos de aprendizaje: si vuelve en menos de 20 min, se repite en esta sesión
    if (next.due.getTime() - Date.now() < 20 * 60_000 && current.requeues < 3) {
      const pos = Math.min(rest.length, 3 + Math.floor(Math.random() * 3))
      rest.splice(pos, 0, { ...current, key: keySeq++, isNew: false, requeues: current.requeues + 1 })
    }
    total.current = Math.max(total.current, stats.done + 1 + rest.length)
    setQueue(rest)
  }

  const skip = (ids: string[]) => {
    setQueue(queue.slice(1).filter((it) => !ids.includes(it.def.id)))
    setNotice('Suspendida. La podés reactivar desde Ajustes.')
  }

  return (
    <div className="review">
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="review-top">
        <Link to="/" className="icon-btn" aria-label="Salir">
          ✕
        </Link>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${(stats.done / Math.max(1, total.current)) * 100}%` }} />
        </div>
        <span className="muted small">{queue.length}</span>
      </div>
      <ReviewCard key={current.key} item={current} onDone={finish} onSkip={skip} />
    </div>
  )
}

function ReviewCard({
  item,
  onDone,
  onSkip,
}: {
  item: QueueItem
  onDone: (g: Grade | null, seconds: number) => void
  onSkip: (ids: string[]) => void
}) {
  const { def } = item
  const seen = useMemo(() => new Set(getData().seen), [])
  const intro = useMemo(() => (item.isNew && !item.introduced ? buildIntro(def, seen) : null), [item, def, seen])
  const prompt = useMemo(() => buildPrompt(def), [def])
  const [phase, setPhase] = useState<Phase>(intro ? 'intro' : 'question')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [given, setGiven] = useState('')
  const started = useRef(Date.now())
  const intervals = useMemo(() => (phase === 'answer' ? previewIntervals(def.id) : null), [phase, def.id])
  const autoSpeak = getData().settings.autoSpeak

  const elapsed = () => Math.min(60, Math.round((Date.now() - started.current) / 1000))

  useEffect(() => {
    if (!autoSpeak) return
    if (phase === 'intro' && intro?.speak) speak(intro.speak)
    if (phase === 'question' && prompt.speakQuestion && prompt.speak) speak(prompt.speak)
    if (phase === 'answer' && !prompt.speakQuestion && !prompt.dictation && prompt.speak) speak(prompt.speak)
  }, [phase, autoSpeak, intro, prompt])

  const submit = (value: string) => {
    setGiven(value)
    setVerdict(check(value, prompt.answers).verdict)
    setPhase('answer')
  }

  const rate = (g: Grade) => {
    if (def.kind === 'grammar') markSeen(`g:${def.group}`)
    onDone(g, elapsed())
  }

  // atajos de teclado en escritorio
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'answer' || (e.target as HTMLElement).tagName === 'INPUT') return
      const n = Number(e.key)
      if (n >= 1 && n <= 4) rate(n as Grade)
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        rate(verdict ? SUGGESTED[verdict] : Rating.Good)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'intro' && intro) {
    return (
      <div className="card review-card intro">
        <CardMenu def={def} question={intro.title} expected={intro.lines.join(' · ')} given="" onSuspend={onSkip} />
        <span className="pill new">Nuevo</span>
        <h2 className="intro-title">
          {intro.title}
          {intro.speak && <SpeakBtn text={intro.speak} />}
        </h2>
        {/* en verbos la intro es la tabla entera: la pronunciación se practica en cada tarjeta */}
        {intro.speak && def.kind !== 'verb' && <PronounceBtn text={intro.speak} />}
        <div className="intro-body">
          {intro.lines.map((l, i) => (
            <p key={i} className={l.startsWith('• ') ? 'example' : undefined}>
              {l.replace(/^• /, '')}
            </p>
          ))}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => onDone(Rating.Easy, elapsed())}>
            Ya lo sabía
          </button>
          <button
            className="btn primary"
            onClick={() => {
              if (def.kind === 'grammar') markSeen(`g:${def.group}`)
              onDone(null, elapsed())
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card review-card">
      <CardMenu def={def} question={prompt.question} expected={prompt.reveal} given={given} onSuspend={onSkip} />
      <span className="label">{prompt.label}</span>
      <Question prompt={prompt} phase={phase} given={given} verdict={verdict} onSubmit={submit} onReveal={() => setPhase('answer')} />

      {phase === 'answer' && (
        <div className="answer">
          {verdict && (
            <p className={`verdict ${verdict}`}>
              {VERDICT_MSG[verdict]}
              {verdict !== 'correct' && given && verdict === 'wrong' && <span className="given"> — escribiste “{given}”</span>}
            </p>
          )}
          <p className="reveal">
            {prompt.reveal}
            {prompt.speak && <SpeakBtn text={prompt.speak} />}
          </p>
          {prompt.speak && <PronounceBtn text={prompt.speak} />}
          {prompt.note && <p className="note">💡 {prompt.note}</p>}

          <p className="muted small center">{verdict ? '¿Coincidís con la corrección?' : '¿Qué tan bien lo sabías?'}</p>
          <div className="grades">
            {([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]).map((g) => (
              <button
                key={g}
                className={`grade g${g} ${verdict && SUGGESTED[verdict] === g ? 'suggested' : ''}`}
                onClick={() => rate(g)}
              >
                <span>{GRADE_LABEL[g]}</span>
                <small>{intervals?.[g]}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Question({
  prompt,
  phase,
  given,
  verdict,
  onSubmit,
  onReveal,
}: {
  prompt: Prompt
  phase: Phase
  given: string
  verdict: Verdict | null
  onSubmit: (v: string) => void
  onReveal: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  const answered = phase === 'answer'

  return (
    <>
      <h2 className={`question ${prompt.dictation ? 'small-q' : ''}`}>
        {prompt.question}
        {prompt.speakQuestion && prompt.speak && <SpeakBtn text={prompt.speak} />}
      </h2>
      {prompt.dictation ? <Dictation text={prompt.speak!} hint={prompt.hint} /> : prompt.hint && <p className="hint">{prompt.hint}</p>}

      {prompt.mode === 'flip' && !answered && (
        <button className="btn primary big" onClick={onReveal}>
          Mostrar respuesta
        </button>
      )}

      {prompt.mode === 'type' && (
        <form
          className="type-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!answered && value.trim()) onSubmit(value)
          }}
        >
          <input
            ref={inputRef}
            className={`input ${answered ? verdict : ''}`}
            value={answered ? given : value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={answered}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            lang="it"
            placeholder="Tu respuesta…"
          />
          {!answered && (
            <div className="btn-row">
              <button type="button" className="btn ghost" onClick={() => onSubmit('')}>
                No sé
              </button>
              <button type="submit" className="btn primary" disabled={!value.trim()}>
                Comprobar
              </button>
            </div>
          )}
          {!answered && <AccentBar onInsert={(c) => (setValue((v) => v + c), inputRef.current?.focus())} />}
        </form>
      )}

      {prompt.mode === 'choice' && (
        <div className="options">
          {prompt.options!.map((o) => {
            const isCorrect = check(o, prompt.answers).verdict === 'correct'
            const cls = answered ? (isCorrect ? 'correct' : o === given ? 'wrong' : 'dim') : ''
            return (
              <button key={o} className={`option ${cls}`} disabled={answered} onClick={() => onSubmit(o)}>
                {o}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

/** Dictado: se reproduce al aparecer; se puede repetir, escuchar más lento o ver la traducción */
function Dictation({ text, hint }: { text: string; hint?: string }) {
  const [showHint, setShowHint] = useState(false)
  useEffect(() => speak(text), [text])
  return (
    <div className="dictation">
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => speak(text)}>
          🔊 Escuchar
        </button>
        <button type="button" className="btn" onClick={() => speak(text, 0.6)}>
          🐢 Más lento
        </button>
      </div>
      {hint &&
        (showHint ? (
          <p className="hint">{hint}</p>
        ) : (
          <button type="button" className="btn ghost small" onClick={() => setShowHint(true)}>
            Ver traducción
          </button>
        ))}
    </div>
  )
}

const ACCENTS = ['à', 'è', 'é', 'ì', 'ò', 'ù', '’']

function AccentBar({ onInsert }: { onInsert: (c: string) => void }) {
  return (
    <div className="accents">
      {ACCENTS.map((c) => (
        <button key={c} type="button" className="accent" onClick={() => onInsert(c)}>
          {c}
        </button>
      ))}
    </div>
  )
}

function Summary({
  stats,
  empty,
  capped,
  onRestart,
}: {
  stats: { done: number; correct: number; seconds: number }
  empty: boolean
  capped: boolean
  onRestart: (opts?: Search) => void
}) {
  if (empty && capped) {
    return (
      <div className="card center stack">
        <h2>Tope diario cumplido 💪</h2>
        <p className="muted">
          Llegaste al límite de {getData().settings.maxReviews} repasos de hoy. Lo que queda vuelve mañana, empezando por lo más
          atrasado. Podés cambiar el límite en Ajustes.
        </p>
        <button className="btn primary" onClick={() => onRestart({ max: 20, extraReviews: 20 })}>
          Repasar 20 más igual
        </button>
        <Link to="/" className="btn ghost">
          Volver
        </Link>
      </div>
    )
  }
  if (empty) {
    return (
      <div className="card center stack">
        <h2>Nada pendiente 🎉</h2>
        <p className="muted">No hay repasos ni tarjetas nuevas para hoy en esta sección.</p>
        <button className="btn primary" onClick={() => onRestart({ extra: 5 })}>
          Aprender 5 nuevas
        </button>
        <Link to="/test" className="btn">
          Hacer un test
        </Link>
        <Link to="/" className="btn ghost">
          Volver
        </Link>
      </div>
    )
  }
  const pct = stats.done ? Math.round((stats.correct / stats.done) * 100) : 0
  const msg = pct >= 90 ? 'Perfetto!' : pct >= 70 ? 'Molto bene!' : pct >= 50 ? 'Bene, avanti così' : 'Coraggio, si impara sbagliando'
  return (
    <div className="card center stack">
      <h2>{msg}</h2>
      <div className="stats-row">
        <div className="stat">
          <strong>{stats.done}</strong>
          <span>respuestas</span>
        </div>
        <div className="stat">
          <strong>{pct}%</strong>
          <span>acertadas</span>
        </div>
        <div className="stat">
          <strong>{Math.max(1, Math.round(stats.seconds / 60))}</strong>
          <span>min</span>
        </div>
      </div>
      <button className="btn primary" onClick={() => onRestart()}>
        Otra ronda
      </button>
      <Link to="/" className="btn">
        Inicio
      </Link>
    </div>
  )
}
