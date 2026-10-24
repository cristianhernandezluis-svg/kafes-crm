
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { obtenerSesion } from "@/lib/auth";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    // Comprobar que la petición proviene del CRM.
    const origin = request.headers.get("origin");
const expectedOrigin = process.env.APP_URL
  ? new URL(process.env.APP_URL).origin
  : new URL(request.url).origin;

    if (!origin || origin !== expectedOrigin) {
      return NextResponse.json(
        { success: false, error: "Origen no autorizado" },
        { status: 403 }
      );
    }

    // Verificar la sesión firmada.
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión" },
        { status: 401 }
      );
    }

    // Confirmar que sigue siendo administrador.
    const result = await pool.query(
      `SELECT id, empresa_id, rol
       FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
         AND rol = 'admin'
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Permisos insuficientes" },
        { status: 403 }
      );
    }

    // Crear el identificador en el servidor.
    const intentoId = randomUUID();

    await pool.query(
      `INSERT INTO whatsapp_intentos_meta
       (id, usuario_id, empresa_id)
       VALUES ($1, $2, $3)`,
      [intentoId, sesion.id, sesion.empresa_id]
    );

    return NextResponse.json({
      success: true,
      intento_id: intentoId,
      expires_in: 600,
    });
  } catch (error) {
    console.error(
      "ERROR INTENTO META:",
      error instanceof Error ? error.name : "Error"
    );

    return NextResponse.json(
      { success: false, error: "No se pudo iniciar el registro" },
      { status: 500 }
    );
  }
}
