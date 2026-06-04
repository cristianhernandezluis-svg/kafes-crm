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
}

export async function GET() {
  try {
    await prepararColumnasClientes();

    const result = await pool.query(`
      SELECT
        id,
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
      ORDER BY created_at DESC;
    `);

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
      nombre,
      telefono,
      ciudad,
      etapa = "Nuevo",
      asesor = null,
      observacion = null,
      proximo_seguimiento = null,
    } = body;

    const result = await pool.query(
      `
      INSERT INTO clientes (
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
        observacion,
        proximo_seguimiento
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        nombre,
        telefono,
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