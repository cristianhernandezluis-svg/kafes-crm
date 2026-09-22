import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const result = await pool.query(
      `
      UPDATE automatizaciones
      SET activa = $1
      WHERE id = $2
      RETURNING *
      `,
      [body.activa, id]
    );

    return NextResponse.json({
      success: true,
      automatizacion: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando automatización:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error actualizando automatización",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await pool.query(
      `
      DELETE FROM automatizaciones
      WHERE id = $1
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error eliminando automatización:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error eliminando automatización",
      },
      { status: 500 }
    );
  }
}