import { describe, expect, it } from 'vitest'
import { type Reminder, isValidEndpoint, isValidTimeZone, localNow, parseSub, reminderMessage, shouldSend } from './reminder-core'

const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'BNcRdreALRFX', auth: 'tBHItJI5svbpez7KI4CCXg' } }
const BA = 'America/Argentina/Buenos_Aires'
const rem = (p: Partial<Reminder> = {}): Reminder => ({ sub, hour: 20, tz: BA, ...p })
// 2026-10-12 20:30 en Buenos Aires (UTC-3)
const at = (h: number, m = 30) => new Date(Date.UTC(2026, 9, 12, h + 3, m))

describe('suscripciones', () => {
  it('sólo acepta endpoints de servicios de push reales', () => {
    expect(isValidEndpoint(sub.endpoint)).toBe(true)
    expect(isValidEndpoint('https://web.push.apple.com/QGuQ')).toBe(true)
    expect(isValidEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(isValidEndpoint('https://evil.example.com/fcm.googleapis.com')).toBe(false)
    expect(isValidEndpoint('http://fcm.googleapis.com/x')).toBe(false)
    expect(isValidEndpoint('https://fcm.googleapis.com.evil.com/x')).toBe(false)
  })
  it('valida claves y zona horaria', () => {
    expect(parseSub(sub)).toEqual(sub)
    expect(parseSub({ ...sub, keys: { p256dh: 'a b', auth: 'x' } })).toBeNull()
    expect(isValidTimeZone(BA)).toBe(true)
    expect(isValidTimeZone('Marte/Olympus')).toBe(false)
  })
})

describe('cuándo avisar', () => {
  it('usa la hora local del dispositivo', () => {
    expect(localNow(at(20), BA)).toEqual({ date: '2026-10-12', hour: 20 })
    expect(localNow(at(22), 'Europe/Rome').date).toBe('2026-10-13')
  })
  it('avisa a la hora elegida o después, una vez por día', () => {
    expect(shouldSend(rem(), at(19)).send).toBe(false)
    expect(shouldSend(rem(), at(20)).send).toBe(true)
    expect(shouldSend(rem(), at(22)).send).toBe(true)
    expect(shouldSend(rem({ sent: '2026-10-12' }), at(21)).send).toBe(false)
    expect(shouldSend(rem({ sent: '2026-10-11' }), at(21)).send).toBe(true)
  })
  it('no avisa si ese día ya practicó', () => {
    expect(shouldSend(rem({ studied: '2026-10-12' }), at(20)).send).toBe(false)
    expect(shouldSend(rem({ studied: '2026-10-11' }), at(20)).send).toBe(true)
  })
  it('el mensaje varía según el día', () => {
    expect(reminderMessage('2026-10-12').body).not.toBe(reminderMessage('2026-10-13').body)
  })
})
