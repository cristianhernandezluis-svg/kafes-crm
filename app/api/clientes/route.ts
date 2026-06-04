import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
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
    const body = await request.json();

    const {
      nombre,
      telefono,
      ciudad,
      etapa = "Nuevo",
      asesor = null,
    } = body;

    const result = await pool.query(
      `
      INSERT INTO clientes (
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
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