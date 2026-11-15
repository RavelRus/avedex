// Lee el archivo oficial de AviList (versión extendida, formato v2026) y lo convierte en filas limpias.
// No decide nada sobre identificadores ni sobre la base de datos: solo lee y valida.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import readExcelFile from 'read-excel-file/node';
import type { FilaAviList, LecturaAviList, Rango } from './tipos.ts';
import { RANGOS } from './tipos.ts';

type Celda = string | number | boolean | Date | null | undefined;

/** Columnas que el importador necesita. Si falta alguna, el formato ha cambiado y se detiene. */
const COLUMNAS_FIJAS = {
  secuencia: '#',
  rango: 'RANK',
  orden: 'ORDER',
  familia: 'FAMILY',
  nombreCientifico: 'SCIENTIFIC NAME',
  autoridad: 'AUTHORITY',
  detallesBibliograficos: 'BIBLIOGRAPHIC DETAILS',
  nombreInglesAviList: 'ENGLISH NAME: AVILIST',
  numeroPropuesta: 'PROPOSAL NUMBER',
  resumenDecision: 'DECISION SUMMARY',
  distribucion: 'RANGE',
  estadoExtincion: 'EXTINCTION STATUS',
  categoriaUicn: 'IUCN RED LIST CATEGORY',
  urlBirdLife: 'BIRDLIFE DATAZONE URL',
  codigoCornell: 'SPECIES CODE CORNELL LAB',
  avibaseId: 'AVIBASE ID',
  generoGramatical: 'GENDER OF GENUS',
  especieTipo: 'TYPE SPECIES OF GENUS',
  localidadTipo: 'TYPE LOCALITY',
  tituloDescripcion: 'TITLE OF ORIGINAL DESCRIPTION',
  urlDescripcion: 'ORIGINAL DESCRIPTION URL',
  protonimo: 'PROTONYM',
} as const;

/** Columnas cuyo título incluye un número de versión que cambia cada año. */
const COLUMNAS_CON_VERSION = {
  nombreInglesClements: /^ENGLISH NAME: CLEMENTS (v\S+)$/,
  nombreInglesBirdLife: /^ENGLISH NAME: BIRDLIFE (v\S+)$/,
  cambiosVersion: /^(v\S+) CHANGES$/,
} as const;

export function sha256DeArchivo(ruta: string): string {
  return createHash('sha256').update(readFileSync(ruta)).digest('hex');
}

function texto(valor: Celda): string | null {
  if (valor === null || valor === undefined) return null;
  const limpio = String(valor).normalize('NFC').trim();
  return limpio === '' ? null : limpio;
}

function esRango(valor: string | null): valor is Rango {
  return valor !== null && (RANGOS as readonly string[]).includes(valor);
}

export async function leerAviList(ruta: string, nombreHoja: string): Promise<LecturaAviList> {
  const hojas = await readExcelFile(ruta);

  const principal = hojas.find((h) => h.sheet === nombreHoja);
  if (!principal) {
    const disponibles = hojas.map((h) => h.sheet).join(', ');
    throw new Error(`No existe la hoja «${nombreHoja}». Hojas del archivo: ${disponibles}`);
  }

  // --- Cita y licencia: se leen del propio archivo, no se escriben a mano ---
  const hojaCita = hojas.find((h) => h.sheet === 'Recommended citation');
  if (!hojaCita) throw new Error('No existe la hoja «Recommended citation».');
  const lineasCita = hojaCita.data
    .flat()
    .map((c) => texto(c as Celda))
    .filter((c): c is string => c !== null);
  const cita = lineasCita.find((l) => l.startsWith('AviList Core Team.'));
  const licencia = lineasCita.find((l) => l.includes('licensed under'));
  if (!cita) throw new Error('No se ha encontrado la cita recomendada en el archivo.');
  if (!licencia) throw new Error('No se ha encontrado la declaración de licencia en el archivo.');
  if (!licencia.includes('CC BY 4.0')) {
    throw new Error(
      `La licencia del archivo ya no es CC BY 4.0: «${licencia}». Hay que revisar docs/FUENTES.md antes de importar.`,
    );
  }

  // --- Cabecera ---
  const [cabeceraCruda, ...datos] = principal.data;
  if (!cabeceraCruda) throw new Error('La hoja principal está vacía.');
  const cabecera = cabeceraCruda.map((c) => texto(c as Celda));

  const indice: Record<string, number> = {};
  for (const [campo, titulo] of Object.entries(COLUMNAS_FIJAS)) {
    const i = cabecera.indexOf(titulo);
    if (i === -1) throw new Error(`Falta la columna «${titulo}». El formato del archivo ha cambiado.`);
    indice[campo] = i;
  }
  const versiones: Record<string, string | null> = {};
  for (const [campo, patron] of Object.entries(COLUMNAS_CON_VERSION)) {
    const i = cabecera.findIndex((t) => t !== null && patron.test(t));
    if (i === -1) throw new Error(`Falta la columna que casa con ${patron}. El formato del archivo ha cambiado.`);
    indice[campo] = i;
    versiones[campo] = patron.exec(cabecera[i] as string)?.[1] ?? null;
  }

  const celda = (fila: readonly Celda[], campo: string): string | null => texto(fila[indice[campo] as number]);

  // --- Filas ---
  const filas: FilaAviList[] = [];
  let filasVacias = 0;
  datos.forEach((fila, n) => {
    const numeroDeFila = n + 2; // la 1 es la cabecera
    const f = fila as readonly Celda[];
    const rango = celda(f, 'rango');
    const nombreCientifico = celda(f, 'nombreCientifico');
    if (rango === null && nombreCientifico === null) {
      filasVacias++;
      return;
    }
    if (!esRango(rango)) throw new Error(`Fila ${numeroDeFila}: rango desconocido «${rango}».`);
    if (nombreCientifico === null) throw new Error(`Fila ${numeroDeFila}: falta el nombre científico.`);
    const secuencia = Number(f[indice['secuencia'] as number]);
    if (!Number.isInteger(secuencia)) throw new Error(`Fila ${numeroDeFila}: número de secuencia no válido.`);
    const orden = celda(f, 'orden');
    if (orden === null) throw new Error(`Fila ${numeroDeFila}: falta el orden.`);

    filas.push({
      secuencia,
      rango,
      orden,
      familia: celda(f, 'familia'),
      nombreCientifico,
      autoridad: celda(f, 'autoridad'),
      detallesBibliograficos: celda(f, 'detallesBibliograficos'),
      nombreInglesAviList: celda(f, 'nombreInglesAviList'),
      nombreInglesClements: celda(f, 'nombreInglesClements'),
      nombreInglesBirdLife: celda(f, 'nombreInglesBirdLife'),
      cambiosVersion: celda(f, 'cambiosVersion'),
      numeroPropuesta: celda(f, 'numeroPropuesta'),
      resumenDecision: celda(f, 'resumenDecision'),
      distribucion: celda(f, 'distribucion'),
      estadoExtincion: celda(f, 'estadoExtincion'),
      categoriaUicn: celda(f, 'categoriaUicn'),
      urlBirdLife: celda(f, 'urlBirdLife'),
      codigoCornell: celda(f, 'codigoCornell'),
      avibaseId: celda(f, 'avibaseId'),
      generoGramatical: celda(f, 'generoGramatical'),
      especieTipo: celda(f, 'especieTipo'),
      localidadTipo: celda(f, 'localidadTipo'),
      tituloDescripcion: celda(f, 'tituloDescripcion'),
      urlDescripcion: celda(f, 'urlDescripcion'),
      protonimo: celda(f, 'protonimo'),
    });
  });

  return {
    filas,
    cita,
    licencia,
    versionClements: versiones['nombreInglesClements'] ?? null,
    versionBirdLife: versiones['nombreInglesBirdLife'] ?? null,
    filasVacias,
  };
}
