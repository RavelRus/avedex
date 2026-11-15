# AVEDEX — datos

Scripts que fabrican la base de referencia científica de AVEDEX a partir de las fuentes originales.

## Qué hay aquí

| Carpeta | Contenido |
|---|---|
| `fuentes/avilist/` | El archivo oficial de AviList (CC BY 4.0) y su manifiesto `v2026.json` |
| `src/` | El importador |
| `pruebas/` | Pruebas automáticas |
| `anclas/taxones.csv` | **Correspondencia permanente taxón → identificador de AVEDEX.** No editar ni borrar |
| `salida/` | Lo que se genera: las bases SQLite y el informe de importación |

## Requisitos

Node.js 22.18 o posterior. Nada más: SQLite y el ejecutor de pruebas vienen incluidos en Node.

## Uso

```
npm install        (solo la primera vez)
npm run importar   genera salida/referencia.sqlite, salida/referencia-nomenclatura.sqlite y el informe
npm run probar     ejecuta las pruebas
npm run tipos      comprueba los tipos de TypeScript
```

Node muestra el aviso «SQLite is an experimental feature». Es esperado: ver `docs/DECISIONES.md`, problema conocido K-01.

## Qué produce

- `salida/referencia.sqlite` — la base que usará la app: taxones, jerarquía, nombres en inglés, distribución,
  categoría de la Lista Roja, estado de extinción y equivalencias con Avibase, eBird y BirdLife.
- `salida/referencia-nomenclatura.sqlite` — datos nomenclaturales y bibliográficos (protónimo, localidad tipo,
  descripción original). Va aparte para aligerar la base principal; se enlaza por `taxon_id`.
- `salida/informe-importacion.md` — recuentos, avisos y huella del archivo importado.

## Cómo se mantienen estables los identificadores

Cada taxón recibe un número propio de AVEDEX la primera vez que se importa. La correspondencia se guarda en
`anclas/taxones.csv` y se reutiliza en cada importación posterior.

- **Especies y subespecies** se reconocen por su Avibase ID, que identifica el concepto taxonómico y no cambia
  aunque cambien el nombre o el género.
- **Órdenes, familias y géneros** no tienen identificador en AviList: se reconocen por rango + nombre.

Si se pierde `anclas/taxones.csv`, una importación desde cero con el mismo archivo de AviList reproduce exactamente
los mismos números (lo comprueba la prueba 4). Lo que no se podría reconstruir es el historial entre versiones.

## Importar una versión nueva de AviList

1. Descargar la versión extendida y guardarla en `fuentes/avilist/`.
2. Copiar `v2026.json` con el nombre de la nueva versión y actualizar sus campos.
3. `npm run importar -- fuentes/avilist/vXXXX.json`

El importador se detiene con un mensaje claro si falta una columna, si la jerarquía es incoherente o si la licencia
del archivo deja de ser CC BY 4.0. Conservar como «no vigentes» los taxones que desaparecen entre versiones está
pendiente (hito 1.4).
