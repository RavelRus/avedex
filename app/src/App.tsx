// Pantalla única de la tarea T2: comprobar en el iPhone que el almacenamiento funciona.
// No es la interfaz de AVEDEX: no tiene diseño a propósito.

import { useCallback, useEffect, useState } from 'react';
import { escucharProgreso, pedir } from './datos/cliente.ts';
import type { EstadoBases, NotaPrueba, ResultadoBusqueda } from './datos/protocolo.ts';

const NOMBRE_RANGO: Record<string, string> = {
  order: 'Orden', family: 'Familia', genus: 'Género', species: 'Especie', subspecies: 'Subespecie',
};

function megas(bytes: number | null): string {
  return bytes === null ? 'desconocido' : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fechaLegible(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

function diasDesde(iso: string | null): string {
  if (!iso) return '—';
  const dias = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return dias < 1 ? 'menos de un día' : `${dias.toFixed(1).replace('.', ',')} días`;
}

function esInstalada(): boolean {
  const iosInstalada = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosInstalada || window.matchMedia('(display-mode: standalone)').matches;
}

export function App() {
  const [fase, setFase] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [mensaje, setMensaje] = useState('Arrancando…');
  const [estado, setEstado] = useState<EstadoBases | null>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [conServiceWorker, setConServiceWorker] = useState(false);

  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [milisegundos, setMilisegundos] = useState<number | null>(null);

  const [notas, setNotas] = useState<NotaPrueba[]>([]);
  const [textoNota, setTextoNota] = useState('');
  const [errorNota, setErrorNota] = useState('');

  useEffect(() => {
    escucharProgreso(setMensaje);
    let cancelado = false;
    (async () => {
      try {
        const inicial = await pedir({ tipo: 'iniciar' });
        const guardadas = await pedir({ tipo: 'notas' });
        if (cancelado) return;
        setEstado(inicial);
        setNotas(guardadas);
        setFase('lista');
      } catch (error) {
        if (cancelado) return;
        setMensaje(error instanceof Error ? error.message : String(error));
        setFase('error');
      }
    })();
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    setConServiceWorker(Boolean(navigator.serviceWorker?.controller));
    const alCambiar = () => setConServiceWorker(Boolean(navigator.serviceWorker?.controller));
    navigator.serviceWorker?.addEventListener('controllerchange', alCambiar);
    navigator.storage?.persisted?.().then(setPersistente, () => setPersistente(null));
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
      navigator.serviceWorker?.removeEventListener('controllerchange', alCambiar);
    };
  }, []);

  useEffect(() => {
    if (fase !== 'lista') return;
    const texto = consulta.trim();
    if (texto.length < 2) {
      setResultados([]);
      setMilisegundos(null);
      return;
    }
    let vigente = true;
    const espera = window.setTimeout(async () => {
      const inicio = performance.now();
      const encontrados = await pedir({ tipo: 'buscar', texto });
      if (!vigente) return;
      setResultados(encontrados);
      setMilisegundos(Math.round(performance.now() - inicio));
    }, 150);
    return () => {
      vigente = false;
      window.clearTimeout(espera);
    };
  }, [consulta, fase]);

  const guardarNota = useCallback(async () => {
    setErrorNota('');
    try {
      setNotas(await pedir({ tipo: 'anadirNota', texto: textoNota }));
      setTextoNota('');
      setEstado(await pedir({ tipo: 'estado' }));
    } catch (error) {
      setErrorNota(error instanceof Error ? error.message : String(error));
    }
  }, [textoNota]);

  const pedirPersistencia = useCallback(async () => {
    try {
      setPersistente(await navigator.storage.persist());
    } catch {
      setPersistente(null);
    }
  }, []);

  if (fase !== 'lista' || !estado) {
    return (
      <main>
        <h1>AVEDEX <small>prueba T2</small></h1>
        <p className={fase === 'error' ? 'aviso error' : 'aviso'} role="status" data-prueba="arranque">{mensaje}</p>
      </main>
    );
  }

  const total = Object.values(estado.recuento).reduce((suma, n) => suma + n, 0);
  const siNo = (valor: boolean | null) => (valor === null ? 'no se puede saber' : valor ? 'sí' : 'no');

  return (
    <main>
      <h1>AVEDEX <small>prueba T2</small></h1>
      <p className="nota-cabecera">
        Pantalla de comprobación del almacenamiento. No es la app definitiva y no tiene diseño.
      </p>

      <section aria-labelledby="t-estado">
        <h2 id="t-estado">1. Estado</h2>
        <dl data-prueba="estado">
          <dt>Abierta como app instalada</dt>
          <dd className={esInstalada() ? 'bien' : 'mal'}>{esInstalada() ? 'sí' : 'no (estás en el navegador)'}</dd>
          <dt>Conexión</dt>
          <dd>{enLinea ? 'con conexión' : 'sin conexión'}</dd>
          <dt>Preparada para abrir sin conexión</dt>
          <dd className={conServiceWorker ? 'bien' : 'mal'}>{conServiceWorker ? 'sí' : 'todavía no (cierra y vuelve a abrir)'}</dd>
          <dt>Base de aves</dt>
          <dd data-prueba="taxonomia">{estado.taxonomia} · {total.toLocaleString('es-ES')} taxones · {(estado.recuento['species'] ?? 0).toLocaleString('es-ES')} especies</dd>
          <dt>Base instalada el</dt>
          <dd>{fechaLegible(estado.referenciaInstaladaEl)} ({megas(estado.referenciaBytes)})</dd>
          <dt>Notas guardadas</dt>
          <dd data-prueba="num-notas">{estado.notas}</dd>
          <dt>Primera nota guardada hace</dt>
          <dd data-prueba="antiguedad">{diasDesde(estado.primeraNota)} {estado.primeraNota ? `(${fechaLegible(estado.primeraNota)})` : ''}</dd>
          <dt>Espacio usado</dt>
          <dd>{megas(estado.usoBytes)} de {megas(estado.cuotaBytes)}</dd>
          <dt>Almacenamiento protegido por el sistema</dt>
          <dd>
            {siNo(persistente)}{' '}
            {persistente === false && <button type="button" className="secundario" onClick={pedirPersistencia}>Solicitar</button>}
          </dd>
          <dt>Versión</dt>
          <dd>app {fechaLegible(__COMPILADO__)} · SQLite {estado.versionSqlite}</dd>
        </dl>
      </section>

      <section aria-labelledby="t-buscar">
        <h2 id="t-buscar">2. Buscar</h2>
        <label htmlFor="consulta">Nombre científico o nombre en inglés</label>
        <input
          id="consulta" type="search" inputMode="search" autoComplete="off" autoCapitalize="none" spellCheck={false}
          placeholder="Parus major, eagle, Sylvia…" value={consulta} onChange={(e) => setConsulta(e.target.value)}
        />
        {milisegundos !== null && (
          <p className="pista" data-prueba="tiempo">{resultados.length} resultados en {milisegundos} ms{resultados.length === 40 ? ' (se muestran los 40 primeros)' : ''}</p>
        )}
        <ul className="resultados" data-prueba="resultados">
          {resultados.map((r) => (
            <li key={r.id}>
              <strong><i>{r.nombreCientifico}</i></strong>{r.nombreIngles ? ` — ${r.nombreIngles}` : ''}
              <span className="pista">
                {NOMBRE_RANGO[r.rango] ?? r.rango}
                {r.subespecies > 0 ? ` · ${r.subespecies} subespecies` : ''}
                {r.linaje.length > 0 ? ` · ${r.linaje.join(' › ')}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-notas">
        <h2 id="t-notas">3. Notas de prueba</h2>
        <p className="pista">Lo que escribas aquí se guarda solo en este dispositivo. Sirve para comprobar que no se pierde.</p>
        <label htmlFor="nota">Nueva nota</label>
        <div className="fila">
          <input id="nota" type="text" value={textoNota} onChange={(e) => setTextoNota(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void guardarNota(); }} placeholder="Prueba del día 1" />
          <button type="button" onClick={() => void guardarNota()}>Guardar</button>
        </div>
        {errorNota && <p className="aviso error">{errorNota}</p>}
        <ul className="notas" data-prueba="notas">
          {notas.map((n) => (
            <li key={n.id}>{n.texto} <span className="pista">{fechaLegible(n.creada)}</span></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-fuente">
        <h2 id="t-fuente">Fuente de los datos</h2>
        <p className="pista">{estado.cita}</p>
        <p className="pista">{estado.licencia}</p>
      </section>
    </main>
  );
}
