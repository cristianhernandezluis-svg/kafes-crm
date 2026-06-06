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