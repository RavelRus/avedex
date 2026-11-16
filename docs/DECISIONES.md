# DECISIONES, RIESGOS Y PENDIENTES

Versión 0.6 — 2026-11-16

## 1. Decisiones tomadas

### De producto y arquitectura (aprobadas por Pablo el 2026-11-15)

| ID | Decisión | Alternativa descartada | Dónde se explica |
|---|---|---|---|
| D-001 | AVEDEX es un proyecto personal, sin publicación en tiendas | App gratuita publicada; producto comercial | `README.md` |
| D-002 | Se desarrolla en Windows y se prueba en iPhone | — | `README.md` |
| D-003 | Presupuesto de 0 €/mes durante el prototipo | — | `README.md` |
| D-004 | Claude programa y prueba; Pablo decide, revisa y valida | Pablo programa con guía | `README.md` |
| D-005 | Desarrollo incremental, con parada para revisión al final de cada etapa | — | `ROADMAP.md` |
| D-006 | **Aplicación web instalable (PWA)** | Flutter; app nativa pagando 99 USD/año a Apple | `ARQUITECTURA.md` §2-3 |
| D-007 | Interfaz con React + TypeScript + Vite | Svelte | `ARQUITECTURA.md` §3 |
| D-008 | Código en repositorio **privado** de GitHub; web publicada con Cloudflare Pages (plan gratuito) | GitHub Pages (en el plan gratuito exige repositorio público) | Esta página, §2 |
| D-009 | Lista de SEO/BirdLife 2022 como autoridad para «aves de España» y nombres en español | Lista regional de eBird | `FUENTES.md` §3 |
| D-010 | Una identificación «sugerida» cuenta para la colección, con marca visual de provisional | Solo cuentan «respaldada» y «revisada» | `MODELO_DATOS.md` §5 |
| D-011 | Las 30-50 especies del primer identificador las elige Pablo entre las frecuentes de su zona habitual | Lista externa de las más comunes de España | `ROADMAP.md` fase 5 |
| D-012 | AviList v2026 como taxonomía base; las demás listas se guardan como equivalencias externas | eBird/Clements como base | `FUENTES.md` §2, §8 |
| D-013 | Dos bases SQLite separadas: referencia científica y datos del usuario | Una sola base | `ARQUITECTURA.md` §4 |
| D-014 | Sin servidor ni cuentas en el MVP; copia de seguridad por exportación | Servidor gratuito desde el principio | `ARQUITECTURA.md` §6 |
| D-015 | Primera tarea: importador de AviList (T1). Segunda: prueba en el iPhone (T2) | Empezar por la prueba en el iPhone con datos de ejemplo | `ROADMAP.md` |
| D-023 | La web se publica como **Cloudflare Worker con archivos estáticos** (`avedex.pablocaruiz.workers.dev`), no como proyecto de Pages. Matiza D-008 | Es lo que el panel de Cloudflare creó al importar el repositorio el 2026-11-16; es igualmente gratuito y no merece la pena rehacerlo | Borrarlo y crear un proyecto de Pages | `app/README.md` |
| D-019 | Claude sube cada cambio directamente a la rama `main` del repositorio y resume lo hecho; Pablo revisa después | Rama aparte y solicitud (pull request) que Pablo aprueba antes | `README.md` |

### Técnicas, tomadas por Claude durante T1 y T2 (2026-11-15)

Decisiones de implementación dentro de lo ya aprobado. Se pueden revertir volviendo a ejecutar el importador; **Pablo puede vetarlas**.

| ID | Decisión | Motivo | Alternativa descartada |
|---|---|---|---|
| D-016 | El identificador estable de cada taxón es un entero propio de AVEDEX. Especies y subespecies se reconocen entre versiones por su **Avibase ID**; órdenes, familias y géneros, por rango + nombre. La correspondencia vive en `datos/anclas/taxones.csv` | AviList incluye el Avibase ID y lo define como identificador estable del concepto taxonómico. Así una especie conserva su número aunque cambie de género o de nombre | Usar el Avibase ID directamente como identificador (ata la app a un sistema externo y deja sin identificador a los rangos superiores) |
| D-017 | La referencia científica se reparte en **dos archivos**: `referencia.sqlite` (16,2 MB) y `referencia-nomenclatura.sqlite` (8,7 MB, datos bibliográficos del modo Experto) | Todo junto pesaba 26,5 MB y Cloudflare Pages no admite archivos de más de 25 MiB. Además aligera la descarga inicial | Un solo archivo; o no importar los datos nomenclaturales |
| D-018 | Los scripts de datos usan solo lo que trae Node (TypeScript directo, SQLite y ejecutor de pruebas incluidos) más una única dependencia, `read-excel-file` | Menos piezas que instalar y mantener en Windows; nada que compilar | better-sqlite3 + Vitest (más dependencias, una de ellas con código nativo) |
| D-020 | La base de aves generada (`app/public/referencia.sqlite`, 16 MB) **se guarda en el repositorio**, junto a su huella `referencia.json`. Se regenera con `npm run publicar` en `datos/` | Cloudflare solo tiene que compilar la app; no depende de ejecutar el importador ni del SQLite experimental de Node en sus servidores | Generarla en cada publicación (más frágil); el coste es que el repositorio crece 16 MB cada vez que cambie la base, previsiblemente una vez al año |
| D-021 | El service worker (lo que permite abrir sin conexión) es propio, unas 40 líneas generadas por `vite.config.ts` | La librería habitual (vite-plugin-pwa) arrastraba cientos de dependencias, varias con avisos de seguridad | vite-plugin-pwa |
| D-022 | La base de aves no se guarda dos veces: el service worker guarda solo la app, y la base vive en el almacenamiento privado del navegador (OPFS). La app la vuelve a descargar solo si cambia su huella | Ahorra 16 MB en el móvil y permite actualizar la ciencia sin tocar los datos del usuario | Guardarla también en la caché del service worker |

D-017 matiza D-013: siguen siendo dos bases lógicas (ciencia y usuario), pero la de ciencia ocupa dos archivos.

## 2. Consecuencias de las decisiones

- **D-006:** se abandona Flutter. PostgreSQL, PostGIS y la API propia quedan pospuestos, no descartados.
- **D-008:** aunque el código sea privado, la web publicada es accesible para quien conozca la dirección. Datos comprobados el 2026-11-15:
  - GitHub Pages solo está disponible en repositorios públicos con el plan gratuito. Fuente: <https://docs.github.com/en/get-started/learning-about-github/githubs-plans>
  - Cloudflare Pages gratuito: 500 publicaciones al mes, una a la vez, 20.000 archivos por sitio y **25 MiB como máximo por archivo**. Fuente: <https://developers.cloudflare.com/pages/platform/limits>
- **D-008 + D-009:** la lista y los nombres de SEO/BirdLife no tienen licencia abierta, así que **no van en la base que se publica**. La base pública lleva solo AviList. Los datos de España se preparan como un archivo complementario que Pablo carga en su dispositivo. El mecanismo se diseña en el hito 1.3.
- **D-010:** la colección necesita dos aspectos visuales por estado (confirmado y provisional).
- **D-015:** la arquitectura no queda confirmada hasta superar T2 en el iPhone.
- **D-016:** `datos/anclas/taxones.csv` es un archivo crítico. No se edita a mano y debe estar siempre bajo control de versiones.

## 3. Propuestas pendientes de aprobación

Ninguna.

## 4. Riesgos

| ID | Riesgo | Gravedad | Mitigación |
|---|---|---|---|
| R-01 | **iOS borra o corrompe los datos de la PWA.** Apple controla lo que una web puede hacer en iPhone y ha cambiado de criterio otras veces | Alta | Prueba real en T2 antes de construir nada más; exportación en el MVP; aviso de copia pendiente |
| R-02 | **La matriz de caracteres es trabajo manual y experto.** No hay un conjunto de datos abierto de marcas de campo listo para usar | Alta | Empezar con 30-50 especies; herencia desde género y familia; revisión de Pablo celda a celda; empezar en paralelo desde la fase 2 |
| R-03 | **El identificador da falsa seguridad** | Alta | No se llama «probabilidad»; estados de identificación separados; casos de prueba con errores deliberados |
| R-04 | **Taxonomías que no casan** entre AviList, la lista española, eBird e iNaturalist. Medido en T1: 28 especies de AviList sin equivalencia exacta en eBird y 875 sin equivalencia exacta en BirdLife. La lista de SEO usa IOC v12.2 y HBW/BirdLife v6b | Media | Equivalencias explícitas y revisadas a mano; informe de no coincidencias; nunca se infiere una equivalencia |
| R-05 | **Subespecies de AviList poco revisadas** | Media | Mostrar la procedencia; no ofrecer identificación a subespecie hasta la fase 7 |
| R-06 | **Alojamiento público = redistribución** | Media | Resuelto en el diseño: en la base pública solo AviList (CC BY); los datos de SEO se cargan localmente (ver §2) |
| R-07 | **Sin contenido de ficha.** Textos, fotos y sonidos de calidad tienen dueño | Media | MVP sin ese contenido; redactar textos propios citando fuentes; medios solo con licencia abierta |
| R-08 | **Alcance.** Seis productos en uno más un cuaderno | Alta | MVP estrecho; nada de fases 5-7 hasta cerrar la 4 |
| R-09 | **Dependencia de una sola persona y de sesiones separadas** | Media | El estado vive en estos documentos y en el código, no en la memoria de la conversación |
| R-10 | **Fotos pesadas** agotan el almacenamiento | Baja | Guardar copia reducida; aviso de espacio |
| R-11 | **Ubicaciones sensibles** si algún día se comparte | Baja ahora | Privadas por defecto; marca de especie sensible desde el modelo de datos |
| R-12 | **Descarga inicial de 16 MB** en el móvil (más 8,7 MB opcionales) | Baja | Se descarga una vez y queda guardada; medir el tiempo real en T2 |

## 5. Datos sin verificar

Resueltos en T1 (ya comprobados en el archivo oficial): cifras de AviList v2026, su licencia CC BY 4.0, su cita y la existencia de un identificador persistente (Avibase ID). También el número de taxones de la lista de SEO/BirdLife 2022 (638) y las taxonomías en que se basa.

Siguen sin verificar:

- Condiciones de reutilización de los contenidos de SEO/BirdLife.
- Condiciones propias de la categoría de la Lista Roja de la UICN que viene dentro del archivo de AviList.
- Límites actuales de la API de iNaturalist (tomados de una página espejo y de su foro).
- Inexistencia de una API pública de Merlin (no se ha encontrado, que no es lo mismo que no existir).
- Comportamiento real del almacenamiento en el iPhone de Pablo (se sabrá en T2).
- Diferencia entre el 97,7 % y el 99,74 % de coincidencia AviList-eBird que publican las dos partes.

## 6. Problemas conocidos

| ID | Problema | Efecto | Qué hacer |
|---|---|---|---|
| K-01 | El SQLite incluido en Node 22 está marcado como experimental y muestra un aviso al ejecutar | Ninguno hoy. Su interfaz podría cambiar en una versión futura de Node | El acceso a la base está concentrado en `datos/src/construir.ts`; si cambia, se adapta ahí o se pasa a better-sqlite3 |
| K-02 | El importador **no se ha ejecutado en Windows**, solo en el entorno de Claude (Linux, Node 22.23) | Puede aparecer algún detalle de rutas o de versión de Node | Ejecutar `npm run probar` en el ordenador de Pablo cuando tenga Node instalado |
| K-03 | Un taxón que desaparezca en una versión futura conserva su identificador en el archivo de anclas, pero no se guarda en la base como «no vigente» | Sin efecto mientras solo haya una versión importada | Hito 1.4 |
| K-04 | Las plantillas de URL externas solo están verificadas para eBird y BirdLife; la de Avibase está vacía | No se puede enlazar a Avibase desde la ficha | Verificarla cuando se haga la ficha (fase 2) |
| K-05 | La app **no se ha probado en Safari ni en iPhone**, solo en Chrome | Es justo lo que T2 tiene que comprobar | Comprobaciones A-F de `ROADMAP.md` |
| K-06 | La app solo puede estar abierta en una pestaña o ventana a la vez (limitación del modo de almacenamiento elegido) | Si se abre dos veces, la segunda muestra un mensaje de error claro | Aceptable para una app instalada; revisar si molesta |
| K-07 | La búsqueda por nombre en inglés recorre toda la tabla (258 ms en ordenador) | En el iPhone puede superar el objetivo de 300 ms | Índice de texto completo en la fase 2 |
| K-09 | La primera publicación en Cloudflare (2026-11-16) mostraba una pantalla en blanco: se publicó el código fuente sin compilar porque faltaba la configuración | La app no cargaba | Añadido `app/wrangler.jsonc`, que obliga a publicar la carpeta compilada `dist/`. Falta confirmar que el panel tiene el comando de compilación |
| K-10 | **Resuelto 2026-11-16.** La app no abría sin conexión en el iPhone (comprobación D). Causa: la lista de archivos del service worker incluía `_headers`, que Cloudflare no sirve (404); con un solo archivo fallido el service worker no se instala. La prueba automática no lo detectó porque usaba un servidor que sí servía ese archivo | Sin modo sin conexión | Excluidos `_headers` e `index.html` de la lista. La prueba automática usa ahora el servidor local de Cloudflare (`wrangler dev`) y comprueba que el service worker queda instalado; se verificó que falla sin el arreglo y pasa con él. Confirmado en el iPhone por Pablo el mismo día |
| K-08 | Los iconos de la app son provisionales (un círculo sobre fondo liso) | Ninguno funcional | Identidad visual pendiente de decidir |

## 7. Tareas pendientes

| Tarea | Quién | Para cuándo |
|---|---|---|
| Instalar Node.js 22.18 o posterior en el ordenador y ejecutar `npm run probar` en `datos/` | Pablo | Antes o durante T2 |
| Poner en Cloudflare (Settings → Build del Worker `avedex`): directorio raíz `app`, comando de compilación `npm run build`, comando de despliegue `npx wrangler deploy` | Pablo | **Ahora** |
| Comprobaciones A-E de T2 en el iPhone y comunicar el resultado | Pablo | Tras publicar |
| Comprobación F de T2 (8 días sin abrir la app) | Pablo | 8 días después de guardar la primera nota |
| Hito 1.3 — Lista de España (el PDF de SEO/BirdLife ya está aportado y su texto es extraíble) | Claude | Tras T2 |
| Proponer lista de caracteres de identificación | Claude | Fase 2 |
| Elegir las 30-50 especies iniciales del identificador | Pablo | Fase 2 |

Repositorio: <https://github.com/RavelRus/avedex> (privado). La app de GitHub de Claude está instalada en él, de modo que Claude puede leer y subir cambios. El PDF de SEO/BirdLife **no** está en el repositorio.

Hecho: descarga del archivo de AviList v2026 (Pablo), T1 (Claude), PDF de la lista de SEO/BirdLife (Pablo), cuentas de GitHub y Cloudflare (Pablo), repositorio privado creado y primer commit subido (Pablo y Claude).

## 8. Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-11-15 | Cuatro decisiones de partida (D-001 a D-004). Investigación de fuentes y viabilidad técnica. Redacción de la Fase 0 |
| 2026-11-15 | Revisión con Pablo: aprobadas las diez propuestas (D-006 a D-015). Fase 0 cerrada |
| 2026-11-15 | T1 hecha: importador de AviList v2026 (33.698 taxones), 17 pruebas de 17 superadas. Decisiones técnicas D-016 a D-018. Verificados contra el archivo los datos pendientes de AviList |
| 2026-11-15 | Repositorio privado `RavelRus/avedex` creado; documentación y `datos/` subidos a `main`. Decisión D-019 sobre cómo se suben los cambios |
| 2026-11-16 | Pablo conecta Cloudflare con el repositorio; se crea un Worker en lugar de un proyecto de Pages (D-023). Primera publicación en blanco (K-09); añadido `app/wrangler.jsonc` |
| 2026-11-16 | Publicada y funcionando en <https://avedex.pablocaruiz.workers.dev>. Pablo prueba en el iPhone: A, B y C superadas; D falla (K-10). Corregido; D superada al repetirla. Pendientes E (reinicio) y F (8 días) |
| 2026-11-15 | T2 construida: app de prueba en `app/`, 8 pasos de 8 superados en Chrome. Decisiones D-020 a D-022. Pendiente: publicar en Cloudflare y probar en el iPhone |
