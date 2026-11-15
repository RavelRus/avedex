# ARQUITECTURA

Versión 0.3 — 2026-11-15 — aprobada por Pablo (D-006, D-007, D-008, D-013, D-014). Queda por confirmar en el iPhone (T2). El módulo de datos ya existe (T1)

## 1. Restricciones que mandan

| Restricción | Consecuencia |
|---|---|
| iPhone + Windows | No se puede compilar una app nativa de iOS en el ordenador de Pablo: Xcode solo existe para macOS |
| 0 €/mes | Sin Apple Developer Program (99 USD/año), sin servidores de pago |
| Proyecto personal | No hace falta App Store. Las licencias «solo uso no comercial» son utilizables |
| Claude programa, Pablo revisa | Tecnología muy documentada, una sola cadena de herramientas, código legible |
| Uso sin conexión | Los datos viven en el dispositivo; el servidor, si llega, es opcional |

## 2. Opciones comparadas

| Opción | ¿Funciona con iPhone + Windows + 0 €? | A favor | En contra |
|---|---|---|---|
| **A. Aplicación web instalable (PWA)** | **Sí** | Se instala desde Safari con «Añadir a pantalla de inicio»; se desarrolla y prueba en Windows; funciona en Android y ordenador sin cambios | Apple limita lo que puede hacer una web; el almacenamiento hay que verificarlo en el dispositivo real |
| B. Flutter (propuesta inicial) | No | Rendimiento nativo, buen soporte offline | Compilar para iOS exige un Mac; instalar en el iPhone exige firma de Apple |
| C. React Native + Expo (compilación en la nube) | No a 0 € | Se compila sin Mac en servidores de Expo (15 compilaciones iOS/mes gratis) | Instalar la app en un iPhone real sin Mac requiere el programa de pago de Apple |
| D. Expo Go (sin compilar) | Parcial | Gratis, se ve en el iPhone desde Windows | No es una app independiente: depende de la app Expo Go y de un servidor de desarrollo; no sirve como producto offline |

Fuentes: condiciones de firma y coste de Apple según Expo (<https://expo.dev/blog/apple-developer-program-explained-free-vs-paid>, 2 nov 2026); límite de compilaciones gratuitas en <https://expo.dev/articles/testing-and-previewing/test-ios-app-without-mac>.

## 3. Recomendación: PWA con base de datos local

**Opción A.** Es la única que cumple las cuatro restricciones a la vez. Y no es un callejón sin salida: el mismo código web se puede envolver más adelante en una app nativa con Capacitor si algún día se decide pagar la cuota de Apple y publicar.

### Piezas

| Pieza | Elección | Por qué | Alternativa descartada |
|---|---|---|---|
| Lenguaje | TypeScript | Detecta errores antes de ejecutar; un solo lenguaje para app y scripts de datos | JavaScript puro (menos seguro) |
| Interfaz | React + Vite | La más documentada; compatible con Capacitor | Svelte (más legible, menos ejemplos). Decidido: D-007 |
| Datos locales | SQLite compilado a WebAssembly, guardado en OPFS | Consultas SQL reales, búsqueda de texto, y el mismo esquema sirve mañana en un servidor PostgreSQL | IndexedDB con Dexie (más simple, peor para consultas taxonómicas y para migrar) |
| Offline | Service worker que guarda la app y la base de referencia | Estándar web | — |
| Servidor | **Ninguno en el MVP** | 0 €, privacidad total, nada que mantener | API propia + PostgreSQL/PostGIS: se pospone hasta que haga falta sincronizar |
| Alojamiento | Cloudflare Pages (gratuito, HTTPS) desde un repositorio privado de GitHub | Una PWA solo se instala desde HTTPS; el código queda privado | GitHub Pages: gratis solo con repositorio público. Decidido: D-008 |
| Pruebas | En `datos/`: el ejecutor de pruebas incluido en Node. En la app: Vitest + lista de comprobación manual en el iPhone | Rápidas y ejecutables en Windows y en el entorno de Claude | — |
| Scripts de datos | Node 22.18+ ejecutando TypeScript directamente, con el SQLite incluido en Node. Única dependencia externa: `read-excel-file` para leer el XLSX (D-018) | Nada que compilar ni instalar aparte de Node | better-sqlite3 (exige compilar código nativo en Windows) |

Datos técnicos comprobados:

- Safari admite el acceso síncrono a OPFS que SQLite necesita desde la versión 16.4 (marzo 2023). Fuente: <https://sqlite.org/wasm/doc/trunk/persistence.md>.
- La variante de almacenamiento `opfs-sahpool` no exige cabeceras especiales del servidor, lo que permite alojamiento estático sencillo; a cambio solo admite una conexión a la vez (una pestaña). Para una app instalada de un solo usuario es aceptable. Fuente secundaria: <https://blog.openreplay.com/sqlite-browser-opfs/>; se confirmará en T2.
- El borrado automático a los siete días que aplica Safari no afecta a las web instaladas en la pantalla de inicio. Fuente: <https://web.dev/articles/storage-for-the-web>. Existen informes antiguos de fallos (errores de WebKit de 2021-2022), así que no se da por garantizado: ver riesgo R-01.
- La app instalada y Safari tienen almacenes separados: lo guardado probando en Safari no aparece en la app instalada.

## 4. Dos bases de datos, no una

Es la decisión de diseño más importante para cumplir «actualizar la ciencia sin perder observaciones».

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│ referencia.sqlite            │      │ usuario.sqlite               │
│ (solo lectura en el móvil)   │      │ (lectura y escritura)        │
│                              │      │                              │
│ taxones, nombres, sinónimos, │◄─────│ observaciones, salidas,      │
│ versiones, regiones,         │ id   │ identificaciones, fotos,     │
│ caracteres, fuentes          │estable│ ajustes, colección          │
└──────────────────────────────┘      └──────────────────────────────┘
        ▲ se genera en el ordenador           ▲ nunca se sustituye;
        │ y se sustituye entera al            │ solo se migra y se
        │ actualizar                          │ exporta
```

- `referencia.sqlite` la fabrica un script a partir de las fuentes con licencia abierta (AviList, matriz de caracteres propia). Se versiona, se publica con la app y se reemplaza completa. Con AviList v2026 pesa 16,2 MB.
- **`referencia-nomenclatura.sqlite`** (8,7 MB): datos nomenclaturales y bibliográficos para el modo Experto. Va en un archivo aparte porque todo junto pesaba 26,5 MB y Cloudflare Pages no admite archivos de más de 25 MiB (<https://developers.cloudflare.com/pages/platform/limits>). La app lo descargará solo cuando haga falta (D-017).
- **Complemento de España:** la lista y los nombres de SEO/BirdLife no tienen licencia abierta, así que van en un archivo aparte que no se publica y que Pablo carga en su dispositivo (D-009). El mecanismo se diseña en el hito 1.3.
- `usuario.sqlite` solo guarda el identificador estable del taxón, más el nombre tal como se mostró al registrar. Si un taxón se divide o cambia de nombre, el registro sigue apuntando a su identificador y la app ofrece revisarlo.

## 5. Estructura del código (prevista)

```
avedex/
  README.md
  docs/
  datos/            scripts que generan referencia.sqlite + fuentes descargadas  ← existe desde T1
  app/              la PWA
    src/
      datos/        acceso a SQLite (único punto que toca la base)
      taxonomia/    búsqueda y navegación
      diario/       registros
      coleccion/    cálculo de estados
      identificador/ motor (funciones puras, sin interfaz)
      ui/           pantallas
```

Regla: `identificador/`, `coleccion/` y `taxonomia/` son lógica pura, sin pantalla ni red, para poder probarlas automáticamente.

## 6. Copia de seguridad

Sin servidor, la única protección de los datos del usuario es la exportación. Por eso entra en el MVP y no después.

- Exportar genera un archivo (datos + fotos) que se guarda en Archivos/iCloud Drive con el menú de compartir de iOS.
- La app avisa cuando hay registros nuevos sin exportar desde hace más de N días.
- Borrar la app de la pantalla de inicio borra sus datos: se advierte en la propia app.

## 7. Enfoque del identificador (para la fase 5)

Se describe ahora porque condiciona el modelo de datos.

**Datos:** una matriz taxón × carácter. Cada celda no es «sí/no», sino con qué frecuencia ese taxón muestra ese estado, y para qué sexo, edad y época.

**Cálculo:**

1. **Punto de partida** por candidato según región, fecha y hábitat. Tiene un suelo mínimo: una especie rara baja en la lista, nunca desaparece por ser rara.
2. **Cada respuesta** multiplica la puntuación de cada candidato según lo compatible que sea. «No lo sé» no cambia nada.
3. **Tolerancia al error:** una respuesta incompatible penaliza mucho pero no elimina, porque el observador se equivoca (luz, distancia, memoria). Cada carácter lleva una fiabilidad.
4. **Rasgos correlacionados** (por ejemplo «pico grueso» y «come semillas») se agrupan y el grupo cuenta como una sola evidencia.
5. **Siguiente pregunta:** la que más reduce la incertidumbre esperada entre los candidatos que quedan (ganancia de información), ponderada por lo fácil que es de observar y por el modo del usuario.
6. **Parada:** si los candidatos restantes no se pueden separar con las preguntas disponibles, el resultado es su ancestro común (género, familia) y se dice por qué.

**Lo que se muestra:** una «compatibilidad» ordenada con los rasgos a favor y en contra. **No se llama probabilidad** mientras no se haya calibrado con casos reales. Una sugerencia del motor entra como estado «sugerida»; pasar a «respaldada» o «revisada» exige una acción del usuario.

**Validación:** un conjunto de casos de prueba (descripciones reales con respuesta conocida, incluidas descripciones incompletas y erróneas) que se ejecuta automáticamente y mide aciertos en primera posición, en las tres primeras y falsos positivos seguros.

## 8. Cómo crecerá sin rehacer

| Necesidad futura | Cambio | ¿Se rehace algo? |
|---|---|---|
| Publicar en App Store | Envolver la PWA con Capacitor + cuota de Apple | No |
| Sincronizar dispositivos | Añadir API + PostgreSQL; `usuario.sqlite` ya usa identificadores globales | No |
| Mapas sin conexión | Teselas vectoriales en un archivo local | No |
| Mapas de distribución | PostGIS en servidor o polígonos simplificados en la base de referencia | No |
| Foto y sonido con IA | Modelos locales o servicio externo, como módulo aparte | No |
| Más países | Más filas en las tablas de región | No |

## 9. Lo que no se hace todavía

Cuentas de usuario, servidor, sincronización, mapas, modelos de IA, notificaciones, diseño visual definitivo.
