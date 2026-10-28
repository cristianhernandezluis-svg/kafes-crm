
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Comprobar la sesión
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id || id.length > 512) {
      return NextResponse.json(
        { success: false, error: "Archivo inválido" },
        { status: 400 }
      );
    }

    // 2. Verificar el usuario y su empresa
    const usuarioResult = await pool.query(
      `SELECT id, empresa_id, rol
       FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (usuarioResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      );
    }

    const usuario = usuarioResult.rows[0];

    if (!["admin", "asesor"].includes(usuario.rol)) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      );
    }

    // 3. Buscar el archivo únicamente entre los mensajes autorizados
    const mediaResult = await pool.query(
      `SELECT
         conv.id,
         conv.cliente_id,
         conv.canal,
         conv.whatsapp_qr_id,
         conv.mime_type,
         conv.empresa_id
       FROM conversaciones conv
       INNER JOIN clientes c
         ON c.id = conv.cliente_id
        AND c.empresa_id = conv.empresa_id
       LEFT JOIN clientes_whatsapp_qr rel
         ON rel.cliente_id = conv.cliente_id
        AND rel.empresa_id = conv.empresa_id
        AND rel.whatsapp_qr_id = conv.whatsapp_qr_id
       WHERE conv.media_id = $1
         AND conv.empresa_id = $2
         AND (
           $3 = 'admin'
           OR (
             $3 = 'asesor'
             AND (
               (
                 conv.canal = 'qr'
                 AND rel.asesor_usuario_id = $4
               )
               OR (
                 conv.canal = 'cloud'
                 AND c.asesor_usuario_id = $4
               )
             )
           )
         )
       ORDER BY conv.id DESC
       LIMIT 1`,
      [id, usuario.empresa_id, usuario.rol, usuario.id]
    );

    if (mediaResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Archivo no encontrado o no autorizado" },
        { status: 404 }
      );
    }

    const media = mediaResult.rows[0];

    // 4. Descargar archivos de WhatsApp QR
    if (media.canal === "qr") {
      if (!media.whatsapp_qr_id) {
        return NextResponse.json(
          { success: false, error: "Canal QR inválido" },
          { status: 400 }
        );
      }

      const tokenInterno = process.env.WHATSAPP_QR_INTERNAL_TOKEN;

      if (!tokenInterno) {
        return NextResponse.json(
          { success: false, error: "Servicio multimedia no configurado" },
          { status: 503 }
        );
      }

      const qrUrl =
        process.env.WHATSAPP_QR_URL || "http://localhost:4001";

      const qrRes = await fetch(
        `${qrUrl}/media/${encodeURIComponent(id)}`,
        {
          headers: {
            "x-internal-token": tokenInterno,
          },
          cache: "no-store",
        }
      );

      if (!qrRes.ok) {
        return NextResponse.json(
          { success: false, error: "Archivo QR no disponible" },
          { status: 404 }
        );
      }

      return new Response(await qrRes.arrayBuffer(), {
        headers: {
          "Content-Type":
            media.mime_type ||
            qrRes.headers.get("content-type") ||
            "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // 5. Descargar archivos de WhatsApp Cloud
    if (media.canal === "cloud") {
      const integracionResult = await pool.query(
        `SELECT token
         FROM integraciones_whatsapp
         WHERE empresa_id = $1
           AND estado = 'activo'
         ORDER BY created_at DESC
         LIMIT 1`,
        [usuario.empresa_id]
      );

      const token = integracionResult.rows[0]?.token;

      if (!token) {
        return NextResponse.json(
          { success: false, error: "WhatsApp Cloud no configurado" },
          { status: 503 }
        );
      }

      const metaRes = await fetch(
        `https://graph.facebook.com/v25.0/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!metaRes.ok) {
        return NextResponse.json(
          { success: false, error: "Archivo Cloud no disponible" },
          { status: 502 }
        );
      }

      const metaData = await metaRes.json();

      if (
        !metaData.url ||
        typeof metaData.url !== "string" ||
        !metaData.url.startsWith("https://")
      ) {
        return NextResponse.json(
          { success: false, error: "Respuesta multimedia inválida" },
          { status: 502 }
        );
      }

      const fileRes = await fetch(metaData.url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!fileRes.ok) {
        return NextResponse.json(
          { success: false, error: "Descarga Cloud fallida" },
          { status: 502 }
        );
      }

      return new Response(await fileRes.arrayBuffer(), {
        headers: {
          "Content-Type":
            media.mime_type ||
            metaData.mime_type ||
            "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Canal multimedia no compatible" },
      { status: 400 }
    );
  } catch (error) {
    console.error("ERROR DESCARGANDO MEDIA:", error);

    return NextResponse.json(
      { success: false, error: "No se pudo descargar el archivo" },
      { status: 500 }
    );
  }
}
