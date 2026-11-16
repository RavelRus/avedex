// Prueba de extremo a extremo de la app de T2 en un navegador real (Chrome/Chromium).
//
// Uso (desde app/):  npm run build && npm run probar:navegador
// Necesita Chrome instalado. Si no lo encuentra, indica su ruta en la variable CHROME.
//
// Comprueba lo mismo que Pablo comprobará a mano en el iPhone, pero en Chrome:
// arranque, búsqueda, guardado, permanencia tras cerrar el navegador y funcionamiento sin conexión.
// OJO: Chrome no es Safari. Esta prueba valida el código, no el comportamiento de iOS.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const PUERTO = 4173;
const URL_APP = `http://127.0.0.1:${PUERTO}/`;
const candidatos = [
  process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = candidatos.find((c) => existsSync(c));
if (!chrome) {
  console.error('No se ha encontrado Chrome. Indica su ruta en la variable de entorno CHROME.');
  process.exit(2);
}

const perfil = mkdtempSync(join(tmpdir(), 'avedex-perfil-'));
// Se sirve con el servidor local de Cloudflare (wrangler dev), que aplica las mismas reglas que producción:
// no sirve _headers, redirige /index.html a /, etc. Con el servidor de Vite un fallo así pasaba inadvertido.
const servidor = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--port', String(PUERTO), '--ip', '127.0.0.1'], { stdio: 'ignore' });
const pasos = [];
const paso = (nombre) => { pasos.push(nombre); console.log(`  ✓ ${nombre}`); };

async function esperarServidor() {
  for (let i = 0; i < 150; i++) {
    try { if ((await fetch(URL_APP)).ok) return; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor de vista previa no arranca.');
}

async function abrir() {
  const contexto = await chromium.launchPersistentContext(perfil, {
    executablePath: chrome, headless: true, args: ['--no-sandbox'],
  });
  const pagina = contexto.pages()[0] ?? (await contexto.newPage());
  const errores = [];
  const descargas = [];
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push(String(e)));
  pagina.on('request', (r) => { if (r.url().includes('.sqlite')) descargas.push(r.url()); });
  return { contexto, pagina, errores, descargas };
}

async function esperarLista(pagina) {
  await pagina.goto(URL_APP);
  await pagina.waitForSelector('[data-prueba="estado"]', { timeout: 60_000 });
}

async function buscar(pagina, texto) {
  await pagina.fill('#consulta', '');
  await pagina.fill('#consulta', texto);
  await pagina.waitForFunction(
    (t) => document.querySelector('#consulta')?.value === t && document.querySelector('[data-prueba="tiempo"]') !== null,
    texto, { timeout: 10_000 },
  );
  await pagina.waitForTimeout(400); // margen para la última respuesta
  const elementos = await pagina.$$eval('[data-prueba="resultados"] li', (lis) => lis.map((li) => li.textContent ?? ''));
  const tiempo = await pagina.textContent('[data-prueba="tiempo"]');
  return { elementos, ms: Number(/en (\d+) ms/.exec(tiempo ?? '')?.[1]) };
}

let codigo = 0;
try {
  await esperarServidor();

  // --- Primera apertura: descarga e instala la base ---
  let s = await abrir();
  const inicio = Date.now();
  await esperarLista(s.pagina);
  const taxonomia = await s.pagina.textContent('[data-prueba="taxonomia"]');
  assert.match(taxonomia, /AviList v2026/);
  assert.match(taxonomia, /33\.698 taxones/);
  assert.match(taxonomia, /11\.172 especies/);
  assert.equal(s.descargas.length, 1, 'la primera vez debe descargar la base una sola vez');
  paso(`primera apertura: base instalada en ${((Date.now() - inicio) / 1000).toFixed(1)} s (${taxonomia.trim()})`);

  let r = await buscar(s.pagina, 'Parus major');
  assert.match(r.elementos[0], /^Parus major — Great Tit/);
  assert.match(r.elementos[0], /16 subespecies/);
  assert.match(r.elementos[0], /Passeriformes › Paridae › Parus/);
  paso(`búsqueda «Parus major»: ${r.elementos.length} resultados en ${r.ms} ms, con linaje y subespecies`);

  r = await buscar(s.pagina, 'aquila adal');
  assert.match(r.elementos[0], /^Aquila adalberti — Spanish Imperial Eagle/);
  paso(`búsqueda sin mayúsculas «aquila adal»: encuentra Aquila adalberti en ${r.ms} ms`);

  r = await buscar(s.pagina, 'eagle');
  assert.ok(r.elementos.length >= 10);
  paso(`búsqueda por nombre en inglés «eagle»: ${r.elementos.length} resultados en ${r.ms} ms`);

  r = await buscar(s.pagina, '%%');
  assert.equal(r.elementos.length, 0, 'los comodines escritos por el usuario no deben devolverlo todo');
  paso('los caracteres especiales (%) se tratan como texto');

  await s.pagina.fill('#nota', 'Nota de la prueba automática');
  await s.pagina.click('text=Guardar');
  await s.pagina.waitForFunction(() => document.querySelector('[data-prueba="num-notas"]')?.textContent === '1');
  paso('nota guardada');
  // El service worker tiene que quedar instalado y activo; si no, la app no abre sin conexión.
  const estadoSw = await s.pagina.evaluate(async () => {
    const limite = new Promise((r) => setTimeout(() => r('no se ha instalado en 15 s'), 15_000));
    const listo = navigator.serviceWorker.ready.then((r) => r.active?.state ?? 'sin worker activo');
    return Promise.race([listo, limite]);
  });
  assert.ok(['activated', 'activating'].includes(estadoSw), `service worker: ${estadoSw}`);
  const guardados = await s.pagina.evaluate(async () => {
    const claves = await caches.keys();
    const cache = await caches.open(claves.find((c) => c.startsWith('avedex-app-')));
    return (await cache.keys()).length;
  });
  assert.ok(guardados >= 8, `solo hay ${guardados} archivos guardados para uso sin conexión`);
  paso(`service worker instalado, ${guardados} archivos guardados para uso sin conexión`);
  await s.pagina.waitForTimeout(500);
  assert.deepEqual(s.errores, [], 'no debe haber errores en la consola');
  await s.contexto.close();

  // --- Segunda apertura: navegador cerrado y abierto de nuevo ---
  s = await abrir();
  await esperarLista(s.pagina);
  assert.equal(await s.pagina.textContent('[data-prueba="num-notas"]'), '1');
  assert.match(await s.pagina.textContent('[data-prueba="notas"]'), /Nota de la prueba automática/);
  assert.equal(s.descargas.length, 0, 'la base no debe volver a descargarse');
  paso('tras cerrar y abrir el navegador: la nota sigue ahí y la base no se vuelve a descargar');

  // --- Sin conexión ---
  await s.contexto.setOffline(true);
  await s.pagina.reload();
  await s.pagina.waitForSelector('[data-prueba="estado"]', { timeout: 30_000 });
  assert.match(await s.pagina.textContent('[data-prueba="notas"]'), /Nota de la prueba automática/);
  r = await buscar(s.pagina, 'Sylvia atricapilla');
  assert.match(r.elementos[0], /^Sylvia atricapilla/);
  paso(`sin conexión: la app abre, conserva la nota y busca (${r.ms} ms)`);
  assert.deepEqual(s.errores.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e)), [], 'no debe haber errores en la consola');
  await s.contexto.close();

  console.log(`\nSuperados ${pasos.length} pasos de ${pasos.length}.`);
} catch (error) {
  console.error('\nFALLO:', error);
  codigo = 1;
} finally {
  servidor.kill();
  rmSync(perfil, { recursive: true, force: true });
}
process.exit(codigo);
