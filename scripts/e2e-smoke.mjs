/**
 * QA end-to-end de TURNO NOCHE sobre Chromium real (headless + SwiftShader).
 *
 * Recorre: portada -> prologo -> juego -> sala de bombas (susto) -> breaker B1
 * con interaccion real -> vestuario -> linterna -> breakers restantes ->
 * decision final -> final -> persistencia tras recargar. Despues valida el
 * layout tactil en un viewport movil. Falla ante cualquier error de consola.
 *
 * Uso: npm run dev (otra terminal) y luego:
 *   node scripts/e2e-smoke.mjs
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.GAME_URL ?? 'http://127.0.0.1:5180/';
const CHROME =
  process.env.CHROME_PATH ??
  `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const OUT = join(process.cwd(), 'tmp', 'e2e');
mkdirSync(OUT, { recursive: true });

const failures = [];
const consoleErrors = [];
let checks = 0;

function check(condition, label) {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}`);
  }
}

async function waitForEngine(page, timeout = 45000) {
  await page.waitForFunction(() => Boolean(window.__turnoNoche), null, { timeout });
}

async function startGame(page, { touch = false } = {}) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.title-screen', { timeout: 45000 });
  await page.waitForFunction(
    () => Boolean(window.__turnoNoche) && !document.querySelector('.boot-bar'),
    null,
    { timeout: 90000 },
  );
  const button = page.locator('button', { hasText: touch ? 'DESCENDER' : 'DESCENDER' });
  await button.first().click();
  await page.waitForSelector('.intro-screen', { timeout: 15000 });
  await page.locator('.intro-skip').click();
  await page.waitForSelector('.hud-objective', { timeout: 30000 });
  await waitForEngine(page);
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    localStorage.setItem('turnonoche.settings.v1', JSON.stringify({ sensitivity: 1, invertY: false, volume: 0, quality: 'low' }));
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`);
  });

  console.log('1. Portada y prologo');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.title-screen', { timeout: 45000 });
  await page.waitForFunction(
    () => Boolean(window.__turnoNoche) && !document.querySelector('.boot-bar'),
    null,
    { timeout: 90000 },
  );
  await page.screenshot({ path: join(OUT, '01-title.png') });
  check((await page.locator('.game-title').innerText()).includes('TURNO NOCHE'), 'la portada muestra TURNO NOCHE');
  check(await page.locator('.title-warning').isVisible(), 'aviso de contenido visible');

  await page.locator('button', { hasText: 'DESCENDER' }).first().click();
  await page.waitForSelector('.intro-screen');
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, '02-intro.png') });
  await page.locator('.intro-skip').click();
  await page.waitForSelector('.hud-objective', { timeout: 30000 });
  await waitForEngine(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, '03-game-start.png') });

  const state0 = await page.evaluate(() => window.__turnoNoche.state());
  check(state0.snapshot.objective.id === 'breakers', 'objetivo inicial: rearmar breakers');
  check(state0.snapshot.notes.length === 0, 'sin notas al empezar');
  check(state0.snapshot.tags.length === 0 && state0.snapshot.fuses.length === 0, 'sin fichas ni fusibles al empezar');
  check(state0.snapshot.bottles === 3, 'la partida arranca con tres botellas');
  check(state0.snapshot.side.id === 'fuses', 'el HUD muestra el objetivo secundario de fusibles');
  check(!state0.dead, 'el jugador esta vivo');

  console.log('2. Nota, diario y escondite');
  await page.evaluate(() => {
    window.__turnoNoche.teleport(-2.25, -7.2, 0);
    window.__turnoNoche.look(0, -0.35);
  });
  await page.waitForSelector('.focus-prompt', { timeout: 12000 }).catch(() => undefined);
  const noteFocus = await page.evaluate(() => document.querySelector('.focus-prompt')?.textContent ?? '');
  check(noteFocus.includes('Leer') || noteFocus.includes('NOTA'), `la nota de la garita se enfoca (${noteFocus.trim() || 'sin foco'})`);
  await page.keyboard.press('e');
  await page.waitForTimeout(1000);
  const noted = await page.evaluate(() => window.__turnoNoche.state());
  check(noted.snapshot.notes.length >= 1, 'la nota se recoge con E');
  await page.keyboard.press('Tab');
  await page.waitForSelector('.journal-overlay', { timeout: 12000 });
  await page.waitForTimeout(800);
  check((await page.locator('.journal-card').innerText()).includes('PARTE DE INCIDENCIA'), 'el diario muestra la nota recogida');
  await page.screenshot({ path: join(OUT, '04b-diario.png') });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(600);

  console.log('2b. Contenido v1.1: archivo, placa, fusible, botella y cria');
  await page.evaluate(() => window.__turnoNoche.freeze(true));
  await page.evaluate(() => {
    window.__turnoNoche.teleport(18.2, -11.4, 0);
    window.__turnoNoche.look(0, -0.5);
  });
  await page.waitForSelector('.focus-prompt', { timeout: 15000 }).catch(() => undefined);
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  const archiveNote = await page.evaluate(() => window.__turnoNoche.state());
  check(archiveNote.snapshot.notes.includes('archivo-turno'), 'la nota del archivo se recoge');

  await page.evaluate(() => {
    window.__turnoNoche.teleport(16.5, -13.6, Math.PI);
    window.__turnoNoche.look(Math.PI, -0.7);
  });
  await page.waitForSelector('.focus-prompt', { timeout: 15000 }).catch(() => undefined);
  const tagFocus = await page.evaluate(() => document.querySelector('.focus-prompt')?.textContent ?? '');
  check(tagFocus.includes('placa') || tagFocus.includes('PLACA'), `la placa de Ríos se enfoca (${tagFocus.trim() || 'sin foco'})`);
  await page.keyboard.press('e');
  await page.waitForTimeout(800);
  const tagState = await page.evaluate(() => window.__turnoNoche.state());
  check(tagState.snapshot.tags.includes('tag-rios'), 'la placa de Ríos se recoge con E');

  await page.evaluate(() => {
    window.__turnoNoche.teleport(17.2, -15.2, Math.PI / 2);
    window.__turnoNoche.look(Math.PI / 2, -0.2);
  });
  await page.waitForSelector('.focus-prompt', { timeout: 15000 }).catch(() => undefined);
  await page.keyboard.press('e');
  await page.waitForTimeout(900);
  const fuseState = await page.evaluate(() => window.__turnoNoche.state());
  check(fuseState.snapshot.fuses.includes('fuse-archivo'), 'el fusible F1 se extrae con E');
  check(fuseState.snapshot.side.progress === 1, 'el objetivo secundario avanza a 1/3');
  await page.screenshot({ path: join(OUT, '04c-archivo.png') });

  await page.keyboard.press('Tab');
  await page.waitForSelector('.journal-overlay', { timeout: 12000 });
  await page.locator('.journal-tabs button', { hasText: 'TRIPULACIÓN' }).click();
  await page.waitForTimeout(600);
  const crewText = await page.locator('.journal-card').innerText();
  check(crewText.includes('T. RÍOS') && crewText.includes('FUSIBLE F1'), 'el diario muestra ficha y fusible');
  await page.locator('.journal-tabs button', { hasText: 'BESTIARIO' }).click();
  await page.waitForTimeout(600);
  const bestiaryText = await page.locator('.journal-card').innerText();
  check(bestiaryText.includes('EL HUÉSPED'), 'el bestiario se desbloquea con las notas');
  await page.screenshot({ path: join(OUT, '04d-bestiary.png') });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    window.__turnoNoche.teleport(21, -14, Math.PI);
    window.__turnoNoche.look(Math.PI, 0);
    window.__turnoNoche.bottles(3);
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('q');
  await page.waitForFunction(() => Boolean(window.__turnoNoche.state().lure), null, { timeout: 20000 }).catch(() => undefined);
  const thrown = await page.evaluate(() => window.__turnoNoche.state());
  check(thrown.snapshot.bottles === 2, 'la botella se lanza y descuenta inventario');
  check(Boolean(thrown.lure), 'el cristal roto fija un señuelo para la criatura');

  await page.evaluate(() => {
    window.__turnoNoche.teleport(-22.5, 6.5, Math.PI);
    window.__turnoNoche.look(Math.PI, 0);
    window.__turnoNoche.latch();
  });
  await page.waitForTimeout(900);
  const latched = await page.evaluate(() => window.__turnoNoche.state());
  check(latched.snapshot.latched, 'una cría se engancha a la cara');
  await page.screenshot({ path: join(OUT, '04e-latch.png') });
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  const unlatched = await page.evaluate(() => window.__turnoNoche.state());
  check(!unlatched.snapshot.latched, 'E arranca la cría de la cara');
  await page.evaluate(() => window.__turnoNoche.freeze(false));

  console.log('3. Sala de bombas: susto y B1 con E real');
  await page.evaluate(() => {
    window.__turnoNoche.teleport(-20.5, -4.5, Math.PI / 2);
    window.__turnoNoche.look(Math.PI / 2, -0.05);
  });
  await page
    .waitForFunction(() => window.__turnoNoche.state().zone === 'sala-bombas', null, { timeout: 20000 })
    .catch(() => undefined);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, '04-pump-glimpse.png') });
  const glimpse = await page.evaluate(() => window.__turnoNoche.state());
  check(glimpse.zone === 'sala-bombas', 'se detecta la zona sala-bombas');

  await page.evaluate(() => {
    window.__turnoNoche.teleport(-17.4, 0.4, -Math.PI / 2);
    window.__turnoNoche.look(-Math.PI / 2, -0.08);
  });
  await page.waitForSelector('.focus-prompt', { timeout: 12000 }).catch(() => undefined);
  const focus = await page.evaluate(() => document.querySelector('.focus-prompt')?.textContent ?? '');
  check(focus.includes('Rearmar') || focus.includes('BREAKER'), `la mira detecta B1 (${focus.trim() || 'sin foco'})`);
  await page.keyboard.press('e');
  await page.waitForTimeout(1200);
  const afterB1 = await page.evaluate(() => window.__turnoNoche.state());
  check(afterB1.snapshot.breakers.b1, 'B1 se rearma con la tecla E');
  check(afterB1.snapshot.objective.progress === 1, 'el HUD cuenta 1/3');
  await page.screenshot({ path: join(OUT, '05-breaker-b1.png') });

  console.log('4. Vestuario, linterna y escondite');
  await page.evaluate(() => {
    window.__turnoNoche.teleport(5.4, 7.4, Math.PI);
  });
  await page.waitForTimeout(900);
  const beforeF = await page.evaluate(() => window.__turnoNoche.state().snapshot.flashlightOn);
  await page.keyboard.press('f');
  await page.waitForTimeout(700);
  const afterF = await page.evaluate(() => window.__turnoNoche.state().snapshot.flashlightOn);
  check(afterF !== beforeF, 'la tecla F conmuta la linterna');
  if (!afterF) await page.keyboard.press('f');
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, '06-vestuario-linterna.png') });

  await page.evaluate(() => {
    window.__turnoNoche.teleport(5.0, 7.1, 0);
    window.__turnoNoche.look(0, -0.05);
  });
  await page.waitForSelector('.focus-prompt', { timeout: 12000 }).catch(() => undefined);
  const hideFocus = await page.evaluate(() => document.querySelector('.focus-prompt')?.textContent ?? '');
  check(hideFocus.includes('Esconderse'), `la taquilla ofrece esconderse (${hideFocus.trim() || 'sin foco'})`);
  await page.keyboard.press('e');
  await page.waitForTimeout(1000);
  const hidden = await page.evaluate(() => window.__turnoNoche.state());
  check(hidden.hidden, 'el jugador se esconde en la taquilla con E');
  await page.screenshot({ path: join(OUT, '07-escondido.png') });
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  const unhidden = await page.evaluate(() => window.__turnoNoche.state());
  check(!unhidden.hidden, 'puede salir de la taquilla');

  console.log('5. Breakers restantes, tercer final y climax');
  await page.evaluate(() => window.__turnoNoche.breakers(3));
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.__turnoNoche.collectAll());
  await page.waitForTimeout(1600);
  const all = await page.evaluate(() => window.__turnoNoche.state());
  check(all.snapshot.liftUnlocked, 'los tres breakers desbloquean el montacargas');
  check(all.snapshot.objective.id === 'return', 'el objetivo pasa a volver al montacargas');
  check(all.snapshot.tags.length === 3 && all.snapshot.fuses.length === 3, 'se recogen las tres fichas y los tres fusibles');
  check(all.snapshot.secretUnlocked, 'fichas y fusibles desbloquean la tercera salida');
  await page.screenshot({ path: join(OUT, '08-climax-rojo.png') });

  console.log('6. Decision final y persistencia');
  await page.evaluate(() => {
    window.__turnoNoche.teleport(0, -9.2, 0);
    window.__turnoNoche.look(0, -0.05);
  });
  await page
    .waitForFunction(
      () => (document.querySelector('.focus-prompt')?.textContent ?? '').toLowerCase().includes('montacargas'),
      null,
      { timeout: 20000 },
    )
    .catch(() => undefined);
  const liftFocus = await page.evaluate(() => document.querySelector('.focus-prompt')?.textContent ?? '');
  check(liftFocus.includes('MONTACARGAS') || liftFocus.includes('Llamar'), `la mira detecta el montacargas (${liftFocus.trim() || 'sin foco'})`);
  await page.keyboard.press('e');
  await page.waitForSelector('.ending-choice', { timeout: 15000 });
  await page.waitForTimeout(900);
  check(await page.locator('[data-action="stay"]').count() === 1, 'el tercer final aparece desbloqueado');
  await page.screenshot({ path: join(OUT, '09-eleccion.png') });
  await page.locator('[data-action="stay"]').click();
  await page.waitForSelector('.ending-screen', { timeout: 15000 });
  await page.waitForTimeout(1200);
  const endingText = await page.locator('.ending-screen').innerText();
  check(endingText.includes('QUEDARSE'), 'el final C se muestra');
  check(endingText.includes('NOTAS'), 'el final incluye estadisticas');
  await page.screenshot({ path: join(OUT, '10-final.png') });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.title-screen', { timeout: 45000 });
  await page.waitForFunction(
    () => /CONTINUAR|VER EL FINAL/.test(document.querySelector('.title-actions')?.textContent ?? ''),
    null,
    { timeout: 90000 },
  );
  const continueVisible = await page.locator('button', { hasText: /CONTINUAR|VER EL FINAL/ }).count();
  check(continueVisible > 0, 'tras recargar aparece la partida guardada');
  const hasNotes = await page.evaluate(() => document.body.innerText.includes('TURNO CERRADO'));
  check(hasNotes, 'el estado guardado figura como turno cerrado');
  await page.screenshot({ path: join(OUT, '11-persistencia.png') });

  console.log('7. Muerte y reintento');
  const context2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context2.addInitScript(() => {
    localStorage.setItem('turnonoche.settings.v1', JSON.stringify({ sensitivity: 1, invertY: false, volume: 0, quality: 'low' }));
  });
  const page2 = await context2.newPage();
  page2.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  await startGame(page2);
  await page2.evaluate(() => window.__turnoNoche.kill());
  await page2.waitForSelector('.death-screen', { timeout: 15000 });
  check((await page2.locator('.death-title').innerText()).includes('TE ENCONTRÓ'), 'pantalla de muerte');
  await page2.screenshot({ path: join(OUT, '12-muerte.png') });
  await page2.locator('button', { hasText: 'VOLVER A INTENTARLO' }).click();
  await page2.waitForSelector('.hud-objective', { timeout: 15000 });
  const revived = await page2.evaluate(() => window.__turnoNoche.state());
  check(!revived.dead, 'el reintento revive al jugador');
  check(revived.snapshot.deaths >= 1, 'la muerte queda contada');

  await context.close();
  await context2.close();

  console.log('8. Tactil / movil');
  const mobile = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  });
  await mobile.addInitScript(() => {
    localStorage.setItem('turnonoche.settings.v1', JSON.stringify({ sensitivity: 1, invertY: false, volume: 0, quality: 'low' }));
  });
  const page3 = await mobile.newPage();
  page3.on('pageerror', (error) => consoleErrors.push(`mobile pageerror: ${error.message}`));
  await startGame(page3, { touch: true });
  check(await page3.locator('.touch-ui').isVisible(), 'controles tactiles visibles');
  check(await page3.locator('.stick').isVisible(), 'stick visible');
  check(await page3.locator('.touch-btn', { hasText: 'LANZAR' }).isVisible(), 'boton LANZAR visible');
  await page3.screenshot({ path: join(OUT, '13-movil.png') });
  const mobileBottles = await page3.evaluate(() => window.__turnoNoche.state().snapshot.bottles);
  await page3.locator('.touch-btn', { hasText: 'LANZAR' }).click();
  await page3.waitForTimeout(700);
  const mobileBottlesAfter = await page3.evaluate(() => window.__turnoNoche.state().snapshot.bottles);
  check(mobileBottlesAfter === mobileBottles - 1, 'LANZAR tactil descuenta una botella');
  const mobileBefore = await page3.evaluate(() => window.__turnoNoche.state().snapshot.flashlightOn);
  await page3.locator('.touch-btn', { hasText: 'LINTERNA' }).click();
  await page3.waitForTimeout(600);
  const mobileAfter = await page3.evaluate(() => window.__turnoNoche.state().snapshot.flashlightOn);
  check(mobileAfter !== mobileBefore, 'linterna tactil conmuta');
  await page3.locator('.touch-btn', { hasText: 'II' }).click();
  await page3.waitForSelector('.pause-overlay', { timeout: 15000 });
  check(true, 'pausa tactil abre el menu');
  await page3.screenshot({ path: join(OUT, '14-movil-pausa.png') });

  await mobile.close();
  await browser.close();

  const filtered = consoleErrors.filter(
    (entry) => !entry.includes('favicon') && !entry.includes('Download the React DevTools'),
  );
  if (filtered.length > 0) {
    console.log('\nErrores de consola:');
    for (const entry of filtered) console.log(`  - ${entry}`);
  }

  console.log(`\nFallos: ${failures.length}`);
  if (failures.length > 0 || filtered.length > 0) process.exit(1);
  console.log(`QA E2E: ${checks} comprobaciones, 0 fallos`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
