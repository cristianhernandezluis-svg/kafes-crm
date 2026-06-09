import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.nombre,
        e.plan,
        e.estado,
        e.created_at,
        COUNT(u.id)::int AS usuarios
      FROM empresas e
      LEFT JOIN usuarios u ON u.empresa_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      empresas: result.rows,
    });
  } catch (error) {
    console.error("ERROR ADMIN EMPRESAS:", error);
    return NextResponse.json(
      { success: false, empresas: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { empresa_id, plan, estado } = body;

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: "empresa_id obligatorio" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE empresas
      SET
        plan = COALESCE($1, plan),
        estado = COALESCE($2, estado)
      WHERE id = $3
      RETURNING *
      `,
      [plan || null, estado || null, empresa_id]
    );

    return NextResponse.json({
      success: true,
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO EMPRESA:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo actualizar empresa" },
      { status: 500 }
    );
  }
}