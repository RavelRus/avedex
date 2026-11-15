# AVEDEX

Aplicación de identificación, aprendizaje y registro de aves. Empieza por España y se diseña para admitir todas las especies y subespecies del mundo.

## Estado actual

| | |
|---|---|
| Fase | **1 — Base científica.** Hito 1.1 (T1, importador de AviList) hecho. Hito 1.2 (T2, prueba en el iPhone) en curso |
| Situación | `datos/` importa AviList v2026 completo (33.698 taxones) a SQLite con identificadores estables: 17 pruebas de 17 superadas. `app/` es una app de prueba sin diseño que busca y guarda sin conexión: 8 pasos de 8 superados en Chrome. **Nada se ha probado aún en el iPhone ni en Windows** |
| Siguiente paso | Publicar `app/` en Cloudflare Pages y hacer las comprobaciones A-F de `docs/ROADMAP.md` en el iPhone |
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
