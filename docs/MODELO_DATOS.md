# MODELO DE DATOS

Versión 0.2 — 2026-11-15 — modelo conceptual. La parte de taxonomía está implementada (ver §7); el resto se concretará al implementar.

## 1. Principios

1. **Identificador interno estable.** Cada taxón recibe un identificador propio de AVEDEX que no se reutiliza ni cambia aunque cambie el nombre, el género o el rango.
2. **El nombre no es el taxón.** Nombres, sinónimos y códigos externos son tablas aparte que apuntan al taxón.
3. **Toda fila científica tiene fuente y versión.**
4. **Los datos del usuario nunca dependen de un nombre**, solo del identificador estable, y guardan además el texto tal como se vio al registrar.
5. **Nada se borra en taxonomía:** un taxón que deja de reconocerse pasa a «no vigente» y se enlaza con su sucesor.
6. **No se fuerza la precisión:** una observación puede apuntar a cualquier rango (especie, género, familia) o a ningún taxón.

## 2. Bloque A — Taxonomía (base de referencia)

### `version_taxonomica`
Una fila por versión importada. Campos: fuente (AviList), versión (v2026), fecha de publicación, fecha de importación, cita, licencia.

### `taxon`
| Campo | Descripción |
|---|---|
| id | Identificador estable de AVEDEX |
| rango | orden, familia, género, especie, subespecie |
| tipo | normal, grupo de subespecies, complejo, «sp.», par «A/B», híbrido |
| padre_id | Taxón superior |
| nombre_cientifico | Nombre vigente |
| autoridad | Autor y año |
| vigente | Sí/no en la versión actual |
| extinto | Sí/no |
| orden_secuencia | Posición en la secuencia taxonómica |
| version_alta, version_baja | Versión en que aparece y en que deja de estar vigente |

### `nombre_taxon`
Nombres comunes. Campos: taxon_id, idioma (es, en, ca, eu, gl…), variante regional, nombre, fuente, preferente sí/no.

### `sinonimo`
Nombres científicos anteriores o alternativos. Campos: taxon_id, nombre, tipo (sinónimo, combinación anterior, error frecuente), fuente.

### `id_externo`
Equivalencias con otras listas. Campos: taxon_id, fuente (AviList, eBird, BirdLife, iNaturalist, Avibase), versión, código, tipo de equivalencia (exacta, más amplia, más estrecha, parcial).

Esta tabla es la que permite documentar que las plataformas no coinciden: una especie de AviList puede corresponder a dos en eBird, y eso se registra como equivalencia «más amplia».

### `cambio_taxonomico`
Historial. Campos: tipo (división, fusión, cambio de nombre, cambio de género, cambio de rango, alta, baja), versión, referencia.
Con una tabla hija `cambio_taxon` que lista los taxones de origen y de destino (una división tiene un origen y varios destinos; una fusión, al revés).

### `region`
Jerárquica. Campos: id, tipo (reino biogeográfico, país, comunidad autónoma, provincia, isla), código (ISO cuando exista), padre_id, nombre.

### `presencia_regional`
Campos: taxon_id, region_id, estatus (residente, estival, invernante, en paso, accidental, introducida, extinguida), categoría de lista nacional (A, B, C… según la lista de SEO/BirdLife), meses de presencia (12 valores), abundancia relativa, fuente.

Una especie presente en varias regiones es **una sola fila en `taxon`** y varias en `presencia_regional`. Las colecciones regionales son consultas, no copias.

### `fuente`
Catálogo de referencias. Campos: id, cita, URL, licencia, fecha de consulta.

### `ficha_seccion` (fases posteriores)
Textos de ficha. Campos: taxon_id, sección, idioma, nivel mínimo (explorador, naturalista, experto), texto, fuente, autor, fecha de revisión.

## 3. Bloque B — Caracteres de identificación (base de referencia)

### `caracter`
Un rasgo observable. Campos: id, nombre, grupo de correlación, tipo (categórico, ordinal, numérico), facilidad de observación (1-5), fiabilidad (1-5), nivel mínimo.
Ejemplos `EJEMPLO`: tamaño relativo, forma del pico, color dominante del dorso, banda alar, forma de la cola, tipo de vuelo, hábitat.

### `estado_caracter`
Valores posibles de un carácter. Ejemplo `EJEMPLO` para «forma del pico»: fino, cónico grueso, ganchudo, largo y recto, largo y curvo, plano.

### `taxon_caracter`
La matriz. Campos: taxon_id, estado_id, frecuencia (siempre, habitual, a veces, nunca), sexo (cualquiera, macho, hembra), edad (cualquiera, adulto, juvenil, primer invierno), época (todo el año, reproductora, invernal), fuente, revisado_por, fecha de revisión.

- Se puede rellenar a nivel de género o familia y la especie lo hereda salvo que lo sobrescriba. Ahorra trabajo y permite el resultado «solo hasta género».
- Una celda sin revisar no se usa en el motor.

### `pregunta`
Cómo se pregunta un carácter. Campos: caracter_id, nivel (explorador, naturalista, experto), texto, ayuda, ilustración. Un mismo carácter puede tener una redacción sencilla y otra técnica.

### `par_similar`
Especies que se confunden. Campos: taxon_a, taxon_b, región, texto de diferenciación, caracteres clave, fuente.

## 4. Bloque C — Datos del usuario (base de usuario)

### `salida`
Campos: id (UUID), inicio, fin, lugar, protocolo (casual, estacionario, recorrido), distancia, número de observadores, notas.

### `observacion`
| Campo | Descripción |
|---|---|
| id | UUID, para poder sincronizar en el futuro sin colisiones |
| salida_id | Opcional |
| taxon_id | Opcional (ave sin identificar). Cualquier rango |
| nombre_mostrado | Nombre tal como se vio al registrar |
| version_taxonomica | Versión vigente al registrar |
| estado_id | sin identificar, sugerida, respaldada, revisada |
| tipo_deteccion | vista, oída, vista y oída |
| fecha, hora | Con zona horaria |
| latitud, longitud, precision_m | Opcionales |
| lugar_texto | Texto libre |
| privacidad | exacta (por defecto, solo local), difuminada, oculta |
| cantidad, cantidad_aproximada | Número y si es estimado |
| sexo, edad | Opcionales |
| comportamiento, habitat, condiciones | Opcionales |
| descripcion, notas | Texto |
| creado, modificado | Marcas de tiempo |

### `identificacion`
Historial de identificaciones de una observación (nunca se sobrescribe). Campos: observacion_id, taxon_id, estado, método (manual, identificador guiado, foto, sonido), certeza declarada, respuestas dadas al identificador, fecha, comentario.
La identificación vigente es la última; las anteriores se conservan. Así una sugerencia automática queda diferenciada de una confirmación del usuario.

### `medio`
Campos: observacion_id, tipo (foto, sonido), archivo, fecha de captura, origen (cámara del móvil, importado).

### `taxon_usuario`
Datos personales por taxón que no salen de un registro: «conocida/estudiada», notas, favorito.

### `ajuste`
Modo activo, región por defecto, idioma de nombres, fecha de la última exportación.

## 5. Colección: se calcula, no se guarda

| Estado | Regla |
|---|---|
| Conocida | Marcada a mano en `taxon_usuario` o ficha consultada/cuestionario superado |
| Escuchada | Al menos una observación «oída» con identificación no «sin identificar» |
| Avistada | Al menos una observación «vista» |
| Fotografiada | Al menos una observación con foto |
| Documentada | Al menos una observación con foto o sonido, estado «revisada» y descripción |

Decidido (D-010): una identificación solo «sugerida» cuenta para la colección, pero se muestra con marca visual de provisional, de modo que la colección no presione para confirmar sin evidencia.

## 6. Qué pasa cuando cambia la taxonomía

Caso: la especie X se divide en X1 y X2 en la versión siguiente.

1. En la nueva `referencia.sqlite`, X pasa a «no vigente» y se crea un `cambio_taxonomico` tipo división con destinos X1 y X2. X conserva su identificador.
2. Las observaciones del usuario siguen apuntando a X. No se toca nada automáticamente.
3. La app detecta observaciones sobre taxones no vigentes y las lista en «Revisar tras actualización».
4. Si la región de la observación solo admite uno de los destinos según `presencia_regional`, se propone ese; el usuario acepta o no. Si no hay forma de decidir, la observación se queda en X, mostrada como «X (sentido amplio)».
5. Cada reasignación añade una fila a `identificacion`; la anterior no se borra.

Cambio de nombre o de género: no requiere nada; el identificador es el mismo y solo cambia el nombre mostrado.

## 7. Qué está implementado (T1, 2026-11-15)

Implementadas en `datos/src/esquema.ts`: `meta`, `fuente`, `version_taxonomica`, `taxon`, `taxon_detalle`, `nombre_taxon`, `sistema_externo`, `id_externo`, y `taxon_nomenclatura` en un archivo aparte. El resto del modelo sigue siendo conceptual.

Diferencias respecto a lo descrito arriba:

| Concepto | Implementación |
|---|---|
| Identificador estable | Entero propio de AVEDEX. La correspondencia se guarda en `datos/anclas/taxones.csv` |
| Ancla de especies y subespecies | **Avibase ID**, que AviList incluye y define como identificador estable del concepto taxonómico. Resuelve la duda de la versión 0.1 |
| Ancla de órdenes, familias y géneros | Rango + nombre científico (AviList no les da identificador). Un género renombrado es un taxón nuevo; sus especies conservan su identificador |
| `taxon.extinto` | Se guarda el texto original de AviList en `estado_extincion` (siete valores posibles) y `extinto` = 1 solo para «Extinct» y «(extinct)» |
| `taxon_detalle` (nueva) | Distribución, categoría de la Lista Roja, cambios de la versión, número de propuesta y resumen de la decisión de AviList |
| `id_externo` | Sistemas cargados: `avibase`, `ebird` (código de especie de Cornell) y `birdlife` (código de DataZone). Solo equivalencias exactas, que son las que da AviList. Las URL no se guardan: se reconstruyen con la plantilla de `sistema_externo` |
| `taxon_nomenclatura` (nueva, archivo aparte) | Protónimo, localidad tipo, detalles bibliográficos, título y URL de la descripción original, género gramatical y especie tipo |
| `sinonimo`, `cambio_taxonomico`, `region`, `presencia_regional` | Sin implementar (hitos 1.3 y 1.4) |

## 8. Pendiente de comprobar

- Cómo trata AviList a un taxón que cambia de rango entre versiones (¿conserva el Avibase ID?). El importador lo admite y lo avisa; se verá al importar una segunda versión (hito 1.4).
- Si la hoja «Changes from previous version» basta para rellenar `cambio_taxonomico` automáticamente.
