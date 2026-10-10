import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { Practice } from '../../components/Practice'
import { SpeakBtn } from '../../components/SpeakBtn'
import { TENSE_LEVEL, VERBS } from '../../data/verbs'
import { PERSONS, TENSES, TENSE_ES, TENSE_LABEL, conjugate, expandForms, type Tense } from '../../lib/conjugate'

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
        {verb.es} · auxiliar <strong>{verb.aux ?? 'avere'}</strong>
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
            </section>
          )
        })}
      </div>
    </div>
  )
}
