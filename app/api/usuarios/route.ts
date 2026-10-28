import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const usuarioResult = await pool.query(
      `SELECT id, rol
       FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (usuarioResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Usuario no autorizado" },
        { status: 403 }
      );
    }

    if (usuarioResult.rows[0].rol !== "admin") {
      return NextResponse.json(
        { success: false, error: "Solo administradores" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empresaIdSolicitada = searchParams.get("empresa_id");

    if (
      empresaIdSolicitada !== null &&
      Number(empresaIdSolicitada) !== sesion.empresa_id
    ) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado a esta empresa" },
        { status: 403 }
      );
    }

    const empresaId = sesion.empresa_id;

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
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const usuarioResult = await pool.query(
      `SELECT id, rol
       FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (usuarioResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Usuario no autorizado" },
        { status: 403 }
      );
    }

    if (usuarioResult.rows[0].rol !== "admin") {
      return NextResponse.json(
        { success: false, error: "Solo administradores" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      nombre,
      email,
      password,
      rol = "asesor",
    } = body;

    if (
      body.empresa_id != null &&
      Number(body.empresa_id) !== sesion.empresa_id
    ) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado a esta empresa" },
        { status: 403 }
      );
    }

    // Por seguridad, desde esta API solo se crean asesores.
    if (rol !== "asesor") {
      return NextResponse.json(
        { success: false, error: "Rol no permitido" },
        { status: 403 }
      );
    }

    if (!nombre || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    const empresa_id = sesion.empresa_id;

    const empresaResult = await pool.query(
      "SELECT plan FROM empresas WHERE id = $1",
      [empresa_id]
    );

    const plan = empresaResult.rows[0]?.plan || "gratis";

    const limites: Record<string, number> = {
      gratis: 1,
      pro: 5,
      empresa: 999,
    };

    const totalUsuarios = await pool.query(
      "SELECT COUNT(*)::int AS total FROM usuarios WHERE empresa_id = $1",
      [empresa_id]
    );

    if (totalUsuarios.rows[0].total >= (limites[plan] || limites.gratis)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tu plan ${plan} permite máximo ${
            limites[plan] || limites.gratis
          } usuario(s).`,
        },
        { status: 403 }
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