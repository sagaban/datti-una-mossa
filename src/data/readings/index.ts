import { LEVELS } from '../verbs'
import type { Reading } from './types'

export type { GlossEntry, Reading, ReadingQuestion } from './types'

// cada archivo de la carpeta exporta un array de lecturas; se juntan solos
const modules = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./types.ts', '!./*.test.ts'], {
  eager: true,
})

export const READINGS: Reading[] = Object.keys(modules)
  .sort()
  .flatMap((k) => Object.values(modules[k]).filter(Array.isArray).flat() as Reading[])
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
