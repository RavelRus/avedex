"""Extrae la tabla principal de la «Lista de las aves de España. Edición de 2022» (SEO/BirdLife) a CSV.

Herramienta de un solo uso: se ejecuta una vez por edición del PDF y su resultado (un CSV) se revisa
y se guarda. El resto del proyecto no necesita Python: trabaja a partir del CSV.

Uso:  python3 extraer_lista_seo.py LISTA.pdf salida.csv
Requiere: pdfplumber

El PDF no tiene licencia abierta: ni el PDF ni el CSV deben publicarse con la app (docs/DECISIONES.md, D-009).

Cómo funciona: lee cada palabra con su posición en la página y la asigna a una columna según la
posición de los títulos de la cabecera de esa misma página. No interpreta ni corrige nada.
"""
import csv
import re
import sys

import pdfplumber

COLUMNAS = ['seccion', 'familia', 'nombre_cientifico', 'subespecies', 'nombre_ingles', 'nombre_espanol',
            'pb', 'na', 'ca', 'observaciones', 'pagina', 'nota_extraccion']


def lineas(palabras, tolerancia=2.5):
    """Agrupa palabras en líneas por su posición vertical."""
    resultado = []
    for p in sorted(palabras, key=lambda p: (p['top'], p['x0'])):
        if resultado and abs(resultado[-1][0]['top'] - p['top']) <= tolerancia:
            resultado[-1].append(p)
        else:
            resultado.append([p])
    return [sorted(l, key=lambda p: p['x0']) for l in resultado]


def texto(palabras):
    return re.sub(r'\s+', ' ', ' '.join(p['text'] for p in palabras)).strip()


def extraer(ruta_pdf):
    filas, avisos = [], []
    seccion = familia = None
    actual = None
    with pdfplumber.open(ruta_pdf) as pdf:
        for numero, pagina in enumerate(pdf.pages, start=1):
            palabras = pagina.extract_words(extra_attrs=['fontname'])
            ls = lineas(palabras)
            cab = next((l for l in ls if any(p['text'] == 'Subespecies' for p in l)
                        and any(p['text'] == 'PB' for p in l)), None)
            if cab is None:
                continue
            x = {p['text']: p['x0'] for p in cab}
            x_sub, x_ing, x_pb, x_na, x_ca, x_obs = x['Subespecies'], x['Species'], x['PB'], x['NA'], x['CA'], x['Rarezas']
            x_esp = max(p['x0'] for p in cab if p['text'] == 'Especie')
            limites = [('nombre_cientifico', x_sub - 3), ('subespecies', x_ing - 3), ('nombre_ingles', x_esp - 3),
                       ('nombre_espanol', x_pb - 8), ('pb', x_na - 6), ('na', x_ca - 6), ('ca', x_obs - 6),
                       ('observaciones', 10_000)]
            fondo_cabecera = max(p['bottom'] for p in cab) + 12  # la cabecera ocupa dos líneas

            for linea in ls:
                if linea[0]['top'] <= fondo_cabecera or linea[0]['top'] > pagina.height - 30:
                    continue
                completo = texto(linea)
                if re.match(r'ESPECIES (SOLO )?EN CATEGOR', completo):
                    # El título de sección se repite al principio de cada página: solo cuenta cuando cambia.
                    if completo != seccion:
                        seccion, familia = completo, None
                    actual = None
                    continue
                if re.fullmatch(r'[A-ZÁÉÍÓÚ]+IDAE', completo):
                    familia, actual = completo, None
                    continue
                # A veces el título de la familia siguiente queda en la misma línea que la última especie
                # de la anterior. Se separa: vale para las filas que vienen después, no para esta.
                familia_siguiente = next((p['text'] for p in linea if re.fullmatch(r'[A-ZÁÉÍÓÚ]{4,}IDAE', p['text'])), None)
                if familia_siguiente:
                    linea = [p for p in linea if p['text'] != familia_siguiente]
                celdas = {c: [] for c, _ in limites}
                for p in linea:
                    celdas[next(c for c, lim in limites if p['x0'] < lim)].append(p)
                cientifico = texto(celdas['nombre_cientifico'])
                # Un nombre científico nuevo empieza por el género, en mayúscula. Si la celda empieza de otra
                # forma es la segunda línea de un nombre partido («Coccothraustes» / «coccothraustes»)
                # o de un par de especies («Pterodroma heraldica» / «/ P. arminjoniana»).
                if cientifico and re.match(r'[A-Z][a-z]', cientifico):
                    actual = {c: texto(celdas[c]) for c, _ in limites}
                    actual.update(seccion=seccion, familia=familia, pagina=numero)
                    filas.append(actual)
                elif actual is not None:
                    # Línea de continuación: completa las celdas de la fila anterior.
                    for c, _ in limites:
                        if celdas[c]:
                            actual[c] = (actual[c] + ' ' + texto(celdas[c])).strip()
                else:
                    avisos.append(f'pág. {numero}: línea sin fila a la que pertenecer: «{completo}»')
                if familia_siguiente:
                    familia, actual = familia_siguiente, None

    # El PDF parte a veces la última letra del epíteto («Anas acut a»). Se recompone solo cuando el resultado
    # es inequívoco (género + trozos en minúscula) y se deja constancia en la columna de avisos de la fila.
    for f in filas:
        original = f['nombre_cientifico']
        partes = original.split(' ')
        if len(partes) > 2 and all(re.fullmatch(r'[a-z]+', t) for t in partes[1:]):
            f['nombre_cientifico'] = partes[0] + ' ' + ''.join(partes[1:])
            f['nota_extraccion'] = f'nombre recompuesto; en el PDF se lee «{original}»'
        else:
            f['nota_extraccion'] = ''
    return filas, avisos


if __name__ == '__main__':
    filas, avisos = extraer(sys.argv[1])
    with open(sys.argv[2], 'w', newline='', encoding='utf-8') as f:
        escritor = csv.DictWriter(f, fieldnames=COLUMNAS)
        escritor.writeheader()
        escritor.writerows(filas)
    print(f'{len(filas)} filas escritas en {sys.argv[2]}')
    for a in avisos:
        print('AVISO:', a)
