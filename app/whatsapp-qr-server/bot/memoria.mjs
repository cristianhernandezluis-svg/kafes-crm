export async function obtenerMemoriaBot(pool,clienteId,whatsappQrId){
  const r=await pool.query(
    `SELECT
       bot_producto,
       bot_paso,
       COALESCE(bot_contexto,'{}'::jsonb) AS bot_contexto,
       etapa
     FROM clientes_whatsapp_qr
     WHERE cliente_id=$1
       AND whatsapp_qr_id=$2
     LIMIT 1`,
    [clienteId, whatsappQrId]
  );

  if(!r.rows[0]){
    return {
      producto:null,
      paso:null,
      contexto:{},
      etapa:null,
      venta:null
    };
  }

  const vr=await pool.query(
    `SELECT
       id,
       producto,
       estado,
       monto,
       adelanto,
       GREATEST(monto-adelanto,0) AS saldo,
       agencia,
       numero_guia,
       estado_envio,
       created_at,
       updated_at
     FROM ventas
     WHERE cliente_id=$1
       AND whatsapp_qr_id=$2
     ORDER BY id DESC
     LIMIT 1`,
    [clienteId, whatsappQrId]
  );

  const filaVenta=vr.rows[0]||null;

  const venta=filaVenta
    ? {
        id:filaVenta.id,
        producto:filaVenta.producto||null,
        estado:filaVenta.estado||null,
        monto:filaVenta.monto==null?null:Number(filaVenta.monto),
        adelanto:filaVenta.adelanto==null?null:Number(filaVenta.adelanto),
        saldo:filaVenta.saldo==null?null:Number(filaVenta.saldo),
        agencia:filaVenta.agencia||null,
        numero_guia:filaVenta.numero_guia||null,
        estado_envio:filaVenta.estado_envio||null,
        created_at:filaVenta.created_at||null,
        updated_at:filaVenta.updated_at||null
      }
    : null;

  return {
    producto:r.rows[0].bot_producto||null,
    paso:r.rows[0].bot_paso||null,
    contexto:
      r.rows[0].bot_contexto &&
      typeof r.rows[0].bot_contexto==="object"
        ? r.rows[0].bot_contexto
        : {},
    etapa:r.rows[0].etapa||null,
    venta
  };
}

export async function guardarMemoriaBot(
  pool,
  clienteId,
  whatsappQrId,
  {producto,paso,contexto}={}
){
  await pool.query(
    `UPDATE clientes_whatsapp_qr
     SET bot_producto=COALESCE($1,bot_producto),
         bot_paso=COALESCE($2,bot_paso),
         bot_contexto=COALESCE($3::jsonb,bot_contexto),
         updated_at=NOW()
     WHERE cliente_id=$4
       AND whatsapp_qr_id=$5`,
    [
      producto??null,
      paso??null,
      contexto!==undefined?JSON.stringify(contexto):null,
      clienteId,
      whatsappQrId
    ]
  );

  if(contexto?.ciudad){
    await pool.query(
      `UPDATE clientes
       SET ciudad=$1
       WHERE id=$2`,
      [contexto.ciudad,clienteId]
    );
  }
}

export async function limpiarMemoriaBot(pool,clienteId,whatsappQrId){
  await pool.query(
    `UPDATE clientes_whatsapp_qr
     SET bot_producto=NULL,
         bot_paso=NULL,
         bot_contexto='{}'::jsonb,
         updated_at=NOW()
     WHERE cliente_id=$1
       AND whatsapp_qr_id=$2`,
    [clienteId, whatsappQrId]
  );
}