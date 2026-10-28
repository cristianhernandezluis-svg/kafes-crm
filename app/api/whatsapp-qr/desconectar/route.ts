
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const qrUrl =
  process.env.WHATSAPP_QR_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://n8n_kafes-whatsapp-qr:4001"
    : "http://localhost:4001");

function errorJson(mensaje: string, status: number) {
  return NextResponse.json(
    { success: false, error: mensaje },
    { status }
  );
}

export async function POST() {
  try {
    // 1. Verificar la sesión
    const sesion = await obtenerSesion();

    if (!sesion) {
      return errorJson("No autorizado", 401);
    }

    // 2. Verificar que sea administrador de su empresa
    const usuarioResult = await pool.query(
      `SELECT id, empresa_id, rol
       FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (usuarioResult.rowCount === 0) {
      return errorJson("Usuario no autorizado", 403);
    }

    const usuario = usuarioResult.rows[0];

    if (usuario.rol !== "admin") {
      return errorJson(
        "Solo el administrador puede desconectar WhatsApp",
        403
      );
    }

    // 3. Comprobar cuál es el canal activo del servidor QR
    const estadoRes = await fetch(`${qrUrl}/qr`, {
      headers: { "x-internal-token": process.env.WHATSAPP_QR_INTERNAL_TOKEN || "" },
      cache: "no-store",
    });

    if (!estadoRes.ok) {
      return errorJson("Servidor WhatsApp QR no disponible", 502);
    }

    const canal = await estadoRes.json();

    const empresaQrId = Number(canal.empresa_id);
    const whatsappQrId = Number(canal.whatsapp_qr_id);

    if (
      !Number.isSafeInteger(empresaQrId) ||
      empresaQrId <= 0 ||
      empresaQrId !== Number(usuario.empresa_id)
    ) {
      return errorJson(
        "El canal WhatsApp no pertenece a tu empresa",
        403
      );
    }

    if (
      !Number.isSafeInteger(whatsappQrId) ||
      whatsappQrId <= 0
    ) {
      return errorJson("No hay un canal QR activo", 409);
    }

    // 4. Confirmar propiedad del canal en PostgreSQL
    const integracionResult = await pool.query(
      `SELECT id
       FROM integraciones_whatsapp_qr
       WHERE id = $1
         AND empresa_id = $2
       LIMIT 1`,
      [whatsappQrId, empresaQrId]
    );

    if (integracionResult.rowCount === 0) {
      return errorJson(
        "Canal no autorizado para esta empresa",
        403
      );
    }

    // 5. Verificar el token de comunicación interna
    const tokenInterno = process.env.WHATSAPP_QR_INTERNAL_TOKEN;

    if (!tokenInterno || tokenInterno.length < 32) {
      return errorJson(
        "Token interno de WhatsApp no configurado",
        503
      );
    }

    // 6. Solicitar desconexión del canal validado
    const respuesta = await fetch(`${qrUrl}/desconectar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": tokenInterno,
      },
      body: JSON.stringify({
        empresa_id: empresaQrId,
        whatsapp_qr_id: whatsappQrId,
      }),
      cache: "no-store",
    });

    const resultado = await respuesta.json();

    return NextResponse.json(resultado, {
      status: respuesta.status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error desconectando WhatsApp QR:", error);

    return errorJson(
      "No se pudo desconectar WhatsApp QR",
      500
    );
  }
}
