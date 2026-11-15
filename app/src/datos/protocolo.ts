// Mensajes entre la pantalla y el trabajador que maneja las bases de datos.
// SQLite con almacenamiento persistente solo puede funcionar dentro de un trabajador (Web Worker).

export interface ResultadoBusqueda {
  id: number;
  rango: string;
  nombreCientifico: string;
  nombreIngles: string | null;
  linaje: string[]; // de lo más general a lo más concreto, sin incluir el propio taxón
  subespecies: number;
}

export interface NotaPrueba {
  id: number;
  texto: string;
  creada: string; // fecha y hora ISO
}

export interface EstadoBases {
  versionSqlite: string;
  taxonomia: string;
  cita: string;
  licencia: string;
  referenciaInstaladaEl: string | null;
  referenciaBytes: number | null;
  recuento: Record<string, number>;
  notas: number;
  primeraNota: string | null;
  archivosOpfs: string[];
  usoBytes: number | null;
  cuotaBytes: number | null;
}

export type Peticion =
  | { tipo: 'iniciar' }
  | { tipo: 'estado' }
  | { tipo: 'buscar'; texto: string }
  | { tipo: 'notas' }
  | { tipo: 'anadirNota'; texto: string };

export interface Respuestas {
  iniciar: EstadoBases;
  estado: EstadoBases;
  buscar: ResultadoBusqueda[];
  notas: NotaPrueba[];
  anadirNota: NotaPrueba[];
}

export type MensajeAlTrabajador = { id: number; peticion: Peticion };

export type MensajeDelTrabajador =
  | { id: number; ok: true; resultado: unknown }
  | { id: number; ok: false; error: string }
  | { progreso: string };
