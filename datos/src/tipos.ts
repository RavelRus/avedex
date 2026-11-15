// Tipos compartidos por el importador.

export type Rango = 'order' | 'family' | 'genus' | 'species' | 'subspecies';

export const RANGOS: readonly Rango[] = ['order', 'family', 'genus', 'species', 'subspecies'];

/** Rango inmediatamente superior a cada rango (null para los órdenes). */
export const RANGO_PADRE: Record<Rango, Rango | null> = {
  order: null,
  family: 'order',
  genus: 'family',
  species: 'genus',
  subspecies: 'species',
};

/** Una fila de la hoja principal de AviList, ya limpia. */
export interface FilaAviList {
  secuencia: number;
  rango: Rango;
  orden: string;
  familia: string | null;
  nombreCientifico: string;
  autoridad: string | null;
  detallesBibliograficos: string | null;
  nombreInglesAviList: string | null;
  nombreInglesClements: string | null;
  nombreInglesBirdLife: string | null;
  cambiosVersion: string | null;
  numeroPropuesta: string | null;
  resumenDecision: string | null;
  distribucion: string | null;
  estadoExtincion: string | null;
  categoriaUicn: string | null;
  urlBirdLife: string | null;
  codigoCornell: string | null;
  avibaseId: string | null;
  generoGramatical: string | null;
  especieTipo: string | null;
  localidadTipo: string | null;
  tituloDescripcion: string | null;
  urlDescripcion: string | null;
  protonimo: string | null;
}

/** Datos de la versión que se importa. */
export interface DatosVersion {
  fuente: string; // «AviList»
  version: string; // «v2026»
  fechaPublicacion: string; // AAAA-MM-DD
  archivo: string;
  sha256: string;
  url: string;
  cita: string;
  licencia: string;
  versionClements: string | null; // p. ej. «v2026»
  versionBirdLife: string | null; // p. ej. «v10»
}

export interface LecturaAviList {
  filas: FilaAviList[];
  cita: string;
  licencia: string;
  versionClements: string | null;
  versionBirdLife: string | null;
  filasVacias: number;
}

/** Una línea del archivo de anclas: la correspondencia permanente clave → identificador. */
export interface Ancla {
  id: number;
  clave: string;
  rango: Rango;
  nombreCientifico: string;
  versionAlta: string;
  versionUltima: string;
}

export interface ResultadoConstruccion {
  recuentoPorRango: Record<Rango, number>;
  anclasNuevas: number;
  anclasReutilizadas: number;
  anclasAusentes: Ancla[]; // estaban en una versión anterior y no aparecen en esta
  nombres: number;
  idsExternos: Record<string, number>;
  filasNomenclatura: number;
  avisos: string[];
}
