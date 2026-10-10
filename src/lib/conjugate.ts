export const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'] as const
export type PersonIndex = 0 | 1 | 2 | 3 | 4 | 5

export const TENSES = [
  'presente',
  'passato prossimo',
  'imperfetto',
  'futuro',
  'condizionale',
  'congiuntivo',
  'trapassato prossimo',
  'futuro anteriore',
  'condizionale passato',
  'congiuntivo imperfetto',
  'passato remoto',
] as const
export type Tense = (typeof TENSES)[number]

export const TENSE_LABEL: Record<Tense, string> = {
  presente: 'Presente',
  'passato prossimo': 'Passato prossimo',
  imperfetto: 'Imperfetto',
  futuro: 'Futuro semplice',
  condizionale: 'Condizionale presente',
  congiuntivo: 'Congiuntivo presente',
  'trapassato prossimo': 'Trapassato prossimo',
  'futuro anteriore': 'Futuro anteriore',
  'condizionale passato': 'Condizionale passato',
  'congiuntivo imperfetto': 'Congiuntivo imperfetto',
  'passato remoto': 'Passato remoto',
}

export const TENSE_ES: Record<Tense, string> = {
  presente: 'presente (hablo)',
  'passato prossimo': 'pretérito perfecto (he hablado / hablé)',
  imperfetto: 'pretérito imperfecto (hablaba)',
  futuro: 'futuro (hablaré)',
  condizionale: 'condicional (hablaría)',
  congiuntivo: 'presente de subjuntivo (que hable)',
  'trapassato prossimo': 'pluscuamperfecto (había hablado)',
  'futuro anteriore': 'futuro compuesto (habré hablado)',
  'condizionale passato': 'condicional compuesto (habría hablado)',
  'congiuntivo imperfetto': 'imperfecto de subjuntivo (que hablara)',
  'passato remoto': 'pretérito indefinido de la narración (hablé)',
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
  /** raíz irregular del passato remoto para io, lui/lei y loro (prendere → pres: presi, prese, presero) */
  rem?: string
  /** formas totalmente irregulares por tiempo (sin pronombre reflexivo) */
  forms?: Partial<Record<'presente' | 'congiuntivo' | 'imperfetto' | 'congiuntivo imperfetto' | 'passato remoto', string[]>>
  note?: string
}

type Conj = 'are' | 'ere' | 'ire'

/** alzarsi → alzare */
const isReflexive = (v: Verb) => v.inf.endsWith('si')
const baseInf = (v: Verb) => (isReflexive(v) ? v.inf.slice(0, -2) + 'e' : v.inf)

export const auxOf = (v: Verb) => (isReflexive(v) ? 'essere' : (v.aux ?? 'avere'))

function split(v: Verb): [string, Conj] {
  const inf = baseInf(v)
  return [inf.slice(0, -3), inf.slice(-3) as Conj]
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
  const [stem, conj] = split(v)
  return stem + { are: 'ato', ere: 'uto', ire: 'ito' }[conj]
}

function futureStem(v: Verb): string {
  if (v.fut) return v.fut
  const [stem, conj] = split(v)
  if (conj === 'are') return join(stem, conj, 'er')
  return stem + (conj === 'ere' ? 'er' : 'ir')
}

const SUBJ_IMPERF = ['ssi', 'ssi', 'sse', 'ssimo', 'ste', 'ssero']
const REFL = ['mi', 'ti', 'si', 'ci', 'vi', 'si']

type SimpleTense =
  | 'presente'
  | 'imperfetto'
  | 'futuro'
  | 'condizionale'
  | 'congiuntivo'
  | 'congiuntivo imperfetto'
  | 'passato remoto'

const REMOTE: Record<Conj, string[]> = {
  are: ['ai', 'asti', 'ò', 'ammo', 'aste', 'arono'],
  ere: ['ei', 'esti', 'é', 'emmo', 'este', 'erono'],
  ire: ['ii', 'isti', 'ì', 'immo', 'iste', 'irono'],
}

function remote(v: Verb, stem: string, conj: Conj, imperfBase: string): string[] {
  if (v.rem) {
    // patrón 1-3-3: io, lui/lei y loro irregulares; el resto sale de la raíz del imperfetto
    const irr = { 0: 'i', 2: 'e', 5: 'ero' } as Record<number, string>
    const reg = { 1: 'sti', 3: 'mmo', 4: 'ste' } as Record<number, string>
    return [0, 1, 2, 3, 4, 5].map((i) => (i in irr ? v.rem + irr[i] : imperfBase + reg[i]))
  }
  const forms = REMOTE[conj].map((e) => stem + e)
  // -ere regulares admiten también -etti, -ette, -ettero (credetti), salvo raíces en -t
  if (conj === 'ere' && !stem.endsWith('t')) {
    forms[0] += `/${stem}etti`
    forms[2] += `/${stem}ette`
    forms[5] += `/${stem}ettero`
  }
  return forms
}

const AUX: Record<'avere' | 'essere', Partial<Record<SimpleTense, string[]>>> = {
  avere: {
    presente: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
    imperfetto: ['avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano'],
    futuro: ['avrò', 'avrai', 'avrà', 'avremo', 'avrete', 'avranno'],
    condizionale: ['avrei', 'avresti', 'avrebbe', 'avremmo', 'avreste', 'avrebbero'],
  },
  essere: {
    presente: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
    imperfetto: ['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano'],
    futuro: ['sarò', 'sarai', 'sarà', 'saremo', 'sarete', 'saranno'],
    condizionale: ['sarei', 'saresti', 'sarebbe', 'saremmo', 'sareste', 'sarebbero'],
  },
}

/** Tiempo compuesto → tiempo simple del auxiliar */
const COMPOUND: Partial<Record<Tense, SimpleTense>> = {
  'passato prossimo': 'presente',
  'trapassato prossimo': 'imperfetto',
  'futuro anteriore': 'futuro',
  'condizionale passato': 'condizionale',
}

function simple(v: Verb, tense: SimpleTense): string[] {
  const [stem, conj] = split(v)
  const imperfBase = v.imp ? v.imp + 'e' : stem + conj[0]
  switch (tense) {
    case 'presente':
      if (v.forms?.presente) return v.forms.presente
      if (v.isc) return ISC_PRESENT.map((e) => stem + e)
      return PRESENT[conj].map((e) => join(stem, conj, e))
    case 'imperfetto':
      if (v.forms?.imperfetto) return v.forms.imperfetto
      return IMPERF.map((e) => imperfBase + e)
    case 'futuro':
      return FUT.map((e) => futureStem(v) + e)
    case 'condizionale':
      return COND.map((e) => futureStem(v) + e)
    case 'congiuntivo':
      if (v.forms?.congiuntivo) return v.forms.congiuntivo
      if (v.isc) return ISC_SUBJ.map((e) => stem + e)
      return SUBJ[conj].map((e) => join(stem, conj, e))
    case 'congiuntivo imperfetto':
      if (v.forms?.['congiuntivo imperfetto']) return v.forms['congiuntivo imperfetto']
      return SUBJ_IMPERF.map((e) => imperfBase + e)
    case 'passato remoto':
      if (v.forms?.['passato remoto']) return v.forms['passato remoto']
      return remote(v, stem, conj, imperfBase)
  }
}

/**
 * Devuelve las 6 formas. En tiempos compuestos con "essere" el participio
 * concuerda: "sono andato/a", "siamo andati/e". Los reflexivos llevan el
 * pronombre: "mi alzo", "mi sono alzato/a".
 */
export function conjugate(v: Verb, tense: Tense): string[] {
  const refl = isReflexive(v)
  const auxTense = COMPOUND[tense]
  if (!auxTense) {
    const forms = simple(v, tense as SimpleTense)
    if (!refl) return forms
    return forms.map((f, i) => f.split('/').map((x) => `${REFL[i]} ${x}`).join('/'))
  }
  const pp = participle(v)
  const aux = auxOf(v)
  return AUX[aux][auxTense]!.map((a, i) => {
    const part = aux === 'essere' ? `${pp.slice(0, -1)}${i < 3 ? 'o/a' : 'i/e'}` : pp
    return `${refl ? REFL[i] + ' ' : ''}${a} ${part}`
  })
}

/**
 * Expande las variantes de una forma:
 * "sono andato/a" → ["sono andato", "sono andata"] (concordancia de género)
 * "credei/credetti" → ["credei", "credetti"] (formas alternativas)
 */
export function expandForms(form: string): string[] {
  if (!form.includes('/')) return [form]
  const [first, ...rest] = form.split('/')
  if (rest.length === 1 && rest[0].length === 1) return [first, first.slice(0, -1) + rest[0]]
  return [first, ...rest]
}
