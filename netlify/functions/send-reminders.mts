import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import webpush from 'web-push'
import { type Reminder, VAPID_PUBLIC_KEY, reminderMessage, shouldSend } from '../../src/lib/reminder-core'

/** Corre cada hora: avisa a quien llegó a su hora y no practicó hoy. Borra las suscripciones vencidas. */
export default async () => {
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!privateKey) {
    console.error('Falta la variable de entorno VAPID_PRIVATE_KEY')
    return
  }
  webpush.setVapidDetails('https://datti-una-mossa.netlify.app', VAPID_PUBLIC_KEY, privateKey)
  const store = getStore({ name: 'reminders', consistency: 'strong' })
  const now = new Date()
  let sent = 0
  let removed = 0
  const { blobs } = await store.list()
  for (const { key } of blobs) {
    const r = (await store.get(key, { type: 'json' })) as Reminder | null
    if (!r) continue
    const { send, date } = shouldSend(r, now)
    if (!send) continue
    try {
      await webpush.sendNotification(r.sub, JSON.stringify(reminderMessage(date)), { TTL: 4 * 3600, urgency: 'normal' })
      await store.setJSON(key, { ...r, sent: date })
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // 404/410: la suscripción ya no existe (se desinstaló la app o se revocó el permiso)
      if (status === 404 || status === 410) {
        await store.delete(key)
        removed++
      } else console.error('Error al enviar', status, (e as Error).message)
    }
  }
  console.log(`[recordatorios] ${blobs.length} suscripciones, ${sent} enviados, ${removed} borrados`)
}

export const config: Config = { schedule: '@hourly' }
