import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await pool.query(
      `
      INSERT INTO actividades (
        empresa_id,
        cliente_id,
        asesor,
        tipo,
        descripcion
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        body.empresa_id,
        body.cliente_id,
        body.asesor,
        body.tipo,
        body.descripcion || "",
      ]
    );

    return NextResponse.json({
      success: true,
      actividad: result.rows[0],
    });
  } catch (error) {
    console.error("Error guardando actividad:", error);

    return NextResponse.json(
      { success: false, error: "Error guardando actividad" },
      { status: 500 }
    );
  }
}