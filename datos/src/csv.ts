// Lector de CSV mínimo (comillas dobles, comas y saltos de línea dentro de comillas). Sin dependencias.

export function leerCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  const t = texto.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (entreComillas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (fila.length > 1 || fila[0] !== '') filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila); }

  const [cabecera, ...resto] = filas;
  if (!cabecera) return [];
  return resto.map((valores, n) => {
    if (valores.length !== cabecera.length) {
      throw new Error(`CSV: la fila ${n + 2} tiene ${valores.length} campos y la cabecera ${cabecera.length}.`);
    }
    return Object.fromEntries(cabecera.map((nombre, i) => [nombre, valores[i]!.normalize('NFC').trim()]));
  });
}

export function escribirCsv(cabecera: readonly string[], filas: readonly Record<string, string>[]): string {
  const celda = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  return [cabecera.join(','), ...filas.map((f) => cabecera.map((c) => celda(f[c] ?? '')).join(','))].join('\n') + '\n';
}
