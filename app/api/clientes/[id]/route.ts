import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const whatsappQrId = Number(body.whatsapp_qr_id);

    console.log("ID RECIBIDO:", id);
    console.log("BODY RECIBIDO:", body);

    if (Number.isFinite(whatsappQrId) && whatsappQrId > 0) {
      await pool.query('UPDATE clientes SET ciudad = COALESCE($1, ciudad) WHERE id = $2', [body.ciudad ?? null, id]);

      const canalResult = await pool.query(
        `UPDATE clientes_whatsapp_qr
         SET etapa = $1,
             asesor = COALESCE($2, asesor),
             observacion = $3,
             proximo_seguimiento = $4::timestamp,
             ultima_gestion = $5,
             cantidad_seguimientos = COALESCE(cantidad_seguimientos, 0) + 1,
             cerrado_por = CASE
               WHEN $1 LIKE 'Pag%Adelanto' AND cerrado_at IS NULL THEN
                 CASE
                   WHEN handoff_motivo = 'validar_pago' THEN 'BOT'
                   WHEN handoff_motivo IN ('pide_humano', 'bot_no_puede', 'intervencion_manual') THEN 'CLOSER'
                   ELSE 'BOT'
                 END
               ELSE cerrado_por
             END,
             cerrado_at = CASE WHEN $1 LIKE 'Pag%Adelanto' AND cerrado_at IS NULL THEN NOW() ELSE cerrado_at END,
             requiere_closer = CASE WHEN $1 LIKE 'Pag%Adelanto' THEN false ELSE requiere_closer END,
             bot_activo = CASE WHEN $1 LIKE 'Pag%Adelanto' THEN true ELSE bot_activo END,
             bot_paso = CASE WHEN $1 LIKE 'Pag%Adelanto' THEN 'postventa' ELSE bot_paso END,
             updated_at = NOW()
         WHERE cliente_id = $6
           AND whatsapp_qr_id = $7
         RETURNING *`,
        [
          body.etapa || 'Seguimiento',
          body.asesor ?? null,
          body.observacion ?? '',
          body.proximo_seguimiento ?? null,
          body.ultima_gestion ?? new Date().toISOString(),
          id,
          whatsappQrId,
        ]
      );

      return NextResponse.json({ success: true, cliente: canalResult.rows[0] });
    }

    const result = await pool.query(
      `
      UPDATE clientes
      SET
        etapa = $1,
        asesor = COALESCE($2, asesor),
        ciudad = COALESCE($3, ciudad),
        observacion = $4,
        proximo_seguimiento = $5::timestamp,
        ultima_gestion = $6,
        cantidad_seguimientos = COALESCE(cantidad_seguimientos, 0) + 1,
        cerrado_por = CASE
          WHEN $1 LIKE 'Pag%Adelanto' AND cerrado_at IS NULL THEN
            CASE
              WHEN handoff_motivo = 'validar_pago' THEN 'BOT'
              WHEN handoff_motivo IN ('pide_humano', 'bot_no_puede', 'intervencion_manual') THEN 'CLOSER'
              ELSE 'BOT'
            END
          ELSE cerrado_por
        END,
        cerrado_at = CASE
          WHEN $1 LIKE 'Pag%Adelanto' AND cerrado_at IS NULL THEN NOW()
          ELSE cerrado_at
        END,
        requiere_closer = CASE
          WHEN $1 LIKE 'Pag%Adelanto' THEN false
          ELSE requiere_closer
        END,
        bot_activo = CASE
          WHEN $1 LIKE 'Pag%Adelanto' THEN true
          ELSE bot_activo
        END,
        bot_paso = CASE
          WHEN $1 LIKE 'Pag%Adelanto' THEN 'postventa'
          ELSE bot_paso
        END
      WHERE id = $7
      RETURNING *
      `,
      [
        body.etapa || "Seguimiento",
        body.asesor ?? null,
        body.ciudad ?? null,
        body.observacion ?? "",
        body.proximo_seguimiento ?? null,
        body.ultima_gestion ?? new Date().toISOString(),
        id,
      ]
    );

    console.log("CLIENTE ACTUALIZADO:", result.rows[0]);

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando cliente:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error actualizando cliente",
      },
      { status: 500 }
    );
  }
}