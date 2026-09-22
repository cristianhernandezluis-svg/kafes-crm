import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa_id = searchParams.get("empresa_id");

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: "Falta empresa_id" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT *
      FROM automatizaciones
      WHERE empresa_id = $1
      ORDER BY id DESC
      `,
      [empresa_id]
    );

    return NextResponse.json({
      success: true,
      automatizaciones: result.rows,
    });
  } catch (error) {
    console.error("Error listando automatizaciones:", error);

    return NextResponse.json(
      { success: false, error: "Error listando automatizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await pool.query(
      `
      INSERT INTO automatizaciones (
        empresa_id,
        nombre,
        descripcion,
        trigger_tipo,
        mensaje,
        espera_horas,
        activa
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        body.empresa_id,
        body.nombre,
        body.descripcion || "",
        body.trigger_tipo,
        body.mensaje || "",
        body.espera_horas || 0,
        body.activa ?? true,
      ]
    );

    return NextResponse.json({
      success: true,
      automatizacion: result.rows[0],
    });
  } catch (error) {
    console.error("Error creando automatización:", error);

    return NextResponse.json(
      { success: false, error: "Error creando automatización" },
      { status: 500 }
    );
  }
}