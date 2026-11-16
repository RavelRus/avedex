# AVEDEX

Aplicación de identificación, aprendizaje y registro de aves. Empieza por España y se diseña para admitir todas las especies y subespecies del mundo.

## Estado actual

| | |
|---|---|
| Fase | **1 — Base científica.** Hito 1.1 hecho. Hito 1.2 (prueba en el iPhone) superado salvo dos esperas. Hito 1.3 (lista de España) en curso |
| Situación | `datos/` importa AviList v2026 (33.698 taxones) y cruza la lista de SEO/BirdLife 2022 (638 taxones): 631 resueltos, 7 pendientes de decisión. 28 pruebas de 28 superadas. `app/` es una app de prueba sin diseño, publicada en <https://avedex.pablocaruiz.workers.dev>; en el iPhone de Pablo instala, busca, guarda y abre sin conexión (comprobaciones A-D superadas el 2026-11-16; E y F pendientes). **Nada se ha ejecutado aún en Windows** |
| Siguiente paso | Pablo aprueba el reparto de las 7 entradas divididas (`datos/fuentes/seo/reparto-propuesto.md`); después se construye el complemento de España y la forma de cargarlo en el iPhone |
| Documentación al día | **La del repositorio.** Las copias de `docs/` en el Proyecto de Claude pueden ir por detrás: ante la duda, manda el repositorio |
| Dónde está el código | Repositorio privado <https://github.com/RavelRus/avedex>, rama `main`. Claude sube los cambios directamente a `main` y Pablo los revisa después (D-019) |

## Decisiones técnicas principales

- Aplicación web instalable (PWA) con React + TypeScript.
- Datos en el dispositivo: SQLite, en dos bases separadas (referencia científica y datos del usuario). Sin servidor.
- Taxonomía base: AviList v2026. España: lista de SEO/BirdLife 2022, cargada solo en local.
- Código en repositorio privado de GitHub; web publicada con Cloudflare Pages.

## Punto de partida (decidido por Pablo el 2026-11-15)

- **Finalidad:** proyecto personal, sin publicar en tiendas.
- **Equipo:** iPhone para probar, ordenador Windows para desarrollar.
- **Presupuesto:** 0 € al mes.
- **Reparto:** Claude programa y prueba; Pablo decide, revisa y valida.

Estas cuatro respuestas condicionan casi toda la arquitectura. Si alguna cambia, hay que revisar `docs/ARQUITECTURA.md` y `docs/FUENTES.md`.

## Documentos

| Archivo | Contenido |
|---|---|
| `docs/PRODUCTO.md` | Visión, requisitos funcionales y no funcionales, alcance del MVP |
| `docs/ARQUITECTURA.md` | Opciones comparadas, arquitectura recomendada, enfoque del identificador |
| `docs/MODELO_DATOS.md` | Modelo conceptual: taxonomía, observaciones, colección, caracteres |
| `docs/FUENTES.md` | Fuentes científicas, licencias, discrepancias taxonómicas |
| `docs/ROADMAP.md` | Fases, hitos comprobables y primera tarea de programación |
| `docs/DECISIONES.md` | Decisiones tomadas, decisiones pendientes, riesgos y problemas conocidos |
| `datos/` | Importador de AviList, pruebas, archivo de anclas e informe de importación. Instrucciones en `datos/README.md` |
| `app/` | La aplicación web instalable. De momento, solo la app de prueba de T2. Instrucciones en `app/README.md` |

## Cómo retomar el proyecto en otra sesión

1. Leer `docs/DECISIONES.md` (qué está decidido y qué no).
2. Leer `docs/ROADMAP.md` (en qué hito estamos).
3. No fiarse de lo recordado: si un documento y el código no coinciden, manda el código y se corrige el documento.

## Convenciones

- Todo dato inventado para probar se marca como `EJEMPLO` y nunca se mezcla con datos reales.
- Un módulo no está «hecho» hasta que sus pruebas se han ejecutado de verdad y el resultado queda anotado en `docs/ROADMAP.md`.
- Cada dato científico guarda su fuente y su versión.
- Antes de reutilizar texto, imagen, sonido o datos de terceros se comprueba la licencia en `docs/FUENTES.md`.
