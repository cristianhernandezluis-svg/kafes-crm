import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function limpiarTelefono(telefono: string) {
  const limpio = telefono.replace(/\D/g, "");
  return limpio.startsWith("51") ? limpio : `51${limpio}`;
}

export async function POST(req: Request) {
  try {
    const { cliente_id, telefono, mensaje } = await req.json();

    if (!cliente_id || !telefono || !mensaje) {
      return NextResponse.json(
        { success: false, error: "Falta cliente, teléfono o mensaje" },
        { status: 400 }
      );
    }

    const clienteResult = await pool.query(
      `SELECT empresa_id FROM clientes WHERE id = $1 LIMIT 1`,
      [cliente_id]
    );

    const empresaId = clienteResult.rows[0]?.empresa_id;

    if (!empresaId) {
      return NextResponse.json(
        { success: false, error: "Cliente sin empresa_id" },
        { status: 400 }
      );
    }

    const configResult = await pool.query(
      `
      SELECT phone_number_id, token
      FROM integraciones_whatsapp
      WHERE empresa_id = $1 AND estado = 'activo'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [empresaId]
    );

    const config = configResult.rows[0];

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Esta empresa no tiene WhatsApp configurado" },
        { status: 400 }
      );
    }

    const telefonoFinal = limpiarTelefono(telefono);

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefonoFinal,
      type: "text",
      text: {
        preview_url: false,
        body: mensaje,
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${config.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("ERROR META WHATSAPP:", data);

      return NextResponse.json(
        { success: false, error: data },
        { status: 500 }
      );
    }

    await pool.query(
      `
      INSERT INTO conversaciones (
        empresa_id,
        cliente_id,
        telefono,
        whatsapp_message_id,
        mensaje,
        remitente,
        tipo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        empresaId,
        cliente_id,
        telefonoFinal,
        data.messages?.[0]?.id || null,
        mensaje,
        "asesor",
        "text",
      ]
    );

    return NextResponse.json({
      success: true,
      telefono: telefonoFinal,
      data,
    });
  } catch (error) {
    console.error("ERROR ENVIANDO WHATSAPP:", error);

    return NextResponse.json(
      { success: false, error: "Error enviando mensaje" },
      { status: 500 }
    );
  }
}