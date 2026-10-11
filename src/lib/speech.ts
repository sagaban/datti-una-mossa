let voice: SpeechSynthesisVoice | null | undefined

function pickVoice() {
  if (voice !== undefined) return voice
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null
  voice = voices.find((v) => v.lang === 'it-IT' && v.localService) ?? voices.find((v) => v.lang.startsWith('it')) ?? null
  return voice
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function utterance(text: string, rate: number) {
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, '').replace(/\//g, ','))
  u.lang = 'it-IT'
  u.rate = rate
  const v = pickVoice()
  if (v) u.voice = v
  return u
}

export function speak(text: string, rate = 0.9) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  speechSynthesis.speak(utterance(text, rate))
}

/** Lee varios fragmentos seguidos (p. ej. los párrafos de una lectura); avisa al terminar */
export function speakAll(parts: string[], rate = 0.9, onEnd?: () => void) {
  if (!canSpeak() || !parts.length) return
  speechSynthesis.cancel()
  parts.forEach((p, i) => {
    const u = utterance(p, rate)
    if (i === parts.length - 1 && onEnd) u.onend = onEnd
    speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel()
}

if (canSpeak()) speechSynthesis.addEventListener?.('voiceschanged', () => (voice = undefined))
