import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function prepararColumnasClientes() {
  await pool.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS observacion TEXT;
  `);

  await pool.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS proximo_seguimiento TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS ultima_gestion TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS cantidad_seguimientos INTEGER DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS empresa_id INTEGER REFERENCES empresas(id);
  `);
}

export async function GET(request: Request) {
  try {
    await prepararColumnasClientes();

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");

    if (!empresaId) {
      return NextResponse.json({
        success: false,
        clientes: [],
        error: "empresa_id es obligatorio",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        empresa_id,
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
        observacion,
        proximo_seguimiento,
        ultima_gestion,
        cantidad_seguimientos,
        created_at
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY created_at DESC;
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      clientes: result.rows,
    });
  } catch (error) {
    console.error("ERROR API CLIENTES:", error);

    return NextResponse.json(
      { success: false, clientes: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await prepararColumnasClientes();

    const body = await request.json();

    const {
      empresa_id,
      nombre,
      telefono,
      ciudad,
      etapa = "Nuevo",
      asesor = null,
      observacion = null,
      proximo_seguimiento = null,
    } = body;

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: "empresa_id es obligatorio" },
        { status: 400 }
      );
    }

    let telefonoLimpio = telefono.replace(/\D/g, "");

    if (!telefonoLimpio.startsWith("51")) {
      telefonoLimpio = `51${telefonoLimpio}`;
    }

    const result = await pool.query(
      `
      INSERT INTO clientes (
        empresa_id,
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
        observacion,
        proximo_seguimiento
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        empresa_id,
        nombre,
        telefonoLimpio,
        ciudad,
        etapa,
        asesor,
        observacion,
        proximo_seguimiento,
      ]
    );

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR CREANDO CLIENTE:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo crear el cliente",
      },
      { status: 500 }
    );
  }
}