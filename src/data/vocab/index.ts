import { LEVELS } from '../verbs'
import { VOCAB_A1 } from './a1'
import { VOCAB_A2_1 } from './a2-1'
import { VOCAB_A2_2 } from './a2-2'
import { VOCAB_BASE, type VocabTheme } from './base'
import { VOCAB_B1_1 } from './b1-1'
import { VOCAB_B1_2 } from './b1-2'
import { VOCAB_TOP_A2 } from './top-a2'
import { VOCAB_TOP_B1 } from './top-b1'

export type { VocabTheme }

// sort estable: dentro de cada nivel van primero los temas originales y después los nuevos
export const VOCAB: VocabTheme[] = [
  VOCAB_BASE,
  VOCAB_A1,
  VOCAB_A2_1,
  VOCAB_A2_2,
  VOCAB_B1_1,
  VOCAB_B1_2,
  VOCAB_TOP_A2,
  VOCAB_TOP_B1,
]
  .flat()
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
