import { getStore } from '@netlify/blobs'
import type { Config } from '@netlify/functions'

/**
 * Reportes de errores de contenido desde la app. Son anónimos: sólo la tarjeta,
 * lo que se mostró, el motivo y un comentario. Se leen con
 * `netlify blobs:list reports` y se procesan como dice AGENTS.md.
 */
const REASONS = ['traduccion', 'italiano', 'correccion', 'otro'] as const

const clip = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '')

export default async (req: Request) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Formato inválido' }, { status: 400 })
  }
  const cardId = clip(body.cardId, 200)
  const reason = REASONS.includes(body.reason as (typeof REASONS)[number]) ? (body.reason as string) : null
  if (!cardId || !reason) return Response.json({ error: 'Faltan datos' }, { status: 400 })

  const report = {
    cardId,
    reason,
    comment: clip(body.comment, 1000),
    question: clip(body.question, 500),
    expected: clip(body.expected, 500),
    given: clip(body.given, 500),
    at: new Date().toISOString(),
  }
  const key = `${report.at}-${crypto.randomUUID().slice(0, 8)}`
  await getStore('reports').setJSON(key, report)
  return Response.json({ ok: true })
}

export const config: Config = {
  path: '/api/report',
  method: 'POST',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
