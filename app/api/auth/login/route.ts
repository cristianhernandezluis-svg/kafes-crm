import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const result = await pool.query(
      `
      SELECT id, empresa_id, nombre, email, password, rol
      FROM usuarios
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Correo no registrado",
      });
    }

    const usuario = result.rows[0];

    const passwordCorrecta = await bcrypt.compare(password, usuario.password);

    if (!passwordCorrecta) {
      return NextResponse.json({
        success: false,
        error: "Contraseña incorrecta",
      });
    }

    delete usuario.password;

    return NextResponse.json({
      success: true,
      usuario,
    });
  } catch (error) {
    console.error("ERROR LOGIN:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}