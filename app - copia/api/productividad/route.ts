import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");

    if (!empresaId) {
      return NextResponse.json(
        { success: false, error: "empresa_id obligatorio" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        COALESCE(asesor, 'Sin asesor') AS asesor,
        COUNT(*)::int AS clientes,
        COUNT(*) FILTER (WHERE etapa = 'Seguimiento')::int AS seguimientos,
        COUNT(*) FILTER (WHERE etapa = 'Pendiente Adelanto')::int AS pendientes_adelanto,
        COUNT(*) FILTER (WHERE etapa = 'Pagó Adelanto')::int AS adelantos,
        COUNT(*) FILTER (WHERE etapa = 'Enviado')::int AS enviados,
        COUNT(*) FILTER (WHERE etapa = 'Entregado')::int AS entregados,
        COUNT(*) FILTER (WHERE etapa = 'No Responde')::int AS no_responde
      FROM clientes
      WHERE empresa_id = $1
      GROUP BY asesor
      ORDER BY clientes DESC
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      productividad: result.rows,
    });
  } catch (error) {
    console.error("ERROR PRODUCTIVIDAD:", error);

    return NextResponse.json(
      {
        success: false,
        productividad: [],
      },
      { status: 500 }
    );
  }
}