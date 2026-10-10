import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { LEVELS, type Level } from '../data/verbs'
import { VERDICT_MSG, type Verdict, check } from '../lib/answer'
import { AREA_LABEL, CATALOG, type Area, type CardDef, buildPrompt } from '../lib/cards'
import { makeDue } from '../lib/store'

export const Route = createFileRoute('/test')({ component: Test })

const SIZE = 20

interface Answer {
  def: CardDef
  ok: boolean
  question: string
  expected: string
  given: string
}

function sample(level: Level): CardDef[] {
  // el test sólo usa preguntas que se pueden corregir solas (sin autoevaluación)
  const pool = CATALOG.filter((c) => c.level === level && c.kind !== 'vocab-r')
  const byArea = new Map<Area, CardDef[]>()
  for (const c of pool) byArea.set(c.area, [...(byArea.get(c.area) ?? []), c])
  const out: CardDef[] = []
  const lists = [...byArea.values()].map((l) => [...l].sort(() => Math.random() - 0.5))
  while (out.length < SIZE && lists.some((l) => l.length)) for (const l of lists) if (l.length && out.length < SIZE) out.push(l.pop()!)
  return out.sort(() => Math.random() - 0.5)
}

function Test() {
  const [level, setLevel] = useState<Level | null>(null)
  const [items, setItems] = useState<CardDef[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])

  if (!level) {
    return (
      <div className="stack">
        <h1>Autoevaluación</h1>
        <p className="muted">
          {SIZE} preguntas mezcladas de vocabulario, verbos, gramática y falsos amigos (en B2 y C1, por ahora sólo
          gramática). Sirve para saber dónde estás y qué reforzar. No afecta tus repasos, salvo que elijas agregar tus
          errores.
        </p>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            className="btn big"
            onClick={() => {
              setLevel(lv)
              setItems(sample(lv))
              setAnswers([])
            }}
          >
            Test nivel {lv}
          </button>
        ))}
      </div>
    )
  }

  if (answers.length >= items.length) return <Results level={level} answers={answers} onAgain={() => setLevel(null)} />

  const def = items[answers.length]
  return (
    <div className="review">
      <div className="review-top">
        <button className="icon-btn" onClick={() => setLevel(null)} aria-label="Salir">
          ✕
        </button>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${(answers.length / items.length) * 100}%` }} />
        </div>
        <span className="muted small">
          {answers.length + 1}/{items.length}
        </span>
      </div>
      <TestQuestion key={answers.length} def={def} onAnswer={(a) => setAnswers((x) => [...x, a])} />
    </div>
  )
}

function TestQuestion({ def, onAnswer }: { def: CardDef; onAnswer: (a: Answer) => void }) {
  const prompt = useMemo(() => buildPrompt(def), [def])
  const [value, setValue] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)

  const submit = (v: string) => {
    setValue(v)
    setVerdict(check(v, prompt.answers).verdict)
  }
  const next = () =>
    onAnswer({
      def,
      ok: verdict === 'correct' || verdict === 'accent',
      question: prompt.hint ? `${prompt.question} — ${prompt.hint}` : prompt.question,
      expected: prompt.reveal,
      given: value,
    })

  return (
    <div className="card review-card">
      <span className="label">{prompt.label}</span>
      <h2 className="question">{prompt.question}</h2>
      {prompt.hint && <p className="hint">{prompt.hint}</p>}
      {prompt.mode === 'choice' ? (
        <div className="options">
          {prompt.options!.map((o) => {
            const cls = verdict ? (check(o, prompt.answers).verdict === 'correct' ? 'correct' : o === value ? 'wrong' : 'dim') : ''
            return (
              <button key={o} className={`option ${cls}`} disabled={!!verdict} onClick={() => submit(o)}>
                {o}
              </button>
            )
          })}
        </div>
      ) : (
        <form
          className="type-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (verdict) next()
            else submit(value)
          }}
        >
          <input
            className={`input ${verdict ?? ''}`}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!!verdict}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="Tu respuesta…"
          />
          {!verdict && (
            <button className="btn primary" type="submit">
              {value.trim() ? 'Comprobar' : 'No sé'}
            </button>
          )}
        </form>
      )}
      {verdict && (
        <div className="answer">
          <p className={`verdict ${verdict}`}>{VERDICT_MSG[verdict]}</p>
          <p className="reveal">{prompt.reveal}</p>
          <button className="btn primary" onClick={next}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}

function Results({ level, answers, onAgain }: { level: Level; answers: Answer[]; onAgain: () => void }) {
  const [added, setAdded] = useState(false)
  const ok = answers.filter((a) => a.ok).length
  const pct = Math.round((ok / answers.length) * 100)
  const byArea = new Map<Area, { ok: number; total: number }>()
  for (const a of answers) {
    const s = byArea.get(a.def.area) ?? { ok: 0, total: 0 }
    s.total++
    if (a.ok) s.ok++
    byArea.set(a.def.area, s)
  }
  const wrong = answers.filter((a) => !a.ok)
  const verdict =
    pct >= 85
      ? `Dominás el ${level}. Probá el siguiente nivel.`
      : pct >= 60
        ? `Buen nivel ${level}, con algunas cosas para pulir.`
        : `Todavía hay bastante del ${level} para reforzar. Los repasos diarios te van a ayudar.`

  return (
    <div className="stack">
      <div className="card center">
        <div className="score">{pct}%</div>
        <p>{verdict}</p>
      </div>
      <div className="card">
        {[...byArea.entries()].map(([area, s]) => (
          <div key={area} className="bar-row">
            <span>{AREA_LABEL[area]}</span>
            <div className="bar">
              <div style={{ width: `${(s.ok / s.total) * 100}%` }} />
            </div>
            <span className="muted small">
              {s.ok}/{s.total}
            </span>
          </div>
        ))}
      </div>
      {wrong.length > 0 && (
        <>
          <h3 className="section-title">Para revisar</h3>
          <div className="list">
            {wrong.map((a, i) => (
              <div key={i} className="list-item col">
                <span className="muted small">{a.question}</span>
                <span>
                  ✓ {a.expected} {a.given && <span className="wrong-txt">· vos: {a.given}</span>}
                </span>
              </div>
            ))}
          </div>
          <button
            className="btn primary"
            disabled={added}
            onClick={() => {
              makeDue(wrong.map((a) => a.def.id))
              setAdded(true)
            }}
          >
            {added ? 'Agregados al repaso ✓' : 'Agregar mis errores al repaso'}
          </button>
        </>
      )}
      <button className="btn" onClick={onAgain}>
        Otro test
      </button>
      <Link to="/" className="btn ghost">
        Inicio
      </Link>
    </div>
  )
}
