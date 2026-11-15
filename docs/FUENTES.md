# FUENTES Y LICENCIAS

Versión 0.2 — consultado el 2026-11-15. Sección de AviList verificada contra el archivo oficial al importarlo (T1)

Leyenda de verificación: ✅ comprobado en la fuente oficial · 🟡 comprobado en fuente secundaria · ❓ sin comprobar.

AVEDEX es, hoy, un **proyecto personal sin publicación**. Varias condiciones de abajo cambian si se publica o se vende algo (app o cuaderno). Cada fuente indica qué pasaría.

## 1. Resumen

| Fuente | Para qué | Licencia | Uso en AVEDEX |
|---|---|---|---|
| AviList v2026 | Columna vertebral taxonómica | CC BY 4.0 | Se importa entera, citando |
| SEO/BirdLife | Lista de España, nombres en español, referencia de contenidos | Sin licencia abierta localizada | Lista y nombres como dato de referencia; textos y medios **no se copian** |
| eBird / Clements | Códigos de especie, nombres en idiomas, frecuencia y estacionalidad | Solo uso no comercial, con clave y atribución | Opcional; válido mientras sea personal |
| iNaturalist | Fotos con licencia abierta, registros | Licencia elegida por cada autor | Solo fotos CC0/CC BY/CC BY-SA, una a una, con atribución |
| Merlin Bird ID | Referencia de experiencia de uso | Sin API pública localizada | Solo se estudia; no se integra |
| xeno-canto | Cantos y reclamos | Creative Commons por grabación | Fase posterior, grabación a grabación |
| AVONET | Medidas y ecología por especie | Artículo CC BY | Posible apoyo para tamaño, hábitat y migración |

## 2. AviList

- **Qué es:** lista mundial unificada de aves, acordada por los equipos de IOC, eBird/Clements y BirdLife. ✅
- **Versión vigente:** v2026, publicada el 20 de octubre de 2026 según su página (la página de Clements da el 21). Primera versión: 11 de junio de 2025; revisión menor 2025b: 11 de junio de 2026. Actualización anual en octubre. ✅ <https://www.avilist.org/checklist/v2026/>
- **Tamaño:** 45 órdenes, 250 familias, 2.379 géneros, 11.172 especies y 19.852 subespecies (33.698 taxones). ✅ Contado en el archivo oficial al importarlo; coincide con lo publicado por Clements. <https://www.birds.cornell.edu/clementschecklist/introduction/updateindex/october-2026/>
- **Formato:** hoja de cálculo descargable en versión corta y extendida; la extendida añade campos nomenclaturales, bibliográficos y enlaces a BirdLife, eBird y Birds of the World. Hay también un explorador interactivo. ✅ <https://www.avilist.org/annual-avilist-update-v2026/>
- **Novedades de v2026 útiles:** rangos geográficos a nivel de especie para todas las especies politípicas y nombres en inglés para órdenes y familias. ✅
- **Licencia:** CC BY 4.0. ✅ Leída en la hoja «Recommended citation» del archivo v2026. El importador se detiene si un archivo futuro declara otra licencia.
- **Cita:** AviList Core Team. 2026. AviList: The Global Avian Checklist, v2026. <https://doi.org/10.2173/avilist.v2026> ✅ (copiada del archivo)
- **Identificadores:** cada especie y subespecie lleva un Avibase ID, que el propio archivo describe como identificador estable del concepto taxonómico, independiente del nombre. ✅ Son únicos (31.024). Órdenes, familias y géneros no tienen identificador.
- **Contenido del archivo:** 26 columnas. Además de la taxonomía: nombres en inglés (AviList, Clements v2026, BirdLife v10), distribución, estado de extinción, categoría de la Lista Roja, código de especie de Cornell, enlace a BirdLife DataZone y datos nomenclaturales. Otras hojas: resúmenes de decisiones, referencias y cambios respecto a la versión anterior (esta última servirá para el hito 1.4). ✅
- **Lista Roja:** la categoría UICN viene dentro del archivo CC BY, pero procede de BirdLife/UICN. ❓ Revisar sus condiciones propias si algún día se publica.
- **Limitaciones:**
  - **Subespecies:** todavía no revisadas a fondo; proceden de IOC 15.2. ✅ Son la parte menos sólida de la lista y AVEDEX debe decirlo.
  - **Nombres comunes:** solo en inglés. ✅ (comprobado en el archivo). Los nombres en español hay que traerlos de otra fuente.
- **Si se publica:** sin cambios, basta atribuir.

## 3. SEO/BirdLife

- **Lista de las Aves de España:** edición de 2022, elaborada por su Grupo de Taxonomía; la anterior era de 2019 (622 especies) y la de 2012 tenía 569. ✅ <https://seo.org/nueva-lista-de-las-aves-de-espana/>
  - La edición de 2022 pasa de 622 a 638 taxones. ✅ (leído en el PDF oficial aportado por Pablo: «Lista de las aves de España. Edición de 2022», 51 páginas, texto extraíble).
  - Los cambios se anuncian anualmente. ✅ Su informe «El estado de las aves de España 2024» recoge la publicación de AviList y cambios en la lista española. 🟡 <https://seo.org/wp-content/uploads/2025/11/Estado-de-Las-aves-2024_v5.pdf>
- **Guía de Aves de España (web y app):** 632 fichas, 401 de especies habituales y 231 de ocasionales; las habituales incluyen nombres en todas las lenguas oficiales del Estado, científico e inglés. ✅ <https://seo.org/creditos/>
- **Taxonomía que usa:** la edición de 2022 combina IOC World Bird List v12.2 y HBW/BirdLife v6b. ✅ (resumen en inglés del PDF oficial). Es decir, **dos listas anteriores a AviList**: habrá especies que no casen por nombre. ❓ No está comprobado en qué punto está su adopción de AviList.
- **Licencia:** no se ha localizado ninguna licencia que permita reutilizar textos, fotos, audios o mapas. Se tratan como **todos los derechos reservados**. ❓
- **Uso en AVEDEX:**
  - La lista (qué especies, qué categoría) y los nombres en español se usan como datos de referencia, citando la fuente.
  - Los textos de ficha se redactan de nuevo a partir de varias fuentes; nunca se copian.
  - Fotos, audios, vídeos y mapas: no se usan.
- **Si se publica:** pedir permiso por escrito a SEO/BirdLife para lista y nombres, o usar los nombres en español de otra fuente con licencia clara.
- **Advertencia de alojamiento:** si la PWA se sirve desde una dirección pública, lo que vaya dentro de `referencia.sqlite` queda técnicamente accesible a cualquiera. Ver riesgo R-06.

## 4. eBird y eBird/Clements

- **Taxonomía:** eBird/Clements v2026. Incluye, además de especies y subespecies, categorías propias para el observador: grupos de subespecies, híbridos, «sp.» y pares «A/B». ✅ <https://science.ebird.org/en/use-ebird-data/the-ebird-taxonomy/2025-ebird-taxonomy-update>
- **API:** licencia no exclusiva y revocable para uso **no comercial**; exige clave personal que no se comparte, y atribución. El uso comercial requiere permiso escrito previo del Cornell Lab. ✅ <https://www.birds.cornell.edu/home/ebird-api-terms-of-use/>
- **Nombres comunes:** eBird ofrece para descarga una matriz con todos sus juegos de nombres regionales, actualizada el 27 de octubre de 2026. ✅ <https://support.ebird.org/en/support/solutions/articles/48000804865-bird-names-in-ebird>
- **Uso en AVEDEX:** el código de especie de eBird como identificador externo; más adelante, frecuencia y estacionalidad por región para el punto de partida del identificador.
- **Si se publica gratis:** sigue siendo uso no comercial, pero hay que releer las condiciones sobre redistribución. **Si se vende algo:** permiso escrito obligatorio.

## 5. iNaturalist

- **Taxonomía de aves:** sigue la lista de Clements con desviaciones explícitas. 🟡 (guía de curadores citada en su foro) <https://www.inaturalist.org/pages/curator%2Bguide>
- **API:** tope técnico de 100 peticiones por minuto; piden no pasar de 60 por minuto ni de 10.000 al día. Descargar más de 5 GB de medios por hora o 24 GB al día puede acabar en bloqueo permanente. La API es para aplicaciones, no para extraer datos en masa; para eso ofrecen conjuntos de datos. 🟡 (leído en <https://chile.inaturalist.org/pages/developers>; la página oficial de prácticas recomendadas no se pudo abrir)
- **Licencias:** cada autor elige la de sus fotos y observaciones; muchas son «no comercial» o con todos los derechos reservados.
- **Uso en AVEDEX:** fase posterior. Solo fotos CC0, CC BY o CC BY-SA, guardando autor, licencia y enlace de cada una.
- **Si se publica:** las CC BY-NC quedarían excluidas si hay ingresos; por eso se excluyen ya.

## 6. Merlin Bird ID

- **Qué ofrece:** identificación por sonido, por foto, por cinco preguntas y por exploración de lista. La identificación por sonido funciona en el dispositivo, sin red. ✅ <https://news.cornell.edu/node/321931> y <https://www.macaulaylibrary.org/?p=6741>
- **API pública:** no se ha localizado ninguna. ❓
- **Uso en AVEDEX:** solo como referencia de diseño. Diferencia buscada: Merlin hace pocas preguntas fijas y da una lista; AVEDEX quiere preguntas adaptativas, explicación de la evidencia y resultado a nivel de género o familia cuando proceda.

## 7. Otras fuentes candidatas

- **xeno-canto:** todas las grabaciones se publican bajo alguna licencia Creative Commons, elegida por quien graba; hay que revisar cada una. ✅ <https://xeno-canto.org/about/terms>. La API v3 exige clave. 🟡
- **AVONET:** medidas morfológicas y variables ecológicas de 11.009 especies; artículo en acceso abierto con licencia CC BY. 🟡 <https://doi.org/10.1111/ele.13898>. ❓ Confirmar la licencia del conjunto de datos en figshare antes de usarlo.
- **Wikimedia Commons:** ❓ sin revisar; candidata para fotos con licencia abierta.
- **BirdLife / Lista Roja UICN:** ❓ sin revisar; AviList extendida incluye la categoría de la Lista Roja.

## 8. Discrepancias taxonómicas documentadas

Las plataformas **no** usan la misma taxonomía. Estado a noviembre de 2026:

| Comparación | Situación |
|---|---|
| AviList v2026 ↔ eBird/Clements v2026 | 11.172 especies frente a 11.201. Órdenes, familias y géneros coinciden al 100 %. ✅ |
| | La cifra de coincidencia en especies varía según quién la dé: Clements publica 99,74 % y AviList habla de 97,7 %. No son el mismo cálculo y no se ha aclarado la diferencia. ❓ |
| | **28 especies** de AviList v2026 no tienen equivalencia exacta en eBird/Clements v2026 (sin código de especie en el archivo). ✅ Contado al importar. Scythebill habla de unas 30 diferencias. 🟡 <https://blog.scythebill.com/2026/11/scythebill-210-ebird-2026-avilist-2026.html> |
| AviList ↔ subespecies de eBird | eBird/Clements ha alineado muchas subespecies; AviList aún arrastra las de IOC 15.2. ✅ |
| AviList ↔ BirdLife | BirdLife va por su versión 10 y prevé varios años hasta la alineación completa, por su vínculo con la Lista Roja. ✅ **875 especies** de AviList v2026 no tienen equivalencia exacta en BirdLife v10 (sin enlace a DataZone ni categoría de Lista Roja). ✅ Contado al importar. Ejemplo: *Parus major*. |
| AviList ↔ IOC | IOC publicó su última versión (15.2) y deja de actualizarse. ✅ |
| AviList ↔ iNaturalist | iNaturalist sigue Clements con desviaciones propias. 🟡 |
| AviList ↔ SEO/BirdLife | Lista española de 2022 basada en IOC v12.2 y HBW/BirdLife v6b. ✅ Habrá especies de la lista española que no casen por nombre; se sabrá cuántas en el hito 1.3. |

**Consecuencia para el diseño:** la tabla `id_externo` admite equivalencias no exactas, y el importador de la lista de España debe producir un informe de taxones que no casan, para resolverlos a mano uno a uno. Ninguna equivalencia se inventa.

## 9. Lista de comprobación antes de incorporar contenido

1. ¿La fuente y la versión están en este documento?
2. ¿La licencia permite el uso actual (personal)? ¿Y si se publicara?
3. ¿Se guarda autor, licencia y enlace junto al contenido?
4. ¿Se ha obtenido por una vía permitida (descarga oficial o API dentro de sus límites)? Nada de extracción automática de páginas web.
5. ¿Es dato real o `EJEMPLO`?
