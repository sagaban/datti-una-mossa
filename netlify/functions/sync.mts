import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'
import { type SyncPayload, hashCode, isValidCode, mergePayload, parsePayload } from '../../src/lib/sync-core'

const MAX_BODY = 4 * 1024 * 1024
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * POST: fusiona el progreso recibido con el guardado y devuelve el resultado.
 * DELETE: borra la copia en la nube.
 * El código viaja en un header (no en la URL) y se guarda sólo su hash.
 */
export default async (req: Request) => {
  const code = req.headers.get('x-sync-code') ?? ''
  if (!isValidCode(code)) return json({ error: 'Código de sincronización inválido' }, 400)

  const store = getStore({ name: 'progress', consistency: 'strong' })
  const key = await hashCode(code)

  if (req.method === 'DELETE') {
    await store.delete(key)
    return json({ ok: true })
  }

  const body = await req.text()
  if (body.length > MAX_BODY) return json({ error: 'Demasiados datos' }, 413)
  let incoming: SyncPayload
  try {
    incoming = parsePayload(JSON.parse(body))
  } catch {
    return json({ error: 'Formato inválido' }, 400)
  }

  // escritura condicional: si otro dispositivo escribió en el medio, se vuelve a fusionar
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(key, { type: 'json' })
    const merged = current ? mergePayload(parsePayload(current.data), incoming) : incoming
    const result = current?.etag
      ? await store.setJSON(key, merged, { onlyIfMatch: current.etag })
      : await store.setJSON(key, merged, { onlyIfNew: true })
    if (result.modified) return json(merged)
  }
  return json({ error: 'Conflicto, reintentá' }, 409)
}

export const config: Config = {
  path: '/api/sync',
  method: ['POST', 'DELETE'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
