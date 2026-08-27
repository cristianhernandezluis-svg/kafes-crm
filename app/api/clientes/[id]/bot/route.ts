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

    const actual = await pool.query(
      `SELECT id, etapa FROM clientes WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!actual.rows[0]) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const etapa = String(actual.rows[0].etapa || "");
    const esPostventa =
      (etapa.startsWith("Pag") && etapa.includes("Adelanto")) ||
      etapa === "Enviado" ||
      etapa === "Entregado";

    if (!esPostventa) {
      return NextResponse.json(
        { success: false, error: "El cliente aun no esta en postventa" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE clientes
      SET bot_activo = true,
          requiere_closer = false,
          bot_paso = 'postventa'
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR DEVOLVIENDO AL BOT:", error);
    return NextResponse.json(
      { success: false, error: "Error devolviendo conversacion al bot" },
      { status: 500 }
    );
  }
}