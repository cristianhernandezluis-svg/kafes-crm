
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function administradorAutorizado() {
  const sesion = await obtenerSesion();

  if (!sesion) return null;

  const result = await pool.query(
    `SELECT id, empresa_id, rol
     FROM usuarios
     WHERE id = $1 AND empresa_id = $2
     LIMIT 1`,
    [sesion.id, sesion.empresa_id]
  );

  const usuario = result.rows[0];

  if (!usuario || usuario.rol !== "admin") {
    return null;
  }

  return usuario;
}

export async function GET() {
  try {
    const usuario = await administradorAutorizado();

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: "Acceso no autorizado" },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `SELECT id, empresa_id, phone_number_id,
              waba_id, estado, created_at
       FROM integraciones_whatsapp
       WHERE empresa_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [usuario.empresa_id]
    );

    return NextResponse.json({
      success: true,
      integracion: result.rows[0] || null,
    });
  } catch (error) {
    console.error("ERROR CONFIG WHATSAPP:", error);

    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "La conexión manual está deshabilitada. Utiliza el registro oficial de Meta cuando esté habilitado.",
    },
    { status: 403 }
  );
}
