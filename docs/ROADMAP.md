# ROADMAP

Versión 0.4 — 2026-11-15 — Fase 0 cerrada; hito 1.1 (T1) hecho; hito 1.2 (T2) construido y probado en Chrome, pendiente de la prueba en el iPhone

Cada hito termina con una comprobación concreta. Un hito no se marca como hecho sin anotar aquí qué se probó y con qué resultado.

## Orden propuesto

Se mantiene el orden de fases del planteamiento original, con tres ajustes:

| Ajuste | Motivo |
|---|---|
| **Prueba en el iPhone al principio** (hito 1.2) | El mayor riesgo técnico es que el almacenamiento de una PWA no se comporte bien en el iPhone de Pablo. Si falla, cambia la arquitectura; hay que saberlo antes de construir encima |
| **La exportación entra con el diario** (fase 3), no después | Sin servidor, es la única copia de seguridad |
| **La matriz de caracteres se empieza en paralelo desde la fase 2** | Es trabajo de documentación lento que no depende del código y que necesita el criterio ornitológico de Pablo |

## Fase 0 — Definición técnica

| Hito | Comprobación | Estado |
|---|---|---|
| 0.1 Documentación inicial | Los seis documentos existen y son coherentes entre sí | Hecho (2026-11-15) |
| 0.2 Decisiones pendientes resueltas | Las diez propuestas contestadas | Hecho (2026-11-15): aprobadas como D-006 a D-015 en `DECISIONES.md` |

**Fase 0 cerrada.**

## Fase 1 — Base científica

| Hito | Qué se construye | Comprobación |
|---|---|---|
| **1.1 Importador de AviList** (tarea T1) — **HECHO 2026-11-15** | Script que convierte el archivo oficial en `referencia.sqlite` | 17 pruebas de 17 superadas. Ver «Resultado de T1» abajo |
| **1.2 Prueba en el iPhone** (tarea T2) — **EN CURSO** | PWA mínima: carga `referencia.sqlite`, busca por nombre científico, guarda una nota de prueba | Instalada en el iPhone; busca en modo avión; la nota sobrevive a reiniciar el móvil y a 8 días sin abrir la app. Ver «Estado de T2» abajo |
| 1.3 Lista de España y nombres en español | Importador de la lista de SEO/BirdLife 2022 sobre la taxonomía de AviList, como archivo complementario que se carga en el dispositivo y no se publica (D-009) | Informe de taxones que casan y que no; cero equivalencias sin revisar; el archivo complementario no aparece en la web publicada |
| 1.4 Sistema de actualización | Importar una segunda versión (v2025 → v2026) conservando identificadores | Los identificadores de los taxones sin cambios son idénticos tras actualizar; los cambios quedan en `cambio_taxonomico` |

**Decisión de continuidad tras 1.2:** si el almacenamiento falla en el iPhone, se detiene el desarrollo y se replantea la arquitectura con Pablo (opciones: IndexedDB en lugar de OPFS, o asumir la cuota de Apple).

## Fase 2 — Enciclopedia funcional

| Hito | Comprobación |
|---|---|
| 2.1 Búsqueda por cualquier nombre, sin tildes | «aguila», «Águila» y «Aquila» devuelven resultados correctos en menos de 300 ms en el iPhone |
| 2.2 Navegación por el árbol taxonómico | De orden a subespecie y vuelta, sin conexión |
| 2.3 Ficha mínima | Nombres, clasificación, subespecies, rango, fuente y versión visibles |
| 2.4 Filtro «Aves de España» | El recuento coincide con el del informe del hito 1.3 |
| *En paralelo:* lista de caracteres y primeras 10 especies de la matriz | Revisadas por Pablo |

## Fase 3 — Diario de observaciones

| Hito | Comprobación |
|---|---|
| 3.1 Registro rápido | Crear un registro en menos de 30 s, sin conexión |
| 3.2 Registro sin identificar | Se guarda y aparece en una lista «por identificar» |
| 3.3 Foto por registro | Desde la cámara y desde archivo |
| 3.4 Editar y borrar | Con confirmación al borrar |
| 3.5 **Exportar e importar** | Exportar → borrar datos → importar deja los mismos registros (prueba automática y manual) |
| 3.6 Registro científico y salidas de campo | Los campos adicionales se guardan y se exportan |

## Fase 4 — Colección personal

| Hito | Comprobación |
|---|---|
| 4.1 Cálculo de estados | Pruebas automáticas para cada regla de `MODELO_DATOS.md` §5 |
| 4.2 Pantalla de colección de España | El primer registro de una especie cambia su estado al instante |
| 4.3 Historial de descubrimientos y estadísticas básicas | Fechas de primera observación correctas |

**Aquí termina el MVP.**

## Fase 5 — Identificador guiado

| Hito | Comprobación |
|---|---|
| 5.1 Matriz de caracteres para 30-50 especies | Todas las celdas con fuente y revisadas |
| 5.2 Conjunto de casos de prueba | Al menos 3 descripciones por especie: completa, incompleta y con un error |
| 5.3 Motor de puntuación | Medición sobre los casos: acierto en primera posición y entre las tres primeras |
| 5.4 Elección adaptativa de preguntas | Número medio de preguntas menor que con un orden fijo, sobre los mismos casos |
| 5.5 Resultado a género/familia y pantalla de verificación | Casos diseñados para no ser resolubles devuelven el ancestro común, no una especie |
| 5.6 Integración con el diario | Una sugerencia del motor se guarda como «sugerida», nunca como «respaldada» |

## Fase 6 — Atlas

Mapa de registros propios; presencia regional y estacionalidad con fuente. Se detalla al llegar.

## Fase 7 — Funciones avanzadas

Sonidos, foto, subespecies, expansión internacional, cuaderno físico. Se detalla al llegar.

---

## Primera tarea de programación

### T1 — Importador de AviList a SQLite

**Por qué esta primero:**
- Todo lo demás depende de la taxonomía.
- Trabaja con datos reales desde el primer día, sin ejemplos inventados.
- Se puede comprobar contra cifras publicadas.
- El resultado (un archivo SQLite) sirve sea cual sea la tecnología de la app. Si T2 obligara a cambiar de arquitectura, T1 no se pierde.

**Qué hace:**
1. Lee el archivo oficial de AviList v2026 (versión extendida).
2. Crea `referencia.sqlite` con las tablas `version_taxonomica`, `taxon`, `nombre_taxon` (inglés), `id_externo` y `fuente`.
3. Asigna a cada taxón un identificador estable y guarda la correspondencia en un archivo de anclas, para que una reimportación dé los mismos identificadores.
4. Emite un informe: recuento por rango, filas descartadas y motivo.

**Qué no hace:** nombres en español, lista de España, historial de cambios, interfaz.

**Cómo se comprueba (pruebas automáticas):**
1. El número de especies, órdenes y familias vigentes coincide con el publicado para v2026 (11.172, 45 y 250; a contrastar con el propio archivo).
2. Todo taxón, salvo los órdenes, tiene padre, y el padre es del rango inmediatamente superior.
3. No hay nombres científicos vigentes duplicados dentro del mismo rango.
4. Ejecutar el importador dos veces produce exactamente los mismos identificadores.
5. Comprobación puntual: *Parus major* existe, es una especie, cuelga de *Parus* → Paridae → Passeriformes, y tiene subespecies.
6. Ninguna fila queda sin fuente ni versión.

**Entregable:** el script, las pruebas, `referencia.sqlite`, el informe de importación y la actualización de este documento con el resultado real de las pruebas.

#### Resultado de T1 (2026-11-15)

Código en `datos/`. Ejecutado en el entorno de Claude (Linux, Node 22.23). **No se ha ejecutado todavía en el Windows de Pablo.**

**Importación real de AviList v2026:**

| Rango | Importados | Publicado |
|---|---|---|
| Órdenes | 45 | 45 |
| Familias | 250 | 250 |
| Géneros | 2.379 | — |
| Especies | 11.172 | 11.172 |
| Subespecies | 19.852 | — |
| **Total** | **33.698** | |

Filas descartadas: 0. Las cifras coinciden además con un recuento independiente del mismo archivo hecho con otra herramienta (Python/openpyxl).

**Pruebas ejecutadas: 17, superadas: 17, fallidas: 0.**

| Prueba definida | Resultado |
|---|---|
| 1. Especies, órdenes y familias coinciden con lo publicado | Superada |
| 2. Cada taxón cuelga del rango inmediatamente superior | Superada |
| 3. Sin nombres científicos repetidos dentro de un rango | Superada |
| 4. Importar dos veces da los mismos identificadores (sobre las anclas y desde cero) | Superada |
| 5. *Parus major* → *Parus* → Paridae → Passeriformes, con subespecies (16) | Superada |
| 6. Ninguna fila sin fuente ni versión | Superada |

Pruebas añadidas: Avibase ID único por especie y subespecie; un nombre preferente en inglés por especie; la base de nomenclatura solo apunta a taxones existentes; la base principal pesa menos de 25 MiB; y siete pruebas de lógica con datos `EJEMPLO` (entre ellas: una especie conserva su identificador cuando su género cambia de nombre, y un identificador nunca se reutiliza).

**Desviaciones respecto a lo previsto** (detalle en `DECISIONES.md`, D-016 a D-018):

- Se generan **dos** archivos en lugar de uno: `referencia.sqlite` (16,2 MB) y `referencia-nomenclatura.sqlite` (8,7 MB). Con todo junto pesaba 26,5 MB y Cloudflare Pages no admite archivos de más de 25 MiB.
- Además de las tablas previstas se crean `taxon_detalle` (distribución, Lista Roja, decisiones de AviList), `sistema_externo` y `meta`.
- Las pruebas usan el ejecutor incluido en Node, no Vitest.

**Lo que T1 no cubre:** conservar como «no vigentes» los taxones que desaparezcan en una versión futura (hito 1.4).

### T2 — Prueba en el iPhone (inmediatamente después)

PWA mínima sin diseño que carga la `referencia.sqlite` de T1. Es la comprobación de continuidad de la arquitectura. Se hace con React (D-007) y se publica con Cloudflare Pages desde un repositorio privado de GitHub (D-008).

#### Estado de T2 (2026-11-15)

**Hecho por Claude.** Código en `app/`. La app descarga la base de aves la primera vez, la guarda en el dispositivo, busca por nombre científico o inglés, guarda notas de prueba en una base aparte y abre sin conexión. Muestra un panel de estado para leer el resultado de cada comprobación.

**Probado de verdad en Chrome** (prueba automática `npm run probar:navegador`, en el entorno de Claude; desde el 2026-11-16 son 9 pasos, servidos con el servidor local de Cloudflare):

| Paso | Resultado |
|---|---|
| Primera apertura: descarga e instala la base (33.698 taxones) | Superado, 1,5 s en local |
| Búsqueda «Parus major» con linaje y 16 subespecies | Superado, 88 ms |
| Búsqueda sin mayúsculas y por nombre en inglés | Superado, 25 y 258 ms |
| Los caracteres especiales no rompen la búsqueda | Superado |
| Guardar una nota | Superado |
| Cerrar y abrir el navegador: la nota sigue y la base no se vuelve a descargar | Superado |
| Sin conexión: la app abre, conserva la nota y busca | Superado |

Los tiempos son de un ordenador, no de un iPhone.

**No probado todavía:** nada de esto se ha ejecutado en Safari ni en un iPhone. Chrome valida el código; no dice cómo se comporta iOS. Tampoco se ha publicado aún en Cloudflare.

**Pendiente de Pablo:**

1. Conectar Cloudflare Pages con el repositorio (directorio raíz `app`, comando `npm run build`, salida `dist`).
2. Abrir la dirección en Safari del iPhone y añadir la app a la pantalla de inicio.
3. Comprobaciones en el iPhone, siempre abriendo desde el icono:

| Nº | Comprobación | Se supera si |
|---|---|---|
| A | Primera apertura con conexión | El panel dice «Abierta como app instalada: sí» y muestra 33.698 taxones |
| B | Buscar «Parus major» | Aparece con Passeriformes › Paridae › Parus y 16 subespecies; anotar los milisegundos |
| C | Guardar una nota | «Notas guardadas» pasa a 1 |
| D | Cerrar la app del todo y abrirla en modo avión | Abre, la nota sigue y la búsqueda funciona |
| E | Apagar y encender el iPhone | La nota sigue |
| F | No abrirla durante 8 días y volver a abrirla | La nota sigue y «Primera nota guardada hace» marca más de 8 días |

**Resultados en el iPhone de Pablo:**

| Nº | Fecha | Resultado |
|---|---|---|
| A | 2026-11-16 | Superada |
| B | 2026-11-16 | Superada (17 resultados; tiempo no anotado) |
| C | 2026-11-16 | Superada |
| D | 2026-11-16 | **Fallida**: no abría en modo avión. Error de Claude (K-10 en `DECISIONES.md`), corregido el mismo día. Pendiente de repetir |
| E | — | Pendiente |
| F | — | Pendiente |

**Criterio de continuidad:** si A-E se superan, se sigue con el hito 1.3 mientras corre la espera de F. Si alguna de A-E falla, se para y se replantea el almacenamiento con Pablo.
