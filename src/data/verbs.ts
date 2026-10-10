import type { Tense, Verb } from '../lib/conjugate'

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
export type Level = (typeof LEVELS)[number]

/** En qué nivel se introduce cada tiempo verbal */
export const TENSE_LEVEL: Record<Tense, Level> = {
  presente: 'A1',
  'passato prossimo': 'A1',
  imperfetto: 'A2',
  futuro: 'A2',
  condizionale: 'B1',
  congiuntivo: 'B1',
}

export const VERBS: Verb[] = [
  {
    inf: 'essere',
    es: 'ser / estar',
    aux: 'essere',
    pp: 'stato',
    fut: 'sar',
    forms: {
      presente: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
      imperfetto: ['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano'],
      congiuntivo: ['sia', 'sia', 'sia', 'siamo', 'siate', 'siano'],
    },
    note: '“Essere” cubre ser y estar en la mayoría de los casos: sono stanco = estoy cansado.',
  },
  {
    inf: 'avere',
    es: 'tener / haber',
    fut: 'avr',
    forms: {
      presente: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
      congiuntivo: ['abbia', 'abbia', 'abbia', 'abbiamo', 'abbiate', 'abbiano'],
    },
    note: 'La h de ho/hai/ha/hanno no suena. Ho fame = tengo hambre.',
  },
  {
    inf: 'fare',
    es: 'hacer',
    pp: 'fatto',
    fut: 'far',
    imp: 'fac',
    forms: {
      presente: ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno'],
      congiuntivo: ['faccia', 'faccia', 'faccia', 'facciamo', 'facciate', 'facciano'],
    },
  },
  {
    inf: 'andare',
    es: 'ir',
    aux: 'essere',
    fut: 'andr',
    forms: {
      presente: ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'],
      congiuntivo: ['vada', 'vada', 'vada', 'andiamo', 'andiate', 'vadano'],
    },
  },
  {
    inf: 'venire',
    es: 'venir',
    aux: 'essere',
    pp: 'venuto',
    fut: 'verr',
    forms: {
      presente: ['vengo', 'vieni', 'viene', 'veniamo', 'venite', 'vengono'],
      congiuntivo: ['venga', 'venga', 'venga', 'veniamo', 'veniate', 'vengano'],
    },
  },
  {
    inf: 'stare',
    es: 'estar / quedarse',
    aux: 'essere',
    fut: 'star',
    forms: {
      presente: ['sto', 'stai', 'sta', 'stiamo', 'state', 'stanno'],
      congiuntivo: ['stia', 'stia', 'stia', 'stiamo', 'stiate', 'stiano'],
    },
    note: 'Se usa para salud (come stai?), gerundio (sto mangiando) y quedarse en un lugar.',
  },
  {
    inf: 'dire',
    es: 'decir',
    pp: 'detto',
    fut: 'dir',
    imp: 'dic',
    forms: {
      presente: ['dico', 'dici', 'dice', 'diciamo', 'dite', 'dicono'],
      congiuntivo: ['dica', 'dica', 'dica', 'diciamo', 'diciate', 'dicano'],
    },
  },
  {
    inf: 'dare',
    es: 'dar',
    fut: 'dar',
    forms: {
      presente: ['do', 'dai', 'dà', 'diamo', 'date', 'danno'],
      congiuntivo: ['dia', 'dia', 'dia', 'diamo', 'diate', 'diano'],
    },
  },
  {
    inf: 'potere',
    es: 'poder',
    fut: 'potr',
    forms: {
      presente: ['posso', 'puoi', 'può', 'possiamo', 'potete', 'possono'],
      congiuntivo: ['possa', 'possa', 'possa', 'possiamo', 'possiate', 'possano'],
    },
  },
  {
    inf: 'volere',
    es: 'querer',
    fut: 'vorr',
    forms: {
      presente: ['voglio', 'vuoi', 'vuole', 'vogliamo', 'volete', 'vogliono'],
      congiuntivo: ['voglia', 'voglia', 'voglia', 'vogliamo', 'vogliate', 'vogliano'],
    },
    note: '“Querer” a una persona es “voler bene” o “amare”, no “volere”.',
  },
  {
    inf: 'dovere',
    es: 'deber / tener que',
    fut: 'dovr',
    forms: {
      presente: ['devo', 'devi', 'deve', 'dobbiamo', 'dovete', 'devono'],
      congiuntivo: ['debba', 'debba', 'debba', 'dobbiamo', 'dobbiate', 'debbano'],
    },
  },
  {
    inf: 'sapere',
    es: 'saber',
    fut: 'sapr',
    forms: {
      presente: ['so', 'sai', 'sa', 'sappiamo', 'sapete', 'sanno'],
      congiuntivo: ['sappia', 'sappia', 'sappia', 'sappiamo', 'sappiate', 'sappiano'],
    },
  },
  {
    inf: 'uscire',
    es: 'salir',
    aux: 'essere',
    forms: {
      presente: ['esco', 'esci', 'esce', 'usciamo', 'uscite', 'escono'],
      congiuntivo: ['esca', 'esca', 'esca', 'usciamo', 'usciate', 'escano'],
    },
    note: 'Falso amigo: “salire” significa subir. Salir = uscire.',
  },
  {
    inf: 'bere',
    es: 'beber / tomar',
    pp: 'bevuto',
    fut: 'berr',
    imp: 'bev',
    forms: {
      presente: ['bevo', 'bevi', 'beve', 'beviamo', 'bevete', 'bevono'],
      congiuntivo: ['beva', 'beva', 'beva', 'beviamo', 'beviate', 'bevano'],
    },
  },
  {
    inf: 'rimanere',
    es: 'quedarse / permanecer',
    aux: 'essere',
    pp: 'rimasto',
    fut: 'rimarr',
    forms: {
      presente: ['rimango', 'rimani', 'rimane', 'rimaniamo', 'rimanete', 'rimangono'],
      congiuntivo: ['rimanga', 'rimanga', 'rimanga', 'rimaniamo', 'rimaniate', 'rimangano'],
    },
  },
  {
    inf: 'tenere',
    es: 'tener (sostener)',
    pp: 'tenuto',
    fut: 'terr',
    forms: {
      presente: ['tengo', 'tieni', 'tiene', 'teniamo', 'tenete', 'tengono'],
      congiuntivo: ['tenga', 'tenga', 'tenga', 'teniamo', 'teniate', 'tengano'],
    },
    note: '“Tener” en el sentido de poseer es “avere”. Tenere = sostener, guardar.',
  },
  {
    inf: 'scegliere',
    es: 'elegir',
    pp: 'scelto',
    forms: {
      presente: ['scelgo', 'scegli', 'sceglie', 'scegliamo', 'scegliete', 'scelgono'],
      congiuntivo: ['scelga', 'scelga', 'scelga', 'scegliamo', 'scegliate', 'scelgano'],
    },
  },
  {
    inf: 'piacere',
    es: 'gustar',
    aux: 'essere',
    pp: 'piaciuto',
    forms: {
      presente: ['piaccio', 'piaci', 'piace', 'piacciamo', 'piacete', 'piacciono'],
      congiuntivo: ['piaccia', 'piaccia', 'piaccia', 'piacciamo', 'piacciate', 'piacciano'],
    },
    note: 'Funciona como gustar: mi piace il caffè, mi piacciono i libri.',
  },

  // -are regulares
  { inf: 'parlare', es: 'hablar' },
  { inf: 'mangiare', es: 'comer', note: 'Mangi, mangiamo, mangerò: la i desaparece ante e/i.' },
  { inf: 'lavorare', es: 'trabajar' },
  { inf: 'abitare', es: 'vivir (residir)' },
  { inf: 'studiare', es: 'estudiar' },
  { inf: 'cercare', es: 'buscar', note: 'Cerchi, cercherò: se agrega h para mantener el sonido /k/.' },
  { inf: 'pagare', es: 'pagar', note: 'Paghi, pagherò: se agrega h para mantener el sonido /g/.' },
  { inf: 'cominciare', es: 'empezar' },
  { inf: 'guardare', es: 'mirar', note: 'Falso amigo: “guardar” es mettere via / conservare.' },
  { inf: 'ascoltare', es: 'escuchar' },
  { inf: 'comprare', es: 'comprar' },
  { inf: 'aspettare', es: 'esperar (aguardar)', note: '“Esperar” con esperanza es “sperare”.' },
  { inf: 'tornare', es: 'volver', aux: 'essere' },
  { inf: 'arrivare', es: 'llegar', aux: 'essere' },
  { inf: 'entrare', es: 'entrar', aux: 'essere' },
  { inf: 'trovare', es: 'encontrar' },
  { inf: 'pensare', es: 'pensar' },
  { inf: 'chiamare', es: 'llamar' },
  { inf: 'giocare', es: 'jugar', note: 'Giochi, giocherò. Jugar es giocare; tocar un instrumento es suonare.' },
  { inf: 'lasciare', es: 'dejar' },

  // -ere
  { inf: 'prendere', es: 'tomar / agarrar', pp: 'preso' },
  { inf: 'vedere', es: 'ver', pp: 'visto', fut: 'vedr' },
  { inf: 'leggere', es: 'leer', pp: 'letto' },
  { inf: 'scrivere', es: 'escribir', pp: 'scritto' },
  { inf: 'mettere', es: 'poner', pp: 'messo' },
  { inf: 'chiudere', es: 'cerrar', pp: 'chiuso' },
  { inf: 'vivere', es: 'vivir', pp: 'vissuto', fut: 'vivr' },
  { inf: 'credere', es: 'creer' },
  { inf: 'conoscere', es: 'conocer', pp: 'conosciuto' },
  { inf: 'perdere', es: 'perder', pp: 'perso' },
  { inf: 'rispondere', es: 'responder', pp: 'risposto' },
  { inf: 'chiedere', es: 'preguntar / pedir', pp: 'chiesto' },
  { inf: 'correre', es: 'correr', pp: 'corso' },
  { inf: 'decidere', es: 'decidir', pp: 'deciso' },
  { inf: 'vendere', es: 'vender' },

  // -ire
  { inf: 'dormire', es: 'dormir' },
  { inf: 'partire', es: 'partir / salir de viaje', aux: 'essere' },
  { inf: 'sentire', es: 'sentir / oír' },
  { inf: 'aprire', es: 'abrir', pp: 'aperto' },
  { inf: 'offrire', es: 'ofrecer / invitar', pp: 'offerto' },
  { inf: 'capire', es: 'entender', isc: true },
  { inf: 'finire', es: 'terminar', isc: true },
  { inf: 'preferire', es: 'preferir', isc: true },
  { inf: 'pulire', es: 'limpiar', isc: true },
]
