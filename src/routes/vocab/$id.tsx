import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { State } from 'ts-fsrs'
import { Practice } from '../../components/Practice'
import { SpeakBtn } from '../../components/SpeakBtn'
import { VOCAB } from '../../data/vocab'
import { alts } from '../../lib/cards'
import { makeDue, setSuspended, useData } from '../../lib/store'
import { isEasyWord } from '../../lib/transparent'

export const Route = createFileRoute('/vocab/$id')({
  loader: ({ params }) => {
    const theme = VOCAB.find((t) => t.id === params.id)
    if (!theme) throw notFound()
    return theme
  },
  component: Theme,
})

function Theme() {
  const theme = Route.useLoaderData()
  const data = useData()
  const [practice, setPractice] = useState(false)

  const ids = theme.words.map((_, i) => `v:${theme.id}:${i}:r`)
  const unseen = ids.filter((id) => !data.cards[id])

  const status = (id: string) => {
    if (data.suspended[id]?.on) return { cls: 'suspended', label: 'Suspendida' }
    const c = data.cards[id]
    if (!c) return { cls: '', label: 'Nueva' }
    if (c.state === State.Review && c.scheduled_days >= 21) return { cls: 'mature', label: 'Consolidada' }
    return { cls: 'learning', label: 'Aprendiendo' }
  }

  return (
    <div className="stack">
      <Link to="/vocab" className="back">
        ← Vocabulario
      </Link>
      <h1>{theme.name}</h1>
      <span className="pill">{theme.level}</span>

      <div className="btn-row">
        <button className="btn primary" onClick={() => setPractice((p) => !p)}>
          {practice ? 'Ver lista' : 'Practicar'}
        </button>
        <button className="btn" disabled={!unseen.length} onClick={() => makeDue(unseen)}>
          {unseen.length ? `+${unseen.length} al repaso` : 'En el repaso ✓'}
        </button>
      </div>

      {practice ? (
        <Practice
          key={theme.id}
          items={[...theme.words]
            .sort(() => Math.random() - 0.5)
            .map(([it, es]) => ({ question: es, hint: 'Escribilo en italiano', answers: alts(it), reveal: it }))}
        />
      ) : (
        <div className="list">
          {theme.words.map(([it, es, note], i) => {
            const st = status(ids[i])
            return (
              <div key={it} className={`list-item word ${st.cls === 'suspended' ? 'is-suspended' : ''}`}>
                <div className="word-main">
                  <span className={`dot ${st.cls}`} title={st.label} aria-label={st.label} />
                  <div>
                    <strong className="word-it">{it}</strong>
                    {isEasyWord(it, es, note) && (
                      <span className="pill small transparent" title="Se parece al español">
                        ≈ es
                      </span>
                    )}
                    <div className="muted small">{es}</div>
                    {note && <div className="word-note">{note}</div>}
                  </div>
                </div>
                {st.cls === 'suspended' ? (
                  <button className="btn ghost small" onClick={() => setSuspended([ids[i], ids[i].replace(/:r$/, ':p')], false)}>
                    Reactivar
                  </button>
                ) : (
                  <SpeakBtn text={it} />
                )}
              </div>
            )
          })}
        </div>
      )}
      {!practice && (
        <p className="muted small">
          <span className="dot" /> nueva · <span className="dot learning" /> aprendiendo · <span className="dot mature" /> consolidada · tachada = suspendida
        </p>
      )}
    </div>
  )
}
