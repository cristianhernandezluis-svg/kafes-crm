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

    if (!whatsappQrId) {
      return NextResponse.json(
        { success: false, error: "Canal de WhatsApp no valido" },
        { status: 400 }
      );
    }

    const actual = await pool.query(
      `SELECT id, etapa
       FROM clientes_whatsapp_qr
       WHERE cliente_id = $1
         AND whatsapp_qr_id = $2
       LIMIT 1`,
      [id, whatsappQrId]
    );

    if (!actual.rows[0]) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado en este canal" },
        { status: 404 }
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
          requiere_closer = false,
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
    console.error("ERROR DEVOLVIENDO AL BOT:", error);
    return NextResponse.json(
      { success: false, error: "Error devolviendo conversacion al bot" },
      { status: 500 }
    );
  }
}