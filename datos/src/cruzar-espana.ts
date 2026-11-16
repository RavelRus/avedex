// Hito 1.3 — Cruza la lista de SEO/BirdLife con AviList y escribe un informe para revisar.
//
// Uso (desde datos/):  npm run cruzar-espana
// Lee:     fuentes/seo/lista-aves-espana-2022.csv, fuentes/seo/equivalencias-revisadas.csv, salida/referencia.sqlite
// Escribe: salida/informe-espana.md  y  fuentes/seo/equivalencias-propuestas.csv
//
// Las propuestas NO se aplican: son sugerencias para que Pablo las apruebe, corrija o rechace.
// Solo cuenta lo que esté en equivalencias-revisadas.csv.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { escribirCsv, leerCsv } from './csv.ts';
import { cruzarConAviList, interpretarListaSeo } from './espana.ts';
import type { EquivalenciaRevisada, ResultadoCruce } from './espana.ts';

const RAIZ = resolve(import.meta.dirname, '..');
export const RUTAS_ESPANA = {
  lista: join(RAIZ, 'fuentes', 'seo', 'lista-aves-espana-2022.csv'),
  revisadas: join(RAIZ, 'fuentes', 'seo', 'equivalencias-revisadas.csv'),
  propuestas: join(RAIZ, 'fuentes', 'seo', 'equivalencias-propuestas.csv'),
  referencia: join(RAIZ, 'salida', 'referencia.sqlite'),
  informe: join(RAIZ, 'salida', 'informe-espana.md'),
};

export function leerRevisadas(ruta: string): EquivalenciaRevisada[] {
  if (!existsSync(ruta)) return [];
  return leerCsv(readFileSync(ruta, 'utf8')).map((f) => ({
    nombreSeo: f['nombre_seo'] ?? '',
    nombreAviList: f['nombre_avilist'] ?? '',
    equivalencia: f['equivalencia'] ?? '',
    decididoPor: f['decidido_por'] ?? '',
    fecha: f['fecha'] ?? '',
    nota: f['nota'] ?? '',
  }));
}

export type Grupo = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G0';

/** Clasifica cada caso pendiente en un grupo de decisión. */
export function grupoDe(r: ResultadoCruce): Grupo | null {
  if (r.estado === 'par') return 'G5';
  if (r.estado === 'exacta') return r.avisos.some((a) => a.startsWith('SEPARADA')) ? 'G4' : null;
  if (r.estado !== 'sin_equivalencia') return null;
  const especie = r.candidatos.filter((c) => c.rango === 'species');
  if (especie.length === 1 && especie[0]!.motivos.includes('mismo nombre en inglés')
    && especie[0]!.motivos.some((m) => m.startsWith('mismo epíteto') || m.startsWith('mismo género'))) return 'G1';
  if (especie.length === 1 && especie[0]!.motivos.some((m) => m.startsWith('mismo epíteto'))) return 'G2';
  if (especie.every((c) => !c.motivos.some((m) => m.startsWith('mismo epíteto') || m.startsWith('mismo género')))
    && r.candidatos.some((c) => c.rango === 'subspecies')) return 'G3';
  return 'G0';
}

export function cruzarEspana() {
  const entradas = interpretarListaSeo(leerCsv(readFileSync(RUTAS_ESPANA.lista, 'utf8')));
  const db = new DatabaseSync(RUTAS_ESPANA.referencia, { readOnly: true });
  const taxonomia = (db.prepare("SELECT valor FROM meta WHERE clave = 'taxonomia_base'").get() as { valor: string }).valor;
  const resultados = cruzarConAviList(entradas, db, leerRevisadas(RUTAS_ESPANA.revisadas));
  db.close();
  return { entradas, resultados, taxonomia };
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const { resultados, taxonomia } = cruzarEspana();
  const cuenta = (estado: string) => resultados.filter((r) => r.estado === estado).length;
  const deGrupo = (g: Grupo) => resultados.filter((r) => grupoDe(r) === g);
  const esp = (r: ResultadoCruce) => `*${r.entrada.nombre}* (${r.entrada.nombreEspanol})`;
  const ambito = (r: ResultadoCruce) => [['PB', r.entrada.pb], ['NA', r.entrada.na], ['CA', r.entrada.ca]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');
  const candidatoPrincipal = (r: ResultadoCruce, rango: string) => r.candidatos.find((c) => c.rango === rango);

  const lineas: string[] = [
    '# Informe del cruce: Lista de las aves de España 2022 ↔ ' + taxonomia,
    '',
    'Generado por `npm run cruzar-espana`. **Contiene datos de SEO/BirdLife sin licencia abierta: no publicar.**',
    '',
    '## Resumen',
    '',
    '| Situación | Entradas |',
    '|---|---|',
    `| Coincidencia exacta de nombre científico, sin incidencias | ${resultados.filter((r) => r.estado === 'exacta' && grupoDe(r) === null).length} |`,
    `| G4 — Mismo nombre, pero AviList ha separado parte en otra especie | ${deGrupo('G4').length} |`,
    `| G1 — Cambio de género o de terminación, mismo nombre en inglés | ${deGrupo('G1').length} |`,
    `| G2 — Cambio de género, nombre en inglés distinto | ${deGrupo('G2').length} |`,
    `| G3 — Especie en la lista, subespecie en AviList | ${deGrupo('G3').length} |`,
    `| G5 — Pares de especies no asignables | ${deGrupo('G5').length} |`,
    `| Sin clasificar | ${deGrupo('G0').length} |`,
    `| Ya revisadas por Pablo | ${cuenta('revisada')} |`,
    `| **Total** | **${resultados.length}** |`,
    '',
    'Ninguna propuesta de este informe está aplicada. Solo cuenta lo que figure en `fuentes/seo/equivalencias-revisadas.csv`.',
    '',
    '## G1 — Cambio de género o de terminación, mismo nombre en inglés',
    '',
    'Propuesta: equivalencia **exacta** (misma especie con el nombre científico actualizado).',
    '',
    '| Lista de España | AviList | Ámbito |',
    '|---|---|---|',
    ...deGrupo('G1').map((r) => `| ${esp(r)} | *${candidatoPrincipal(r, 'species')!.nombreCientifico}* | ${ambito(r)} |`),
    '',
    '## G2 — Cambio de género, nombre en inglés distinto',
    '',
    'El epíteto coincide, pero el nombre en inglés no: puede ser la misma especie o una parte de ella tras una división.',
    '',
    '| Lista de España | Inglés en la lista | AviList | Inglés en AviList | Subespecies en la lista |',
    '|---|---|---|---|---|',
    ...deGrupo('G2').map((r) => { const c = candidatoPrincipal(r, 'species')!; return `| ${esp(r)} | ${r.entrada.nombreIngles} | *${c.nombreCientifico}* | ${c.nombreIngles ?? '—'} | ${r.entrada.subespeciesTexto || '—'} |`; }),
    '',
    '## G3 — Especie en la lista, subespecie en AviList',
    '',
    'Propuesta: enlazar con la subespecie de AviList, que es el mismo conjunto de aves.',
    '',
    '| Lista de España | AviList | Ámbito |',
    '|---|---|---|',
    ...deGrupo('G3').map((r) => `| ${esp(r)} | *${candidatoPrincipal(r, 'subspecies')!.nombreCientifico}* | ${ambito(r)} |`),
    '',
    '## G4 — Mismo nombre, pero AviList ha separado parte en otra especie',
    '',
    'El nombre científico coincide, pero la especie de la lista es más amplia que la de AviList: una entrada de la lista corresponde a varias especies de AviList.',
    '',
    ...deGrupo('G4').flatMap((r) => [
      `**${esp(r)}** — subespecies en la lista: ${r.entrada.subespeciesTexto} — ${ambito(r)}`,
      '',
      ...r.avisos.filter((a) => a.startsWith('SEPARADA')).map((a) => `- ${a.replace('SEPARADA: ', '')}`),
      '',
    ]),
    '## G5 — Pares de especies',
    '',
    'Registros que la propia lista no asigna a una sola especie. Propuesta: no enlazarlos con ningún taxón.',
    '',
    ...deGrupo('G5').map((r) => `- ${esp(r)} — ${ambito(r)}`),
    '',
    '## Avisos informativos (no requieren decisión)',
    '',
    '### Subespecies de la lista que AviList no reconoce con ese nombre',
    '',
    ...resultados.flatMap((r) => r.avisos.filter((a) => a.startsWith('Subespecie «')).map((a) => `- ${esp(r)}: ${a} Texto de la lista: «${r.entrada.subespeciesTexto}».`)),
    '',
    '### Nombre en inglés distinto con nombre científico idéntico',
    '',
    '| Especie | Lista | AviList |',
    '|---|---|---|',
    ...resultados.filter((r) => r.estado === 'exacta').flatMap((r) => r.avisos.filter((a) => a.startsWith('Nombre en inglés')).map((a) => {
      const m = /dice «(.*?)» y AviList «(.*?)»/.exec(a);
      return `| ${esp(r)} | ${m?.[1] ?? ''} | ${m?.[2] ?? ''} |`;
    })),
    '',
  ];
  if (deGrupo('G0').length > 0) {
    lineas.push('## Sin clasificar', '', ...deGrupo('G0').map((r) => `- ${esp(r)}: ${r.candidatos.map((c) => `${c.nombreCientifico} [${c.motivos.join('; ')}]`).join(' / ') || 'sin candidatos'}`), '');
  }
  writeFileSync(RUTAS_ESPANA.informe, lineas.join('\n'), 'utf8');

  const propuestas = resultados.flatMap((r): Record<string, string>[] => {
    const g = grupoDe(r);
    if (g === 'G1' || g === 'G2') return [{ grupo: g, nombre_seo: r.entrada.nombre, nombre_avilist: candidatoPrincipal(r, 'species')!.nombreCientifico, equivalencia: g === 'G1' ? 'exacta' : 'pendiente' }];
    if (g === 'G3') return [{ grupo: g, nombre_seo: r.entrada.nombre, nombre_avilist: candidatoPrincipal(r, 'subspecies')!.nombreCientifico, equivalencia: 'exacta' }];
    return [];
  });
  writeFileSync(RUTAS_ESPANA.propuestas, escribirCsv(['grupo', 'nombre_seo', 'nombre_avilist', 'equivalencia'], propuestas), 'utf8');

  console.log(lineas.slice(4, 18).join('\n'));
  console.log(`\nInforme: ${RUTAS_ESPANA.informe}`);
}
