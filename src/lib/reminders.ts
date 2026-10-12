import { allDays, onLocalChange, today } from './store'
import { VAPID_PUBLIC_KEY } from './reminder-core'

/**
 * Recordatorio diario (cliente). Es por dispositivo: no viaja con la sincronización,
 * porque cada dispositivo tiene su propia suscripción de push.
 */
const KEY = 'datti-una-mossa:reminder'
const ENDPOINT = '/api/reminder'

interface Local {
  hour: number
  endpoint: string
  /** último día que se le avisó al servidor que se practicó */
  reported?: string
}

export type ReminderSupport = 'ok' | 'install' | 'unsupported'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

/** En iPhone las notificaciones web sólo andan con la app agregada a la pantalla de inicio */
export function reminderSupport(): ReminderSupport {
  if (typeof window === 'undefined') return 'unsupported'
  const hasPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIOS() && !isStandalone()) return 'install'
  return hasPush ? 'ok' : 'unsupported'
}

export function getReminder(): Local | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Local) : null
  } catch {
    return null
  }
}

function save(r: Local | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r))
    else localStorage.removeItem(KEY)
  } catch {}
}

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

const studiedToday = () => (allDays()[today()]?.reviews ?? 0) > 0

async function post(body: unknown, method: 'POST' | 'DELETE' = 'POST') {
  const res = await fetch(ENDPOINT, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return res.ok && ((await res.json().catch(() => null)) as { ok?: boolean } | null)?.ok === true
}

async function subscribe(): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.ready
  return (
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  )
}

async function register(sub: PushSubscription, hour: number): Promise<boolean> {
  const t = today()
  const ok = await post({
    sub: sub.toJSON(),
    hour,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(studiedToday() ? { studied: t } : {}),
  })
  if (ok) save({ hour, endpoint: sub.endpoint, reported: studiedToday() ? t : undefined })
  return ok
}

export type EnableResult = 'ok' | 'denied' | 'error'

/** Pide permiso, se suscribe y registra la hora en el servidor */
export async function enableReminder(hour: number): Promise<EnableResult> {
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'denied'
    return (await register(await subscribe(), hour)) ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

export async function setReminderHour(hour: number): Promise<boolean> {
  try {
    return await register(await subscribe(), hour)
  } catch {
    return false
  }
}

export async function disableReminder(): Promise<void> {
  const r = getReminder()
  save(null)
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
    await sub?.unsubscribe()
    if (r) await post({ endpoint: r.endpoint }, 'DELETE')
  } catch {}
}

/** Avisa al servidor que hoy ya se practicó, una vez por día */
async function reportStudied() {
  const r = getReminder()
  const t = today()
  if (!r || r.reported === t || !studiedToday() || !navigator.onLine) return
  try {
    if (await post({ endpoint: r.endpoint, studied: t })) save({ ...r, reported: t })
  } catch {}
}

/** Si el navegador renovó la suscripción (o la borró), se vuelve a registrar */
async function checkSubscription() {
  const r = getReminder()
  if (!r || Notification.permission !== 'granted') return
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
    if (!sub || sub.endpoint !== r.endpoint) await register(sub ?? (await subscribe()), r.hour)
  } catch {}
}

let started = false

export function initReminders() {
  if (started || reminderSupport() !== 'ok' || !getReminder()) return
  started = true
  void checkSubscription().then(reportStudied)
  onLocalChange(() => void reportStudied())
  window.addEventListener('online', () => void reportStudied())
}
