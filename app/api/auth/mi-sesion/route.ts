import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "Sin sesión" },
        { status: 401 }
      );
    }

    const resultado = await pool.query(
      `SELECT u.id, u.empresa_id, u.rol, e.nombre AS empresa
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1 AND u.empresa_id = $2
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (!resultado.rows.length) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      usuario: resultado.rows[0],
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}