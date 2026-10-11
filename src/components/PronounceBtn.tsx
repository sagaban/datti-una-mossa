import { useState } from 'react'
import { type ListenError, canListen, listen, matchSpeech } from '../lib/pronounce'

type State = { kind: 'idle' } | { kind: 'listening' } | { kind: 'ok' } | { kind: 'miss'; heard: string } | { kind: 'error'; error: ListenError }

const ERROR_MSG: Record<ListenError, string> = {
  'not-allowed': 'Permití el micrófono en el navegador para practicar.',
  'no-speech': 'No se escuchó nada. Probá de nuevo.',
  unsupported: 'Este navegador no reconoce voz.',
  other: 'No se pudo reconocer. Probá de nuevo.',
}

/** Practicar pronunciación: decí la palabra o frase y se compara con lo esperado (no afecta la nota) */
export function PronounceBtn({ text }: { text: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  if (!canListen()) return null

  const start = async () => {
    setState({ kind: 'listening' })
    try {
      const heard = await listen()
      const { ok, best } = matchSpeech(heard, text)
      setState(ok ? { kind: 'ok' } : { kind: 'miss', heard: best })
    } catch (e) {
      setState({ kind: 'error', error: (e as ListenError) ?? 'other' })
    }
  }

  return (
    <div className="pronounce">
      <button type="button" className="btn small" onClick={start} disabled={state.kind === 'listening'}>
        {state.kind === 'listening' ? '🎙️ Escuchando…' : '🎙️ Decilo vos'}
      </button>
      <span className="small" role="status" aria-live="polite">
        {state.kind === 'ok' && <span className="ok-txt">¡Bien dicho! ✓</span>}
        {state.kind === 'miss' && (
          <span>
            Se entendió «{state.heard}». <span className="muted">Probá de nuevo.</span>
          </span>
        )}
        {state.kind === 'error' && <span className="muted">{ERROR_MSG[state.error]}</span>}
      </span>
    </div>
  )
}
