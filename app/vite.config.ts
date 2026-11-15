import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Archivos que el service worker NO guarda: la base de referencia se copia a OPFS (no hace falta
// tenerla dos veces) y su manifiesto debe pedirse siempre a la red para detectar versiones nuevas.
const NO_GUARDAR = [/\.sqlite$/, /^referencia\.json$/, /^sw\.js$/];

/**
 * Genera dist/sw.js al terminar la compilación, con la lista exacta de archivos de la app.
 * Sustituye a vite-plugin-pwa para no arrastrar sus dependencias.
 */
function servicioSinConexion(): Plugin {
  return {
    name: 'avedex-service-worker',
    apply: 'build',
    closeBundle() {
      const dist = join(import.meta.dirname, 'dist');
      const archivos: string[] = [];
      const recorrer = (carpeta: string) => {
        for (const nombre of readdirSync(carpeta)) {
          const ruta = join(carpeta, nombre);
          if (statSync(ruta).isDirectory()) recorrer(ruta);
          else archivos.push(relative(dist, ruta).split('\\').join('/'));
        }
      };
      recorrer(dist);
      const guardar = archivos.filter((a) => !NO_GUARDAR.some((p) => p.test(a))).sort();
      const huella = createHash('sha256');
      for (const a of guardar) huella.update(a).update(readFileSync(join(dist, a)));
      const version = huella.digest('hex').slice(0, 12);
      const plantilla = readFileSync(join(import.meta.dirname, 'src', 'sw-plantilla.js'), 'utf8');
      const sw = plantilla
        .replace('__VERSION__', version)
        .replace('"__ARCHIVOS__"', JSON.stringify(['/', ...guardar.map((a) => `/${a}`)]));
      writeFileSync(join(dist, 'sw.js'), sw, 'utf8');
      console.log(`service worker: ${guardar.length} archivos, versión ${version}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), servicioSinConexion()],
  define: {
    __COMPILADO__: JSON.stringify(new Date().toISOString()),
  },
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  build: { target: 'es2022' },
});
