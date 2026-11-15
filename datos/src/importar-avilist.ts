// Tarea T1 — Importador de AviList a SQLite.
//
// Uso (desde la carpeta datos/):
//   npm run importar                      → importa la versión descrita en fuentes/avilist/v2026.json
//   npm run importar -- ruta/al/manifiesto.json
//
// Produce:
//   salida/referencia.sqlite                 la base de referencia (la que usa la app)
//   salida/referencia-nomenclatura.sqlite    datos nomenclaturales y bibliográficos (modo Experto, opcional)
//   salida/informe-importacion.md    qué se ha importado y con qué avisos
//   anclas/taxones.csv               correspondencia permanente taxón → identificador (se actualiza)

import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { escribirAnclas, leerAnclas } from './anclas.ts';
import { construirReferencia } from './construir.ts';
import { leerAviList, sha256DeArchivo } from './leer-avilist.ts';
import type { DatosVersion, Rango } from './tipos.ts';
import { RANGOS } from './tipos.ts';

interface Manifiesto {
  fuente: string;
  version: string;
  fecha_publicacion: string;
  archivo: string;
  hoja: string;
  url: string;
}

const RAIZ = resolve(import.meta.dirname, '..');
const NOMBRE_RANGO: Record<Rango, string> = {
  order: 'Órdenes', family: 'Familias', genus: 'Géneros', species: 'Especies', subspecies: 'Subespecies',
};

export interface RutasImportacion {
  manifiesto: string;
  anclas: string;
  base: string;
  nomenclatura: string;
  informe: string;
}

export function rutasPorDefecto(): RutasImportacion {
  return {
    manifiesto: join(RAIZ, 'fuentes', 'avilist', 'v2026.json'),
    anclas: join(RAIZ, 'anclas', 'taxones.csv'),
    base: join(RAIZ, 'salida', 'referencia.sqlite'),
    nomenclatura: join(RAIZ, 'salida', 'referencia-nomenclatura.sqlite'),
    informe: join(RAIZ, 'salida', 'informe-importacion.md'),
  };
}

export async function importar(rutas: RutasImportacion, fechaImportacion: string) {
  const manifiesto = JSON.parse(readFileSync(rutas.manifiesto, 'utf8')) as Manifiesto;
  const rutaXlsx = join(dirname(rutas.manifiesto), manifiesto.archivo);

  const lectura = await leerAviList(rutaXlsx, manifiesto.hoja);
  const version: DatosVersion = {
    fuente: manifiesto.fuente,
    version: manifiesto.version,
    fechaPublicacion: manifiesto.fecha_publicacion,
    archivo: manifiesto.archivo,
    sha256: sha256DeArchivo(rutaXlsx),
    url: manifiesto.url,
    cita: lectura.cita,
    licencia: lectura.licencia,
    versionClements: lectura.versionClements,
    versionBirdLife: lectura.versionBirdLife,
  };

  const anclasPrevias = leerAnclas(rutas.anclas);

  // Se construye en un archivo temporal: si algo falla, la base anterior y las anclas quedan intactas.
  mkdirSync(dirname(rutas.base), { recursive: true });
  mkdirSync(dirname(rutas.anclas), { recursive: true });
  const temporal = `${rutas.base}.tmp`;
  const temporalNomenclatura = `${rutas.nomenclatura}.tmp`;
  const { resultado, anclas } = construirReferencia({
    rutaBase: temporal,
    rutaNomenclatura: temporalNomenclatura,
    filas: lectura.filas,
    anclasPrevias,
    version,
    fechaImportacion,
  });
  renameSync(temporal, rutas.base);
  renameSync(temporalNomenclatura, rutas.nomenclatura);
  escribirAnclas(rutas.anclas, anclas);

  const tamano = statSync(rutas.base).size;
  const tamanoNomenclatura = statSync(rutas.nomenclatura).size;
  const total = RANGOS.reduce((s, r) => s + resultado.recuentoPorRango[r], 0);
  const informe = [
    '# Informe de importación',
    '',
    `- **Fuente:** ${version.fuente} ${version.version} (publicada el ${version.fechaPublicacion})`,
    `- **Archivo:** \`${version.archivo}\``,
    `- **SHA-256:** \`${version.sha256}\``,
    `- **Cita:** ${version.cita}`,
    `- **Licencia:** ${version.licencia}`,
    `- **Fecha de importación:** ${fechaImportacion}`,
    '',
    '## Taxones importados',
    '',
    '| Rango | Número |',
    '|---|---|',
    ...RANGOS.map((r) => `| ${NOMBRE_RANGO[r]} | ${resultado.recuentoPorRango[r]} |`),
    `| **Total** | **${total}** |`,
    '',
    `Filas vacías ignoradas en la hoja: ${lectura.filasVacias}. Filas descartadas por error: 0 (cualquier error detiene la importación).`,
    '',
    '## Identificadores',
    '',
    `- Identificadores nuevos asignados: ${resultado.anclasNuevas}`,
    `- Identificadores reutilizados de importaciones anteriores: ${resultado.anclasReutilizadas}`,
    `- Taxones de versiones anteriores ausentes en esta: ${resultado.anclasAusentes.length}`,
    '',
    '## Otros datos',
    '',
    `- Nombres en inglés: ${resultado.nombres}`,
    `- Equivalencias con Avibase: ${resultado.idsExternos['avibase']}`,
    `- Equivalencias con eBird/Clements ${version.versionClements ?? ''}: ${resultado.idsExternos['ebird']}`,
    `- Equivalencias con BirdLife ${version.versionBirdLife ?? ''}: ${resultado.idsExternos['birdlife']}`,
    `- Filas con datos nomenclaturales: ${resultado.filasNomenclatura}`,
    `- Tamaño de \`referencia.sqlite\`: ${(tamano / 1024 / 1024).toFixed(1)} MB`,
    `- Tamaño de \`referencia-nomenclatura.sqlite\`: ${(tamanoNomenclatura / 1024 / 1024).toFixed(1)} MB`,
    '',
    '## Avisos',
    '',
    ...(resultado.avisos.length > 0 ? resultado.avisos.map((a) => `- ${a}`) : ['Ninguno.']),
    '',
  ].join('\n');
  writeFileSync(rutas.informe, informe, 'utf8');

  return { resultado, version, tamano, tamanoNomenclatura, informe };
}

// Solo se ejecuta al lanzarlo como programa, no al importarlo desde las pruebas.
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const rutas = rutasPorDefecto();
  if (process.argv[2]) rutas.manifiesto = resolve(process.argv[2]);
  const hoy = new Date().toISOString().slice(0, 10);
  const { informe } = await importar(rutas, hoy);
  console.log(informe);
  console.log(`Base escrita en ${rutas.base}`);
}
