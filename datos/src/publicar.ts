// Copia la base de referencia a la app (app/public/) y escribe su manifiesto.
// Uso (desde datos/):  npm run publicar      — después de «npm run importar».
//
// La app compara el sha256 del manifiesto con el de la base que tiene instalada y solo la
// vuelve a descargar si ha cambiado.

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const RAIZ = resolve(import.meta.dirname, '..');
const origen = join(RAIZ, 'salida', 'referencia.sqlite');
const destino = join(RAIZ, '..', 'app', 'public');

const db = new DatabaseSync(origen, { readOnly: true });
const taxonomia = (db.prepare("SELECT valor FROM meta WHERE clave = 'taxonomia_base'").get() as { valor: string }).valor;
db.close();

const datos = readFileSync(origen);
const manifiesto = {
  taxonomia,
  sha256: createHash('sha256').update(datos).digest('hex'),
  bytes: datos.byteLength,
};

mkdirSync(destino, { recursive: true });
copyFileSync(origen, join(destino, 'referencia.sqlite'));
writeFileSync(join(destino, 'referencia.json'), JSON.stringify(manifiesto, null, 2) + '\n', 'utf8');
console.log(`Publicada ${taxonomia}: ${(manifiesto.bytes / 1024 / 1024).toFixed(1)} MB, sha256 ${manifiesto.sha256.slice(0, 12)}…`);
