import { canSpeak, speak } from '../lib/speech'

export function SpeakBtn({ text }: { text: string }) {
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className="speak"
      aria-label="Escuchar"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
    >
      🔊
    </button>
  )
}
