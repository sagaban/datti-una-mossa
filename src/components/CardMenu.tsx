import { useEffect, useState } from 'react'
import type { CardDef } from '../lib/cards'
import { REASON_LABEL, type ReportReason, sendReport } from '../lib/reports'
import { setSuspended } from '../lib/store'

/** En vocabulario se suspende la palabra entera: reconocimiento y producción */
export function suspendIds(def: CardDef): string[] {
  if (def.kind === 'vocab-r' || def.kind === 'vocab-p') {
    const base = def.id.replace(/:[rp]$/, '')
    return [`${base}:r`, `${base}:p`]
  }
  return [def.id]
}

type View = 'closed' | 'menu' | 'report' | 'sent' | 'queued'

/** Menú "⋯" de una tarjeta: suspenderla o reportar un error de contenido */
export function CardMenu({
  def,
  question,
  expected,
  given,
  onSuspend,
}: {
  def: CardDef
  question: string
  expected: string
  given: string
  onSuspend: (ids: string[]) => void
}) {
  const [view, setView] = useState<View>('closed')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (view !== 'sent' && view !== 'queued') return
    const t = setTimeout(() => setView('closed'), 2500)
    return () => clearTimeout(t)
  }, [view])

  const isVocab = def.kind === 'vocab-r' || def.kind === 'vocab-p'

  return (
    <>
      <button
        type="button"
        className="card-menu-btn"
        aria-label="Más opciones"
        aria-expanded={view !== 'closed'}
        onClick={() => setView(view === 'closed' ? 'menu' : 'closed')}
      >
        ⋯
      </button>
      {view === 'menu' && (
        <div className="card-menu" role="menu">
          <button
            role="menuitem"
            className="btn small"
            onClick={() => {
              const ids = suspendIds(def)
              setSuspended(ids, true)
              onSuspend(ids)
            }}
          >
            🙈 Suspender {isVocab ? 'esta palabra' : 'esta tarjeta'}
          </button>
          <button role="menuitem" className="btn small" onClick={() => setView('report')}>
            ⚠️ Reportar un error
          </button>
          <small className="muted">Suspender: no vuelve a aparecer (la reactivás desde Ajustes o la lista del tema).</small>
        </div>
      )}
      {view === 'report' && (
        <form
          className="card-menu"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!reason) return
            setSending(true)
            const sent = await sendReport({ cardId: def.id, reason, comment, question, expected, given })
            setSending(false)
            setComment('')
            setReason(null)
            setView(sent ? 'sent' : 'queued')
          }}
        >
          <strong className="small">¿Qué está mal?</strong>
          <div className="chips">
            {(Object.keys(REASON_LABEL) as ReportReason[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                className={`chip ${reason === r ? 'on' : ''}`}
                onClick={() => setReason(r)}
              >
                {REASON_LABEL[r]}
              </button>
            ))}
          </div>
          <textarea
            className="input"
            rows={2}
            maxLength={1000}
            placeholder="Detalle opcional (p. ej. la traducción correcta)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="btn-row">
            <button type="button" className="btn ghost small" onClick={() => setView('closed')}>
              Cancelar
            </button>
            <button type="submit" className="btn primary small" disabled={!reason || sending}>
              {sending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      )}
      {view === 'sent' && <p className="card-menu small">¡Gracias! Lo vamos a revisar.</p>}
      {view === 'queued' && <p className="card-menu small">No se pudo enviar ahora: se reintenta más tarde.</p>}
    </>
  )
}
