// Esquema de referencia.sqlite. Solo las tablas que rellena la tarea T1.
// El resto del modelo (regiones, caracteres, cambios taxonómicos…) se añadirá en sus hitos.

export const VERSION_ESQUEMA = 1;

export const ESQUEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE meta (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
) STRICT;

CREATE TABLE fuente (
  id INTEGER PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  cita TEXT NOT NULL,
  url TEXT,
  licencia TEXT NOT NULL,
  fecha_consulta TEXT NOT NULL
) STRICT;

CREATE TABLE version_taxonomica (
  id INTEGER PRIMARY KEY,
  fuente_id INTEGER NOT NULL REFERENCES fuente(id),
  version TEXT NOT NULL,
  fecha_publicacion TEXT NOT NULL,
  archivo TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  UNIQUE (fuente_id, version)
) STRICT;

CREATE TABLE taxon (
  id INTEGER PRIMARY KEY,
  rango TEXT NOT NULL CHECK (rango IN ('order','family','genus','species','subspecies')),
  tipo TEXT NOT NULL DEFAULT 'normal',
  padre_id INTEGER REFERENCES taxon(id),
  nombre_cientifico TEXT NOT NULL,
  autoridad TEXT,
  vigente INTEGER NOT NULL DEFAULT 1 CHECK (vigente IN (0,1)),
  estado_extincion TEXT,
  extinto INTEGER NOT NULL DEFAULT 0 CHECK (extinto IN (0,1)),
  orden_secuencia INTEGER NOT NULL,
  version_alta_id INTEGER NOT NULL REFERENCES version_taxonomica(id),
  version_baja_id INTEGER REFERENCES version_taxonomica(id),
  CHECK ((rango = 'order') = (padre_id IS NULL))
) STRICT;

CREATE INDEX taxon_padre ON taxon(padre_id);
CREATE INDEX taxon_nombre ON taxon(nombre_cientifico);
CREATE INDEX taxon_rango ON taxon(rango);

CREATE TABLE taxon_detalle (
  taxon_id INTEGER PRIMARY KEY REFERENCES taxon(id),
  distribucion TEXT,
  categoria_uicn TEXT,
  cambios_version TEXT,
  numero_propuesta TEXT,
  resumen_decision TEXT,
  version_id INTEGER NOT NULL REFERENCES version_taxonomica(id)
) STRICT;

CREATE TABLE nombre_taxon (
  id INTEGER PRIMARY KEY,
  taxon_id INTEGER NOT NULL REFERENCES taxon(id),
  idioma TEXT NOT NULL,
  variante TEXT NOT NULL,
  nombre TEXT NOT NULL,
  preferente INTEGER NOT NULL DEFAULT 0 CHECK (preferente IN (0,1)),
  fuente_id INTEGER NOT NULL REFERENCES fuente(id),
  UNIQUE (taxon_id, idioma, variante)
) STRICT;

CREATE INDEX nombre_taxon_nombre ON nombre_taxon(nombre);

CREATE TABLE sistema_externo (
  sistema TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  plantilla_url TEXT  -- «{codigo}» se sustituye por el código; NULL si no se ha verificado ninguna
) STRICT;

CREATE TABLE id_externo (
  taxon_id INTEGER NOT NULL REFERENCES taxon(id),
  sistema TEXT NOT NULL REFERENCES sistema_externo(sistema),
  version TEXT NOT NULL,
  codigo TEXT NOT NULL,
  equivalencia TEXT NOT NULL DEFAULT 'exacta'
    CHECK (equivalencia IN ('exacta','mas_amplia','mas_estrecha','parcial')),
  fuente_id INTEGER NOT NULL REFERENCES fuente(id),
  PRIMARY KEY (taxon_id, sistema)
) STRICT, WITHOUT ROWID;

CREATE INDEX id_externo_codigo ON id_externo(sistema, codigo);
`;

// Segunda base, opcional: datos nomenclaturales y bibliográficos (modo Experto).
// Va aparte para que la base principal pese menos; se enlaza por taxon_id.
export const ESQUEMA_NOMENCLATURA = `
CREATE TABLE meta (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
) STRICT;

CREATE TABLE fuente (
  id INTEGER PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  cita TEXT NOT NULL,
  url TEXT,
  licencia TEXT NOT NULL,
  fecha_consulta TEXT NOT NULL
) STRICT;

CREATE TABLE taxon_nomenclatura (
  taxon_id INTEGER PRIMARY KEY,  -- identificador de taxon en referencia.sqlite
  protonimo TEXT,
  localidad_tipo TEXT,
  detalles_bibliograficos TEXT,
  titulo_descripcion TEXT,
  url_descripcion TEXT,
  genero_gramatical TEXT,
  especie_tipo TEXT,
  fuente_id INTEGER NOT NULL REFERENCES fuente(id)
) STRICT;
`;
