export async function obtenerMemoriaBot(pool,clienteId){
  const r=await pool.query(`SELECT bot_producto,bot_paso,COALESCE(bot_contexto,'{}'::jsonb) AS bot_contexto FROM clientes WHERE id=$1 LIMIT 1`,[clienteId]);
  if(!r.rows[0])return {producto:null,paso:null,contexto:{}};
  return {
    producto:r.rows[0].bot_producto||null,
    paso:r.rows[0].bot_paso||null,
    contexto:r.rows[0].bot_contexto&&typeof r.rows[0].bot_contexto==='object'?r.rows[0].bot_contexto:{}
  };
}

export async function guardarMemoriaBot(pool,clienteId,{producto,paso,contexto}={}){
  await pool.query(`UPDATE clientes SET bot_producto=COALESCE($1,bot_producto),bot_paso=COALESCE($2,bot_paso),bot_contexto=COALESCE($3::jsonb,bot_contexto) WHERE id=$4`,[
    producto??null,
    paso??null,
    contexto!==undefined?JSON.stringify(contexto):null,
    clienteId
  ]);
  if(contexto?.ciudad){await pool.query(`UPDATE clientes SET ciudad=$1 WHERE id=$2`,[contexto.ciudad,clienteId]);}
}

export async function limpiarMemoriaBot(pool,clienteId){
  await pool.query(`UPDATE clientes SET bot_producto=NULL,bot_paso=NULL,bot_contexto='{}'::jsonb WHERE id=$1`,[clienteId]);
}
