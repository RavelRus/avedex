// Hito 1.3 — Cruce de la «Lista de las aves de España» (SEO/BirdLife, 2022) con la taxonomía de AviList.
//
// Regla principal: aquí NO se decide ninguna equivalencia dudosa. Solo se dan por buenas:
//   1. las coincidencias exactas de nombre científico con una especie vigente de AviList, y
//   2. las que figuren en el archivo de equivalencias revisadas por Pablo.
// Para todo lo demás se buscan candidatos y se explican, para que decida una persona.

import type { DatabaseSync } from 'node:sqlite';

export interface EntradaSeo {
  fila: number; // posición en la lista (1 = primera)
  seccion: string;
  familia: string;
  nombreOriginal: string; // tal como figura en la lista
  nombre: string; // sin la marca † de extinto
  marcadoExtinto: boolean;
  esPar: boolean; // «Pterodroma macroptera / P. arminjoniana»: registro no asignable a una sola especie
  subespecies: string[];
  subespeciesTexto: string;
  nombreIngles: string;
  nombreEspanol: string;
  pb: string;
  na: string;
  ca: string;
  observaciones: string;
  pagina: number;
}

export interface Candidato {
  taxonId: number;
  rango: string;
  nombreCientifico: string;
  nombreIngles: string | null;
  motivos: string[];
}

export type EstadoCruce = 'exacta' | 'revisada' | 'par' | 'sin_equivalencia';

export interface ResultadoCruce {
  entrada: EntradaSeo;
  estado: EstadoCruce;
  taxonId: number | null;
  nombreAviList: string | null;
  equivalencia: string | null; // exacta, mas_amplia, mas_estrecha, parcial
  candidatos: Candidato[];
  avisos: string[];
}

export interface EquivalenciaRevisada {
  nombreSeo: string;
  nombreAviList: string; // vacío = «decidido: no tiene equivalente»
  equivalencia: string;
  decididoPor: string;
  fecha: string;
  nota: string;
}

/** Normaliza la categoría de la lista: «A(i)» y «A (i)» son lo mismo. */
export function normalizarCategoria(valor: string): string {
  return valor.replace(/\s+/g, '').replace('(i)', ' (i)');
}

export function interpretarListaSeo(filas: readonly Record<string, string>[]): EntradaSeo[] {
  return filas.map((f, i) => {
    const original = f['nombre_cientifico'] ?? '';
    const marcadoExtinto = original.includes('†');
    const nombre = original.replace('†', '').replace(/\s+/g, ' ').trim();
    const subespeciesTexto = f['subespecies'] ?? '';
    return {
      fila: i + 1,
      seccion: f['seccion'] ?? '',
      familia: f['familia'] ?? '',
      nombreOriginal: original,
      nombre,
      marcadoExtinto,
      esPar: nombre.includes('/'),
      // «ASD» = asignación de subespecie desconocida. Los signos ¿? y las barras se descartan aquí;
      // el texto original se conserva en subespeciesTexto.
      subespecies: interpretarSubespecies(subespeciesTexto),
      subespeciesTexto,
      nombreIngles: f['nombre_ingles'] ?? '',
      nombreEspanol: f['nombre_espanol'] ?? '',
      pb: normalizarCategoria(f['pb'] ?? ''),
      na: normalizarCategoria(f['na'] ?? ''),
      ca: normalizarCategoria(f['ca'] ?? ''),
      observaciones: f['observaciones'] ?? '',
      pagina: Number(f['pagina']),
    };
  });
}

/**
 * Convierte la celda de subespecies en una lista de epítetos.
 * - «ASD» (asignación de subespecie desconocida) y «cruces subespecíficos» no son subespecies.
 * - Los signos ¿? indican duda de la propia lista: el epíteto se conserva.
 * - El PDF parte a veces una letra («h ispanus», «cherru g»): los trozos de un mismo elemento se unen.
 */
export function interpretarSubespecies(texto: string): string[] {
  if (texto === '' || texto === 'ASD') return [];
  return texto
    .split(/[,/]/)
    .map((parte) => parte.replace(/[¿?†]/g, '').trim())
    .filter((parte) => parte !== '' && !parte.includes('cruces'))
    .map((parte) => parte.replace(/\s+/g, ''))
    .filter((parte) => /^[a-z]{3,}$/.test(parte));
}

/** Raíz del epíteto sin la terminación de género gramatical: «caeruleus» y «caerulea» comparten raíz. */
export function raizEpiteto(epiteto: string): string {
  return epiteto.replace(/(us|um|is|a|e|er|ra|rum|ii|i)$/, '');
}

const inglesComparable = (s: string) => s.toLowerCase().replace(/[’'`-]/g, ' ').replace(/\s+/g, ' ').trim();

interface TaxonAviList {
  id: number;
  rango: string;
  nombre: string;
  padreId: number | null;
  familia: string;
  ingles: string | null;
}

export function cruzarConAviList(
  entradas: readonly EntradaSeo[],
  db: DatabaseSync,
  revisadas: readonly EquivalenciaRevisada[] = [],
): ResultadoCruce[] {
  // Se carga en memoria lo necesario: especies y subespecies vigentes con su familia y nombres en inglés.
  const taxones = db.prepare(
    `SELECT t.id, t.rango, t.nombre_cientifico AS nombre, t.padre_id AS padreId,
            (SELECT n.nombre FROM nombre_taxon n WHERE n.taxon_id = t.id AND n.preferente = 1) AS ingles
     FROM taxon t WHERE t.vigente = 1`,
  ).all() as unknown as Omit<TaxonAviList, 'familia'>[];
  const porId = new Map(taxones.map((t) => [t.id, t]));
  const familiaDe = (t: Omit<TaxonAviList, 'familia'>): string => {
    let actual: Omit<TaxonAviList, 'familia'> | undefined = t;
    while (actual && actual.rango !== 'family') actual = actual.padreId === null ? undefined : porId.get(actual.padreId);
    return actual?.nombre.toUpperCase() ?? '';
  };
  const especies: TaxonAviList[] = [];
  const subespecies: TaxonAviList[] = [];
  for (const t of taxones) {
    if (t.rango === 'species') especies.push({ ...t, familia: familiaDe(t) });
    else if (t.rango === 'subspecies') subespecies.push({ ...t, familia: familiaDe(t) });
  }
  const especiePorNombre = new Map(especies.map((e) => [e.nombre, e]));
  const subespeciesDe = new Map<number, string[]>();
  for (const s of subespecies) {
    const lista = subespeciesDe.get(s.padreId!) ?? [];
    lista.push(s.nombre.split(' ')[2]!);
    subespeciesDe.set(s.padreId!, lista);
  }
  // Todos los nombres en inglés de cada especie (AviList, Clements, BirdLife).
  const inglesDe = new Map<number, Set<string>>();
  for (const fila of db.prepare("SELECT taxon_id AS id, nombre FROM nombre_taxon WHERE idioma = 'en'").all() as { id: number; nombre: string }[]) {
    const conjunto = inglesDe.get(fila.id) ?? new Set<string>();
    conjunto.add(inglesComparable(fila.nombre));
    inglesDe.set(fila.id, conjunto);
  }
  const revisadaPorNombre = new Map(revisadas.map((r) => [r.nombreSeo, r]));

  return entradas.map((entrada): ResultadoCruce => {
    const base = { entrada, candidatos: [] as Candidato[], avisos: [] as string[] };

    // Comprueba que las subespecies que la lista sitúa en España existen bajo esa misma especie en AviList.
    // Si no, el nombre coincide pero el concepto puede no ser el mismo (p. ej. AviList ha separado una especie).
    const avisosSubespecies = (especie: TaxonAviList): string[] => {
      const enAviList = new Set((subespeciesDe.get(especie.id) ?? []).map(raizEpiteto));
      const genero = especie.nombre.split(' ')[0]!;
      const avisos: string[] = [];
      for (const ssp of entrada.subespecies) {
        const raiz = raizEpiteto(ssp);
        if (enAviList.has(raiz)) continue;
        if (enAviList.size === 0 && raiz === raizEpiteto(especie.nombre.split(' ')[1]!)) continue; // nominal de especie monotípica
        // Primero se busca en el mismo género; solo si no hay nada, en el resto de la familia.
        const mismaRaiz = especies.filter((e) => e.id !== especie.id && e.familia === especie.familia && raizEpiteto(e.nombre.split(' ')[1]!) === raiz);
        const enGenero = mismaRaiz.filter((e) => e.nombre.split(' ')[0] === genero);
        const comoEspecie = enGenero.length > 0 ? enGenero : mismaRaiz;
        const comoSubespecie = subespecies.filter((x) => x.padreId !== especie.id && x.familia === especie.familia && raizEpiteto(x.nombre.split(' ')[2]!) === raiz
          && (x.nombre.split(' ')[0] === genero || comoEspecie.length === 0));
        if (comoEspecie.length > 0) {
          avisos.push(`SEPARADA: la lista sitúa en España la subespecie «${ssp}», que en AviList es otra especie: ${comoEspecie.map((e) => `${e.nombre} (${e.ingles ?? '—'})`).join(', ')}.`);
        } else if (comoSubespecie.length > 0) {
          avisos.push(`SEPARADA: la subespecie «${ssp}» de la lista está en AviList bajo otra especie: ${comoSubespecie.map((x) => x.nombre).join(', ')}.`);
        } else {
          avisos.push(`Subespecie «${ssp}» de la lista: AviList no la reconoce con ese nombre (sinónimo, errata de la lista o subespecie no aceptada).`);
        }
      }
      return avisos;
    };

    const revisada = revisadaPorNombre.get(entrada.nombre);
    if (revisada) {
      if (revisada.nombreAviList === '') {
        return { ...base, estado: 'revisada', taxonId: null, nombreAviList: null, equivalencia: null,
          avisos: [`Decidido por ${revisada.decididoPor} (${revisada.fecha}): sin equivalente en AviList. ${revisada.nota}`.trim()] };
      }
      const destino = especiePorNombre.get(revisada.nombreAviList)
        ?? subespecies.find((s) => s.nombre === revisada.nombreAviList);
      if (!destino) throw new Error(`Equivalencia revisada de «${entrada.nombre}»: «${revisada.nombreAviList}» no existe en AviList.`);
      return { ...base, estado: 'revisada', taxonId: destino.id, nombreAviList: destino.nombre, equivalencia: revisada.equivalencia,
        avisos: [`Decidido por ${revisada.decididoPor} (${revisada.fecha}). ${revisada.nota}`.trim()] };
    }

    if (entrada.esPar) {
      return { ...base, estado: 'par', taxonId: null, nombreAviList: null, equivalencia: null,
        avisos: ['Registro que la lista no asigna a una sola especie (par de especies). No se enlaza con ningún taxón.'] };
    }

    const exacta = especiePorNombre.get(entrada.nombre);
    if (exacta) {
      const avisos = avisosSubespecies(exacta);
      const ingleses = inglesDe.get(exacta.id) ?? new Set<string>();
      if (entrada.nombreIngles && !ingleses.has(inglesComparable(entrada.nombreIngles))) {
        avisos.push(`Nombre en inglés distinto: la lista dice «${entrada.nombreIngles}» y AviList «${exacta.ingles ?? '—'}». Suele ser solo un cambio de nombre, pero puede indicar una división de la especie.`);
      }
      return { ...base, estado: 'exacta', taxonId: exacta.id, nombreAviList: exacta.nombre, equivalencia: 'exacta', avisos };
    }

    // Sin coincidencia exacta: se buscan candidatos y se explica por qué lo son. No se elige ninguno.
    const [genero, epiteto] = entrada.nombre.split(' ') as [string, string];
    const raiz = raizEpiteto(epiteto ?? '');
    const ingles = inglesComparable(entrada.nombreIngles);
    const candidatos = new Map<number, Candidato>();
    const anotar = (t: TaxonAviList, motivo: string) => {
      const c = candidatos.get(t.id) ?? { taxonId: t.id, rango: t.rango, nombreCientifico: t.nombre, nombreIngles: t.ingles, motivos: [] };
      c.motivos.push(motivo);
      candidatos.set(t.id, c);
    };
    for (const e of especies) {
      const [g, ep] = e.nombre.split(' ') as [string, string];
      const mismoIngles = ingles !== '' && (inglesDe.get(e.id)?.has(ingles) ?? false);
      const mismaRaiz = raizEpiteto(ep) === raiz;
      if (mismaRaiz && g !== genero && (e.familia === entrada.familia || mismoIngles)) anotar(e, 'mismo epíteto en otro género');
      if (mismaRaiz && g === genero) anotar(e, 'mismo género y epíteto con otra terminación');
      if (mismoIngles) anotar(e, 'mismo nombre en inglés');
    }
    for (const s of subespecies) {
      const [g, , ssp] = s.nombre.split(' ') as [string, string, string];
      if (raizEpiteto(ssp) === raiz && (g === genero || s.familia === entrada.familia)) {
        anotar(s, 'AviList lo trata como subespecie');
      }
    }
    // Si ya es candidata una especie, su subespecie nominal (mismo epíteto repetido) no aporta nada: se quita.
    const idsEspecie = new Set([...candidatos.values()]
      .filter((c) => c.rango === 'species' && c.motivos.some((m) => m.startsWith('mismo epíteto') || m.startsWith('mismo género')))
      .map((c) => c.taxonId));
    const utiles = [...candidatos.values()].filter((c) => {
      if (c.rango !== 'subspecies') return true;
      const padre = porId.get(c.taxonId)?.padreId;
      return !(padre !== null && padre !== undefined && idsEspecie.has(padre));
    });
    return { ...base, estado: 'sin_equivalencia', taxonId: null, nombreAviList: null, equivalencia: null,
      candidatos: utiles.sort((a, b) => b.motivos.length - a.motivos.length) };
  });
}
