
import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  const db = await pool.connect();

  try {
    const body = await request.json();

    const nombre = String(body.nombre || "").trim();
    const empresa = String(body.empresa || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = body.password;

    if (
      !nombre ||
      !empresa ||
      !email ||
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 72
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Completa los datos y usa una contraseña de 12 a 72 caracteres.",
        },
        { status: 400 }
      );
    }

    if (
      nombre.length > 150 ||
      empresa.length > 150 ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { success: false, error: "Datos de registro inválidos" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.query("BEGIN");

    const existe = await db.query(
      "SELECT id FROM usuarios WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );

    if (existe.rows.length > 0) {
      await db.query("ROLLBACK");

      return NextResponse.json(
        { success: false, error: "Correo ya registrado" },
        { status: 409 }
      );
    }

    const empresaCreada = await db.query(
      "INSERT INTO empresas (nombre) VALUES ($1) RETURNING id",
      [empresa]
    );

    const empresaId = empresaCreada.rows[0].id;

    const usuario = await db.query(
      `INSERT INTO usuarios
       (empresa_id, nombre, email, password, rol)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, empresa_id, nombre, email, rol`,
      [empresaId, nombre, email, passwordHash]
    );

    await db.query("COMMIT");

    return NextResponse.json(
      { success: true, usuario: usuario.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});

    console.error("ERROR REGISTRO:", error);

    return NextResponse.json(
      { success: false, error: "No se pudo completar el registro" },
      { status: 500 }
    );
  } finally {
    db.release();
  }
}
