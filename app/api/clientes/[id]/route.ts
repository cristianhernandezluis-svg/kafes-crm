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

    console.log("ID RECIBIDO:", id);
    console.log("BODY RECIBIDO:", body);

    const result = await pool.query(
      `
      UPDATE clientes
      SET
        etapa = $1,
        asesor = COALESCE($2, asesor),
        ciudad = COALESCE($3, ciudad),
        observacion = $4,
        proximo_seguimiento = $5,
        ultima_gestion = $6,
        cantidad_seguimientos = COALESCE(cantidad_seguimientos, 0) + 1
      WHERE id = $7
      RETURNING *
      `,
      [
        body.etapa || "Seguimiento",
        body.asesor ?? null,
        body.ciudad ?? null,
        body.observacion ?? "",
        body.proximo_seguimiento ?? null,
        body.ultima_gestion ?? new Date().toISOString(),
        id,
      ]
    );

    console.log("CLIENTE ACTUALIZADO:", result.rows[0]);

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando cliente:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error actualizando cliente",
      },
      { status: 500 }
    );
  }
}