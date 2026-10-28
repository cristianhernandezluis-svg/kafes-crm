
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

async function autorizarUsuario(soloAdmin = false) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return { error: errorJson("No autorizado", 401) };
  }

  const usuarioResult = await pool.query(
    `SELECT id, empresa_id, rol
     FROM usuarios
     WHERE id = $1
       AND empresa_id = $2
     LIMIT 1`,
    [sesion.id, sesion.empresa_id]
  );

  if (usuarioResult.rowCount === 0) {
    return { error: errorJson("Acceso denegado", 403) };
  }

  const usuario = usuarioResult.rows[0];

  if (!["admin", "asesor"].includes(usuario.rol)) {
    return { error: errorJson("Rol no autorizado", 403) };
  }

  if (soloAdmin && usuario.rol !== "admin") {
    return {
      error: errorJson(
        "Solo el administrador puede realizar esta accion",
        403
      ),
    };
  }

  return {
    empresaId: Number(usuario.empresa_id),
  };
}

async function verificarCanal(empresaId: number) {
  // El servidor QR informa qué canal controla actualmente.
  const respuesta = await fetch(`${qrUrl}/qr`, {
    headers: { "x-internal-token": process.env.WHATSAPP_QR_INTERNAL_TOKEN || "" },
    cache: "no-store",
  });

  if (!respuesta.ok) {
    return { error: errorJson("Servidor QR no disponible", 502) };
  }

  const canal = await respuesta.json();

  const canalId = Number(canal.whatsapp_qr_id);
  const empresaQrId = Number(canal.empresa_id);

  if (
    !Number.isSafeInteger(empresaQrId) ||
    empresaQrId <= 0 ||
    empresaQrId !== empresaId
  ) {
    return {
      error: errorJson("Canal no autorizado para esta empresa", 403),
    };
  }

  if (
    !Number.isSafeInteger(canalId) ||
    canalId <= 0
  ) {
    return {
      error: errorJson("No hay un canal QR activo", 409),
    };
  }

  // Comprobar la propiedad del canal directamente en PostgreSQL.
  const integracion = await pool.query(
    `SELECT id
     FROM integraciones_whatsapp_qr
     WHERE id = $1
       AND empresa_id = $2
     LIMIT 1`,
    [canalId, empresaId]
  );

  if (integracion.rowCount === 0) {
    return {
      error: errorJson("Canal no encontrado para esta empresa", 403),
    };
  }

  return { canal };
}

// Consultar estado y codigo QR
export async function GET() {
  try {
    const acceso = await autorizarUsuario();

    if (acceso.error) return acceso.error;

    const verificacion = await verificarCanal(
      acceso.empresaId!
    );

    if (verificacion.error) return verificacion.error;

    return NextResponse.json(verificacion.canal, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error consultando WhatsApp QR:", error);
    return errorJson("No se pudo consultar WhatsApp QR", 500);
  }
}

// Cambiar producto o flujo principal
export async function PATCH(request: Request) {
  try {
    const acceso = await autorizarUsuario(true);

    if (acceso.error) return acceso.error;

    const verificacion = await verificarCanal(
      acceso.empresaId!
    );

    if (verificacion.error) return verificacion.error;

    const token = process.env.WHATSAPP_QR_INTERNAL_TOKEN;

    if (!token || token.length < 32) {
      return errorJson("Token interno no configurado", 503);
    }

    const body = await request.json();

    const esFlujoPrincipal =
      body?.flujo_principal_id !== undefined;

    let datos: Record<string, string | number>;

    if (esFlujoPrincipal) {
      const flujoId = Number(body.flujo_principal_id);

      if (
        !Number.isSafeInteger(flujoId) ||
        flujoId <= 0
      ) {
        return errorJson("Flujo principal invalido", 400);
      }

      datos = { flujo_principal_id: flujoId };
    } else {
      const productoSlug = body?.producto_slug;

      if (
        typeof productoSlug !== "string" ||
        !productoSlug.trim()
      ) {
        return errorJson("Producto principal invalido", 400);
      }

      datos = { producto_slug: productoSlug.trim() };
    }

    const respuesta = await fetch(
      esFlujoPrincipal
        ? `${qrUrl}/flujo-principal`
        : `${qrUrl}/producto-principal`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": token,
        },
        body: JSON.stringify({ ...datos, empresa_id: acceso.empresaId, whatsapp_qr_id: Number(verificacion.canal!.whatsapp_qr_id) }),
        cache: "no-store",
      }
    );

    const resultado = await respuesta.json();

    return NextResponse.json(resultado, {
      status: respuesta.status,
    });
  } catch (error) {
    console.error("Error actualizando WhatsApp QR:", error);
    return errorJson("No se pudo actualizar WhatsApp QR", 500);
  }
}

// Sincronizar contactos
export async function POST() {
  try {
    const acceso = await autorizarUsuario(true);

    if (acceso.error) return acceso.error;

    const verificacion = await verificarCanal(
      acceso.empresaId!
    );

    if (verificacion.error) return verificacion.error;

    const token = process.env.WHATSAPP_QR_INTERNAL_TOKEN;

    if (!token || token.length < 32) {
      return errorJson("Token interno no configurado", 503);
    }

    const respuesta = await fetch(
      `${qrUrl}/sync-contacts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-token": token },
        body: JSON.stringify({ empresa_id: acceso.empresaId, whatsapp_qr_id: Number(verificacion.canal!.whatsapp_qr_id) }),
        cache: "no-store",
      }
    );

    const resultado = await respuesta.json();

    return NextResponse.json(resultado, {
      status: respuesta.status,
    });
  } catch (error) {
    console.error("Error sincronizando WhatsApp QR:", error);
    return errorJson("No se pudieron sincronizar contactos", 500);
  }
}
