import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { SpeakBtn } from '../../components/SpeakBtn'
import { READINGS, type Reading } from '../../data/readings'
import { CARD_BY_ID, describeCard } from '../../lib/cards'
import { type Lookup, type Token, lookup, tokenize } from '../../lib/reading'
import { canSpeak, speakAll, stopSpeaking } from '../../lib/speech'
import { isSuspended, makeDue, markSeen, setSuspended, useData } from '../../lib/store'

export const Route = createFileRoute('/letture/$id')({
  loader: ({ params }) => {
    const reading = READINGS.find((r) => r.id === params.id)
    if (!reading) throw notFound()
    return reading
  },
  component: ReadingPage,
})

function ReadingPage() {
  const reading = Route.useLoaderData()
  const { seen } = useData()
  const [selected, setSelected] = useState<{ token: Token; info: Lookup | null } | null>(null)
  const [playing, setPlaying] = useState<number | null>(null)
  const paragraphs = useMemo(() => reading.text.split(/\n\s*\n/).map((p) => p.trim()), [reading])

  useEffect(() => () => stopSpeaking(), [])

  const play = (rate: number) => {
    setPlaying(rate)
    speakAll(paragraphs, rate, () => setPlaying(null))
  }

  return (
    <div className="stack reading">
      <Link to="/letture" className="back">
        ← Lecturas
      </Link>
      <div>
        <h1>{reading.title}</h1>
        <p className="muted">
          {reading.titleEs} · <span className="pill small">{reading.level}</span>
          {seen.includes(`r:${reading.id}`) && <span className="pill small sync-ok"> ✓ leída</span>}
        </p>
      </div>

      {canSpeak() && (
        <div className="btn-row">
          {playing === null ? (
            <>
              <button className="btn small" onClick={() => play(0.9)}>
                🔊 Escuchar
              </button>
              <button className="btn small" onClick={() => play(0.65)}>
                🐢 Más lento
              </button>
            </>
          ) : (
            <button
              className="btn small"
              onClick={() => {
                stopSpeaking()
                setPlaying(null)
              }}
            >
              ⏹ Detener
            </button>
          )}
        </div>
      )}

      <article className="card reading-text" lang="it">
        {paragraphs.map((p, i) => (
          <p key={i}>
            {tokenize(p).map((t, j) =>
              t.key ? (
                // span (no button): un botón es inline-block y permite cortar la línea antes de la puntuación
                <span
                  key={j}
                  role="button"
                  tabIndex={0}
                  className={`w ${selected?.token === t ? 'sel' : ''}`}
                  onClick={() => setSelected({ token: t, info: lookup(reading, t) })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelected({ token: t, info: lookup(reading, t) })
                    }
                  }}
                >
                  {t.text}
                </span>
              ) : (
                <span key={j}>{t.text}</span>
              ),
            )}
          </p>
        ))}
      </article>
      <p className="muted small">Tocá cualquier palabra para ver la traducción y sumarla al repaso.</p>

      <Questions reading={reading} />

      {selected && <WordSheet token={selected.token} info={selected.info} onClose={() => setSelected(null)} />}
    </div>
  )
}

/** Hoja inferior con la traducción de la palabra tocada */
function WordSheet({ token, info, onClose }: { token: Token; info: Lookup | null; onClose: () => void }) {
  const { cards } = useData()
  const [added, setAdded] = useState(false)
  const def = info?.cardId ? CARD_BY_ID.get(info.cardId) : undefined
  const vocab = def ? describeCard(def) : null
  const translation = info?.es || vocab?.subtitle
  const known = info?.cardId ? !!cards[info.cardId] : false
  const suspended = info?.cardId ? isSuspended(info.cardId) : false

  return (
    <div className="sheet" role="dialog" aria-label={`Palabra: ${token.text}`}>
      <div className="row-between">
        <h3 className="sheet-word">
          {token.text} <SpeakBtn text={token.text} />
        </h3>
        <button className="icon-btn" aria-label="Cerrar" onClick={onClose}>
          ✕
        </button>
      </div>
      {translation ? <p className="sheet-es">{translation}</p> : <p className="muted">Sin traducción en el glosario.</p>}
      {vocab && vocab.title.toLowerCase() !== token.text.toLowerCase() && <p className="muted small">De: {vocab.title}</p>}
      {!vocab && info?.lemma && <p className="muted small">De: {info.lemma}</p>}
      <div className="btn-row">
        {info?.cardId &&
          (suspended ? (
            <button className="btn small" onClick={() => setSuspended([info.cardId!, info.cardId!.replace(/:r$/, ':p')], false)}>
              Reactivar (está suspendida)
            </button>
          ) : (
            <button
              className="btn primary small"
              disabled={added}
              onClick={() => {
                makeDue([info.cardId!])
                setAdded(true)
              }}
            >
              {added ? 'En el repaso ✓' : known ? 'Repasarla pronto' : 'Sumar al repaso'}
            </button>
          ))}
        {info?.verb && (
          <Link to="/verbi/$inf" params={{ inf: info.verb }} className="btn small">
            Ver conjugación
          </Link>
        )}
      </div>
    </div>
  )
}

function Questions({ reading }: { reading: Reading }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const done = Object.keys(answers).length === reading.questions.length
  const score = reading.questions.filter((q, i) => answers[i] === q.answer).length

  useEffect(() => {
    if (done) markSeen(`r:${reading.id}`)
  }, [done, reading.id])

  return (
    <section className="stack">
      <h3 className="section-title">Comprensión</h3>
      {reading.questions.map((q, i) => (
        <div key={i} className="card stack">
          <strong>{q.q}</strong>
          <div className="options">
            {q.options.map((o, j) => {
              const answered = i in answers
              const cls = answered ? (j === q.answer ? 'correct' : answers[i] === j ? 'wrong' : 'dim') : ''
              return (
                <button key={j} className={`option ${cls}`} disabled={answered} onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}>
                  {o}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {done && (
        <p className="card center">
          {score}/{reading.questions.length} {score === reading.questions.length ? '· Perfetto! 🎉' : '· ¡Bien! Releé lo que te costó.'}
        </p>
      )}
    </section>
  )
}
