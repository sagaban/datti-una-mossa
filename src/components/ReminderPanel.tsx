import { useState } from 'react'
import { disableReminder, enableReminder, getReminder, initReminders, reminderSupport, setReminderHour } from '../lib/reminders'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7)

export function ReminderPanel() {
  const support = reminderSupport()
  const [reminder, setReminder] = useState(getReminder)
  const [hour, setHour] = useState(reminder?.hour ?? 20)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (support === 'unsupported') return null

  const toggle = async (on: boolean) => {
    setBusy(true)
    setMsg('')
    if (on) {
      const r = await enableReminder(hour)
      if (r === 'ok') initReminders()
      setMsg(
        r === 'ok'
          ? `Listo: te aviso a las ${hour} h si ese día no practicaste.`
          : r === 'denied'
            ? 'El navegador no dio permiso para notificaciones. Activalo en los ajustes del sitio.'
            : 'No se pudo activar. Probá de nuevo con conexión.',
      )
    } else await disableReminder()
    setReminder(getReminder())
    setBusy(false)
  }

  const changeHour = async (h: number) => {
    setHour(h)
    if (!reminder) return
    setBusy(true)
    setMsg((await setReminderHour(h)) ? `Te aviso a las ${h} h.` : 'No se pudo cambiar la hora. Probá de nuevo con conexión.')
    setReminder(getReminder())
    setBusy(false)
  }

  return (
    <section className="card stack">
      <span>Recordatorio diario</span>
      {support === 'install' ? (
        <p className="muted small">
          En iPhone los avisos sólo funcionan con la app instalada: en Safari tocá Compartir → “Agregar a inicio” y abrila desde
          ahí.
        </p>
      ) : (
        <>
          <p className="muted small">Un aviso por día a la hora que elijas, sólo si ese día todavía no practicaste en este dispositivo.</p>
          <label className="toggle">
            <input type="checkbox" checked={!!reminder} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
            Avisarme para repasar
          </label>
          <label className="row-between">
            <span>Hora</span>
            <select value={hour} disabled={busy} onChange={(e) => changeHour(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </label>
          {msg && (
            <p className="small" role="status">
              {msg}
            </p>
          )}
        </>
      )}
    </section>
  )
}
