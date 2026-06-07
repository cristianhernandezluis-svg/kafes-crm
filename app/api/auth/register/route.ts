import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nombre,
      empresa,
      email,
      password,
    } = body;

    const existe = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Correo ya registrado",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const empresaCreada = await pool.query(
      `
      INSERT INTO empresas(nombre)
      VALUES($1)
      RETURNING *
      `,
      [empresa]
    );

    const empresaId =
      empresaCreada.rows[0].id;

    const usuario = await pool.query(
      `
      INSERT INTO usuarios
      (
        empresa_id,
        nombre,
        email,
        password,
        rol
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        'admin'
      )
      RETURNING *
      `,
      [
        empresaId,
        nombre,
        email,
        passwordHash,
      ]
    );

    return NextResponse.json({
      success: true,
      usuario: usuario.rows[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      error: "Error interno",
    });
  }
}