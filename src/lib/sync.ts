import { applyRemote, getData, onLocalChange, patchSync, setSync, toPayload } from './store'
import { generateCode, isValidCode, normalizeCode, parsePayload } from './sync-core'

const ENDPOINT = '/api/sync'
/** después de repasar, espera un rato sin cambios antes de subir */
const DEBOUNCE_MS = 15_000

export type SyncResult = 'ok' | 'offline' | 'error' | 'disabled'

let inflight: Promise<SyncResult> | null = null
let timer: ReturnType<typeof setTimeout> | undefined

async function request(method: 'POST' | 'DELETE', code: string, body?: string) {
  return fetch(ENDPOINT, {
    method,
    headers: { 'content-type': 'application/json', 'x-sync-code': code },
    body,
  })
}

export function syncNow(): Promise<SyncResult> {
  const sync = getData().sync
  if (!sync) return Promise.resolve('disabled')
  if (inflight) return inflight
  clearTimeout(timer)
  inflight = (async (): Promise<SyncResult> => {
    if (!navigator.onLine) return 'offline'
    try {
      const res = await request('POST', sync.code, JSON.stringify(toPayload()))
      if (!res.ok) {
        const msg = ((await res.json().catch(() => null)) as { error?: string } | null)?.error
        patchSync({ lastError: msg ?? `Error ${res.status}` })
        return 'error'
      }
      // el código pudo cambiar mientras tanto (p. ej. se desvinculó)
      if (getData().sync?.code !== sync.code) return 'disabled'
      applyRemote(parsePayload(await res.json()), { lastSync: Date.now(), lastError: undefined })
      return 'ok'
    } catch {
      if (!navigator.onLine) return 'offline'
      patchSync({ lastError: 'No se pudo conectar' })
      return 'error'
    }
  })().finally(() => (inflight = null))
  return inflight
}

function schedule() {
  if (!getData().sync) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, DEBOUNCE_MS)
}

/** Crea un código nuevo y sube el progreso de este dispositivo */
export function enableSync(): Promise<SyncResult> {
  setSync({ code: generateCode() })
  return syncNow()
}

/** Vincula este dispositivo con un código existente: el progreso de ambos se combina */
export function joinSync(input: string): Promise<SyncResult> | 'invalid' {
  const code = normalizeCode(input)
  if (!isValidCode(code)) return 'invalid'
  setSync({ code })
  return syncNow()
}

/** Desvincula este dispositivo; el progreso local y la copia en la nube quedan intactos */
export function disableSync() {
  clearTimeout(timer)
  setSync(null)
}

/** Borra la copia en la nube y desvincula este dispositivo */
export async function deleteCloudCopy(): Promise<boolean> {
  const sync = getData().sync
  if (!sync) return false
  try {
    const res = await request('DELETE', sync.code)
    if (!res.ok) return false
    disableSync()
    return true
  } catch {
    return false
  }
}

export const syncLink = (code: string) => `${location.origin}/sincronizar#${code}`

let started = false

/** Sincroniza al abrir, al volver la conexión, al pasar a segundo plano y un rato después de repasar */
export function initSync() {
  if (started || typeof window === 'undefined') return
  started = true
  onLocalChange(schedule)
  window.addEventListener('online', () => void syncNow())
  // al ocultarse sube lo último; al volver trae lo que se hizo en otro dispositivo
  document.addEventListener('visibilitychange', () => void syncNow())
  void syncNow()
}
