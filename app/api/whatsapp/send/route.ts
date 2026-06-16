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
      `
      SELECT empresa_id, canal
      FROM clientes
      WHERE id = $1
      LIMIT 1
      `,
      [cliente_id]
    );

    const cliente = clienteResult.rows[0];

    if (!cliente?.empresa_id) {
      return NextResponse.json(
        { success: false, error: "Cliente sin empresa_id" },
        { status: 400 }
      );
    }

    const empresaId = cliente.empresa_id;
    const canal = cliente.canal || "cloud";
    const telefonoFinal = limpiarTelefono(telefono);

    let whatsappMessageId = null;
    let data: any = null;

    if (canal === "qr") {
      const qrUrl = process.env.WHATSAPP_QR_URL || "http://localhost:4001";

      const response = await fetch(`${qrUrl}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telefono: telefonoFinal,
          mensaje,
        }),
      });

      data = await response.json();

      if (!response.ok || data.success === false) {
        console.error("ERROR WHATSAPP QR:", data);

        return NextResponse.json(
          { success: false, error: data },
          { status: 500 }
        );
      }

      whatsappMessageId = data.messageId || null;
    } else {
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
          { success: false, error: "Esta empresa no tiene WhatsApp Cloud configurado" },
          { status: 400 }
        );
      }

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

      data = await response.json();

      if (!response.ok) {
        console.error("ERROR META WHATSAPP:", data);

        return NextResponse.json(
          { success: false, error: data },
          { status: 500 }
        );
      }

      whatsappMessageId = data.messages?.[0]?.id || null;
    }

    if (canal !== "qr") {
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
      whatsappMessageId,
      mensaje,
      "asesor",
      "text",
    ]
  );
}

    return NextResponse.json({
      success: true,
      canal,
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