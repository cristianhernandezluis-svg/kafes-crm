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
      WITH no_leidos AS (
        SELECT cliente_id, COUNT(*) AS total
        FROM conversaciones
        WHERE whatsapp_qr_id = $2
          AND remitente = 'cliente'
          AND COALESCE(leido, false) = false
        GROUP BY cliente_id
      )
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.ciudad,
        COALESCE(rel.etapa, 'Nuevo') AS etapa,
        rel.asesor AS asesor,
        COALESCE(rel.score, 0) AS score,
        COALESCE(rel.temperatura, 'frio') AS temperatura,
        COALESCE(rel.bot_activo, true) AS bot_activo,
        COALESCE(rel.requiere_closer, false) AS requiere_closer,
        rel.bot_producto AS bot_producto,
        rel.bot_paso AS bot_paso,
        COALESCE(rel.bot_contexto, '{}'::jsonb) AS bot_contexto,
        c.created_at,

        ult.mensaje AS ultimo_mensaje,
        ult.tipo AS ultimo_tipo,
        ult.created_at AS ultimo_mensaje_fecha,

        COALESCE(no_leidos.total, 0) AS no_leidos

      FROM clientes c

      LEFT JOIN clientes_whatsapp_qr rel
        ON rel.cliente_id = c.id
       AND rel.empresa_id = c.empresa_id
       AND rel.whatsapp_qr_id = $2

      LEFT JOIN LATERAL (
        SELECT mensaje, tipo, created_at
        FROM conversaciones
        WHERE cliente_id = c.id
          AND whatsapp_qr_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ult ON true

      LEFT JOIN no_leidos ON no_leidos.cliente_id = c.id

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
    const { cliente_id, whatsapp_qr_id, accion } = await req.json();

    if (!cliente_id || !whatsapp_qr_id) {
      return NextResponse.json(
        { success: false, error: "Falta cliente_id o whatsapp_qr_id" },
        { status: 400 }
      );
    }

    if (accion === 'liberar') {
      await pool.query(
        `
        UPDATE clientes_whatsapp_qr
        SET bot_activo = true,
            humano_hasta = NULL,
            updated_at = NOW()
        WHERE cliente_id = $1
          AND whatsapp_qr_id = $2
          AND humano_hasta IS NOT NULL
        `,
        [cliente_id, whatsapp_qr_id]
      );

      return NextResponse.json({ success: true, liberado: true });
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


    await pool.query(
      `
      UPDATE clientes_whatsapp_qr
      SET bot_activo = false,
          requiere_closer = false,
          humano_hasta = NOW() + INTERVAL '90 seconds',
          updated_at = NOW()
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
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
