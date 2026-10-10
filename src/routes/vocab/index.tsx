import { Link, createFileRoute } from '@tanstack/react-router'
import { LEVELS } from '../../data/verbs'
import { VOCAB } from '../../data/vocab'
import { useData } from '../../lib/store'

export const Route = createFileRoute('/vocab/')({ component: Vocab })

function Vocab() {
  const data = useData()
  return (
    <div className="stack">
      <h1>Vocabulario</h1>
      <p className="muted">Palabras por tema. Las ves en tus repasos de a poco; acá podés recorrerlas y practicarlas cuando quieras.</p>
      {LEVELS.map((lv) => {
        const themes = VOCAB.filter((t) => t.level === lv)
        if (!themes.length) return null
        return (
          <section key={lv}>
            <h3 className="section-title">Nivel {lv}</h3>
            <div className="list">
              {themes.map((t) => {
                const seen = t.words.filter((_, i) => data.cards[`v:${t.id}:${i}:r`]).length
                return (
                  <Link key={t.id} to="/vocab/$id" params={{ id: t.id }} className="list-item">
                    <span>{t.name}</span>
                    <span className="muted small">
                      {seen}/{t.words.length}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
