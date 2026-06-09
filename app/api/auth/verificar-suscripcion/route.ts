import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: Request) {
  try {
    const { empresa_id } = await request.json();

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: "empresa_id obligatorio" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT estado, fecha_vencimiento
      FROM empresas
      WHERE id = $1
      LIMIT 1
      `,
      [empresa_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, activa: false },
        { status: 404 }
      );
    }

    const empresa = result.rows[0];

    if (empresa.estado !== "activo") {
      return NextResponse.json({
        success: true,
        activa: false,
        motivo: "suspendido",
      });
    }

    if (empresa.fecha_vencimiento) {
      const hoy = new Date();
      const vencimiento = new Date(empresa.fecha_vencimiento);

      if (vencimiento < hoy) {
        return NextResponse.json({
          success: true,
          activa: false,
          motivo: "vencido",
        });
      }
    }

    return NextResponse.json({
      success: true,
      activa: true,
    });
  } catch (error) {
    console.error("ERROR VERIFICANDO SUSCRIPCION:", error);

    return NextResponse.json(
      { success: false, activa: false },
      { status: 500 }
    );
  }
}