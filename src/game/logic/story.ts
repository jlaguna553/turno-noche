import type { BestiaryEntry, BreakerId, CrewTag, EndingId, FuseRecord, NoteRecord } from '../core/bus';

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
  {
    id: 'archivo-turno',
    title: 'RELACIÓN DEL TURNO 07/11',
    author: 'J. Alarcón · Jefa de planta',
    zone: 'archivo',
    lines: [
      'Turno de noche: Alarcón (jefatura), Vela (bombas), Ríos (electricidad), Duarte (pozo), Ortiz (mantenimiento), Salas (contratista).',
      'Salas no figura en el parte de salida. Su taquilla sigue cerrada y su ficha sigue activa.',
      'He tachado su nombre tres veces. Vuelve a aparecer. El sistema no acepta que se haya quedado abajo.',
    ],
  },
  {
    id: 'informe-psicologico',
    title: 'INFORME CONFIDENCIAL · SALAS',
    author: 'Servicio médico · Planta Baja',
    zone: 'archivo',
    lines: [
      'El contratista Salas refiere insomnio, ruido de agua en los conductos y una voz que repite su nombre desde la cisterna.',
      'Se le retira la linterna por indicación de seguridad. A las 03:47 la reclama en recepción. A las 03:49 la linterna está en el fondo del pozo.',
      'No se recomienda continuar el turno. No se recomienda interrumpirlo.',
    ],
  },
  {
    id: 'calderas-presion',
    title: 'REGISTRO DE CALDERAS',
    author: 'M. Vela · técnico de bombas',
    zone: 'calderas',
    lines: [
      'Las calderas llevan once meses apagadas. El agua de los circuitos sigue a 38 grados.',
      'Cada vez que abro la purga, el vapor sale con forma de persona y se deshace antes de tocar el techo.',
      'He dejado de abrir la purga. Ahora la oigo abrirse sola a las 03:47.',
    ],
  },
  {
    id: 'cisterna-cadena',
    title: 'NOTA DE MANTENIMIENTO · CISTERNA',
    author: 'S. Duarte · operadora de pozo',
    zone: 'cisterna',
    lines: [
      'Las cadenas del pozo no sujetan la compuerta. Sujetan lo que hay debajo.',
      'Hoy he contado siete cadenas. Ayer había seis. La séptima está tensa y viene del agua.',
      'Si baja a la cisterna y ve las cadenas moverse, no se acerque a la orilla. No es la corriente.',
    ],
  },
  {
    id: 'carta-sin-firma',
    title: 'CARTA SIN FIRMA',
    author: 'Turno anterior',
    zone: 'cisterna',
    lines: [
      'Si estás leyendo esto, ya has oído la voz. No es VERA. VERA solo repite lo que grabamos nosotros.',
      'Yo me quedé para cerrar la compuerta. No me arrepiento. Pero el agua no me dejó terminar.',
      'Hay una tercera salida. Ni subir ni inundar: quedarse. Si has reunido las fichas y has devuelto la luz, la planta te acepta como relevo.',
      'No es una vida. Es un turno que no termina.',
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
  archivo: [
    'El archivo guarda el turno 07/11. No busque su propia ficha: todavía no existe.',
    'Hay una caja fuerte detrás de los archivadores. La llave la llevaba Vela.',
  ],
  calderas: [
    'Las calderas llevan once meses apagadas. Si cantan, no contestes.',
    'Hay algo pequeño moviéndose entre las tuberías. No use la linterna de golpe.',
  ],
  cisterna: [
    'No se acerque a la orilla. Las cadenas no sujetan la compuerta.',
    'El agua está demasiado quieta para ser agua.',
  ],
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

export const CREW_TAGS: CrewTag[] = [
  {
    id: 'tag-rios',
    name: 'T. RÍOS',
    role: 'ELECTRICISTA',
    zone: 'archivo',
    lines: [
      'Placa de latón, mordida por el óxido. La foto del reverso está borrada.',
      'Ríos firmó el último rearme de B3. Su letra tiembla en la última línea: «no es la corriente, es el agua».',
      'La cadena de la placa está rota por el cierre, como si alguien la hubiera arrancado del cuello.',
    ],
  },
  {
    id: 'tag-vela',
    name: 'M. VELA',
    role: 'TÉCNICO DE BOMBAS',
    zone: 'calderas',
    lines: [
      'La placa huele a vapor y a hierro. Detrás hay una llave pequeña, sin puerta conocida.',
      'Vela anotó en el reverso: «B2 a las 03:47. Si la caldera canta, no contestes».',
      'La llave encaja en la caja fuerte del archivo. Alguien la llevaba encima cuando dejó de ser una persona.',
    ],
  },
  {
    id: 'tag-duarte',
    name: 'S. DUARTE',
    role: 'OPERADORA DE POZO',
    zone: 'cisterna',
    lines: [
      'La placa está húmeda aunque la cisterna lleve meses sin bombear.',
      'Duarte dibujó siete marcas en el borde. La séptima está tachada y reescrita más abajo, como si se hubiera movido.',
      'En el reverso: «La compuerta se abre desde dentro. No la cierres con la mano».',
    ],
  },
];

export const FUSES: FuseRecord[] = [
  {
    id: 'fuse-archivo',
    label: 'FUSIBLE F1 · ARCHIVO',
    zone: 'archivo',
    lines: ['Cerámica y filamento grueso. Restaura el alumbrado del ala este.'],
  },
  {
    id: 'fuse-calderas',
    label: 'FUSIBLE F2 · CALDERAS',
    zone: 'calderas',
    lines: ['El fusible está caliente. La caldera lleva once meses apagada.'],
  },
  {
    id: 'fuse-cisterna',
    label: 'FUSIBLE F3 · CISTERNA',
    zone: 'cisterna',
    lines: ['El filamento brilla solo cuando la linterna lo enfoca.'],
  },
];

export const FUSE_LINES: Record<string, string[]> = {
  'fuse-archivo': ['F1 restaurado. El ala este vuelve a tener luz.'],
  'fuse-calderas': ['F2 restaurado. La caldera ha dejado de golpear. Por ahora.'],
  'fuse-cisterna': ['F3 restaurado. Alumbrado de emergencia completo.'],
};

export const FUSE_COMPLETE_LINES = [
  'Los tres fusibles están en línea. La planta ya no está a oscuras.',
  'Eso también significa que él ya no necesita la linterna para encontrarla.',
];

export const TAG_LINES: Record<string, string[]> = {
  'tag-rios': ['Placa de T. Ríos. El sistema de personal acaba de marcarla como «presente».'],
  'tag-vela': ['Placa de M. Vela. La llave pequeña encaja en algo del archivo.'],
  'tag-duarte': ['Placa de S. Duarte. La cisterna huele a agua dulce. No hay agua dulce aquí.'],
};

export const BESTIARY: BestiaryEntry[] = [
  {
    id: 'huesped',
    title: 'EL HUÉSPED',
    subtitle: 'Criatura principal · 2,2 m',
    unlock: 'notes',
    body: [
      'Camina erguido, demasiado despacio para su tamaño. La bata es de un turno anterior. Debajo no hay paciente: hay conductos.',
      'Ve con cono estrecho y oye mejor de lo que ve. La linterna le ayuda a fijar la distancia; correr le da la dirección.',
      'No mata por hambre. Mata por relevo.',
    ],
  },
  {
    id: 'crias',
    title: 'LAS CRÍAS',
    subtitle: 'Criaturas pequeñas · cisterna',
    unlock: 'tags',
    body: [
      'Seis patas, ninguna simetría. Se mueven en grupo y chillan cuando encuentran algo que respira.',
      'La luz directa las ahuyenta. El ruido las llama. Si se lanzan a la cara, hay que arrancarlas con la mano libre.',
      'No son el huésped. Son lo que el huésped dejó en el pozo.',
    ],
  },
  {
    id: 'vera',
    title: 'VERA',
    subtitle: 'Operadora de voz · canal 7',
    unlock: 'fuses',
    body: [
      'No es una inteligencia. Es un sistema de megafonía entrenado con las voces del turno 07/11.',
      'Repite partes, avisa de peligros y, a veces, responde a preguntas que nadie ha hecho.',
      'Cuando dice «contratista», está leyendo una ficha. Cuando dice su nombre, está improvisando.',
    ],
  },
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
  stay: {
    title: 'QUEDARSE',
    subtitle: 'FINAL C · EL RELEVO',
    lines: [
      'No sube. No inunda. Cierra la puerta del montacargas desde dentro y devuelve la llave al panel.',
      'Las tres placas pesan en el bolsillo. Los tres fusibles zumban. La planta le reconoce como personal activo.',
      'El huésped aparece al fondo del pasillo. No corre. Espera, con la cabeza ladeada, como un compañero de turno.',
      'VERA anuncia la hora: «03:47. Turno de noche cubierto. Bienvenido al relevo.»',
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
  'Q lanza una botella. El ruido del cristal lejos de usted puede salvarle el turno.',
  'Las tres fichas y los tres fusibles abren una tercera salida en el montacargas.',
];
