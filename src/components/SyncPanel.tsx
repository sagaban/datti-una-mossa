import { useState } from 'react'
import { useData } from '../lib/store'
import { type SyncResult, deleteCloudCopy, disableSync, enableSync, joinSync, syncLink, syncNow } from '../lib/sync'

const RESULT_MSG: Record<SyncResult, string> = {
  ok: 'Sincronizado ✓',
  offline: 'Sin conexión: se sincroniza cuando vuelva la red',
  error: 'No se pudo sincronizar',
  disabled: '',
}

function ago(ts?: number) {
  if (!ts) return 'nunca'
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'recién'
  if (s < 3600) return `hace ${Math.round(s / 60)} min`
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`
  return new Date(ts).toLocaleDateString('es')
}

export function SyncPanel() {
  const { sync } = useData()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [input, setInput] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const run = async (fn: () => Promise<SyncResult> | 'invalid') => {
    setBusy(true)
    setMsg('')
    const r = await fn()
    setMsg(r === 'invalid' ? 'El código no es válido: revisá que esté completo' : RESULT_MSG[r])
    setBusy(false)
  }

  if (!sync) {
    return (
      <section className="card stack">
        <span>Sincronización</span>
        <p className="muted small">
          Usá la app en el celular y en la compu con el mismo progreso. No hace falta cuenta: se genera un código que
          funciona como contraseña.
        </p>
        <button className="btn primary" disabled={busy} onClick={() => run(enableSync)}>
          Activar sincronización
        </button>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            void run(() => joinSync(input))
          }}
        >
          <label className="muted small" htmlFor="sync-code">
            ¿Ya la activaste en otro dispositivo? Pegá el código:
          </label>
          <input
            id="sync-code"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="xxxx-xxxx-…"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn" type="submit" disabled={busy || !input.trim()}>
            Vincular este dispositivo
          </button>
        </form>
        {msg && <p className="small">{msg}</p>}
      </section>
    )
  }

  const link = syncLink(sync.code)
  return (
    <section className="card stack">
      <div className="row-between">
        <span>Sincronización</span>
        <span className={`pill small ${sync.lastError ? 'sync-error' : 'sync-ok'}`}>{sync.lastError ? 'Con error' : 'Activa'}</span>
      </div>
      <p className="muted small">
        Última sincronización: {ago(sync.lastSync)}
        {sync.lastError && ` · ${sync.lastError}`}
      </p>
      <button className="btn" disabled={busy} onClick={() => run(syncNow)}>
        {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>

      <div className="stack">
        <span className="small">Para sumar otro dispositivo, abrí este link ahí (o pegá el código en Ajustes):</span>
        {showCode ? (
          <code className="sync-code">{sync.code}</code>
        ) : (
          <button className="btn ghost small" onClick={() => setShowCode(true)}>
            Mostrar código
          </button>
        )}
        <div className="btn-row">
          <button
            className="btn small"
            onClick={() =>
              navigator.clipboard?.writeText(link).then(
                () => setMsg('Link copiado ✓'),
                () => setMsg('No se pudo copiar'),
              )
            }
          >
            Copiar link
          </button>
          {'share' in navigator && (
            <button className="btn small" onClick={() => navigator.share({ title: 'Datti una mossa', url: link }).catch(() => {})}>
              Compartir
            </button>
          )}
        </div>
        <p className="muted small">⚠️ Quien tenga el código o el link puede ver y modificar tu progreso. No lo publiques.</p>
      </div>

      <div className="btn-row">
        <button className="btn ghost small" onClick={disableSync}>
          Desvincular este dispositivo
        </button>
        {confirmDelete ? (
          <button
            className="btn danger small"
            onClick={async () => {
              setMsg((await deleteCloudCopy()) ? 'Copia en la nube borrada' : 'No se pudo borrar')
              setConfirmDelete(false)
            }}
          >
            ¿Seguro? Borrar
          </button>
        ) : (
          <button className="btn ghost small" onClick={() => setConfirmDelete(true)}>
            Borrar copia en la nube
          </button>
        )}
      </div>
      {msg && <p className="small">{msg}</p>}
    </section>
  )
}
