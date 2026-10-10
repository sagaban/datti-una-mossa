let voice: SpeechSynthesisVoice | null | undefined

function pickVoice() {
  if (voice !== undefined) return voice
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null
  voice = voices.find((v) => v.lang === 'it-IT' && v.localService) ?? voices.find((v) => v.lang.startsWith('it')) ?? null
  return voice
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function speak(text: string, rate = 0.9) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, '').replace(/\//g, ','))
  u.lang = 'it-IT'
  u.rate = rate
  const v = pickVoice()
  if (v) u.voice = v
  speechSynthesis.speak(u)
}

if (canSpeak()) speechSynthesis.addEventListener?.('voiceschanged', () => (voice = undefined))
