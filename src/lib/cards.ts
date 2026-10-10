import { FALSE_FRIENDS } from '../data/falseFriends'
import { GRAMMAR } from '../data/grammar'
import { VOCAB } from '../data/vocab'
import { LEVELS, TENSE_LEVEL, VERBS, type Level } from '../data/verbs'
import { PERSONS, TENSES, TENSE_LABEL, conjugate, expandForms, type Tense } from './conjugate'

export type Area = 'vocab' | 'verbi' | 'grammatica' | 'falsi'
export type Kind = 'vocab-r' | 'vocab-p' | 'verb' | 'grammar' | 'ff'

export const AREA_LABEL: Record<Area, string> = {
  vocab: 'Vocabulario',
  verbi: 'Verbos',
  grammatica: 'Gramática',
  falsi: 'Falsos amigos',
}

export interface CardDef {
  id: string
  kind: Kind
  area: Area
  level: Level
  /** tema, lección o verbo al que pertenece */
  group: string
  groupLabel: string
}

export interface Prompt {
  label: string
  /** texto principal de la pregunta */
  question: string
  /** contexto extra (traducción, pista) */
  hint?: string
  mode: 'flip' | 'type' | 'choice'
  answers: string[]
  options?: string[]
  /** lo que se muestra al revelar */
  reveal: string
  note?: string
  /** texto en italiano para leer en voz alta */
  speak?: string
  /** si la pregunta está en italiano se puede escuchar antes de responder */
  speakQuestion?: boolean
}

export interface Intro {
  title: string
  lines: string[]
  speak?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** "la madre / la mamma" → ["la madre", "la mamma"] */
const alts = (s: string) => s.split(' / ').map((x) => x.trim())

function vocabEntry(id: string) {
  const [, themeId, idx] = id.split(':')
  const theme = VOCAB.find((t) => t.id === themeId)!
  const [it, es, note] = theme.words[Number(idx)]
  return { theme, it, es, note }
}

function buildCatalog(): CardDef[] {
  const byLevel = {} as Record<Level, CardDef[][]>

  // Cada área es una "cola"; al final se intercalan para que cada día llegue un poco de todo
  for (const level of LEVELS) {
    const vocab: CardDef[] = []
    for (const t of VOCAB.filter((t) => t.level === level)) {
      t.words.forEach((_, i) => {
        const base = { area: 'vocab' as const, level, group: t.id, groupLabel: t.name }
        vocab.push({ ...base, id: `v:${t.id}:${i}:r`, kind: 'vocab-r' })
        vocab.push({ ...base, id: `v:${t.id}:${i}:p`, kind: 'vocab-p' })
      })
    }
    const verbs: CardDef[] = []
    for (const tense of TENSES.filter((t) => TENSE_LEVEL[t] === level)) {
      for (const v of VERBS) {
        verbs.push({
          id: `c:${v.inf}:${tense}`,
          kind: 'verb',
          area: 'verbi',
          level,
          group: v.inf,
          groupLabel: `${v.inf} · ${TENSE_LABEL[tense]}`,
        })
      }
    }
    const grammar: CardDef[] = []
    for (const g of GRAMMAR.filter((g) => g.level === level)) {
      g.ex.forEach((_, i) =>
        grammar.push({ id: `g:${g.id}:${i}`, kind: 'grammar', area: 'grammatica', level, group: g.id, groupLabel: g.title }),
      )
    }
    const ff: CardDef[] =
      level === 'A2'
        ? FALSE_FRIENDS.map((_, i) => ({
            id: `f:${i}`,
            kind: 'ff' as const,
            area: 'falsi' as const,
            level,
            group: 'falsi',
            groupLabel: 'Falsos amigos',
          }))
        : []
    byLevel[level] = [vocab, verbs, grammar, ff]
  }

  const out: CardDef[] = []
  for (const level of LEVELS) {
    const queues = byLevel[level].map((q) => [...q])
    // vocab avanza más rápido que el resto: 2 palabras por cada verbo/gramática
    const weights = [3, 1, 1, 1]
    while (queues.some((q) => q.length)) {
      queues.forEach((q, i) => out.push(...q.splice(0, weights[i])))
    }
  }
  return out
}

export const CATALOG = buildCatalog()
export const CARD_BY_ID = new Map(CATALOG.map((c) => [c.id, c]))

export function buildPrompt(def: CardDef): Prompt {
  switch (def.kind) {
    case 'vocab-r': {
      const { it, es, note, theme } = vocabEntry(def.id)
      return {
        label: `Vocabulario · ${theme.name}`,
        question: it,
        hint: '¿Qué significa?',
        mode: 'flip',
        answers: alts(es),
        reveal: es,
        note,
        speak: it,
        speakQuestion: true,
      }
    }
    case 'vocab-p': {
      const { it, es, note, theme } = vocabEntry(def.id)
      return {
        label: `Vocabulario · ${theme.name}`,
        question: es,
        hint: 'Escribilo en italiano',
        mode: 'type',
        answers: alts(it),
        reveal: it,
        note,
        speak: it,
      }
    }
    case 'verb': {
      const [, inf, tense] = def.id.split(':') as [string, string, Tense]
      const v = VERBS.find((v) => v.inf === inf)!
      const forms = conjugate(v, tense)
      const p = Math.floor(Math.random() * 6)
      const answers = expandForms(forms[p])
      return {
        label: `Verbos · ${TENSE_LABEL[tense]}`,
        question: `${tense === 'congiuntivo' ? 'che ' : ''}${PERSONS[p]} ___`,
        hint: `${inf} (${v.es}) · ${TENSE_LABEL[tense]}`,
        mode: 'type',
        answers,
        reveal: `${tense === 'congiuntivo' ? 'che ' : ''}${PERSONS[p]} ${forms[p]}`,
        note: v.note,
        speak: `${PERSONS[p] === 'lui/lei' ? 'lui' : PERSONS[p]} ${answers[0]}`,
      }
    }
    case 'grammar': {
      const [, topicId, idx] = def.id.split(':')
      const g = GRAMMAR.find((g) => g.id === topicId)!
      const ex = g.ex[Number(idx)]
      return {
        label: `Gramática · ${g.title}`,
        question: ex.s,
        hint: ex.es,
        mode: ex.opts ? 'choice' : 'type',
        answers: ex.a,
        options: ex.opts ? shuffle(ex.opts) : undefined,
        reveal: ex.s.replace('___', ex.a[0]),
        speak: ex.s.replace('___', ex.a[0]).replace(/\(.*?\)/g, ''),
      }
    }
    case 'ff': {
      const f = FALSE_FRIENDS[Number(def.id.split(':')[1])]
      const others = shuffle(FALSE_FRIENDS.filter((x) => x !== f)).slice(0, 2).map((x) => x.means)
      return {
        label: 'Falsos amigos',
        question: f.it,
        hint: '¿Qué significa en italiano?',
        mode: 'choice',
        answers: [f.means],
        options: shuffle([f.means, f.trap, ...others]),
        reveal: f.means,
        note: `“${f.trap}” se dice “${f.trapIt}”.`,
        speak: f.it,
        speakQuestion: true,
      }
    }
  }
}

/** Presentación antes de la primera pregunta: primero se expone, después se recupera */
export function buildIntro(def: CardDef, seenGroups: Set<string>): Intro | null {
  switch (def.kind) {
    case 'vocab-r': {
      const { it, es, note } = vocabEntry(def.id)
      return { title: it, lines: [es, ...(note ? [note] : [])], speak: it }
    }
    case 'vocab-p':
      return null
    case 'verb': {
      const [, inf, tense] = def.id.split(':') as [string, string, Tense]
      const v = VERBS.find((v) => v.inf === inf)!
      const forms = conjugate(v, tense)
      return {
        title: `${inf} — ${TENSE_LABEL[tense]}`,
        lines: [v.es, ...forms.map((f, i) => `${PERSONS[i]} ${f}`), ...(v.note ? [v.note] : [])],
        speak: forms.join(', '),
      }
    }
    case 'grammar': {
      if (seenGroups.has(`g:${def.group}`)) return null
      const g = GRAMMAR.find((g) => g.id === def.group)!
      return { title: g.title, lines: g.body }
    }
    case 'ff': {
      const f = FALSE_FRIENDS[Number(def.id.split(':')[1])]
      return {
        title: f.it,
        lines: [`Significa: ${f.means}`, `No confundir con “${f.trap}”, que se dice “${f.trapIt}”.`],
        speak: f.it,
      }
    }
  }
}
