import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");

    if (!empresaId) {
      return NextResponse.json({
        success: false,
        usuarios: [],
        error: "empresa_id es obligatorio",
      });
    }

    const result = await pool.query(
      `
      SELECT id, empresa_id, nombre, email, rol, proveedor, created_at
      FROM usuarios
      WHERE empresa_id = $1
      ORDER BY created_at DESC
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      usuarios: result.rows,
    });
  } catch (error) {
    console.error("ERROR LISTANDO USUARIOS:", error);

    return NextResponse.json(
      { success: false, usuarios: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { empresa_id, nombre, email, password, rol = "asesor" } = body;

    if (!empresa_id || !nombre || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Este correo ya está registrado" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO usuarios (
        empresa_id,
        nombre,
        email,
        password,
        rol,
        proveedor
      )
      VALUES ($1, $2, $3, $4, $5, 'email')
      RETURNING id, empresa_id, nombre, email, rol, proveedor, created_at
      `,
      [empresa_id, nombre, email, passwordHash, rol]
    );

    return NextResponse.json({
      success: true,
      usuario: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR CREANDO USUARIO:", error);

    return NextResponse.json(
      { success: false, error: "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}