export function crearBufferMensajes({
  silencioMs = 3000,
  maxEsperaMs = 10000,
  procesarLote,
}) {
  const buffers = new Map();
  const colas = new Map();

  function ejecutarEnCola(clave, lote) {
    const anterior = colas.get(clave) || Promise.resolve();

    const actual = anterior
      .catch(() => {})
      .then(() => procesarLote(lote))
      .catch((error) => {
        console.error("ERROR PROCESANDO BUFFER:", error?.message || error);
      })
      .finally(() => {
        if (colas.get(clave) === actual) {
          colas.delete(clave);
        }
      });

    colas.set(clave, actual);
  }

  function vaciar(clave) {
    const buffer = buffers.get(clave);
    if (!buffer) return;

    if (buffer.timer) clearTimeout(buffer.timer);
    buffers.delete(clave);

    if (buffer.items.length) {
      ejecutarEnCola(clave, buffer.items);
    }
  }

  function agregar(clave, item) {
    const ahora = Date.now();
    let buffer = buffers.get(clave);

    if (!buffer) {
      buffer = {
        inicio: ahora,
        items: [],
        timer: null,
      };
      buffers.set(clave, buffer);
    }

    buffer.items.push(item);

    if (buffer.timer) clearTimeout(buffer.timer);

    const transcurrido = ahora - buffer.inicio;
    const restante = Math.max(0, maxEsperaMs - transcurrido);

    if (restante === 0) {
      vaciar(clave);
      return;
    }

    const espera = Math.min(silencioMs, restante);
    buffer.timer = setTimeout(() => vaciar(clave), espera);
  }

  return { agregar, vaciar };
}
