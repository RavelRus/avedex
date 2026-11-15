# PRODUCTO

Versión 0.1 — 2026-11-15 — pendiente de revisión

## 1. Visión

AVEDEX reúne en una sola aplicación seis cosas: enciclopedia ornitológica, identificador guiado, diario de campo, colección personal, atlas y aprendizaje. Lo acompaña un cuaderno de campo en papel que funciona sin teléfono.

Tres ideas mandan sobre el resto:

1. **El rigor va antes que el juego.** La colección motiva, pero no decide qué es una identificación válida.
2. **La incertidumbre se muestra.** El identificador puede acabar en «género *Sylvia*» o «no identificada».
3. **Los datos del usuario son suyos.** Se guardan en su dispositivo, se pueden exportar y sobreviven a los cambios de taxonomía.

## 2. Usuarios y modos

Un único conjunto de datos, tres niveles de profundidad. El modo es un ajuste que se puede cambiar en cualquier momento; no oculta información, solo decide qué se muestra primero y con qué vocabulario.

| Modo | Para quién | Qué cambia |
|---|---|---|
| Explorador | Principiantes | Preguntas sencillas, fichas resumidas, registro rápido |
| Naturalista | Con experiencia | Sexos, edades, plumajes, especies similares, estadísticas |
| Experto | Avanzados | Subespecies, caracteres diagnósticos, referencias, exportación |

Implementación prevista: cada campo de ficha, cada carácter y cada pregunta lleva un «nivel mínimo». La interfaz filtra por ese nivel, con un botón «ver más detalle» siempre disponible.

## 3. Requisitos funcionales

Prioridad: **MVP** = entra en el primer producto usable · **Después** = fase posterior.

### Taxonomía y enciclopedia

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Árbol orden → familia → género → especie → subespecie, navegable | MVP |
| RF-02 | Identificador interno estable por taxón, independiente del nombre | MVP |
| RF-03 | Nombres científicos y comunes en varios idiomas, con fuente | MVP (científico, español, inglés) |
| RF-04 | Versiones taxonómicas y registro de divisiones, fusiones y cambios de nombre | MVP (estructura), Después (historial completo) |
| RF-05 | Taxones que no son especies: grupos de subespecies, complejos, «sp.», pares «A/B» | Después |
| RF-06 | Búsqueda por cualquier nombre, sin tildes ni mayúsculas | MVP |
| RF-07 | Ficha con secciones: identificación, biología, distribución, taxonomía, experiencia personal | MVP (taxonomía + experiencia personal), Después (resto) |
| RF-08 | Lista de aves de España con categoría de presencia | MVP |

### Diario de campo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-10 | Registro rápido: especie, fecha, hora, lugar opcional, número, foto opcional, notas | MVP |
| RF-11 | Registrar un ave sin identificar | MVP |
| RF-12 | Registro científico: certeza, coordenadas y precisión, sexo, edad, comportamiento, hábitat, condiciones, protocolo, esfuerzo | Después |
| RF-13 | Salidas de campo que agrupan observaciones | Después |
| RF-14 | Editar y borrar registros | MVP |
| RF-15 | Exportar e importar todos los datos del usuario | MVP |
| RF-16 | Fotos tomadas con el móvil o importadas desde archivo | MVP (una foto por registro), Después (varias, sonidos) |
| RF-17 | Ubicación exacta privada por defecto; marca de especie sensible | MVP (privada por defecto) |

### Colección

| ID | Requisito | Prioridad |
|---|---|---|
| RF-20 | Estados por especie: conocida, escuchada, avistada, fotografiada, documentada | MVP |
| RF-21 | El estado se calcula a partir de los registros, no se marca a mano (salvo «conocida») | MVP |
| RF-22 | Colección de España; después por regiones, familias y hábitats | MVP (España), Después (resto) |
| RF-23 | Estado de colección separado del estado de identificación | MVP |

### Identificador guiado

| ID | Requisito | Prioridad |
|---|---|---|
| RF-30 | Contexto: región, fecha, hábitat | Después (fase 5) |
| RF-31 | Preguntas con opción «no lo sé / no lo observé / no lo recuerdo» | Después |
| RF-32 | Siguiente pregunta elegida por ganancia de información | Después |
| RF-33 | Lista ordenada de candidatos con rasgos a favor y en contra | Después |
| RF-34 | Resultado posible a nivel de género o familia | Después |
| RF-35 | Estados: sin identificar, sugerida, respaldada, revisada | MVP (el campo existe desde el primer registro) |
| RF-36 | Volver a preguntas anteriores y guardar identificación provisional | Después |
| RF-37 | Subespecies solo con evidencia suficiente | Después (fase 7) |

### Atlas, aprendizaje, cuaderno

| ID | Requisito | Prioridad |
|---|---|---|
| RF-40 | Atlas personal: mapa de registros propios | Después (fase 6) |
| RF-41 | Atlas científico: distribución y estacionalidad con fuente | Después (fase 6) |
| RF-50 | Cuestionarios, comparaciones, siluetas, cantos | Después |
| RF-60 | Cuaderno físico con QR hacia fichas | Después (fase 7) |

## 4. Requisitos no funcionales

| ID | Requisito | Cómo se comprueba |
|---|---|---|
| RNF-01 | **Sin conexión:** búsqueda, fichas, registro y colección funcionan en modo avión | Prueba manual en el iPhone en modo avión |
| RNF-02 | **Coste 0 €/mes** en el prototipo | Sin servicios de pago en la arquitectura |
| RNF-03 | **Privacidad:** ningún dato del usuario sale del dispositivo salvo exportación manual | Revisión de red: cero peticiones con datos personales |
| RNF-04 | **Durabilidad:** los registros sobreviven a cerrar la app, reiniciar el móvil y actualizar la taxonomía | Pruebas automáticas de migración + prueba manual |
| RNF-05 | **Trazabilidad:** cada dato científico tiene fuente y versión | Prueba automática: ningún registro de referencia sin fuente |
| RNF-06 | **Escala:** la base admite la lista mundial (11.172 especies en AviList v2026) sin rediseño | Importación completa y búsqueda en menos de 300 ms en el iPhone |
| RNF-07 | **Legalidad:** solo se incluye contenido con licencia compatible | Lista de comprobación de `FUENTES.md` antes de cada incorporación |
| RNF-08 | **Mantenibilidad:** una sola cadena de herramientas, módulos pequeños, pruebas automáticas | Revisión en cada hito |
| RNF-09 | **Legibilidad:** texto legible a pleno sol, botones grandes, uso con una mano | Prueba de campo |

## 5. Alcance del MVP

**Objetivo:** que Pablo pueda instalar AVEDEX en su iPhone, buscar cualquier ave de España, registrar un avistamiento en menos de 30 segundos sin cobertura y ver su colección crecer.

### Dentro

- Taxonomía mundial importada de AviList (CC BY 4.0), con identificadores estables.
- Lista de aves de España con nombres en español.
- Búsqueda y ficha mínima: nombres, clasificación, subespecies, rango geográfico según AviList, registros propios.
- Registro rápido con foto opcional y posibilidad de «sin identificar».
- Colección de España con los cinco estados.
- Exportar e importar copia de seguridad.
- Todo sin conexión.

### Fuera (de momento)

- Identificador guiado (fase 5; la preparación de datos empieza antes, ver `ROADMAP.md`).
- Textos de biología, fotos y sonidos de terceros.
- Mapas, atlas, estadísticas avanzadas.
- Sincronización entre dispositivos y cuentas de usuario.
- Reconocimiento por foto o sonido.
- Identidad visual, pixel art, logotipo.
- Cuaderno físico.

### Por qué el identificador no está en el MVP

Es el módulo prioritario del proyecto, pero depende de una matriz de caracteres que hay que escribir y revisar a mano, y de una taxonomía y un diario que funcionen. Construirlo antes obligaría a rehacerlo. Lo que sí se adelanta es el trabajo lento: la matriz de caracteres se empieza a preparar en paralelo desde la fase 2.

## 6. Criterios de aceptación del MVP

1. Instalada en el iPhone desde la pantalla de inicio, abre en modo avión.
2. Buscar «carbonero» devuelve *Parus major* con su clasificación y subespecies.
3. Crear un registro con foto, cerrar la app, reiniciar el móvil: el registro sigue ahí.
4. El primer registro de una especie la pasa a «avistada» en la colección.
5. Exportar, borrar los datos e importar devuelve exactamente los mismos registros.
6. Sustituir la base de referencia por una versión taxonómica nueva no pierde ni altera registros.
