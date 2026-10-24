
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

function error(mensaje: string, status: number) {
  return NextResponse.json(
    { success: false, error: mensaje },
    { status }
  );
}

function origenValido(request: Request) {
  const origen = request.headers.get("origin");
  const permitido = process.env.APP_URL;

  if (!origen || !permitido) return false;

  try {
    return new URL(origen).origin === new URL(permitido).origin;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const admin = await obtenerAdmin();
    if (!admin) return error("Acceso no autorizado", 403);

    const resultado = await pool.query(
      `SELECT id, nombre, proveedor, modelo,
              prompt_maestro, activo,
              creado_en, actualizado_en
       FROM agentes_ia
       WHERE empresa_id = $1
       ORDER BY actualizado_en DESC
       LIMIT 100`,
      [admin.empresa_id]
    );

    return NextResponse.json({
      success: true,
      agentes: resultado.rows,
    });
  } catch (e) {
    console.error(
      "ERROR LISTAR AGENTES:",
      e instanceof Error ? e.name : "Error"
    );
    return error("No se pudieron cargar los agentes", 500);
  }
}

export async function POST(request: Request) {
  try {
    if (!origenValido(request)) {
      return error("Origen no autorizado", 403);
    }

    const admin = await obtenerAdmin();
    if (!admin) return error("Acceso no autorizado", 403);

    if (
      !(request.headers.get("content-type") || "")
        .toLowerCase()
        .includes("application/json")
    ) {
      return error("Se requiere JSON", 415);
    }

    const longitud = Number(
      request.headers.get("content-length") || 0
    );
    if (longitud > 65536) {
      return error("Solicitud demasiado grande", 413);
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return error("Datos inválidos", 400);
    }

    const nombre = body.nombre;
    const prompt = body.prompt_maestro;
    const modelo = body.modelo;

    if (
      typeof nombre !== "string" ||
      nombre.trim().length < 3 ||
      nombre.length > 120 ||
      typeof prompt !== "string" ||
      prompt.length > 40000 ||
      typeof modelo !== "string" ||
      !["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"].includes(modelo)
    ) {
      return error("Revisa el nombre, el modelo y el prompt", 400);
    }

    const resultado = await pool.query(
      `INSERT INTO agentes_ia
         (empresa_id, nombre, proveedor, modelo, prompt_maestro, activo)
       VALUES ($1, $2, 'openai', $3, $4, FALSE)
       RETURNING id, nombre, proveedor, modelo,
                 prompt_maestro, activo, creado_en, actualizado_en`,
      [admin.empresa_id, nombre.trim(), modelo, prompt]
    );

    return NextResponse.json(
      { success: true, agente: resultado.rows[0] },
      { status: 201 }
    );
  } catch (e) {
    console.error(
      "ERROR CREAR AGENTE:",
      e instanceof Error ? e.name : "Error"
    );
    return error("No se pudo crear el agente", 500);
  }
}
