// Archivo de anclas: la correspondencia permanente entre un taxón y su identificador de AVEDEX.
//
// Es lo que garantiza que un taxón conserve su identificador entre importaciones y entre versiones.
// Se guarda como CSV de texto para poder revisarlo y versionarlo. NUNCA se edita a mano ni se borra:
// si se pierde, los identificadores cambian y los registros del usuario dejan de apuntar a su taxón.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Ancla, FilaAviList, Rango } from './tipos.ts';
import { RANGOS } from './tipos.ts';

const CABECERA = 'id,clave,rango,nombre_cientifico,version_alta,version_ultima';

/**
 * Clave con la que se reconoce a un taxón de una versión a otra.
 * - Especies y subespecies: el Avibase ID, que identifica el concepto taxonómico y no cambia
 *   aunque cambien el nombre o el género.
 * - Órdenes, familias y géneros: AviList no les da identificador, así que se usa rango + nombre.
 *   Un género renombrado es, a estos efectos, un taxón nuevo.
 */
export function claveDeAncla(fila: Pick<FilaAviList, 'rango' | 'nombreCientifico' | 'avibaseId'>): string {
  if (fila.rango === 'species' || fila.rango === 'subspecies') {
    if (!fila.avibaseId) {
      throw new Error(`«${fila.nombreCientifico}» (${fila.rango}) no tiene Avibase ID: no se le puede dar un ancla estable.`);
    }
    return `avibase:${fila.avibaseId}`;
  }
  return `nombre:${fila.rango}:${fila.nombreCientifico}`;
}

export function leerAnclas(ruta: string): Ancla[] {
  if (!existsSync(ruta)) return [];
  const lineas = readFileSync(ruta, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  const [cabecera, ...resto] = lineas;
  if (cabecera !== CABECERA) throw new Error(`Cabecera inesperada en ${ruta}: «${cabecera}».`);
  const anclas: Ancla[] = [];
  const idsVistos = new Set<number>();
  const clavesVistas = new Set<string>();
  for (const linea of resto) {
    const partes = linea.split(',');
    if (partes.length !== 6) throw new Error(`Línea de anclas mal formada: «${linea}».`);
    const [idTexto, clave, rango, nombreCientifico, versionAlta, versionUltima] = partes as [
      string, string, string, string, string, string,
    ];
    const id = Number(idTexto);
    if (!Number.isInteger(id) || id <= 0) throw new Error(`Identificador no válido en anclas: «${idTexto}».`);
    if (!(RANGOS as readonly string[]).includes(rango)) throw new Error(`Rango no válido en anclas: «${rango}».`);
    if (idsVistos.has(id)) throw new Error(`Identificador repetido en anclas: ${id}.`);
    if (clavesVistas.has(clave)) throw new Error(`Clave repetida en anclas: ${clave}.`);
    idsVistos.add(id);
    clavesVistas.add(clave);
    anclas.push({ id, clave, rango: rango as Rango, nombreCientifico, versionAlta, versionUltima });
  }
  return anclas;
}

export function escribirAnclas(ruta: string, anclas: readonly Ancla[]): void {
  const ordenadas = [...anclas].sort((a, b) => a.id - b.id);
  const lineas = ordenadas.map((a) => {
    const campos = [String(a.id), a.clave, a.rango, a.nombreCientifico, a.versionAlta, a.versionUltima];
    for (const c of campos) {
      if (/[,\r\n]/.test(c)) throw new Error(`Un campo de ancla contiene coma o salto de línea: «${c}».`);
    }
    return campos.join(',');
  });
  writeFileSync(ruta, [CABECERA, ...lineas].join('\n') + '\n', 'utf8');
}
