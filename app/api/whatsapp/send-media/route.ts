import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
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
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

const usuarioResult = await pool.query(
  `SELECT id, rol
   FROM usuarios
   WHERE id = $1
     AND empresa_id = $2
   LIMIT 1`,
  [sesion.id, sesion.empresa_id]
);

if (usuarioResult.rows.length === 0) {
  return NextResponse.json(
    { success: false, error: "Usuario no autorizado" },
    { status: 403 }
  );
}

    const formData = await req.formData();

const clienteId = formData.get("cliente_id") as string;
const qrIdRaw = formData.get("whatsapp_qr_id");
const qrIdPresente = qrIdRaw !== null && qrIdRaw !== "";
const whatsappQrId = qrIdPresente ? Number(qrIdRaw) : 0;
if (qrIdPresente && (!Number.isSafeInteger(whatsappQrId) || whatsappQrId <= 0)) {
  return NextResponse.json({ success: false, error: "Canal WhatsApp QR invalido" }, { status: 400 });
}
const archivo = formData.get("archivo") as File;

if (!clienteId || !archivo || !(archivo instanceof File) || archivo.size === 0) {
      return NextResponse.json(
        { success: false, error: "Faltan datos" },
        { status: 400 }
      );
    }

    const tipo = detectarTipo(archivo.type);

    const clienteResult = await pool.query(
  `SELECT empresa_id, canal, telefono
   FROM clientes
   WHERE id = $1
     AND empresa_id = $2
   LIMIT 1`,
  [clienteId, sesion.empresa_id]
);

    const cliente = clienteResult.rows[0];

    if (!cliente?.empresa_id) {
      return NextResponse.json(
        { success: false, error: "Cliente sin empresa_id" },
        { status: 400 }
      );
    }

if (!cliente.telefono) {
  return NextResponse.json(
    { success: false, error: "Cliente sin teléfono registrado" },
    { status: 400 }
  );
}

const telefonoFinal = limpiarTelefono(
  String(cliente.telefono)
);

    const empresaId = cliente.empresa_id;
    // VALIDACION_CANAL_CLIENTE_QR
    if (cliente.canal === "qr" && !whatsappQrId) {
      return NextResponse.json(
        { success: false, error: "Este cliente requiere un canal WhatsApp QR valido" },
        { status: 400 }
      );
    }


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

    // PERMISOS_MEDIA_ASESOR
    const rolActual = usuarioResult.rows[0].rol;
    const usuarioIdActual = usuarioResult.rows[0].id;
    if (rolActual !== "admin" && rolActual !== "asesor") {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }
    if (rolActual === "asesor") {
      const permisoResult = whatsappQrId
        ? await pool.query(
            "SELECT 1 FROM clientes_whatsapp_qr WHERE cliente_id=$1 AND empresa_id=$2 AND whatsapp_qr_id=$3 AND asesor_usuario_id=$4 LIMIT 1",
            [clienteId, empresaId, whatsappQrId, usuarioIdActual]
          )
        : await pool.query(
            "SELECT 1 FROM clientes WHERE id=$1 AND empresa_id=$2 AND asesor_usuario_id=$3 LIMIT 1",
            [clienteId, empresaId, usuarioIdActual]
          );
      if (permisoResult.rowCount === 0) {
        return NextResponse.json({ success: false, error: "Conversacion no autorizada" }, { status: 403 });
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
	  "x-internal-token": process.env.WHATSAPP_QR_INTERNAL_TOKEN || "",
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
       requiere_closer = CASE
         WHEN handoff_motivo = 'validar_pago' THEN true
         ELSE false
       END,
       humano_hasta = CASE
         WHEN handoff_motivo = 'validar_pago' THEN humano_hasta
         ELSE NOW() + INTERVAL '90 seconds'
       END,
       handoff_motivo = CASE
         WHEN handoff_motivo = 'validar_pago' THEN 'validar_pago'
         WHEN handoff_motivo IN ('pide_humano', 'bot_no_puede') THEN handoff_motivo
         ELSE 'intervencion_manual'
       END,
       updated_at = NOW()
   WHERE cliente_id = $1
     AND whatsapp_qr_id = $2
     AND empresa_id = $3`,
  [clienteId, whatsappQrId, sesion.empresa_id]
);


      return NextResponse.json({
        success: true,
        canal: "qr",
        tipo: data.tipo || tipo,
        mediaId: data.mediaId || null,
        data,
      });
    }

    const configResult = await pool.query(
      "SELECT phone_number_id, token FROM integraciones_whatsapp WHERE empresa_id = $1 AND estado = $2 ORDER BY created_at DESC LIMIT 1",
      [sesion.empresa_id, "activo"]
    );
    const configCloud = configResult.rows[0];
    if (!configCloud?.phone_number_id || !configCloud?.token) {
      return NextResponse.json({ success: false, error: "Esta empresa no tiene WhatsApp Cloud configurado" }, { status: 400 });
    }

    const uploadForm = new FormData();
    uploadForm.append("messaging_product", "whatsapp");
    uploadForm.append("file", archivo, archivo.name);

    const uploadRes = await fetch(
      `https://graph.facebook.com/v25.0/${configCloud.phone_number_id}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configCloud.token}`,
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

    const payload: { messaging_product: string; recipient_type: string; to: string; type: string; image?: { id: string }; document?: { id: string; filename: string }; audio?: { id: string } } = {
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
      `https://graph.facebook.com/v25.0/${configCloud.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configCloud.token}`,
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
      requiere_closer = CASE
        WHEN handoff_motivo = 'validar_pago' THEN true
        ELSE false
      END,
      humano_hasta = CASE
        WHEN handoff_motivo = 'validar_pago' THEN humano_hasta
        ELSE NOW() + INTERVAL '90 seconds'
      END,
      handoff_motivo = CASE
        WHEN handoff_motivo = 'validar_pago' THEN 'validar_pago'
        WHEN handoff_motivo IN ('pide_humano', 'bot_no_puede') THEN handoff_motivo
        ELSE 'intervencion_manual'
      END
  WHERE id = $1
    AND empresa_id = $2
  `,
  [clienteId, sesion.empresa_id]
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
    empresa_id,
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
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `,
  [
    sesion.empresa_id,
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