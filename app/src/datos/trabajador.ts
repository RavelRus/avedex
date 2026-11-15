/// <reference lib="webworker" />
// Trabajador de datos: único punto de la app que toca SQLite.
//
// Mantiene dos bases en el almacenamiento privado del navegador (OPFS):
//   /referencia.sqlite  → ciencia. Se descarga del servidor y se sustituye entera al actualizar.
//   /usuario.sqlite     → datos del usuario. Nunca se sustituye.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { OpfsSAHPoolDatabase, SAHPoolUtil } from '@sqlite.org/sqlite-wasm';
import type {
  EstadoBases, MensajeAlTrabajador, MensajeDelTrabajador, NotaPrueba, Peticion, ResultadoBusqueda,
} from './protocolo.ts';

const RUTA_REFERENCIA = '/referencia.sqlite';
const RUTA_USUARIO = '/usuario.sqlite';

interface ManifiestoReferencia {
  taxonomia: string;
  sha256: string;
  bytes: number;
}

let versionSqlite = '';
let almacen: SAHPoolUtil | null = null;
let referencia: OpfsSAHPoolDatabase | null = null;
let usuario: OpfsSAHPoolDatabase | null = null;

const enviar = (mensaje: MensajeDelTrabajador) => (self as DedicatedWorkerGlobalScope).postMessage(mensaje);
const progreso = (texto: string) => enviar({ progreso: texto });

function ajuste(clave: string): string | null {
  const valor = usuario!.selectValue('SELECT valor FROM ajuste WHERE clave = ?', [clave]);
  return typeof valor === 'string' ? valor : null;
}

function guardarAjuste(clave: string, valor: string): void {
  usuario!.exec({
    sql: 'INSERT INTO ajuste (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    bind: [clave, valor],
  });
}

async function sha256(datos: ArrayBuffer): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function iniciar(): Promise<EstadoBases> {
  if (referencia && usuario) return estado();

  progreso('Arrancando SQLite…');
  const sqlite3 = await sqlite3InitModule();
  versionSqlite = sqlite3.version.libVersion;

  progreso('Abriendo el almacenamiento del dispositivo…');
  try {
    almacen = await sqlite3.installOpfsSAHPoolVfs({ initialCapacity: 12 });
  } catch (e) {
    throw new Error(
      'No se ha podido abrir el almacenamiento del dispositivo (OPFS). ' +
        'Si AVEDEX está abierta en otra pestaña o ventana, ciérrala y vuelve a intentarlo. ' +
        `Detalle: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  usuario = new almacen.OpfsSAHPoolDb(RUTA_USUARIO);
  usuario.exec(`
    CREATE TABLE IF NOT EXISTS ajuste (clave TEXT PRIMARY KEY, valor TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS nota_prueba (
      id INTEGER PRIMARY KEY,
      texto TEXT NOT NULL,
      creada TEXT NOT NULL
    ) STRICT;
  `);

  // ¿Hay una base de referencia nueva en el servidor? Sin conexión, esta consulta falla y se sigue con la instalada.
  let remoto: ManifiestoReferencia | null = null;
  try {
    const r = await fetch('/referencia.json', { cache: 'no-store' });
    if (r.ok) remoto = (await r.json()) as ManifiestoReferencia;
  } catch {
    remoto = null;
  }

  const instalada = almacen.getFileNames().includes(RUTA_REFERENCIA);
  const shaInstalada = ajuste('referencia_sha256');
  if (!instalada && !remoto) {
    throw new Error('La primera vez hace falta conexión para descargar la base de aves. Conéctate y vuelve a abrir AVEDEX.');
  }

  if (remoto && (!instalada || remoto.sha256 !== shaInstalada)) {
    progreso(`Descargando la base de aves (${(remoto.bytes / 1024 / 1024).toFixed(0)} MB)…`);
    const r = await fetch(`/referencia.sqlite?v=${remoto.sha256.slice(0, 12)}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`No se ha podido descargar la base de aves (HTTP ${r.status}).`);
    const datos = await r.arrayBuffer();
    progreso('Comprobando la descarga…');
    if (datos.byteLength !== remoto.bytes || (await sha256(datos)) !== remoto.sha256) {
      throw new Error('La base de aves descargada no coincide con la publicada. Vuelve a intentarlo.');
    }
    progreso('Guardando la base de aves en el dispositivo…');
    if (instalada) almacen.unlink(RUTA_REFERENCIA);
    await almacen.importDb(RUTA_REFERENCIA, datos);
    guardarAjuste('referencia_sha256', remoto.sha256);
    guardarAjuste('referencia_bytes', String(remoto.bytes));
    guardarAjuste('referencia_instalada_el', new Date().toISOString());
  }

  referencia = new almacen.OpfsSAHPoolDb(RUTA_REFERENCIA);
  return estado();
}

async function estado(): Promise<EstadoBases> {
  const ref = referencia!;
  const recuento: Record<string, number> = {};
  for (const fila of ref.selectObjects('SELECT rango, COUNT(*) AS n FROM taxon WHERE vigente = 1 GROUP BY rango')) {
    recuento[String(fila['rango'])] = Number(fila['n']);
  }
  const fuente = ref.selectObject('SELECT cita, licencia FROM fuente WHERE id = 1') ?? {};
  let usoBytes: number | null = null;
  let cuotaBytes: number | null = null;
  try {
    const estimacion = await navigator.storage.estimate();
    usoBytes = estimacion.usage ?? null;
    cuotaBytes = estimacion.quota ?? null;
  } catch {
    // Algunos navegadores no dan esta información; no es un error.
  }
  const bytes = ajuste('referencia_bytes');
  return {
    versionSqlite,
    taxonomia: String(ref.selectValue("SELECT valor FROM meta WHERE clave = 'taxonomia_base'") ?? ''),
    cita: String(fuente['cita'] ?? ''),
    licencia: String(fuente['licencia'] ?? ''),
    referenciaInstaladaEl: ajuste('referencia_instalada_el'),
    referenciaBytes: bytes === null ? null : Number(bytes),
    recuento,
    notas: Number(usuario!.selectValue('SELECT COUNT(*) FROM nota_prueba') ?? 0),
    primeraNota: (usuario!.selectValue('SELECT MIN(creada) FROM nota_prueba') as string | null) ?? null,
    archivosOpfs: almacen!.getFileNames(),
    usoBytes,
    cuotaBytes,
  };
}

const ORDEN_RANGO = "CASE t.rango WHEN 'species' THEN 1 WHEN 'subspecies' THEN 2 WHEN 'genus' THEN 3 WHEN 'family' THEN 4 ELSE 5 END";

function buscar(textoCrudo: string): ResultadoBusqueda[] {
  const texto = textoCrudo.trim();
  if (texto.length < 2) return [];
  // Los comodines de LIKE que escriba el usuario se tratan como texto normal.
  const literal = texto.replace(/[\\%_]/g, (c) => `\\${c}`);
  const filas = referencia!.selectObjects(
    `SELECT t.id, t.rango, t.nombre_cientifico AS nombre,
            (SELECT n.nombre FROM nombre_taxon n WHERE n.taxon_id = t.id AND n.idioma = 'en' AND n.preferente = 1) AS ingles,
            (SELECT COUNT(*) FROM taxon s WHERE s.padre_id = t.id AND s.rango = 'subspecies') AS subespecies
     FROM taxon t
     WHERE t.vigente = 1 AND (
       t.nombre_cientifico LIKE ?1 || '%' ESCAPE '\\'
       OR t.id IN (SELECT n.taxon_id FROM nombre_taxon n WHERE n.nombre LIKE '%' || ?1 || '%' ESCAPE '\\'))
     ORDER BY ${ORDEN_RANGO}, t.orden_secuencia
     LIMIT 40`,
    [literal],
  );
  return filas.map((f) => {
    const id = Number(f['id']);
    const linaje = referencia!.selectValues(
      `WITH RECURSIVE arriba(id, padre_id, nombre, nivel) AS (
         SELECT p.id, p.padre_id, p.nombre_cientifico, 1 FROM taxon h JOIN taxon p ON p.id = h.padre_id WHERE h.id = ?1
         UNION ALL
         SELECT p.id, p.padre_id, p.nombre_cientifico, a.nivel + 1 FROM arriba a JOIN taxon p ON p.id = a.padre_id)
       SELECT nombre FROM arriba ORDER BY nivel DESC`,
      [id],
    ) as string[];
    return {
      id,
      rango: String(f['rango']),
      nombreCientifico: String(f['nombre']),
      nombreIngles: (f['ingles'] as string | null) ?? null,
      linaje,
      subespecies: Number(f['subespecies']),
    };
  });
}

function notas(): NotaPrueba[] {
  return usuario!.selectObjects('SELECT id, texto, creada FROM nota_prueba ORDER BY id DESC').map((f) => ({
    id: Number(f['id']),
    texto: String(f['texto']),
    creada: String(f['creada']),
  }));
}

function anadirNota(texto: string): NotaPrueba[] {
  const limpio = texto.trim();
  if (limpio === '') throw new Error('La nota está vacía.');
  usuario!.exec({ sql: 'INSERT INTO nota_prueba (texto, creada) VALUES (?, ?)', bind: [limpio, new Date().toISOString()] });
  return notas();
}

async function atender(peticion: Peticion): Promise<unknown> {
  if (peticion.tipo === 'iniciar') return iniciar();
  if (!referencia || !usuario) throw new Error('Las bases de datos aún no están abiertas.');
  switch (peticion.tipo) {
    case 'estado': return estado();
    case 'buscar': return buscar(peticion.texto);
    case 'notas': return notas();
    case 'anadirNota': return anadirNota(peticion.texto);
  }
}

self.addEventListener('message', (evento: MessageEvent<MensajeAlTrabajador>) => {
  const { id, peticion } = evento.data;
  atender(peticion).then(
    (resultado) => enviar({ id, ok: true, resultado }),
    (error: unknown) => enviar({ id, ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
});
