import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Practice } from '../../components/Practice'
import { GRAMMAR } from '../../data/grammar'
import { fillBlank } from '../../lib/cards'
import { markSeen } from '../../lib/store'

export const Route = createFileRoute('/lezioni/$id')({
  loader: ({ params }) => {
    const topic = GRAMMAR.find((g) => g.id === params.id)
    if (!topic) throw notFound()
    return topic
  },
  component: Lesson,
})

function Lesson() {
  const topic = Route.useLoaderData()
  return (
    <div className="stack">
      <Link to="/lezioni" className="back">
        ← Gramática
      </Link>
      <h1>{topic.title}</h1>
      <span className="pill">{topic.level}</span>
      <div className="card lesson-body">
        {topic.body.map((l, i) =>
          l.startsWith('• ') ? (
            <p key={i} className="example">
              {l.slice(2)}
            </p>
          ) : (
            <p key={i}>{l}</p>
          ),
        )}
      </div>
      <h3 className="section-title">Practicá</h3>
      <Practice
        key={topic.id}
        onFinish={() => markSeen(`g:${topic.id}`)}
        items={topic.ex.map((e) => ({
          question: e.s,
          hint: e.es,
          answers: e.a,
          options: e.opts,
          reveal: fillBlank(e),
        }))}
      />
    </div>
  )
}
