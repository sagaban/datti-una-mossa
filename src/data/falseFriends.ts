export interface FalseFriend {
  it: string
  /** significado real */
  means: string
  /** lo que un hispanohablante tiende a creer */
  trap: string
  /** cómo se dice la trampa en italiano */
  trapIt: string
}

export const FALSE_FRIENDS: FalseFriend[] = [
  { it: 'burro', means: 'manteca', trap: 'burro (animal)', trapIt: 'asino' },
  { it: 'salire', means: 'subir', trap: 'salir', trapIt: 'uscire' },
  { it: 'guardare', means: 'mirar', trap: 'guardar', trapIt: 'mettere via' },
  { it: 'caldo', means: 'caliente / calor', trap: 'caldo (sopa)', trapIt: 'brodo' },
  { it: 'camera', means: 'habitación', trap: 'cámara', trapIt: 'macchina fotografica' },
  { it: 'aceto', means: 'vinagre', trap: 'aceite', trapIt: 'olio' },
  { it: 'largo', means: 'ancho', trap: 'largo', trapIt: 'lungo' },
  { it: 'subito', means: 'enseguida', trap: 'de repente', trapIt: 'improvvisamente' },
  { it: 'gamba', means: 'pierna', trap: 'gamba (camarón)', trapIt: 'gambero' },
  { it: 'imbarazzata', means: 'avergonzada', trap: 'embarazada', trapIt: 'incinta' },
  { it: 'tirare', means: 'tirar de / jalar', trap: 'tirar (a la basura)', trapIt: 'buttare' },
  { it: 'aspettare', means: 'esperar (aguardar)', trap: 'aspecto', trapIt: 'aspetto' },
  { it: 'topo', means: 'ratón', trap: 'topo (animal)', trapIt: 'talpa' },
  { it: 'pronto', means: '¿hola? (al teléfono) / listo', trap: 'pronto (enseguida)', trapIt: 'presto' },
  { it: 'presto', means: 'pronto / temprano', trap: 'prestado', trapIt: 'prestato' },
  { it: 'fermare', means: 'detener', trap: 'firmar', trapIt: 'firmare' },
  { it: 'rumore', means: 'ruido', trap: 'rumor', trapIt: 'voce / diceria' },
  { it: 'seta', means: 'seda', trap: 'seta (hongo)', trapIt: 'fungo' },
  { it: 'vaso', means: 'maceta / frasco', trap: 'vaso (para beber)', trapIt: 'bicchiere' },
  { it: 'carta', means: 'papel', trap: 'carta (correo)', trapIt: 'lettera' },
  { it: 'negozio', means: 'tienda', trap: 'negocio (trato)', trapIt: 'affare' },
  { it: 'nudo', means: 'desnudo', trap: 'nudo', trapIt: 'nodo' },
  { it: 'stanza', means: 'habitación / cuarto', trap: 'estancia (campo)', trapIt: 'tenuta' },
  { it: 'palestra', means: 'gimnasio', trap: 'palestra (tribuna)', trapIt: 'tribuna' },
  { it: 'officina', means: 'taller', trap: 'oficina', trapIt: 'ufficio' },
  { it: 'tenda', means: 'carpa / cortina', trap: 'tienda', trapIt: 'negozio' },
  { it: 'esito', means: 'resultado', trap: 'éxito', trapIt: 'successo' },
  { it: 'brutto', means: 'feo', trap: 'bruto', trapIt: 'rozzo' },
  { it: 'gonna', means: 'pollera / falda', trap: 'gana', trapIt: 'voglia' },
  { it: 'autista', means: 'chofer', trap: 'autista (TEA)', trapIt: 'autistico' },
  { it: 'camino', means: 'chimenea', trap: 'camino', trapIt: 'cammino / strada' },
  { it: 'salato', means: 'salado', trap: 'salteado', trapIt: 'saltato' },
  { it: 'morbido', means: 'suave / blando', trap: 'mórbido', trapIt: 'morboso' },
  { it: 'ginnasio', means: 'liceo clásico (escuela)', trap: 'gimnasio', trapIt: 'palestra' },
  { it: 'macchina', means: 'auto / coche', trap: 'máquina (sólo)', trapIt: 'macchinario' },
  { it: 'cattivo', means: 'malo', trap: 'cautivo', trapIt: 'prigioniero' },
  { it: 'bravo', means: 'bueno / hábil', trap: 'bravo (enojado)', trapIt: 'arrabbiato' },
  { it: 'parenti', means: 'parientes', trap: 'padres', trapIt: 'genitori' },
  { it: 'squadra', means: 'equipo', trap: 'escuadra', trapIt: 'flotta' },
]
