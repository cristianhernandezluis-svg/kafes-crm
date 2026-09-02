import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function limpiarTelefono(telefono: string) {
  const limpio = telefono.replace(/\D/g, "");

  if (limpio.startsWith("51")) {
    return limpio;
  }

  return `51${limpio}`;
}

function detectarTipo(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const clienteId = formData.get("cliente_id") as string;
    const whatsappQrId = Number(formData.get("whatsapp_qr_id"));
    const telefono = formData.get("telefono") as string;
    const archivo = formData.get("archivo") as File;

    if (!clienteId || !telefono || !archivo) {
      return NextResponse.json(
        { success: false, error: "Faltan datos" },
        { status: 400 }
      );
    }


    const telefonoFinal = limpiarTelefono(telefono);
    const tipo = detectarTipo(archivo.type);

    const clienteResult = await pool.query(
      `SELECT empresa_id, canal
       FROM clientes
       WHERE id = $1
       LIMIT 1`,
      [clienteId]
    );

    const cliente = clienteResult.rows[0];

    if (!cliente?.empresa_id) {
      return NextResponse.json(
        { success: false, error: "Cliente sin empresa_id" },
        { status: 400 }
      );
    }

    const empresaId = cliente.empresa_id;

    if (whatsappQrId) {
      const relacionQr = await pool.query(
        `SELECT rel.id
         FROM clientes_whatsapp_qr rel
         JOIN integraciones_whatsapp_qr iq
           ON iq.id = rel.whatsapp_qr_id
          AND iq.empresa_id = rel.empresa_id
         WHERE rel.cliente_id = $1
           AND rel.empresa_id = $2
           AND rel.whatsapp_qr_id = $3
         LIMIT 1`,
        [clienteId, empresaId, whatsappQrId]
      );

      if (relacionQr.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: "El cliente no pertenece a este canal de WhatsApp" },
          { status: 400 }
        );
      }
    }

    const canal = whatsappQrId ? "qr" : cliente.canal || "cloud";

    if (canal === "qr") {
      const qrUrl = process.env.WHATSAPP_QR_URL || "http://localhost:4001";
      const bufferArchivo = Buffer.from(await archivo.arrayBuffer());

      const response = await fetch(`${qrUrl}/send-media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-telefono": telefonoFinal,
          "x-cliente-id": String(clienteId),
          "x-whatsapp-qr-id": String(whatsappQrId),
          "x-mime-type": archivo.type || "application/octet-stream",
          "x-filename": encodeURIComponent(archivo.name || "archivo"),
        },
        body: bufferArchivo,
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        console.error("ERROR MEDIA WHATSAPP QR:", data);
        return NextResponse.json(
          { success: false, error: data },
          { status: response.status || 500 }
        );
      }

      await pool.query(
        `UPDATE clientes_whatsapp_qr
         SET bot_activo = false,
             requiere_closer = false,
             humano_hasta = NOW() + INTERVAL '90 seconds',
             handoff_motivo = CASE
               WHEN handoff_motivo = 'validar_pago' THEN 'validar_pago'
               WHEN handoff_motivo IN ('pide_humano', 'bot_no_puede') THEN handoff_motivo
               ELSE 'intervencion_manual'
             END,
             updated_at = NOW()
         WHERE cliente_id = $1
           AND whatsapp_qr_id = $2`,
        [clienteId, whatsappQrId]
      );


      return NextResponse.json({
        success: true,
        canal: "qr",
        tipo: data.tipo || tipo,
        mediaId: data.mediaId || null,
        data,
      });
    }

    const uploadForm = new FormData();
    uploadForm.append("messaging_product", "whatsapp");
    uploadForm.append("file", archivo, archivo.name);

    const uploadRes = await fetch(
      `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        },
        body: uploadForm,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("ERROR SUBIENDO MEDIA:", uploadData);
      return NextResponse.json(
        { success: false, error: uploadData },
        { status: 500 }
      );
    }

    const mediaId = uploadData.id;

    let payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: telefonoFinal,
      type: tipo,
    };

    if (tipo === "image") {
      payload.image = {
        id: mediaId,
      };
    }

    if (tipo === "document") {
      payload.document = {
        id: mediaId,
        filename: archivo.name,
      };
    }

    if (tipo === "audio") {
      payload.audio = {
        id: mediaId,
      };
    }

    const sendRes = await fetch(
      `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      console.error("ERROR ENVIANDO MEDIA:", sendData);
      return NextResponse.json(
        { success: false, error: sendData },
        { status: 500 }
      );
    }

    await pool.query(
      `
      UPDATE clientes
      SET bot_activo = false,
          requiere_closer = false,
          humano_hasta = NOW() + INTERVAL '90 seconds',
          handoff_motivo = CASE
            WHEN handoff_motivo = 'validar_pago' THEN 'validar_pago'
            WHEN handoff_motivo IN ('pide_humano', 'bot_no_puede') THEN handoff_motivo
            ELSE 'intervencion_manual'
          END
      WHERE id = $1
      `,
      [clienteId]
    );

    const mensaje =
      tipo === "image"
        ? "📷 Imagen enviada"
        : tipo === "audio"
        ? "🎤 Audio enviado"
        : "📄 Documento enviado";

    await pool.query(
      `
      INSERT INTO conversaciones (
        cliente_id,
        telefono,
        whatsapp_message_id,
        mensaje,
        remitente,
        tipo,
        media_id,
        mime_type,
        filename
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        clienteId,
        telefonoFinal,
        sendData.messages?.[0]?.id || null,
        mensaje,
        "asesor",
        tipo,
        mediaId,
        archivo.type,
        archivo.name,
      ]
    );

    return NextResponse.json({
      success: true,
      tipo,
      mediaId,
      data: sendData,
    });
  } catch (error) {
    console.error("ERROR SEND MEDIA:", error);

    return NextResponse.json(
      { success: false, error: "Error enviando archivo" },
      { status: 500 }
    );
  }
}