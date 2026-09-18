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
    const accion = String(body.accion || "").toLowerCase();

    if (!whatsappQrId) {
      return NextResponse.json(
        { success: false, error: "Canal de WhatsApp no valido" },
        { status: 400 }
      );
    }

    const actual = await pool.query(
      `
      SELECT
        id,
        etapa,
        bot_activo,
        modo_humano_permanente
      FROM clientes_whatsapp_qr
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      LIMIT 1
      `,
      [id, whatsappQrId]
    );

    if (!actual.rows[0]) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado en este canal" },
        { status: 404 }
      );
    }

    if (accion === "pausar") {
      const result = await pool.query(
        `
        UPDATE clientes_whatsapp_qr
        SET bot_activo = false,
            modo_humano_permanente = true,
            humano_hasta = NULL,
            proximo_seguimiento = NULL,
            requiere_closer = false,
            handoff_motivo = 'intervencion_manual',
            bot_contexto =
              COALESCE(bot_contexto, '{}'::jsonb) ||
              jsonb_build_object(
                'seguimiento_silencio_activo', false,
                'seguimiento_explicito_activo', false
              ),
            updated_at = NOW()
        WHERE cliente_id = $1
          AND whatsapp_qr_id = $2
        RETURNING *
        `,
        [id, whatsappQrId]
      );

      return NextResponse.json({
        success: true,
        accion: "pausado",
        cliente: result.rows[0],
      });
    }

    if (accion === "activar") {
      const result = await pool.query(
        `
        UPDATE clientes_whatsapp_qr
        SET bot_activo = true,
            modo_humano_permanente = false,
            humano_hasta = NULL,
            updated_at = NOW()
        WHERE cliente_id = $1
          AND whatsapp_qr_id = $2
        RETURNING *
        `,
        [id, whatsappQrId]
      );

      return NextResponse.json({
        success: true,
        accion: "activado",
        cliente: result.rows[0],
      });
    }

if (actual.rows[0].modo_humano_permanente === true) {
  return NextResponse.json(
    {
      success: false,
      error: "El bot esta pausado manualmente. Debes activarlo con el boton Activar bot.",
    },
    { status: 409 }
  );
}

    const etapa = String(actual.rows[0].etapa || "");

    const esPostventa =
      (etapa.startsWith("Pag") && etapa.includes("Adelanto")) ||
      etapa === "Enviado" ||
      etapa === "Entregado";

    if (!esPostventa) {
      return NextResponse.json(
        { success: false, error: "El cliente aun no esta en postventa" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE clientes_whatsapp_qr
      SET bot_activo = true,
          modo_humano_permanente = false,
          requiere_closer = false,
          humano_hasta = NULL,
          bot_paso = 'postventa',
          updated_at = NOW()
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      RETURNING *
      `,
      [id, whatsappQrId]
    );

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR CONTROLANDO BOT:", error);

    return NextResponse.json(
      { success: false, error: "Error controlando conversacion del bot" },
      { status: 500 }
    );
  }
}