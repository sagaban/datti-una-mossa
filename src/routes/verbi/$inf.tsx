import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { Practice } from '../../components/Practice'
import { SpeakBtn } from '../../components/SpeakBtn'
import { GRAMMAR, TENSE_LESSON } from '../../data/grammar'
import { exampleFor } from '../../data/verb-examples'
import { TENSE_LEVEL, VERBS } from '../../data/verbs'
import { findForm } from '../../lib/verb-example'
import { PERSONS, TENSES, TENSE_ES, TENSE_LABEL, type Verb, auxOf, conjugate, expandForms, type Tense } from '../../lib/conjugate'

export const Route = createFileRoute('/verbi/$inf')({
  loader: ({ params }) => {
    const verb = VERBS.find((v) => v.inf === params.inf)
    if (!verb) throw notFound()
    return verb
  },
  component: VerbPage,
})

function VerbPage() {
  const verb = Route.useLoaderData()
  const [drill, setDrill] = useState<Tense | null>(null)

  return (
    <div className="stack">
      <Link to="/verbi" className="back">
        ← Verbos
      </Link>
      <h1>
        {verb.inf} <SpeakBtn text={verb.inf} />
      </h1>
      <p className="muted">
        {verb.es} · auxiliar <strong>{auxOf(verb)}</strong>
      </p>
      {verb.note && <p className="note">💡 {verb.note}</p>}

      {drill && (
        <>
          <div className="row-between">
            <h3 className="section-title">Practicando: {TENSE_LABEL[drill]}</h3>
            <button className="btn ghost small" onClick={() => setDrill(null)}>
              Cerrar
            </button>
          </div>
          <Practice
            key={drill}
            items={conjugate(verb, drill).map((f, i) => ({
              question: `${drill === 'congiuntivo' ? 'che ' : ''}${PERSONS[i]} ___`,
              hint: `${verb.inf} · ${TENSE_LABEL[drill]}`,
              answers: expandForms(f),
              reveal: `${PERSONS[i]} ${f}`,
            }))}
          />
        </>
      )}

      <div className="tenses">
        {TENSES.map((t) => {
          const forms = conjugate(verb, t)
          return (
            <section key={t} className="card tense">
              <header>
                <div>
                  <strong>{TENSE_LABEL[t]}</strong> <span className="pill small">{TENSE_LEVEL[t]}</span>
                  <div className="muted small">{TENSE_ES[t]}</div>
                </div>
                <button className="btn small" onClick={() => (setDrill(t), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
                  Practicar
                </button>
              </header>
              <table>
                <tbody>
                  {forms.map((f, i) => (
                    <tr key={i}>
                      <td className="muted">{(t === 'congiuntivo' ? 'che ' : '') + PERSONS[i]}</td>
                      <td>{f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TenseExample verb={verb} tense={t} />
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** Oración de ejemplo con la forma resaltada y link a la lección que explica el tiempo */
function TenseExample({ verb, tense }: { verb: Verb; tense: Tense }) {
  const ex = exampleFor(verb.inf, tense)
  const lesson = GRAMMAR.find((g) => g.id === TENSE_LESSON[tense])
  if (!ex && !lesson) return null
  const span = ex && findForm(ex[0], verb, tense)
  return (
    <div className="tense-example">
      {ex && (
        <p>
          <span className="it">
            {span ? (
              <>
                {ex[0].slice(0, span[0])}
                <strong>{ex[0].slice(span[0], span[1])}</strong>
                {ex[0].slice(span[1])}
              </>
            ) : (
              ex[0]
            )}
          </span>{' '}
          <SpeakBtn text={ex[0]} />
          <br />
          <span className="muted small">{ex[1]}</span>
        </p>
      )}
      {lesson && (
        <Link to="/lezioni/$id" params={{ id: lesson.id }} className="small">
          ¿Cuándo se usa? · {lesson.title} →
        </Link>
      )}
    </div>
  )
}
