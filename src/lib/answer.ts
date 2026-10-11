export type Verdict = 'correct' | 'accent' | 'article' | 'typo' | 'wrong'

export interface CheckResult {
  verdict: Verdict
  expected: string
}

const ARTICLES = /^(?:(?:il|lo|la|i|gli|le|un|uno|una)\s+|(?:l|un)')/

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[’`´]/g, "'")
    .replace(/[.!?¿¡,;:“”"«»…—–]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/'\s+/g, "'")
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function stripArticle(s: string): string {
  return s.replace(ARTICLES, '')
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

const RANK: Verdict[] = ['correct', 'accent', 'article', 'typo', 'wrong']

function compare(given: string, expected: string): Verdict {
  const g = normalize(given)
  const e = normalize(expected)
  if (g === e) return 'correct'
  if (stripAccents(g) === stripAccents(e)) return 'accent'
  const eNoArt = stripArticle(e)
  if (eNoArt !== e && stripAccents(g) === stripAccents(eNoArt)) return 'article'
  const dist = Math.min(levenshtein(stripAccents(g), stripAccents(e)), levenshtein(stripAccents(g), stripAccents(eNoArt)))
  // en frases largas (dictado, expresiones) se toleran 2 errores de tipeo
  const maxTypos = eNoArt.length >= 20 ? 2 : 1
  if (eNoArt.length >= 5 && dist >= 1 && dist <= maxTypos) return 'typo'
  return 'wrong'
}

/** `answers` son alternativas válidas; la primera es la que se muestra */
export function check(given: string, answers: string[]): CheckResult {
  let best: Verdict = 'wrong'
  for (const a of answers) {
    const v = compare(given, a)
    if (RANK.indexOf(v) < RANK.indexOf(best)) best = v
  }
  return { verdict: best, expected: answers[0] }
}

export const VERDICT_MSG: Record<Verdict, string> = {
  correct: '¡Esatto!',
  accent: 'Bien, pero ojo con el acento',
  article: 'Bien, pero incluí el artículo para fijar el género',
  typo: 'Casi: un error de tipeo',
  wrong: 'No es correcto',
}
