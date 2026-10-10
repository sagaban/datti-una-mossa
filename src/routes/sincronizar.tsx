import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useData } from '../lib/store'
import { joinSync } from '../lib/sync'
import { isValidCode, normalizeCode } from '../lib/sync-core'

export const Route = createFileRoute('/sincronizar')({ component: Pair })

function Pair() {
  const { sync, cards } = useData()
  // el código viene en el hash: nunca se manda al servidor como parte de la URL
  const [code] = useState(() => normalizeCode(location.hash.slice(1)))
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  useEffect(() => {
    // no dejar el código a la vista en la barra de direcciones ni en el historial
    if (location.hash) history.replaceState(null, '', location.pathname)
  }, [])

  const valid = isValidCode(code)
  // se evalúa al abrir: al vincular, el código cambia antes de que lleguen los datos
  const [already] = useState(() => sync?.code === code)
  const hasProgress = Object.keys(cards).length > 0

  return (
    <div className="stack">
      <h1>Sincronizar</h1>
      {!valid ? (
        <div className="card stack">
          <p>El link no tiene un código válido. Copialo de nuevo desde Ajustes en tu otro dispositivo.</p>
          <Link to="/impostazioni" className="btn">
            Ir a Ajustes
          </Link>
        </div>
      ) : already || state === 'done' ? (
        <div className="card stack center">
          <h2>Listo ✓</h2>
          <p className="muted">Este dispositivo ya comparte el progreso.</p>
          <Link to="/" className="btn primary">
            Ir al inicio
          </Link>
        </div>
      ) : (
        <div className="card stack">
          <p>Vas a vincular este dispositivo con tu progreso sincronizado.</p>
          {hasProgress && (
            <p className="muted small">El progreso que ya tenés acá no se pierde: se combina con el de tus otros dispositivos.</p>
          )}
          {sync && <p className="muted small">Este dispositivo deja de usar el código anterior.</p>}
          <button
            className="btn primary"
            disabled={state === 'busy'}
            onClick={async () => {
              setState('busy')
              const r = await joinSync(code)
              setState(r === 'ok' ? 'done' : 'error')
            }}
          >
            {state === 'busy' ? 'Vinculando…' : 'Vincular este dispositivo'}
          </button>
          {state === 'error' && (
            <p className="small">No se pudo conectar. Quedó vinculado igual: va a sincronizar cuando haya conexión.</p>
          )}
        </div>
      )}
    </div>
  )
}
