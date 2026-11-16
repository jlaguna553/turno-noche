import type { BreakerId, EndingId, NoteRecord } from '../core/bus';

/**
 * Guion y textos. Data pura: sin DOM, sin motor. Los ids de zona coinciden con
 * `world/layout.ts` y los tests lo verifican.
 */

export const GAME_TITLE = 'TURNO NOCHE';
export const GAME_SUBTITLE = 'SECTOR 07 // PLANTA BAJA';
export const GAME_TAGLINE = 'No estás solo en la planta.';

export interface IntroBeat {
  speaker: string | null;
  text: string;
  hold: number;
}

export const INTRO: IntroBeat[] = [
  { speaker: null, text: 'ESTACIÓN DE BOMBEO «PLANTA BAJA» · SECTOR 07', hold: 2.6 },
  { speaker: null, text: '03:47. El turno de noche lleva once meses cerrado.', hold: 3 },
  {
    speaker: 'VERA',
    text: 'Contratista, bienvenido. La planta está en cuarentena administrativa. No hay nadie dentro.',
    hold: 4.4,
  },
  {
    speaker: 'VERA',
    text: 'Su trabajo es sencillo: rearme B1, B2 y B3. Después podrá subir. No toque nada más.',
    hold: 4.6,
  },
  {
    speaker: 'VERA',
    text: 'Ah. Y si oye algo por los conductos, no conteste. El sistema de voz a veces imita a la gente.',
    hold: 5,
  },
];

export const NOTES: NoteRecord[] = [
  {
    id: 'parte-incidencia',
    title: 'PARTE DE INCIDENCIA 07/11',
    author: 'J. Alarcón · Jefa de planta',
    zone: 'guardia',
    lines: [
      '03:12. Salida de la bomba 2 por encima del nivel de rejilla. Protocolo: cerrar compuertas y esperar.',
      '03:40. La compuerta 2 se abre desde dentro.',
      '03:41. Se ordena evacuación por el montacargas. Seis personas. El ascensor sube con cinco.',
      'No se autoriza descenso hasta que la cisterna esté seca. No se autoriza descenso.',
    ],
  },
  {
    id: 'registro-pozo',
    title: 'REGISTRO DE PRESIÓN · POZO 1',
    author: 'Turno de mantenimiento',
    zone: 'sala-bombas',
    lines: [
      'El pozo no devuelve agua. Devuelve peso.',
      'Cada vez que abrimos la válvula de fondo, la línea de presión sube y luego alguien golpea la tubería desde el otro lado. Tres golpes. Siempre tres.',
      'Hoy hemos contado los golpes con el registro cerrado: también suenan.',
    ],
  },
  {
    id: 'cuaderno-taller',
    title: 'PÁGINAS SUELTAS DEL TALLER',
    author: 'V. Ortiz · técnico',
    zone: 'taller',
    lines: [
      'Día 6. La radio repite el parte de las 03:12 aunque no queda batería en la radio.',
      'Día 9. He puesto cinta en las rejillas. Si no veo los conductos, no oigo lo que camina dentro.',
      'Día 14. He entendido el sistema. La planta no está encendida: está despierta. Y tiene hambre de turno.',
      'Día 15. Si alguien lee esto, que rearme los tres breakers y suba. Que no mire atrás. Que no me busque.',
    ],
  },
  {
    id: 'taquilla-17',
    title: 'ETIQUETA DE TAQUILLA 17',
    author: 'Sin firma',
    zone: 'vestuario',
    lines: [
      'Dentro hay una foto del turno de noche: seis caras, una tachada con rotulador.',
      'Detrás, escrito con prisa: «Cuando la linterna se apague, él ya sabe dónde estás. La luz solo le ayuda a llegar antes.»',
      'La taquilla huele a agua estancada. La ropa de dentro todavía está mojada.',
    ],
  },
  {
    id: 'protocolo-inundacion',
    title: 'PROTOCOLO DE INUNDACIÓN · B3',
    author: 'J. Alarcón · Jefa de planta',
    zone: 'subestacion',
    lines: [
      'Si el huésped alcanza la superficie, la planta se inunda con el pozo 1. El montacargas queda inutilizado. Es una salida de una sola dirección.',
      'No he podido firmar la orden. Que conste que lo intenté.',
      'Alguien tiene que quedarse abajo para que la compuerta cierre. Que sea el turno de noche. Siempre es el turno de noche.',
    ],
  },
];

export function noteById(id: string): NoteRecord | undefined {
  return NOTES.find((note) => note.id === id);
}

export const ZONE_LINES: Record<string, string[]> = {
  guardia: [
    'El montacargas está bloqueado. Rearme la corriente y vuelva. No use las escaleras: no hay escaleras.',
  ],
  'pasillo-norte': [
    'Los conductos de esta ala están conectados con el pozo. Si escucha agua, no está lloviendo.',
  ],
  'sala-bombas': [
    'B1 está en el cuadro norte. La bomba 2 funciona sola desde el incidente. No se acerque a la rejilla.',
  ],
  taller: [
    'B2 está junto al banco de trabajo. Cuidado con las cuchillas: siguen girando.',
  ],
  'pasillo-sur': ['La subestación está al fondo. La puerta del vestuario se abre sola. No es el viento.'],
  vestuario: ['Taquillas 12 a 17. Usted puede usar una. Él también sabe abrirlas.'],
  subestacion: ['B3 es el último. Después de esto, la planta va a saber exactamente dónde está usted.'],
};

export const BREAKER_LINES: Record<BreakerId, string[]> = {
  b1: [
    'B1 rearmado. Bomba 2 en línea.',
    'Ha hecho ruido. Todo el edificio lo ha oído. Siga moviéndose.',
  ],
  b2: [
    'B2 rearmado. Iluminación de emergencia al 40 %.',
    '¿Puede oír eso? Es la puerta del vestuario. Yo no la he abierto.',
  ],
  b3: [
    'B3 rearmado. Corriente restablecida. Montacargas operativo.',
    'Contratista. Ya no hay ningún otro sitio al que ir. Corra.',
  ],
};

export const LIFT_LINES = {
  locked: ['El montacargas no responde. Faltan breakers: B1, B2 y B3.'],
  unlocked: [
    'Montacargas operativo. Elija: subir, o inundar el pozo desde el panel de B3.',
    'Si sube, la planta queda como está. Si inunda, se queda abajo. Piense rápido.',
  ],
};

export const ENTITY_WHISPERS = [
  'QUÉDATE',
  'TURNO',
  'TE VEO',
  'ABRE',
  'NO SUBAS',
  'AQUÍ',
];

export const ENDINGS: Record<EndingId, { title: string; subtitle: string; lines: string[] }> = {
  ascend: {
    title: 'SUBIR',
    subtitle: 'FINAL A · EL RELEVO',
    lines: [
      'La puerta del montacargas se cierra. La planta queda abajo, encendida, esperando.',
      'A las 04:02 el sistema registra una subida de presión en el pozo 1. A las 04:03 se abre la compuerta 2 desde dentro.',
      'En el parte del turno de día, VERA anota: «Operario recibido. Sustitución completada.»',
      'Al día siguiente, la empresa envía a otro contratista. Usted ya sabe lo que va a encontrar.',
    ],
  },
  flood: {
    title: 'INUNDAR EL POZO',
    subtitle: 'FINAL B · EL QUE SE QUEDA',
    lines: [
      'Abre la válvula de fondo. El agua sube por las rejillas, por los conductos, por las paredes.',
      'La criatura deja de perseguirle. Se queda quieta en el pasillo, mirando el agua, como si reconociera el sitio.',
      'La compuerta 2 cierra a la altura de su pecho. La planta se apaga por primera vez en once meses.',
      'En la última grabación de VERA se oye una voz humana: «Gracias. Nadie había querido quedarse.»',
    ],
  },
};

export const DEATH_LINES = [
  'La linterna rueda por el suelo. La planta vuelve a estar en silencio.',
  'No llegó al montacargas.',
  'El turno de noche no termina. Cambia de operario.',
];

export const HINTS = [
  'Correr hace ruido. Agacharse no.',
  'La linterna le ayuda a ver. También le ayuda a él.',
  'Las taquillas del vestuario sirven para esconderse. No para siempre.',
  'Los breakers están en la sala de bombas, el taller y la subestación.',
];
