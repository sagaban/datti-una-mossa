import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { type Reminder, isValidEndpoint, isValidTimeZone, parseSub, reminderKey, validDate, validHour } from '../../src/lib/reminder-core'

/**
 * Suscripciones al recordatorio diario (store `reminders`, clave = hash del endpoint).
 * - POST { sub, hour, tz }        alta o cambio de hora
 * - POST { endpoint, studied }    "hoy ya practiqué": ese día no se avisa
 * - DELETE { endpoint }           baja
 * El endpoint de push es largo y aleatorio: hace las veces de secreto.
 */
export default async (req: Request) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Formato inválido' }, { status: 400 })
  }
  const store = getStore({ name: 'reminders', consistency: 'strong' })

  if (req.method === 'DELETE') {
    if (!isValidEndpoint(body.endpoint)) return Response.json({ error: 'Suscripción inválida' }, { status: 400 })
    await store.delete(await reminderKey(body.endpoint))
    return Response.json({ ok: true })
  }

  const sub = parseSub(body.sub)
  if (sub) {
    if (!validHour(body.hour) || !isValidTimeZone(body.tz)) return Response.json({ error: 'Datos inválidos' }, { status: 400 })
    const key = await reminderKey(sub.endpoint)
    const prev = (await store.get(key, { type: 'json' })) as Reminder | null
    const next: Reminder = { sub, hour: body.hour, tz: body.tz, studied: prev?.studied, sent: prev?.sent }
    if (validDate(body.studied)) next.studied = body.studied
    await store.setJSON(key, next)
    return Response.json({ ok: true })
  }

  if (isValidEndpoint(body.endpoint) && validDate(body.studied)) {
    const key = await reminderKey(body.endpoint)
    const prev = (await store.get(key, { type: 'json' })) as Reminder | null
    if (!prev) return Response.json({ error: 'No existe' }, { status: 404 })
    await store.setJSON(key, { ...prev, studied: body.studied })
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'Datos inválidos' }, { status: 400 })
}

export const config: Config = {
  path: '/api/reminder',
  method: ['POST', 'DELETE'],
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
