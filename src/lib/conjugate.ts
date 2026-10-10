export const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'] as const
export type PersonIndex = 0 | 1 | 2 | 3 | 4 | 5

export const TENSES = [
  'presente',
  'passato prossimo',
  'imperfetto',
  'futuro',
  'condizionale',
  'congiuntivo',
] as const
export type Tense = (typeof TENSES)[number]

export const TENSE_LABEL: Record<Tense, string> = {
  presente: 'Presente',
  'passato prossimo': 'Passato prossimo',
  imperfetto: 'Imperfetto',
  futuro: 'Futuro semplice',
  condizionale: 'Condizionale presente',
  congiuntivo: 'Congiuntivo presente',
}

export const TENSE_ES: Record<Tense, string> = {
  presente: 'presente (hablo)',
  'passato prossimo': 'pretérito perfecto (he hablado / hablé)',
  imperfetto: 'pretérito imperfecto (hablaba)',
  futuro: 'futuro (hablaré)',
  condizionale: 'condicional (hablaría)',
  congiuntivo: 'presente de subjuntivo (que hable)',
}

export interface Verb {
  inf: string
  es: string
  aux?: 'avere' | 'essere'
  /** -ire con infijo -isc- (capire → capisco) */
  isc?: boolean
  /** participio pasado irregular */
  pp?: string
  /** raíz irregular de futuro/condicional (andare → andr) */
  fut?: string
  /** raíz irregular de imperfecto (fare → fac) */
  imp?: string
  /** formas totalmente irregulares por tiempo */
  forms?: Partial<Record<'presente' | 'congiuntivo' | 'imperfetto', string[]>>
  note?: string
}

type Conj = 'are' | 'ere' | 'ire'

function split(inf: string): [string, Conj] {
  const ending = inf.slice(-3) as Conj
  return [inf.slice(0, -3), ending]
}

/** -care/-gare conservan el sonido duro ante e/i: cerchi, pagherò */
function hard(stem: string, conj: Conj, next: string) {
  if (conj === 'are' && /[cg]$/.test(stem) && /^[ie]/.test(next)) return stem + 'h'
  return stem
}

/** studi + i → studi; mangi + erò → mangerò */
function join(stem: string, conj: Conj, ending: string) {
  const s = hard(stem, conj, ending)
  if (conj === 'are' && s.endsWith('i') && ending.startsWith('i')) return s + ending.slice(1)
  if (conj === 'are' && /[cg]i$/.test(s) && ending.startsWith('e')) return s.slice(0, -1) + ending
  return s + ending
}

const PRESENT: Record<Conj, string[]> = {
  are: ['o', 'i', 'a', 'iamo', 'ate', 'ano'],
  ere: ['o', 'i', 'e', 'iamo', 'ete', 'ono'],
  ire: ['o', 'i', 'e', 'iamo', 'ite', 'ono'],
}
const ISC_PRESENT = ['isco', 'isci', 'isce', 'iamo', 'ite', 'iscono']
const IMPERF = ['vo', 'vi', 'va', 'vamo', 'vate', 'vano']
const FUT = ['ò', 'ai', 'à', 'emo', 'ete', 'anno']
const COND = ['ei', 'esti', 'ebbe', 'emmo', 'este', 'ebbero']
const SUBJ: Record<Conj, string[]> = {
  are: ['i', 'i', 'i', 'iamo', 'iate', 'ino'],
  ere: ['a', 'a', 'a', 'iamo', 'iate', 'ano'],
  ire: ['a', 'a', 'a', 'iamo', 'iate', 'ano'],
}
const ISC_SUBJ = ['isca', 'isca', 'isca', 'iamo', 'iate', 'iscano']

export function participle(v: Verb): string {
  if (v.pp) return v.pp
  const [stem, conj] = split(v.inf)
  return stem + { are: 'ato', ere: 'uto', ire: 'ito' }[conj]
}

function futureStem(v: Verb): string {
  if (v.fut) return v.fut
  const [stem, conj] = split(v.inf)
  if (conj === 'are') return join(stem, conj, 'er')
  return stem + (conj === 'ere' ? 'er' : 'ir')
}

const AVERE_PRES = ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno']
const ESSERE_PRES = ['sono', 'sei', 'è', 'siamo', 'siete', 'sono']

/**
 * Devuelve las 6 formas. En passato prossimo con "essere" el participio
 * concuerda: se devuelve "sono andato/a", "siamo andati/e".
 */
export function conjugate(v: Verb, tense: Tense): string[] {
  const [stem, conj] = split(v.inf)
  switch (tense) {
    case 'presente':
      if (v.forms?.presente) return v.forms.presente
      if (v.isc) return ISC_PRESENT.map((e) => stem + e)
      return PRESENT[conj].map((e) => join(stem, conj, e))
    case 'imperfetto': {
      if (v.forms?.imperfetto) return v.forms.imperfetto
      const base = v.imp ? v.imp + 'e' : stem + conj[0]
      return IMPERF.map((e) => base + e)
    }
    case 'futuro':
      return FUT.map((e) => futureStem(v) + e)
    case 'condizionale':
      return COND.map((e) => futureStem(v) + e)
    case 'congiuntivo':
      if (v.forms?.congiuntivo) return v.forms.congiuntivo
      if (v.isc) return ISC_SUBJ.map((e) => stem + e)
      return SUBJ[conj].map((e) => join(stem, conj, e))
    case 'passato prossimo': {
      const pp = participle(v)
      if (v.aux === 'essere') {
        const root = pp.slice(0, -1)
        return ESSERE_PRES.map((a, i) => `${a} ${root}${i < 3 ? 'o/a' : 'i/e'}`)
      }
      return AVERE_PRES.map((a) => `${a} ${pp}`)
    }
  }
}

/** Expande "sono andato/a" en ["sono andato", "sono andata"] */
export function expandForms(form: string): string[] {
  const m = form.match(/^(.*?)(\w)\/(\w)$/u)
  if (!m) return [form]
  return [m[1] + m[2], m[1] + m[3]]
}
