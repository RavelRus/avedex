// Pruebas del hito 1.3: lectura de la lista de SEO/BirdLife y cruce con AviList.
// Usan los datos reales (CSV extraído del PDF y referencia.sqlite). Si faltan, se omiten.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, test } from 'node:test';
import { cruzarEspana, grupoDe, RUTAS_ESPANA } from '../src/cruzar-espana.ts';
import { escribirCsv, leerCsv } from '../src/csv.ts';
import { interpretarSubespecies, normalizarCategoria, raizEpiteto } from '../src/espana.ts';

test('CSV: ida y vuelta con comas, comillas y saltos de línea', () => {
  const filas = [{ a: 'uno, dos', b: 'dice "hola"' }, { a: 'línea\npartida', b: '' }];
  assert.deepEqual(leerCsv(escribirCsv(['a', 'b'], filas)), [{ a: 'uno, dos', b: 'dice "hola"' }, { a: 'línea\npartida', b: '' }]);
});

test('subespecies: se interpretan las formas que usa la lista', () => {
  assert.deepEqual(interpretarSubespecies('major, corsus, mallorcae, excelsus'), ['major', 'corsus', 'mallorcae', 'excelsus']);
  assert.deepEqual(interpretarSubespecies('ASD'), []);
  assert.deepEqual(interpretarSubespecies(''), []);
  assert.deepEqual(interpretarSubespecies('cruces subespecíficos'), []);
  assert.deepEqual(interpretarSubespecies('jagoensis / cruces subespecíficos'), ['jagoensis']);
  assert.deepEqual(interpretarSubespecies('arquata, ¿orientalis?'), ['arquata', 'orientalis']);
  assert.deepEqual(interpretarSubespecies('h ispanus, bubo'), ['hispanus', 'bubo']);
  assert.deepEqual(interpretarSubespecies('rufescens †, polatzeki'), ['rufescens', 'polatzeki']);
  assert.deepEqual(interpretarSubespecies('mongolus/stegmanni, atrifrons/pamirensis'), ['mongolus', 'stegmanni', 'atrifrons', 'pamirensis']);
});

test('categorías y epítetos: normalización', () => {
  assert.equal(normalizarCategoria('A(i)'), 'A (i)');
  assert.equal(normalizarCategoria('A (i)'), 'A (i)');
  assert.equal(normalizarCategoria('C*'), 'C*');
  assert.equal(raizEpiteto('caeruleus'), raizEpiteto('caerulea'));
  assert.equal(raizEpiteto('martinicus'), raizEpiteto('martinica'));
  assert.notEqual(raizEpiteto('major'), raizEpiteto('minor'));
});

const hayDatos = existsSync(RUTAS_ESPANA.lista) && existsSync(RUTAS_ESPANA.referencia);

describe('cruce real con AviList', { skip: hayDatos ? false : 'faltan la lista de España o referencia.sqlite' }, () => {
  const { entradas, resultados } = hayDatos ? cruzarEspana() : { entradas: [], resultados: [] };

  test('la lista tiene los 638 taxones que declara la edición de 2022', () => {
    assert.equal(entradas.length, 638);
    assert.equal(new Set(entradas.map((e) => e.nombre)).size, 638, 'no hay nombres repetidos');
  });

  test('toda entrada tiene nombre científico, nombre en español, familia y al menos una categoría', () => {
    for (const e of entradas) {
      assert.match(e.nombre, /^[A-Z][a-z]+ [a-z]+( \/ [A-Z]\. [a-z]+)?$/, e.nombreOriginal);
      assert.ok(e.nombreEspanol !== '', e.nombre);
      assert.match(e.familia, /^[A-Z]+IDAE$/, e.nombre);
      assert.ok(e.pb !== '' || e.na !== '' || e.ca !== '', e.nombre);
      for (const c of [e.pb, e.na, e.ca]) assert.match(c, /^(|[ABCD]( \(i\))?\*?|E1\*?)$/, `${e.nombre}: «${c}»`);
    }
  });

  test('cada entrada queda en un estado y ninguna se enlaza sin coincidencia exacta o revisión', () => {
    assert.equal(resultados.length, entradas.length);
    for (const r of resultados) {
      if (r.estado === 'exacta') assert.equal(r.nombreAviList, r.entrada.nombre);
      if (r.estado === 'sin_equivalencia' || r.estado === 'par') assert.equal(r.taxonId, null, r.entrada.nombre);
    }
  });

  test('las coincidencias exactas apuntan a especies vigentes y ningún taxón se enlaza dos veces', () => {
    const db = new DatabaseSync(RUTAS_ESPANA.referencia, { readOnly: true });
    const consulta = db.prepare('SELECT rango, vigente, nombre_cientifico AS nombre FROM taxon WHERE id = ?');
    const vistos = new Set<number>();
    for (const r of resultados.filter((x) => x.taxonId !== null)) {
      const t = consulta.get(r.taxonId) as { rango: string; vigente: number; nombre: string };
      assert.equal(t.vigente, 1);
      if (r.estado === 'exacta') assert.equal(t.rango, 'species');
      assert.ok(!vistos.has(r.taxonId!), `taxón enlazado dos veces: ${t.nombre}`);
      vistos.add(r.taxonId!);
    }
    db.close();
  });

  test('todo caso pendiente cae en un grupo de decisión y trae candidatos', () => {
    const pendientes = resultados.filter((r) => r.estado === 'sin_equivalencia');
    for (const r of pendientes) {
      assert.ok(r.candidatos.length > 0, `sin candidatos: ${r.entrada.nombre}`);
      assert.notEqual(grupoDe(r), 'G0', `sin clasificar: ${r.entrada.nombre}`);
    }
  });

  test('casos conocidos', () => {
    const de = (nombre: string) => resultados.find((r) => r.entrada.nombre === nombre)!;
    assert.equal(de('Parus major').estado, 'exacta');
    assert.equal(de('Parus major').entrada.nombreEspanol, 'Carbonero común');
    assert.equal(grupoDe(de('Larus audouinii')), 'G1');
    assert.equal(de('Larus audouinii').candidatos[0]!.nombreCientifico, 'Ichthyaetus audouinii');
    assert.equal(grupoDe(de('Corvus cornix')), 'G3');
    assert.equal(grupoDe(de('Fringilla coelebs')), 'G4');
    assert.equal(grupoDe(de('Haematopus meadewaldoi')), null);
    assert.equal(de('Haematopus meadewaldoi').entrada.marcadoExtinto, true);
  });
});

test('los datos de SEO/BirdLife no están en la carpeta que se publica', () => {
  const publica = resolve(import.meta.dirname, '..', '..', 'app', 'public');
  if (!existsSync(publica)) return;
  for (const nombre of readdirSync(publica)) {
    assert.ok(!/seo|espana|españa/i.test(nombre), `archivo sospechoso en app/public: ${nombre}`);
    if (/\.(json|csv|md|txt)$/.test(nombre)) {
      assert.ok(!readFileSync(join(publica, nombre), 'utf8').includes('Carbonero común'), `${nombre} contiene nombres de la lista de SEO`);
    }
  }
  // La base pública no debe contener nombres en español: solo los trae la lista de SEO.
  const base = join(publica, 'referencia.sqlite');
  if (existsSync(base)) {
    const db = new DatabaseSync(base, { readOnly: true });
    const n = (db.prepare("SELECT COUNT(*) AS n FROM nombre_taxon WHERE idioma <> 'en'").get() as { n: number }).n;
    db.close();
    assert.equal(n, 0);
  }
});
