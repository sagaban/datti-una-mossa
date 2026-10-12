import type { Tense } from '../../lib/conjugate'

/** [oración en italiano, traducción al español] */
export type Example = [it: string, es: string]

/** Una oración de ejemplo por verbo y por tiempo */
export type VerbExamples = Record<string, Record<Tense, Example>>
