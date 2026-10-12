import type { Tense } from '../../lib/conjugate'
import type { Example, VerbExamples } from './types'

export type { Example, VerbExamples } from './types'

// cada archivo de la carpeta exporta un objeto { infinitivo: { tiempo: [it, es] } }; se juntan solos
const modules = import.meta.glob<Record<string, VerbExamples>>(['./*.ts', '!./index.ts', '!./types.ts', '!./*.test.ts'], {
  eager: true,
})

export const VERB_EXAMPLES: VerbExamples = Object.assign({}, ...Object.keys(modules).sort().flatMap((k) => Object.values(modules[k])))

export const exampleFor = (inf: string, tense: Tense): Example | undefined => VERB_EXAMPLES[inf]?.[tense]
