
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
import { cifrarToken } from "@/lib/crypto";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PROVEEDOR = "openai";

function respuestaError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

async function obtenerAdministrador() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;

  const resultado = await pool.query(
    `SELECT id, empresa_id
     FROM usuarios
     WHERE id = $1
       AND empresa_id = $2
       AND rol = 'admin'
     LIMIT 1`,
    [sesion.id, sesion.empresa_id]
  );

  return resultado.rows[0] || null;
}

function origenAutorizado(request: Request) {
  const origen = request.headers.get("origin");
  const dominio = process.env.APP_URL;

  if (!origen || !dominio) return false;

  try {
    return new URL(origen).origin ===
      new URL(dominio).origin;
  } catch {
    return false;
  }
}

// Consultar el estado sin mostrar la API Key.
export async function GET() {
  try {
    const admin = await obtenerAdministrador();

    if (!admin) {
      return respuestaError("Acceso no autorizado", 403);
    }

    const resultado = await pool.query(
      `SELECT estado, actualizado_en,
        respuesta_automatica, transcribir_audio
 FROM integraciones_ia
 WHERE empresa_id = $1
   AND proveedor = $2
 LIMIT 1`,
      [admin.empresa_id, PROVEEDOR]
    );

    return NextResponse.json({
  success: true,
  conectado: resultado.rows[0]?.estado === "activo",
  respuesta_automatica: resultado.rows[0]?.respuesta_automatica === true,
  transcribir_audio: resultado.rows[0]?.transcribir_audio === true,
  actualizado_en: resultado.rows[0]?.actualizado_en || null,
});
  } catch (error) {
    console.error(
      "ERROR ESTADO OPENAI:",
      error instanceof Error ? error.name : "Error"
    );

    return respuestaError("Error al consultar OpenAI", 500);
  }
}

// Validar y guardar una API Key cifrada.
export async function POST(request: Request) {
  try {
    if (!origenAutorizado(request)) {
      return respuestaError("Origen no autorizado", 403);
    }

    const admin = await obtenerAdministrador();

    if (!admin) {
      return respuestaError("Acceso no autorizado", 403);
    }

    const tipo = request.headers.get("content-type") || "";

    if (!tipo.toLowerCase().includes("application/json")) {
      return respuestaError("Se requiere JSON", 415);
    }

    const longitud = Number(
      request.headers.get("content-length") || 0
    );

    if (longitud > 8192) {
      return respuestaError("Solicitud demasiado grande", 413);
    }

    const body = await request.json().catch(() => null);
    const apiKey = body?.api_key;

    if (
      typeof apiKey !== "string" ||
      apiKey.length < 20 ||
      apiKey.length > 512 ||
      !apiKey.startsWith("sk-") ||
      apiKey !== apiKey.trim()
    ) {
      return respuestaError("API Key inválida", 400);
    }

    // Comprobar la credencial directamente con OpenAI.
    const verificacion = await fetch(
      "https://api.openai.com/v1/models",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!verificacion.ok) {
      if (verificacion.status === 401) {
        return respuestaError(
          "OpenAI rechazó la API Key",
          400
        );
      }

      return respuestaError(
        "No se pudo verificar el acceso a OpenAI. " +
        "Comprueba los permisos de la clave.",
        502
      );
    }

    const cifrada = cifrarToken(apiKey);

    await pool.query(
      `INSERT INTO integraciones_ia
         (empresa_id, proveedor, api_key_cifrada, estado)
       VALUES ($1, $2, $3, 'activo')
       ON CONFLICT (empresa_id, proveedor)
       DO UPDATE SET
         api_key_cifrada = EXCLUDED.api_key_cifrada,
         estado = 'activo',
         actualizado_en = NOW()`,
      [admin.empresa_id, PROVEEDOR, cifrada]
    );

    return NextResponse.json({
      success: true,
      conectado: true,
      mensaje: "OpenAI conectado correctamente",
    });
  } catch (error) {
    console.error(
      "ERROR CONECTAR OPENAI:",
      error instanceof Error ? error.name : "Error"
    );

    return respuestaError(
      "No se pudo completar la conexión",
      500
    );
  }
}

// Desconectar y eliminar la credencial.
export async function DELETE(request: Request) {
  try {
    if (!origenAutorizado(request)) {
      return respuestaError("Origen no autorizado", 403);
    }

    const admin = await obtenerAdministrador();

    if (!admin) {
      return respuestaError("Acceso no autorizado", 403);
    }

    await pool.query(
      `DELETE FROM integraciones_ia
       WHERE empresa_id = $1
         AND proveedor = $2`,
      [admin.empresa_id, PROVEEDOR]
    );

    return NextResponse.json({
      success: true,
      conectado: false,
      mensaje: "OpenAI desconectado",
    });
  } catch (error) {
    console.error(
      "ERROR DESCONECTAR OPENAI:",
      error instanceof Error ? error.name : "Error"
    );

    return respuestaError(
      "No se pudo desconectar OpenAI",
      500
    );
  }
}


export async function PATCH(request: Request) {
  try {
    if (!origenAutorizado(request)) {
      return respuestaError("Origen no autorizado", 403);
    }

    const admin = await obtenerAdministrador();

    if (!admin) {
      return respuestaError("Acceso no autorizado", 403);
    }

    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respuestaError("Datos inválidos", 400);
    }

    const datos = body as Record<string, unknown>;
    const campo = datos.campo;
    const valor = datos.valor;

    if (
      (campo !== "respuesta_automatica" &&
       campo !== "transcribir_audio") ||
      typeof valor !== "boolean"
    ) {
      return respuestaError("Configuración inválida", 400);
    }

    const resultado = await pool.query(
      `UPDATE integraciones_ia
       SET
         respuesta_automatica = CASE
           WHEN $2 = 'respuesta_automatica'
           THEN $3::boolean
           ELSE respuesta_automatica
         END,
         transcribir_audio = CASE
           WHEN $2 = 'transcribir_audio'
           THEN $3::boolean
           ELSE transcribir_audio
         END,
         actualizado_en = NOW()
       WHERE empresa_id = $1
         AND proveedor = 'openai'
         AND estado = 'activo'
       RETURNING respuesta_automatica, transcribir_audio`,
      [admin.empresa_id, campo, valor]
    );

    if (resultado.rows.length === 0) {
      return respuestaError(
        "Primero debes conectar OpenAI",
        409
      );
    }

    return NextResponse.json({
      success: true,
      configuracion: resultado.rows[0],
    });
  } catch (error) {
    console.error(
      "ERROR CONFIGURACIÓN IA:",
      error instanceof Error ? error.name : "Error"
    );

    return respuestaError(
      "No se pudo guardar la configuración",
      500
    );
  }
}
