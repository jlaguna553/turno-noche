# TURNO NOCHE

**Terror en primera persona para navegador y móvil.** Estación de bombeo «Planta Baja», Sector 07,
03:47. Once meses cerrada. Usted es el contratista del turno de noche.

[![Jugar en GitHub Pages](https://img.shields.io/badge/JUGAR-GitHub%20Pages-8e1f14?style=flat-square)](https://jlaguna553.github.io/turno-noche/)
[![PWA](https://img.shields.io/badge/PWA-offline-4b5d4b?style=flat-square)](#instalar-como-app-pwa)
[![Tests](https://img.shields.io/badge/tests-47%20unit%20%2B%2049%20E2E-4b5d4b?style=flat-square)](#pruebas)

![Portada de TURNO NOCHE](docs/screenshots/title.jpg)

> **Aviso de contenido.** Terror psicológico, sustos repentinos, luces intermitentes, sonido de
> alta intensidad y espacios cerrados. Se recomienda jugar con auriculares. No apto para personas
> sensibles a la oscuridad o al ruido.

---

## Qué es

Un juego de terror (una sesión de 15 a 25 minutos) construido como **PWA**: se abre en el
navegador, se instala en la pantalla de inicio y funciona **sin conexión** tras la primera carga.
Sin descargas, sin cuentas, sin servidor.

- **Motor:** three.js r187 (WebGL2) + Rapier 0.21 (WASM). Física de personaje con el modelo de
  movimiento de Source (fricción + `accelerate`, autostep, crouch con collider real).
- **Arte y audio:** 100 % procedurales. Texturas, geometría, criaturas, efectos y voces se generan
  por código en el navegador. Cero assets externos.
- **Nivel:** planta de bombeo con **diez zonas**, tres breakers, **diez notas**, **tres placas de
  tripulación**, **tres fusibles**, taquillas para esconderse, botellas para distraer y un
  montacargas con **tres finales**.
- **Criaturas:** el huésped (dos metros, visión en cono, oído y persecución A*) y las crías de la
  cisterna (seis patas, se lanzan a la cara y delatan su posición).
- **Interfaz:** React 19 sobre el canvas; el motor 3D no usa reconciliación en el camino caliente.
- **Móvil:** stick analógico, arrastre de cámara, botones de acción, pantalla completa y orientación
  horizontal.

## Novedades de la v1.1

- **Tres alas nuevas:** Archivo, Calderas y Cisterna, con su propio arte, luces, props y sustos.
- **Más lore:** de 5 a **10 notas**; fichas de Ríos, Vela y Duarte con historias cruzadas.
- **Objetivo secundario:** los tres fusibles restauran el alumbrado de emergencia.
- **Final secreto:** las tres placas + los tres fusibles desbloquean la tercera salida
  (**QUEDARSE**), además de Subir e Inundar.
- **Bestiario y archivo:** el diario tiene pestañas de Notas, Tripulación, Bestiario y Controles.
- **Botellas:** `Q` lanza una botella; el cristal roto fija un señuelo y aparta al huésped.
- **Crías:** acechan, chillan, se enganchan a la cara y hay que arrancarlas con `E`.
- **Animación nueva:** el huésped tiene siete poses (idle, walk, run, lunge, attack, emerge, peek),
  piernas con rodilla/tobillo, cabeza que sigue la cámara, bata con movimiento secundario y
  aliento en niebla. La primera persona tiene linterna y mano animadas; la muerte deja caer la
  linterna al suelo.

## Cómo se juega

Reactive **B1** (sala de bombas), **B2** (taller) y **B3** (subestación). Después vuelva al
montacargas de la garita. Algo patrulla la planta, oye sus pasos y ve su linterna.

Opcional, pero recompensado:

- **Tres fusibles** (Archivo, Calderas, Cisterna): restauran la luz de emergencia y hacen la planta
  menos hostil.
- **Tres placas de tripulación**: reconstruyen quién era el turno 07/11 y desbloquean el bestiario.
- **Las tres placas y los tres fusibles** habilitan una tercera opción en el montacargas.

| Tecla | Acción |
| --- | --- |
| `WASD` | moverse |
| `SHIFT` | correr (hace mucho ruido) |
| `CTRL` / `C` | agacharse (casi silencio) |
| `E` | interactuar: notas, placas, fusibles, breakers, taquillas, montacargas, radio |
| `E` | arrancar una cría de la cara cuando se engancha |
| `F` | linterna |
| `Q` | lanzar botella (señuelo de ruido) |
| `TAB` | diario / archivo / bestiario |
| `ESC` | pausa |

En móvil: stick a la izquierda, arrastre a la derecha y botones **USAR / CORRER / AGACHAR /
LINTERNA / LANZAR / DIARIO / II**. El dispositivo se juega en horizontal.

### Lo que hay que saber para sobrevivir

- **La linterna es una elección.** Ilumina, pero también alarga el alcance visual del huésped.
  La batería se agota; hay pilas repartidas por la planta.
- **Correr es ruidoso.** Agacharse reduce el ruido y la altura de la cámara. La criatura investiga
  los ruidos aunque no le vea.
- **Las taquillas con marca blanca son escondites.** Dentro no puede moverse; la vista queda
  reducida a una rendija. `E` para salir.
- **Las botellas son información.** El ruido del cristal crea un punto de investigación lejos de
  usted; úselo para cruzar un pasillo o llegar a un fusible.
- **Las crías son un aviso, no un combate.** La luz directa las ahuyenta; el ruido las atrae. Si se
  enganchan, `E` para arrancarlas y no corra: el huésped ya sabe dónde está.
- **Los breakers hacen ruido.** Cada uno cambia el estado de la planta y el comportamiento de la
  criatura. El tercero la despierta del todo.
- **La radio de la garita da pistas** si no sabe dónde ir. El HUD marca el siguiente objetivo.
- **El diario recuerda.** Las pestañas de Tripulación y Bestiario se completan con lo que encuentra.
- **Los sustos no son solo scripted.** Hay eventos ambientales (golpes en tuberías, vapor, pasos
  lejanos, susurros, luces que mueren, el agua de la cisterna) además de las apariciones
  guionizadas.

## Capturas

| Juego en escritorio | Archivo, turno 07/11 |
| --- | --- |
| ![Juego](docs/screenshots/gameplay.jpg) | ![Archivo](docs/screenshots/archivo.jpg) |

| Cisterna: algo sale del agua | La cría en la cara |
| --- | --- |
| ![Cisterna](docs/screenshots/cisterna.jpg) | ![Cría](docs/screenshots/latch.jpg) |

| Archivo del operario | Elección final |
| --- | --- |
| ![Diario](docs/screenshots/journal.jpg) | ![Tres finales](docs/screenshots/choice.jpg) |

| Final C · El relevo | Juego en móvil |
| --- | --- |
| ![Final](docs/screenshots/final.jpg) | ![Móvil](docs/screenshots/mobile.jpg) |

## Jugar

**En línea:** <https://jlaguna553.github.io/turno-noche/>

### Instalar como app (PWA)

- **Android / Chrome:** abra la URL, menú → «Añadir a la pantalla de inicio» / «Instalar
  aplicación». Se abre a pantalla completa en horizontal.
- **iOS / Safari:** Compartir → «Añadir a pantalla de inicio».
- **Escritorio / Chrome o Edge:** icono de instalar en la barra de direcciones.

El service worker precachea el shell y los assets de la build; tras la primera carga el juego
arranca **sin red**, verificado en el QA (modo offline de Chromium).

## Ejecutar en local

Requisitos: **Node 20.19+** (probado en 20.20 y CI en 22) y un navegador con WebGL2.

```bash
npm install
npm run dev        # http://localhost:5180
```

```bash
npm run typecheck  # tsc --noEmit
npm test           # vitest: 47 pruebas
npm run build      # tsc + vite build -> dist/
npm run preview    # sirve dist/ en :4173
npm run icons      # regenera los iconos PWA procedurales
```

Para probar la PWA en local use `npm run build && npm run preview`: en `vite dev` el service
worker no se registra a propósito.

## Cómo está hecho

```text
src/
├── main.tsx / App.tsx        orquestación UI ↔ motor, fases y pantallas
├── game/
│   ├── engine.ts             loop 60 Hz, interacción, IA, objetivos, coleccionables,
│   │                         botellas, crías, checkpoint/muerte, finales
│   ├── core/                 bus tipado, input (teclado/táctil), config, guardado v2, PRNG
│   ├── physics/              mundo Rapier y raycasts
│   ├── player/               controlador Source-like + matemática de movimiento pura
│   ├── render/               materiales procedurales y post-proceso PSX/VHS
│   ├── audio/                WebAudio procedural: drones, latidos, pasos, criaturas, radio
│   ├── logic/                estado puro y testeable: objetivos, fusibles, fichas, batería,
│   │                         FSM del huésped y de las crías, guion, bestiario, finales
│   └── world/                layout de 10 zonas, A*, props, huésped, crías, viewmodel
├── ui/                       portada, prólogo, HUD, táctil, pausa, archivo, muerte, finales
└── public/                   manifest, service worker e iconos
```

Decisiones que sostienen el juego:

- **Un solo cuerpo fijo de Rapier** para toda la geometría estática; el jugador y el huésped son
  cápsulas cinemáticas con `KinematicCharacterController`.
- **Simulación a 60 Hz fijos** con acumulador y cámara interpolada; el render nunca cambia la
  física.
- **Datos puros en `logic/`**: los cerebros del huésped y de las crías, la batería, los objetivos y
  el guardado se prueban en vitest sin DOM ni WebGL.
- **Post-proceso único** (bloom tenue + grading con viñeta, grano, aberración, tramado ordenado,
  scanlines y bandas VHS). `uFear` corrompe la imagen cuando la criatura se acerca: el miedo se
  ve, no solo se cuenta.
- **Animación por jerarquía de articulaciones**, no por esqueleto importado: cadera, rodilla,
  tobillo, hombro, codo, muñeca, cuello y mandíbula. Las poses se interpolan y los pies buscan el
  suelo.
- **Resolución interna reducida** (0,56× / 0,70× / 0,86× según calidad) y escalado con
  `image-rendering: pixelated`: estética PSX y más fotogramas en GPU móvil.
- **Audio espacializado**: la respiración del huésped se panea según su dirección relativa y sube
  con la cercanía. Es el canal de información principal.
- **Guardado local v2** de breakers, notas, fichas, fusibles, botellas, muertes, tiempo y final;
  migra partidas v1 sin perder progreso. El checkpoint es la garita.

### Por qué no se usan assets de Valve (ni de nadie)

La petición original hablaba de reutilizar personajes y criaturas de Valve. **Eso no es legal**:
los modelos, texturas, sonidos y nombres de Half-Life siguen siendo propiedad de Valve aunque se
modifiquen, y subirlos a GitHub es una infracción. Este proyecto hace lo contrario:

- **Cero material de terceros.** Cada textura, malla, sonido y línea de guion es original y se
  genera por código.
- **La inspiración es de género, no de material.** El look GoldSrc/PSX (baja resolución, niebla,
  luces fluorescentes, geometría industrial) se consigue con shaders y arte procedural, no
  copiando assets.
- **Se reutiliza el motor, no el contenido.** La base de motor web (three.js + Rapier, física
  Source-like, PWA) viene del arnés de **half-web / PACKETWORKS**, código del mismo autor; el
  contenido de aquel juego (redes, VLAN, reparto) no se ha portado.

El resultado es un juego publicable, instalable y legal, con la misma sensación de FPS de terror
industrial.

## Pruebas

```bash
npm test                      # 47 pruebas unitarias
node scripts/e2e-smoke.mjs    # requiere npm run dev y Chromium
```

- **Vitest (47):** objetivos, notas, fichas, fusibles y final secreto; batería y ruido; FSM del
  huésped (visión, oído, linterna, escondite, agresividad, alertas y señuelos); FSM de las crías
  (acecho, persecución, luz, enganche y huida); guardado v2 y migración desde v1; navegación A* y
  simetría del grafo; integridad del layout de las diez zonas, props y coleccionables; textos de
  prólogo, bestiario y los tres finales.
- **QA E2E (49 comprobaciones)** con Chromium real y SwiftShader: portada → prólogo → nota con
  `E` → diario → Archivo con nota, placa y fusible → pestañas de Tripulación y Bestiario →
  botella con señuelo → cría enganchada y arrancada → susto de la sala de bombas → B1 con
  interacción real → linterna → escondite y salida → tres breakers → tres placas y tres fusibles →
  tercera salida → final C → persistencia tras recargar → muerte y reintento → controles táctiles,
  LANZAR y pausa en viewport 844×390.
- **QA PWA:** manifiesto, iconos, service worker controlando la página, 12 entradas en caché
  (shell + assets con hash) y arranque completo del juego **con la red desconectada**.
- El E2E falla ante cualquier error de consola. Evidencia de la última pasada: **49/49, 0 fallos,
  0 errores de consola**.

### Rendimiento y peso (medido en esta build)

| Chunk | Raw | gzip |
| --- | --- | --- |
| `index` (UI + lógica + App) | 50 KB | 16 KB |
| `engine` (mundo, IA, narrativa) | 146 KB | 44 KB |
| `react` | 219 KB | 68 KB |
| `three` | 591 KB | 144 KB |
| `rapier` (WASM base64) | 4,33 MB | 1,65 MB |
| CSS | 32 KB | 8 KB |
| **Total** | **~5,4 MB** | **~1,9 MB** |

Rapier es ~81 % del peso. La pantalla de arranque pinta antes de cargar el motor (import
dinámico). En el QA headless con SwiftShader se miden 10–20 fps: es render por software, no
representativo de una GPU real. En móvil la calidad arranca en `low` (resolución interna 0,56×).

## Límites honestos

- Un único escenario, dos tipos de criatura y un final por partida. La animación es procedural
  (jerarquías, poses y mezclas por código), no captura de movimiento ni esqueletos importados.
- El audio se genera y ejecuta sin errores, pero la mezcla final no se ha escuchado en un
  dispositivo físico; conviene ajustar el volumen con auriculares.
- Guardado local al navegador; borrar los datos del sitio borra el turno.
- Sin multijugador, sin cuentas, sin nube.
- Si el navegador rechaza `requestPointerLock`, se puede mirar arrastrando con el botón izquierdo;
  el juego avisa con la pausa.
- El nivel es contenido, no fontanería: añadir zonas es editar `world/layout.ts`.

## Créditos

- Diseño, código, arte procedural, audio y guion: **Javier Laguna**.
- Motor base y arquitectura de referencia: arnés de **half-web / PACKETWORKS** (código propio).
- Inspiración estética: shooters industriales de finales de los 90, terror analógico y plantas de
  bombeo reales. Sin material copiado.

## Licencia

Código bajo licencia **MIT** (ver [`LICENSE`](LICENSE)). El arte y el audio se generan por código
dentro de este repositorio y quedan cubiertos por la misma licencia. No se incluye ni se
redistribuye material de Valve, Half-Life ni de terceros.
