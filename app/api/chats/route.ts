import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");
    const whatsappQrId = searchParams.get("whatsapp_qr_id");

    if (!empresaId || !whatsappQrId) return NextResponse.json({ success: true, chats: [] });

    const result = await pool.query(`
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.ciudad,
        c.etapa,
        c.asesor,
        c.score,
        c.temperatura,
        c.bot_activo,
        c.requiere_closer,
        c.bot_producto,
        c.bot_paso,
        c.bot_contexto,
        c.created_at,

        ult.mensaje AS ultimo_mensaje,
        ult.tipo AS ultimo_tipo,
        ult.created_at AS ultimo_mensaje_fecha,

        COALESCE(no_leidos.total, 0) AS no_leidos

      FROM clientes c

      LEFT JOIN LATERAL (
        SELECT mensaje, tipo, created_at
        FROM conversaciones
        WHERE cliente_id = c.id
          AND whatsapp_qr_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ult ON true

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM conversaciones
        WHERE cliente_id = c.id
          AND whatsapp_qr_id = $2
          AND remitente = 'cliente'
          AND COALESCE(leido, false) = false
      ) no_leidos ON true

      WHERE c.empresa_id = $1
        AND EXISTS (
          SELECT 1
          FROM conversaciones conv
          WHERE conv.cliente_id = c.id
            AND conv.empresa_id = $1
            AND conv.whatsapp_qr_id = $2
        )

      ORDER BY
        ult.created_at DESC NULLS LAST,
        c.created_at DESC;
    `, [empresaId, whatsappQrId]);

    return NextResponse.json({
      success: true,
      chats: result.rows,
    });
  } catch (error) {
    console.error("ERROR API CHATS:", error);
    return NextResponse.json(
      { success: false, chats: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { cliente_id, whatsapp_qr_id } = await req.json();

    if (!cliente_id || !whatsapp_qr_id) {
      return NextResponse.json(
        { success: false, error: "Falta cliente_id o whatsapp_qr_id" },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE conversaciones
      SET leido = true
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
        AND remitente = 'cliente'
      `,
      [cliente_id, whatsapp_qr_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR MARCANDO CHAT LEIDO:", error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
