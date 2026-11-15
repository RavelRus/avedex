// Pruebas con el archivo REAL de AviList v2026 (datos reales, no ejemplos).
// Son las seis comprobaciones definidas para la tarea T1 en docs/ROADMAP.md, más algunas adicionales.
// Importan el archivo en una carpeta temporal: no tocan salida/ ni anclas/.

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, before, describe, test } from 'node:test';
import { importar, rutasPorDefecto } from '../src/importar-avilist.ts';
import type { RutasImportacion } from '../src/importar-avilist.ts';

// Cifras publicadas para AviList v2026 (docs/FUENTES.md §2).
const PUBLICADO = { especies: 11172, ordenes: 45, familias: 250 };

const manifiesto = rutasPorDefecto().manifiesto;
const hayArchivo = existsSync(manifiesto) &&
  existsSync(join(manifiesto, '..', (JSON.parse(readFileSync(manifiesto, 'utf8')) as { archivo: string }).archivo));

function rutasEn(carpeta: string): RutasImportacion {
  return {
    manifiesto,
    anclas: join(carpeta, 'taxones.csv'),
    base: join(carpeta, 'referencia.sqlite'),
    nomenclatura: join(carpeta, 'referencia-nomenclatura.sqlite'),
    informe: join(carpeta, 'informe.md'),
  };
}

function volcarTaxones(ruta: string): string {
  const db = new DatabaseSync(ruta, { readOnly: true });
  const filas = db.prepare('SELECT id, rango, padre_id, nombre_cientifico FROM taxon ORDER BY id').all();
  db.close();
  return JSON.stringify(filas);
}

describe('AviList v2026 real', { skip: hayArchivo ? false : 'falta el archivo de AviList en fuentes/avilist/' }, () => {
  const carpetaA = mkdtempSync(join(tmpdir(), 'avedex-a-'));
  const carpetaB = mkdtempSync(join(tmpdir(), 'avedex-b-'));
  let db: DatabaseSync;
  let volcadoPrimera = '';

  const uno = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).get(...p) as T;
  const todos = <T>(sql: string, ...p: (string | number)[]) => db.prepare(sql).all(...p) as T[];
  const contar = (sql: string, ...p: (string | number)[]) => uno<{ n: number }>(sql, ...p).n;

  before(async () => {
    await importar(rutasEn(carpetaA), '2026-11-15');
    volcadoPrimera = volcarTaxones(rutasEn(carpetaA).base);
    db = new DatabaseSync(rutasEn(carpetaA).base, { readOnly: true });
  });
  after(() => {
    db?.close();
    rmSync(carpetaA, { recursive: true, force: true });
    rmSync(carpetaB, { recursive: true, force: true });
  });

  test('1. especies, órdenes y familias coinciden con las cifras publicadas', () => {
    assert.equal(contar("SELECT COUNT(*) AS n FROM taxon WHERE rango = 'species' AND vigente = 1"), PUBLICADO.especies);
    assert.equal(contar("SELECT COUNT(*) AS n FROM taxon WHERE rango = 'order' AND vigente = 1"), PUBLICADO.ordenes);
    assert.equal(contar("SELECT COUNT(*) AS n FROM taxon WHERE rango = 'family' AND vigente = 1"), PUBLICADO.familias);
  });

  test('2. todo taxón (salvo los órdenes) tiene padre del rango inmediatamente superior', () => {
    const malos = contar(
      `SELECT COUNT(*) AS n FROM taxon h LEFT JOIN taxon p ON p.id = h.padre_id
       WHERE NOT (
         (h.rango = 'order' AND h.padre_id IS NULL) OR
         (h.rango = 'family' AND p.rango = 'order') OR
         (h.rango = 'genus' AND p.rango = 'family') OR
         (h.rango = 'species' AND p.rango = 'genus') OR
         (h.rango = 'subspecies' AND p.rango = 'species'))`,
    );
    assert.equal(malos, 0);
    // El nombre de cada especie y subespecie empieza por el de su padre.
    const nombres = contar(
      `SELECT COUNT(*) AS n FROM taxon h JOIN taxon p ON p.id = h.padre_id
       WHERE h.rango IN ('species','subspecies') AND h.nombre_cientifico NOT LIKE p.nombre_cientifico || ' %'`,
    );
    assert.equal(nombres, 0);
  });

  test('3. no hay nombres científicos vigentes repetidos dentro de un rango', () => {
    const repetidos = todos(
      'SELECT rango, nombre_cientifico FROM taxon WHERE vigente = 1 GROUP BY rango, nombre_cientifico HAVING COUNT(*) > 1',
    );
    assert.deepEqual(repetidos, []);
  });

  test('4. importar dos veces produce exactamente los mismos identificadores', async () => {
    // a) Segunda importación sobre las anclas de la primera.
    const segunda = await importar(rutasEn(carpetaA), '2026-11-16');
    assert.equal(segunda.resultado.anclasNuevas, 0);
    assert.equal(volcarTaxones(rutasEn(carpetaA).base), volcadoPrimera);
    // b) Importación desde cero en otra carpeta, sin anclas previas.
    await importar(rutasEn(carpetaB), '2026-11-15');
    assert.equal(volcarTaxones(rutasEn(carpetaB).base), volcadoPrimera);
    assert.equal(readFileSync(rutasEn(carpetaB).anclas, 'utf8'), readFileSync(rutasEn(carpetaA).anclas, 'utf8'));
  });

  test('5. Parus major: especie de Parus → Paridae → Passeriformes, con subespecies', () => {
    const cadena = todos<{ rango: string; nombre_cientifico: string }>(
      `WITH RECURSIVE linaje(id, padre_id, rango, nombre_cientifico) AS (
         SELECT id, padre_id, rango, nombre_cientifico FROM taxon WHERE nombre_cientifico = 'Parus major' AND rango = 'species'
         UNION ALL
         SELECT t.id, t.padre_id, t.rango, t.nombre_cientifico FROM taxon t JOIN linaje l ON t.id = l.padre_id)
       SELECT rango, nombre_cientifico FROM linaje`,
    );
    assert.deepEqual(cadena.map((c) => `${c.rango}:${c.nombre_cientifico}`), [
      'species:Parus major', 'genus:Parus', 'family:Paridae', 'order:Passeriformes',
    ]);
    const subespecies = contar(
      `SELECT COUNT(*) AS n FROM taxon s JOIN taxon e ON e.id = s.padre_id
       WHERE e.nombre_cientifico = 'Parus major' AND s.rango = 'subspecies'`,
    );
    assert.ok(subespecies > 0, 'Parus major debe tener subespecies');
    const ingles = uno<{ nombre: string }>(
      `SELECT n.nombre FROM nombre_taxon n JOIN taxon t ON t.id = n.taxon_id
       WHERE t.nombre_cientifico = 'Parus major' AND n.preferente = 1`,
    );
    assert.equal(ingles.nombre, 'Great Tit');
  });

  test('6. ninguna fila queda sin fuente ni versión', () => {
    assert.equal(contar('SELECT COUNT(*) AS n FROM taxon WHERE version_alta_id IS NULL'), 0);
    assert.equal(contar('SELECT COUNT(*) AS n FROM taxon_detalle WHERE version_id IS NULL'), 0);
    assert.equal(contar('SELECT COUNT(*) AS n FROM nombre_taxon WHERE fuente_id IS NULL'), 0);
    assert.equal(contar("SELECT COUNT(*) AS n FROM id_externo WHERE fuente_id IS NULL OR version = ''"), 0);
    const fuente = uno<{ cita: string; licencia: string }>('SELECT cita, licencia FROM fuente WHERE id = 1');
    assert.match(fuente.cita, /AviList Core Team\. 2026\..*v2026/);
    assert.match(fuente.licencia, /CC BY 4\.0/);
    const v = uno<{ version: string; sha256: string }>('SELECT version, sha256 FROM version_taxonomica WHERE id = 1');
    assert.equal(v.version, 'v2026');
    assert.match(v.sha256, /^[0-9a-f]{64}$/);
  });

  test('extra: cada especie y subespecie tiene un Avibase ID único', () => {
    const total = contar("SELECT COUNT(*) AS n FROM taxon WHERE rango IN ('species','subspecies')");
    const conId = contar("SELECT COUNT(*) AS n FROM id_externo WHERE sistema = 'avibase'");
    const distintos = contar("SELECT COUNT(DISTINCT codigo) AS n FROM id_externo WHERE sistema = 'avibase'");
    assert.equal(conId, total);
    assert.equal(distintos, total);
  });

  test('extra: cada especie tiene exactamente un nombre preferente en inglés', () => {
    const malas = contar(
      `SELECT COUNT(*) AS n FROM taxon t WHERE t.rango = 'species' AND
         (SELECT COUNT(*) FROM nombre_taxon n WHERE n.taxon_id = t.id AND n.idioma = 'en' AND n.preferente = 1) <> 1`,
    );
    assert.equal(malas, 0);
  });

  test('extra: la base de nomenclatura apunta solo a taxones que existen', () => {
    const nom = new DatabaseSync(rutasEn(carpetaA).nomenclatura, { readOnly: true });
    const ids = nom.prepare('SELECT taxon_id FROM taxon_nomenclatura').all() as { taxon_id: number }[];
    nom.close();
    const existentes = new Set(todos<{ id: number }>('SELECT id FROM taxon').map((t) => t.id));
    assert.ok(ids.length > 0);
    assert.equal(ids.filter((i) => !existentes.has(i.taxon_id)).length, 0);
  });

  test('extra: la base principal cabe en el límite de 25 MiB por archivo del alojamiento', () => {
    const paginas = uno<{ page_count: number }>('PRAGMA page_count').page_count;
    const tamano = uno<{ page_size: number }>('PRAGMA page_size').page_size * paginas;
    assert.ok(tamano < 25 * 1024 * 1024, `la base pesa ${(tamano / 1024 / 1024).toFixed(1)} MiB`);
  });
});
