// Pruebas del constructor con datos inventados.
// TODOS los taxones de este archivo son EJEMPLO: nombres ficticios para probar la lógica, no datos científicos.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { escribirAnclas, leerAnclas } from '../src/anclas.ts';
import { construirReferencia } from '../src/construir.ts';
import type { Ancla, DatosVersion, FilaAviList, Rango } from '../src/tipos.ts';

const carpeta = mkdtempSync(join(tmpdir(), 'avedex-ejemplo-'));
after(() => rmSync(carpeta, { recursive: true, force: true }));

function version(v: string): DatosVersion {
  return {
    fuente: 'EJEMPLO', version: v, fechaPublicacion: '2000-01-01', archivo: 'ejemplo.xlsx', sha256: 'ejemplo',
    url: 'https://example.org', cita: 'EJEMPLO. Cita ficticia.', licencia: 'EJEMPLO', versionClements: 'v0', versionBirdLife: 'v0',
  };
}

let secuencia = 0;
function fila(rango: Rango, nombre: string, orden: string, familia: string | null, avibaseId: string | null = null): FilaAviList {
  return {
    secuencia: ++secuencia, rango, orden, familia, nombreCientifico: nombre, avibaseId,
    autoridad: null, detallesBibliograficos: null, nombreInglesAviList: rango === 'species' ? `Example ${nombre}` : null,
    nombreInglesClements: null, nombreInglesBirdLife: null, cambiosVersion: null, numeroPropuesta: null,
    resumenDecision: null, distribucion: null, estadoExtincion: null, categoriaUicn: null, urlBirdLife: null,
    codigoCornell: null, generoGramatical: null, especieTipo: null, localidadTipo: null, tituloDescripcion: null,
    urlDescripcion: null, protonimo: null,
  };
}

/** Lista EJEMPLO: un orden, una familia, dos géneros, tres especies y dos subespecies. */
function listaEjemplo(generoB = 'Ejemplornis'): FilaAviList[] {
  secuencia = 0;
  return [
    fila('order', 'Ejemploformes', 'Ejemploformes', null),
    fila('family', 'Ejemplidae', 'Ejemploformes', 'Ejemplidae'),
    fila('genus', 'Ejemplus', 'Ejemploformes', 'Ejemplidae'),
    fila('species', 'Ejemplus primus', 'Ejemploformes', 'Ejemplidae', 'avibase-EJ000001'),
    fila('subspecies', 'Ejemplus primus primus', 'Ejemploformes', 'Ejemplidae', 'avibase-EJ000002'),
    fila('subspecies', 'Ejemplus primus alter', 'Ejemploformes', 'Ejemplidae', 'avibase-EJ000003'),
    fila('species', 'Ejemplus secundus', 'Ejemploformes', 'Ejemplidae', 'avibase-EJ000004'),
    fila('genus', generoB, 'Ejemploformes', 'Ejemplidae'),
    fila('species', `${generoB} tertius`, 'Ejemploformes', 'Ejemplidae', 'avibase-EJ000005'),
  ];
}

function construir(filas: FilaAviList[], anclasPrevias: Ancla[] = [], v = 'v1') {
  return construirReferencia({ rutaBase: ':memory:', filas, anclasPrevias, version: version(v), fechaImportacion: '2000-01-01' });
}

function idDe(anclas: Ancla[], nombre: string): number {
  const a = anclas.find((x) => x.nombreCientifico === nombre);
  assert.ok(a, `no existe ancla para ${nombre}`);
  return a.id;
}

test('asigna identificadores consecutivos en orden de secuencia y cuenta por rango', () => {
  const { resultado, anclas } = construir(listaEjemplo());
  assert.deepEqual(resultado.recuentoPorRango, { order: 1, family: 1, genus: 2, species: 3, subspecies: 2 });
  assert.deepEqual(anclas.map((a) => a.id), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(resultado.anclasNuevas, 9);
  assert.equal(resultado.anclasReutilizadas, 0);
});

test('cada taxón cuelga del taxón de rango inmediatamente superior', () => {
  const ruta = join(carpeta, 'jerarquia.sqlite');
  construirReferencia({ rutaBase: ruta, filas: listaEjemplo(), anclasPrevias: [], version: version('v1'), fechaImportacion: '2000-01-01' });
  const db = new DatabaseSync(ruta, { readOnly: true });
  const filas = db.prepare(
    `SELECT h.nombre_cientifico AS hijo, h.rango AS rango_hijo, p.nombre_cientifico AS padre, p.rango AS rango_padre
     FROM taxon h LEFT JOIN taxon p ON p.id = h.padre_id ORDER BY h.orden_secuencia`,
  ).all() as { hijo: string; rango_hijo: string; padre: string | null; rango_padre: string | null }[];
  db.close();
  const padreDe = Object.fromEntries(filas.map((f) => [f.hijo, f.padre]));
  assert.equal(padreDe['Ejemploformes'], null);
  assert.equal(padreDe['Ejemplidae'], 'Ejemploformes');
  assert.equal(padreDe['Ejemplus'], 'Ejemplidae');
  assert.equal(padreDe['Ejemplus primus alter'], 'Ejemplus primus');
  assert.equal(padreDe['Ejemplus secundus'], 'Ejemplus');
  assert.equal(padreDe['Ejemplornis tertius'], 'Ejemplornis');
});

test('reimportar la misma lista conserva todos los identificadores', () => {
  const primera = construir(listaEjemplo());
  const segunda = construir(listaEjemplo(), primera.anclas);
  assert.deepEqual(segunda.anclas, primera.anclas);
  assert.equal(segunda.resultado.anclasNuevas, 0);
  assert.equal(segunda.resultado.anclasReutilizadas, 9);
});

test('una especie conserva su identificador aunque su género cambie de nombre', () => {
  const v1 = construir(listaEjemplo('Ejemplornis'));
  const idEspecie = idDe(v1.anclas, 'Ejemplornis tertius');
  const idGeneroViejo = idDe(v1.anclas, 'Ejemplornis');

  const v2 = construir(listaEjemplo('Novornis'), v1.anclas, 'v2');
  assert.equal(idDe(v2.anclas, 'Novornis tertius'), idEspecie, 'la especie debe conservar su identificador');
  // El género nuevo es un taxón nuevo; el antiguo queda como ausente y su identificador no se reutiliza.
  const idGeneroNuevo = idDe(v2.anclas, 'Novornis');
  assert.notEqual(idGeneroNuevo, idGeneroViejo);
  assert.equal(idGeneroNuevo, 10);
  assert.deepEqual(v2.resultado.anclasAusentes.map((a) => a.nombreCientifico), ['Ejemplornis']);
  assert.equal(idDe(v2.anclas, 'Ejemplornis'), idGeneroViejo, 'el ancla antigua no se borra');
});

test('un taxón que desaparece no cede su identificador a otro', () => {
  const v1 = construir(listaEjemplo());
  const sinSecundus = listaEjemplo().filter((f) => f.nombreCientifico !== 'Ejemplus secundus');
  const v2 = construir(sinSecundus, v1.anclas, 'v2');
  assert.deepEqual(v2.resultado.anclasAusentes.map((a) => a.nombreCientifico), ['Ejemplus secundus']);

  const conNueva = [...sinSecundus, { ...fila('species', 'Ejemplornis quartus', 'Ejemploformes', 'Ejemplidae', 'avibase-EJ000006'), secuencia: 99 }];
  const v3 = construir(conNueva, v2.anclas, 'v3');
  assert.equal(idDe(v3.anclas, 'Ejemplornis quartus'), 10);
  assert.equal(idDe(v3.anclas, 'Ejemplus secundus'), idDe(v1.anclas, 'Ejemplus secundus'));
});

test('el archivo de anclas se guarda y se lee sin pérdidas', () => {
  const { anclas } = construir(listaEjemplo());
  const ruta = join(carpeta, 'anclas.csv');
  escribirAnclas(ruta, anclas);
  assert.deepEqual(leerAnclas(ruta), anclas);
  assert.deepEqual(leerAnclas(join(carpeta, 'no-existe.csv')), []);
});

test('rechaza datos incoherentes en lugar de importarlos a medias', () => {
  const sinAvibase = listaEjemplo();
  sinAvibase[3] = { ...sinAvibase[3]!, avibaseId: null };
  assert.throws(() => construir(sinAvibase), /no tiene Avibase ID/);

  const generoEquivocado = listaEjemplo();
  generoEquivocado[6] = { ...generoEquivocado[6]!, nombreCientifico: 'Otrogenus secundus' };
  assert.throws(() => construir(generoEquivocado), /no corresponde al género en curso/);

  const subespecieHuerfana = listaEjemplo();
  subespecieHuerfana[5] = { ...subespecieHuerfana[5]!, nombreCientifico: 'Ejemplus secundus alter' };
  assert.throws(() => construir(subespecieHuerfana), /no corresponde a la especie en curso/);

  const nombreRepetido = listaEjemplo();
  nombreRepetido[6] = { ...nombreRepetido[6]!, nombreCientifico: 'Ejemplus primus' };
  assert.throws(() => construir(nombreRepetido), /repetido/);

  const avibaseRepetido = listaEjemplo();
  avibaseRepetido[6] = { ...avibaseRepetido[6]!, avibaseId: 'avibase-EJ000001' };
  assert.throws(() => construir(avibaseRepetido), /comparten la misma ancla/);

  const familiaDeOtroOrden = listaEjemplo();
  familiaDeOtroOrden[1] = { ...familiaDeOtroOrden[1]!, orden: 'Otroformes' };
  assert.throws(() => construir(familiaDeOtroOrden), /no pertenece al orden en curso/);
});
