import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { etapa, asesor, ciudad } = body;

    const result = await pool.query(
      `
      UPDATE clientes
      SET
        etapa = COALESCE($1, etapa),
        asesor = COALESCE($2, asesor),
        ciudad = COALESCE($3, ciudad)
      WHERE id = $4
      RETURNING *
      `,
      [etapa, asesor, ciudad, id]
    );

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando cliente:", error);

    return NextResponse.json(
      { success: false, error: "Error actualizando cliente" },
      { status: 500 }
    );
  }
}