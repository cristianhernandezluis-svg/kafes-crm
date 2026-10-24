
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type Contexto = {
  params: Promise<{ id: string }>;
};

function respuestaError(mensaje: string, status: number) {
  return NextResponse.json(
    { success: false, error: mensaje },
    { status }
  );
}

async function obtenerAdmin() {
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

function origenValido(request: Request) {
  const origen = request.headers.get("origin");
  const permitido = process.env.APP_URL;

  if (!origen || !permitido) return false;

  try {
    return new URL(origen).origin ===
      new URL(permitido).origin;
  } catch {
    return false;
  }
}

export async function PATCH(
  request: Request,
  contexto: Contexto
) {
  try {
    if (!origenValido(request)) {
      return respuestaError("Origen no autorizado", 403);
    }

    const admin = await obtenerAdmin();
    if (!admin) {
      return respuestaError("Acceso no autorizado", 403);
    }

    const { id } = await contexto.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return respuestaError("Agente inválido", 400);
    }

    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return respuestaError("Datos inválidos", 400);
    }

    const datos = body as Record<string, unknown>;
    const { nombre, modelo, prompt_maestro } = datos;

    if (
      typeof nombre !== "string" ||
      nombre.trim().length < 3 ||
      nombre.length > 120 ||
      typeof modelo !== "string" ||
      !["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"].includes(modelo) ||
      typeof prompt_maestro !== "string" ||
      prompt_maestro.length > 40000
    ) {
      return respuestaError("Datos del agente inválidos", 400);
    }

    const resultado = await pool.query(
      `UPDATE agentes_ia
       SET nombre = $1,
           modelo = $2,
           prompt_maestro = $3,
           actualizado_en = NOW()
       WHERE id = $4::bigint
         AND empresa_id = $5
       RETURNING id, nombre, proveedor, modelo,
                 prompt_maestro, activo, creado_en, actualizado_en`,
      [
        nombre.trim(),
        modelo,
        prompt_maestro,
        id,
        admin.empresa_id,
      ]
    );

    if (resultado.rows.length === 0) {
      return respuestaError("Agente no encontrado", 404);
    }

    return NextResponse.json({
      success: true,
      agente: resultado.rows[0],
    });
  } catch (error) {
    console.error(
      "ERROR EDITAR AGENTE:",
      error instanceof Error ? error.name : "Error"
    );

    return respuestaError("No se pudo editar el agente", 500);
  }
}

export async function DELETE(
  request: Request,
  contexto: Contexto
) {
  try {
    if (!origenValido(request)) {
      return respuestaError("Origen no autorizado", 403);
    }

    const admin = await obtenerAdmin();
    if (!admin) {
      return respuestaError("Acceso no autorizado", 403);
    }

    const { id } = await contexto.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return respuestaError("Agente inválido", 400);
    }

    const resultado = await pool.query(
      `DELETE FROM agentes_ia
       WHERE id = $1::bigint
         AND empresa_id = $2
       RETURNING id`,
      [id, admin.empresa_id]
    );

    if (resultado.rows.length === 0) {
      return respuestaError("Agente no encontrado", 404);
    }

    return NextResponse.json({
      success: true,
      mensaje: "Agente eliminado correctamente",
    });
  } catch (error) {
    console.error(
      "ERROR ELIMINAR AGENTE:",
      error instanceof Error ? error.name : "Error"
    );

    return respuestaError("No se pudo eliminar el agente", 500);
  }
}
