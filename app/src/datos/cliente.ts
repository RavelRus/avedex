// Lado de la pantalla: envía peticiones al trabajador de datos y devuelve promesas.

import type { MensajeAlTrabajador, MensajeDelTrabajador, Peticion, Respuestas } from './protocolo.ts';

type Pendiente = { resolver: (valor: unknown) => void; rechazar: (error: Error) => void };

const trabajador = new Worker(new URL('./trabajador.ts', import.meta.url), { type: 'module' });
const pendientes = new Map<number, Pendiente>();
let siguienteId = 1;
let alProgresar: (texto: string) => void = () => {};

trabajador.addEventListener('message', (evento: MessageEvent<MensajeDelTrabajador>) => {
  const mensaje = evento.data;
  if ('progreso' in mensaje) {
    alProgresar(mensaje.progreso);
    return;
  }
  const pendiente = pendientes.get(mensaje.id);
  if (!pendiente) return;
  pendientes.delete(mensaje.id);
  if (mensaje.ok) pendiente.resolver(mensaje.resultado);
  else pendiente.rechazar(new Error(mensaje.error));
});

trabajador.addEventListener('error', (evento) => {
  const error = new Error(`El trabajador de datos ha fallado: ${evento.message || 'error desconocido'}`);
  for (const p of pendientes.values()) p.rechazar(error);
  pendientes.clear();
});

export function escucharProgreso(funcion: (texto: string) => void): void {
  alProgresar = funcion;
}

export function pedir<P extends Peticion>(peticion: P): Promise<Respuestas[P['tipo']]> {
  return new Promise((resolver, rechazar) => {
    const id = siguienteId++;
    pendientes.set(id, { resolver: resolver as (valor: unknown) => void, rechazar });
    trabajador.postMessage({ id, peticion } satisfies MensajeAlTrabajador);
  });
}
