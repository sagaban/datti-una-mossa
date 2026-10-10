import { Link, createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { SyncPanel } from '../components/SyncPanel'
import { AREA_LABEL, type Area } from '../lib/cards'
import { canSpeak, speak } from '../lib/speech'
import { exportData, importData, resetAll, today, updateSettings, useData } from '../lib/store'

export const Route = createFileRoute('/impostazioni')({ component: Settings })

function Settings() {
  const { settings } = useData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `datti-una-mossa-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="stack">
      <Link to="/" className="back">
        ← Inicio
      </Link>
      <h1>Ajustes</h1>

      <section className="card stack">
        <div className="field">
          <span>Tarjetas nuevas por día</span>
          <div className="seg">
            {[5, 10, 15, 20, 30].map((n) => (
              <button key={n} className={settings.newPerDay === n ? 'on' : ''} onClick={() => updateSettings({ newPerDay: n })}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Retención objetivo</span>
          <div className="seg">
            {[0.85, 0.9, 0.95].map((r) => (
              <button key={r} className={settings.retention === r ? 'on' : ''} onClick={() => updateSettings({ retention: r })}>
                {Math.round(r * 100)}%
              </button>
            ))}
          </div>
          <small className="muted">Más alta = recordás más, pero con más repasos diarios.</small>
        </div>
      </section>

      <section className="card stack">
        <span>Qué practicar</span>
        {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
          <label key={a} className="toggle">
            <input
              type="checkbox"
              checked={settings.areas[a]}
              onChange={(e) => updateSettings({ areas: { ...settings.areas, [a]: e.target.checked } })}
            />
            {AREA_LABEL[a]}
          </label>
        ))}
      </section>

      {canSpeak() && (
        <section className="card stack">
          <label className="toggle">
            <input type="checkbox" checked={settings.autoSpeak} onChange={(e) => updateSettings({ autoSpeak: e.target.checked })} />
            Leer en voz alta automáticamente
          </label>
          <button className="btn small" onClick={() => speak('Ciao! Come stai? Io sto benissimo, grazie.')}>
            Probar voz italiana
          </button>
        </section>
      )}

      <SyncPanel />

      <section className="card stack">
        <span>Copia de seguridad</span>
        <p className="muted small">Sin sincronización, tu progreso se guarda sólo en este dispositivo: exportalo de vez en cuando.</p>
        <div className="btn-row">
          <button className="btn" onClick={download}>
            Exportar
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Importar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              importData(await f.text())
              setMsg('Progreso importado ✓')
            } catch {
              setMsg('No se pudo leer el archivo')
            }
          }}
        />
        {msg && <p className="small">{msg}</p>}
      </section>

      <section className="card stack">
        {confirmReset ? (
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
            <button
              className="btn danger"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
                setMsg('Progreso borrado')
              }}
            >
              Sí, borrar todo
            </button>
          </div>
        ) : (
          <>
            <button className="btn danger" onClick={() => setConfirmReset(true)}>
              Borrar todo el progreso
            </button>
            <p className="muted small">
              Borra el progreso de este dispositivo y lo desvincula de la sincronización. La copia en la nube no se toca.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
