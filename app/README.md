# AVEDEX — app

Aplicación web instalable (PWA). **Ahora mismo es solo la app de prueba de la tarea T2**: una pantalla sin diseño
para comprobar que el almacenamiento funciona en el iPhone. No es la interfaz de AVEDEX.

## Qué hace

1. Descarga la base de aves (`public/referencia.sqlite`, AviList v2026) la primera vez y la guarda en el dispositivo.
2. Busca por nombre científico o nombre en inglés.
3. Guarda notas de prueba en una segunda base (`usuario.sqlite`) que nunca se sustituye.
4. Abre y funciona sin conexión.

## Uso

```
npm install              (solo la primera vez)
npm run dev              abre la app en el ordenador para desarrollar
npm run build            compila la versión que se publica (carpeta dist/)
npm run probar:navegador prueba automática en Chrome (hay que compilar antes)
```

## Cómo está hecha

| Archivo | Para qué |
|---|---|
| `src/datos/trabajador.ts` | Único punto que toca SQLite. Mantiene las dos bases en el almacenamiento privado del navegador (OPFS) |
| `src/datos/cliente.ts`, `protocolo.ts` | Comunicación entre la pantalla y el trabajador |
| `src/App.tsx` | La pantalla de prueba |
| `src/sw-plantilla.js` + `vite.config.ts` | Service worker: guarda la app para abrirla sin conexión |
| `public/referencia.sqlite`, `referencia.json` | Base de aves y su huella. Las genera `npm run publicar` en `datos/` |
| `public/_headers` | Reglas de caché para Cloudflare Pages |
| `.node-version` | Versión de Node que usa Cloudflare al compilar |

## Publicación (Cloudflare Pages)

- Directorio raíz: `app`
- Comando de compilación: `npm run build`
- Directorio de salida: `dist`

Cloudflare vuelve a publicar automáticamente con cada cambio en la rama `main`.

## Actualizar la base de aves

En `datos/`: `npm run importar` y después `npm run publicar`. La app detecta que la huella ha cambiado y
descarga la base nueva la próxima vez que se abra con conexión. Los datos del usuario no se tocan.
