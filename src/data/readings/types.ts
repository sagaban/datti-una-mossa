import type { Level } from '../verbs'

export interface GlossEntry {
  /** traducción al español en este contexto */
  es: string
  /** forma de diccionario como figura en el vocabulario de la app ("il caffè", "andare"); permite sumarla al repaso */
  lemma?: string
}

export interface ReadingQuestion {
  /** pregunta (en español para A1–A2, en italiano desde B1) */
  q: string
  options: string[]
  /** índice de la opción correcta */
  answer: number
}

export interface Reading {
  /** único y estable: se usa para marcarla como leída (no renombrar) */
  id: string
  level: Level
  title: string
  titleEs: string
  /** párrafos separados por una línea en blanco */
  text: string
  /** clave: palabra tal como aparece en el texto, en minúsculas (sin signos; con apóstrofo si es elisión: "dell’") */
  glossary: Record<string, GlossEntry>
  questions: ReadingQuestion[]
}
