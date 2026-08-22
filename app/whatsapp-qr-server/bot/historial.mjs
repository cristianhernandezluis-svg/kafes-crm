const PAUSA_SESION_MINUTOS = 15;
const MAX_MENSAJES_BUSCADOS = 30;
const MAX_MENSAJES_IA = 10;

export async function obtenerHistorialReciente(
  pool,
  clienteId,
  antesDeId
) {
  const result = await pool.query(
    `
    SELECT id, remitente, mensaje, created_at
    FROM conversaciones
    WHERE cliente_id = $1
      AND id < $2
      AND created_at >= NOW() - INTERVAL '24 hours'
      AND remitente IN ('cliente', 'bot', 'asesor')
      AND mensaje IS NOT NULL
      AND TRIM(mensaje) <> ''
    ORDER BY created_at DESC, id DESC
    LIMIT $3
    `,
    [clienteId, antesDeId, MAX_MENSAJES_BUSCADOS]
  );

  if (result.rows.length === 0) {
    return [];
  }

  const sesion = [];
  let mensajeMasNuevo = null;

  for (const fila of result.rows) {
    if (mensajeMasNuevo) {
      const diferenciaMs =
        new Date(mensajeMasNuevo.created_at).getTime() -
        new Date(fila.created_at).getTime();

      const diferenciaMinutos = diferenciaMs / 60000;

      if (diferenciaMinutos > PAUSA_SESION_MINUTOS) {
        break;
      }
    }

    sesion.push(fila);
    mensajeMasNuevo = fila;
  }

  return sesion
    .slice(0, MAX_MENSAJES_IA)
    .reverse()
    .map((fila) => ({
      rol: fila.remitente,
      mensaje: fila.mensaje,
    }));
}