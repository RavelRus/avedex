// Construye referencia.sqlite a partir de filas ya leídas.
// Recibe datos y devuelve datos: no lee el XLSX ni toca el archivo de anclas, para poder probarlo aislado.

import { existsSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { claveDeAncla } from './anclas.ts';
import { ESQUEMA, ESQUEMA_NOMENCLATURA, VERSION_ESQUEMA } from './esquema.ts';
import type { Ancla, DatosVersion, FilaAviList, Rango, ResultadoConstruccion } from './tipos.ts';
import { RANGO_PADRE } from './tipos.ts';

export interface OpcionesConstruccion {
  rutaBase: string; // ruta del archivo SQLite que se crea (se sobrescribe)
  rutaNomenclatura?: string; // si se indica, se crea además la base de datos nomenclaturales
  filas: readonly FilaAviList[];
  anclasPrevias: readonly Ancla[];
  version: DatosVersion;
  fechaImportacion: string; // AAAA-MM-DD
}

export interface Construccion {
  resultado: ResultadoConstruccion;
  anclas: Ancla[]; // anclas previas + nuevas, listas para guardar
}

/** Estados de AviList que significan «extinto» sin matices. El texto original se guarda siempre aparte. */
const ESTADOS_EXTINTO = new Set(['Extinct', '(extinct)']);

const PLANTILLA_BIRDLIFE = 'https://datazone.birdlife.org/species/factsheet/{codigo}';

interface TaxonPreparado {
  id: number;
  padreId: number | null;
  fila: FilaAviList;
}

/**
 * Comprueba que el archivo es coherente y calcula el padre de cada taxón.
 * AviList lista los taxones en orden jerárquico: cada fila cuelga del último taxón de rango superior visto.
 */
function prepararJerarquia(filas: readonly FilaAviList[]): { fila: FilaAviList; clavePadre: string | null }[] {
  const ordenadas = [...filas].sort((a, b) => a.secuencia - b.secuencia);
  const actual: Partial<Record<Rango, FilaAviList>> = {};
  const nombresPorRango = new Map<string, number>();
  const salida: { fila: FilaAviList; clavePadre: string | null }[] = [];
  let secuenciaAnterior = -Infinity;

  for (const fila of ordenadas) {
    const donde = `«${fila.nombreCientifico}» (${fila.rango}, nº ${fila.secuencia})`;
    if (fila.secuencia === secuenciaAnterior) throw new Error(`Número de secuencia repetido: ${fila.secuencia}.`);
    secuenciaAnterior = fila.secuencia;

    const claveNombre = `${fila.rango}:${fila.nombreCientifico}`;
    if (nombresPorRango.has(claveNombre)) {
      throw new Error(`Nombre científico repetido dentro del rango: ${donde}.`);
    }
    nombresPorRango.set(claveNombre, fila.secuencia);

    const rangoPadre = RANGO_PADRE[fila.rango];
    const padre = rangoPadre ? actual[rangoPadre] : undefined;
    if (rangoPadre && !padre) throw new Error(`${donde} aparece antes que ningún taxón de rango ${rangoPadre}.`);

    const palabras = fila.nombreCientifico.split(' ');
    switch (fila.rango) {
      case 'order':
        if (fila.orden !== fila.nombreCientifico) throw new Error(`${donde}: la columna ORDER no coincide.`);
        break;
      case 'family':
        if (fila.orden !== padre?.nombreCientifico) throw new Error(`${donde}: no pertenece al orden en curso.`);
        if (fila.familia !== fila.nombreCientifico) throw new Error(`${donde}: la columna FAMILY no coincide.`);
        break;
      case 'genus':
        if (fila.familia !== padre?.nombreCientifico) throw new Error(`${donde}: no pertenece a la familia en curso.`);
        if (palabras.length !== 1) throw new Error(`${donde}: un género debe tener una sola palabra.`);
        break;
      case 'species':
        if (palabras.length !== 2 || palabras[0] !== padre?.nombreCientifico) {
          throw new Error(`${donde}: el nombre no corresponde al género en curso (${padre?.nombreCientifico}).`);
        }
        break;
      case 'subspecies':
        if (palabras.length !== 3 || `${palabras[0]} ${palabras[1]}` !== padre?.nombreCientifico) {
          throw new Error(`${donde}: el nombre no corresponde a la especie en curso (${padre?.nombreCientifico}).`);
        }
        break;
    }

    // Al cambiar de taxón en un rango, los rangos inferiores dejan de estar «en curso».
    actual[fila.rango] = fila;
    if (fila.rango === 'order') { delete actual.family; delete actual.genus; delete actual.species; }
    if (fila.rango === 'family') { delete actual.genus; delete actual.species; }
    if (fila.rango === 'genus') { delete actual.species; }

    salida.push({ fila, clavePadre: padre ? claveDeAncla(padre) : null });
  }
  return salida;
}

export function construirReferencia(opciones: OpcionesConstruccion): Construccion {
  const { filas, anclasPrevias, version, fechaImportacion, rutaBase, rutaNomenclatura } = opciones;
  const avisos: string[] = [];

  // 1. Jerarquía
  const jerarquia = prepararJerarquia(filas);

  // 2. Identificadores estables
  const anclasPorClave = new Map<string, Ancla>();
  for (const a of anclasPrevias) anclasPorClave.set(a.clave, { ...a });
  let siguienteId = anclasPrevias.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  let anclasNuevas = 0;
  let anclasReutilizadas = 0;
  const clavesPresentes = new Set<string>();
  const idPorClave = new Map<string, number>();
  const taxones: TaxonPreparado[] = [];

  for (const { fila, clavePadre } of jerarquia) {
    const clave = claveDeAncla(fila);
    if (clavesPresentes.has(clave)) throw new Error(`Dos filas comparten la misma ancla: ${clave}.`);
    clavesPresentes.add(clave);

    let ancla = anclasPorClave.get(clave);
    if (ancla) {
      anclasReutilizadas++;
      if (ancla.rango !== fila.rango) {
        avisos.push(`«${fila.nombreCientifico}» conserva su identificador ${ancla.id} pero cambia de rango: ${ancla.rango} → ${fila.rango}.`);
      }
      ancla.rango = fila.rango;
      ancla.nombreCientifico = fila.nombreCientifico;
      ancla.versionUltima = version.version;
    } else {
      ancla = {
        id: siguienteId++,
        clave,
        rango: fila.rango,
        nombreCientifico: fila.nombreCientifico,
        versionAlta: version.version,
        versionUltima: version.version,
      };
      anclasPorClave.set(clave, ancla);
      anclasNuevas++;
    }
    idPorClave.set(clave, ancla.id);

    const padreId = clavePadre === null ? null : idPorClave.get(clavePadre);
    if (padreId === undefined) throw new Error(`No se ha encontrado el padre de «${fila.nombreCientifico}».`);
    taxones.push({ id: ancla.id, padreId, fila });
  }

  const anclasAusentes = anclasPrevias.filter((a) => !clavesPresentes.has(a.clave));
  if (anclasAusentes.length > 0) {
    avisos.push(
      `${anclasAusentes.length} taxones de versiones anteriores no aparecen en ${version.version}. ` +
        'Conservan su identificador en el archivo de anclas, pero aún no se guardan en la base como «no vigentes» (hito 1.4).',
    );
  }

  // 3. Base de datos
  if (rutaBase !== ':memory:' && existsSync(rutaBase)) rmSync(rutaBase);
  const db = new DatabaseSync(rutaBase);
  const idsExternos: Record<string, number> = { avibase: 0, ebird: 0, birdlife: 0 };
  let nombres = 0;
  const recuentoPorRango: Record<Rango, number> = { order: 0, family: 0, genus: 0, species: 0, subspecies: 0 };

  try {
    db.exec(ESQUEMA);
    db.exec('BEGIN');

    const meta = db.prepare('INSERT INTO meta (clave, valor) VALUES (?, ?)');
    meta.run('esquema_version', String(VERSION_ESQUEMA));
    meta.run('generado_el', fechaImportacion);
    meta.run('taxonomia_base', `${version.fuente} ${version.version}`);

    db.prepare('INSERT INTO fuente (id, clave, cita, url, licencia, fecha_consulta) VALUES (1, ?, ?, ?, ?, ?)')
      .run(`${version.fuente.toLowerCase()}-${version.version}`, version.cita, version.url, version.licencia, fechaImportacion);
    db.prepare('INSERT INTO version_taxonomica (id, fuente_id, version, fecha_publicacion, archivo, sha256) VALUES (1, 1, ?, ?, ?, ?)')
      .run(version.version, version.fechaPublicacion, version.archivo, version.sha256);

    const insTaxon = db.prepare(
      `INSERT INTO taxon (id, rango, padre_id, nombre_cientifico, autoridad, vigente, estado_extincion, extinto, orden_secuencia, version_alta_id)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 1)`,
    );
    const insDetalle = db.prepare(
      `INSERT INTO taxon_detalle (taxon_id, distribucion, categoria_uicn, cambios_version, numero_propuesta, resumen_decision, version_id)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    );
    const insNombre = db.prepare(
      'INSERT INTO nombre_taxon (taxon_id, idioma, variante, nombre, preferente, fuente_id) VALUES (?, ?, ?, ?, ?, 1)',
    );
    const insSistema = db.prepare('INSERT INTO sistema_externo (sistema, nombre, plantilla_url) VALUES (?, ?, ?)');
    // Plantillas tomadas de la hoja «How to use» de AviList y de sus propias URL. La de Avibase no se ha verificado.
    insSistema.run('avibase', 'Avibase', null);
    insSistema.run('ebird', 'eBird / Cornell Lab', 'https://ebird.org/species/{codigo}');
    insSistema.run('birdlife', 'BirdLife DataZone', PLANTILLA_BIRDLIFE);
    const insExterno = db.prepare(
      "INSERT INTO id_externo (taxon_id, sistema, version, codigo, equivalencia, fuente_id) VALUES (?, ?, ?, ?, 'exacta', 1)",
    );

    // Los padres van siempre antes que los hijos porque se respeta el orden de secuencia.
    for (const { id, padreId, fila } of taxones) {
      recuentoPorRango[fila.rango]++;
      const extinto = fila.estadoExtincion !== null && ESTADOS_EXTINTO.has(fila.estadoExtincion) ? 1 : 0;
      insTaxon.run(id, fila.rango, padreId, fila.nombreCientifico, fila.autoridad, fila.estadoExtincion, extinto, fila.secuencia);

      const detalle = [fila.distribucion, fila.categoriaUicn, fila.cambiosVersion, fila.numeroPropuesta, fila.resumenDecision];
      if (detalle.some((d) => d !== null)) insDetalle.run(id, ...detalle);

      if (fila.nombreInglesAviList) { insNombre.run(id, 'en', 'AviList', fila.nombreInglesAviList, 1); nombres++; }
      if (fila.nombreInglesClements) {
        insNombre.run(id, 'en', `Clements ${version.versionClements ?? ''}`.trim(), fila.nombreInglesClements, 0);
        nombres++;
      }
      if (fila.nombreInglesBirdLife) {
        insNombre.run(id, 'en', `BirdLife ${version.versionBirdLife ?? ''}`.trim(), fila.nombreInglesBirdLife, 0);
        nombres++;
      }

      if (fila.avibaseId) {
        insExterno.run(id, 'avibase', `${version.fuente} ${version.version}`, fila.avibaseId);
        idsExternos['avibase']!++;
      }
      if (fila.codigoCornell) {
        insExterno.run(id, 'ebird', `Clements ${version.versionClements ?? ''}`.trim(), fila.codigoCornell);
        idsExternos['ebird']!++;
      }
      if (fila.urlBirdLife) {
        // Solo se guarda el código: la URL se reconstruye con la plantilla de sistema_externo.
        const prefijo = PLANTILLA_BIRDLIFE.replace('{codigo}', '');
        const codigo = fila.urlBirdLife.startsWith(prefijo) ? fila.urlBirdLife.slice(prefijo.length) : '';
        if (!/^\d+$/.test(codigo)) throw new Error(`URL de BirdLife con formato inesperado: ${fila.urlBirdLife}`);
        insExterno.run(id, 'birdlife', `BirdLife ${version.versionBirdLife ?? ''}`.trim(), codigo);
        idsExternos['birdlife']!++;
      }
    }

    db.exec('COMMIT');

    const integridad = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    if (integridad.integrity_check !== 'ok') throw new Error(`La base no supera integrity_check: ${integridad.integrity_check}`);
    const clavesRotas = db.prepare('PRAGMA foreign_key_check').all();
    if (clavesRotas.length > 0) throw new Error(`Hay ${clavesRotas.length} claves foráneas rotas.`);
    db.exec('VACUUM');
  } finally {
    db.close();
  }

  // 3b. Base de datos nomenclaturales (opcional)
  let filasNomenclatura = 0;
  if (rutaNomenclatura) {
    if (rutaNomenclatura !== ':memory:' && existsSync(rutaNomenclatura)) rmSync(rutaNomenclatura);
    const dbn = new DatabaseSync(rutaNomenclatura);
    try {
      dbn.exec(ESQUEMA_NOMENCLATURA);
      dbn.exec('BEGIN');
      const metaN = dbn.prepare('INSERT INTO meta (clave, valor) VALUES (?, ?)');
      metaN.run('esquema_version', String(VERSION_ESQUEMA));
      metaN.run('generado_el', fechaImportacion);
      metaN.run('taxonomia_base', `${version.fuente} ${version.version}`);
      dbn.prepare('INSERT INTO fuente (id, clave, cita, url, licencia, fecha_consulta) VALUES (1, ?, ?, ?, ?, ?)')
        .run(`${version.fuente.toLowerCase()}-${version.version}`, version.cita, version.url, version.licencia, fechaImportacion);
      const insN = dbn.prepare(
        `INSERT INTO taxon_nomenclatura (taxon_id, protonimo, localidad_tipo, detalles_bibliograficos, titulo_descripcion,
           url_descripcion, genero_gramatical, especie_tipo, fuente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      );
      for (const { id, fila } of taxones) {
        const campos = [
          fila.protonimo, fila.localidadTipo, fila.detallesBibliograficos, fila.tituloDescripcion,
          fila.urlDescripcion, fila.generoGramatical, fila.especieTipo,
        ];
        if (campos.some((c) => c !== null)) { insN.run(id, ...campos); filasNomenclatura++; }
      }
      dbn.exec('COMMIT');
      const integridadN = dbn.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (integridadN.integrity_check !== 'ok') throw new Error('La base de nomenclatura no supera integrity_check.');
      dbn.exec('VACUUM');
    } finally {
      dbn.close();
    }
  }

  // 4. Avisos informativos sobre los datos
  const especies = taxones.filter((t) => t.fila.rango === 'species');
  const sinEbird = especies.filter((t) => !t.fila.codigoCornell).length;
  const sinBirdLife = especies.filter((t) => !t.fila.urlBirdLife).length;
  if (sinEbird > 0) avisos.push(`${sinEbird} especies no tienen equivalencia exacta en eBird/Clements (sin código de especie).`);
  if (sinBirdLife > 0) avisos.push(`${sinBirdLife} especies no tienen equivalencia exacta en BirdLife (sin enlace a DataZone).`);

  return {
    resultado: { recuentoPorRango, anclasNuevas, anclasReutilizadas, anclasAusentes, nombres, idsExternos, filasNomenclatura, avisos },
    anclas: [...anclasPorClave.values()],
  };
}
