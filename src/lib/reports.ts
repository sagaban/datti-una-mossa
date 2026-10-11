/** Reportes de errores de contenido; si no hay conexión quedan en cola y se reintentan */

export type ReportReason = 'traduccion' | 'italiano' | 'correccion' | 'otro'

export const REASON_LABEL: Record<ReportReason, string> = {
  traduccion: 'La traducción está mal',
  italiano: 'Error en el italiano',
  correccion: 'Mi respuesta era correcta',
  otro: 'Otro problema',
}

export interface Report {
  cardId: string
  reason: ReportReason
  comment: string
  question: string
  expected: string
  given: string
}

const QUEUE_KEY = 'datti-una-mossa:reports'

function readQueue(): Report[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as Report[]
  } catch {
    return []
  }
}

function writeQueue(q: Report[]) {
  try {
    if (q.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)))
    else localStorage.removeItem(QUEUE_KEY)
  } catch {
    // sin almacenamiento: el reporte se pierde, no es crítico
  }
}

/** true = entregado (o inválido, no tiene sentido reintentar); false = reintentar más tarde */
async function post(r: Report): Promise<boolean> {
  try {
    const res = await fetch('/api/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r) })
    if (res.status === 400) return true
    // sólo cuenta como enviado si la función lo confirma (un 200 con HTML no es un envío)
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null
    return res.ok && body?.ok === true
  } catch {
    return false
  }
}

/** Devuelve true si se envió ya; false si quedó en cola para después */
export async function sendReport(r: Report): Promise<boolean> {
  if (navigator.onLine && (await post(r))) return true
  writeQueue([...readQueue(), r])
  return false
}

export async function flushReports() {
  const q = readQueue()
  if (!q.length || !navigator.onLine) return
  const left: Report[] = []
  for (const r of q) if (!(await post(r))) left.push(r)
  writeQueue(left)
}
