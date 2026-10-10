import { useEffect, useMemo, useState } from 'react'
import { VERDICT_MSG, check } from '../lib/answer'
import { SpeakBtn } from './SpeakBtn'

export interface PracticeItem {
  question: string
  hint?: string
  answers: string[]
  options?: string[]
  reveal: string
}

/** Práctica libre, sin afectar la repetición espaciada */
export function Practice({ items, onFinish }: { items: PracticeItem[]; onFinish?: (score: number) => void }) {
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [result, setResult] = useState<ReturnType<typeof check> | null>(null)
  const [score, setScore] = useState(0)
  const item = items[i]
  const options = useMemo(() => item?.options && [...item.options].sort(() => Math.random() - 0.5), [item])
  const finished = !item

  useEffect(() => {
    if (finished) onFinish?.(score)
  }, [finished])

  if (!item) {
    return (
      <div className="card center stack">
        <h3>
          {score} / {items.length}
        </h3>
        <p className="muted">Los ejercicios de esta lección también aparecen en tus repasos diarios.</p>
        <button className="btn" onClick={() => (setI(0), setScore(0))}>
          Repetir
        </button>
      </div>
    )
  }

  const submit = (v: string) => {
    const r = check(v, item.answers)
    setValue(v)
    setResult(r)
    if (r.verdict === 'correct' || r.verdict === 'accent') setScore((s) => s + 1)
  }
  const next = () => {
    setI(i + 1)
    setValue('')
    setResult(null)
  }

  return (
    <div className="card practice">
      <span className="label">
        {i + 1} / {items.length}
      </span>
      <h3 className="question small-q">{item.question}</h3>
      {item.hint && <p className="hint">{item.hint}</p>}
      {options ? (
        <div className="options">
          {options.map((o) => {
            const cls = result ? (check(o, item.answers).verdict === 'correct' ? 'correct' : o === value ? 'wrong' : 'dim') : ''
            return (
              <button key={o} className={`option ${cls}`} disabled={!!result} onClick={() => submit(o)}>
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
            if (result) next()
            else if (value.trim()) submit(value)
          }}
        >
          <input
            className={`input ${result?.verdict ?? ''}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!!result}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="Tu respuesta…"
          />
          {!result && (
            <button className="btn primary" type="submit" disabled={!value.trim()}>
              Comprobar
            </button>
          )}
        </form>
      )}
      {result && (
        <div className="answer">
          <p className={`verdict ${result.verdict}`}>{VERDICT_MSG[result.verdict]}</p>
          <p className="reveal">
            {item.reveal}
            <SpeakBtn text={item.reveal} />
          </p>
          <button className="btn primary" onClick={next}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
