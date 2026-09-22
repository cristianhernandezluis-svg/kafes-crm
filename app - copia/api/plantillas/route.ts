import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");

    const result = await pool.query(
      `
      SELECT *
      FROM plantillas_whatsapp
      WHERE empresa_id = $1
      ORDER BY created_at DESC
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      plantillas: result.rows,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        plantillas: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      empresa_id,
      nombre,
      mensaje,
    } = body;

    const result = await pool.query(
      `
      INSERT INTO plantillas_whatsapp (
        empresa_id,
        nombre,
        mensaje
      )
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [empresa_id, nombre, mensaje]
    );

    return NextResponse.json({
      success: true,
      plantilla: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}