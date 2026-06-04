import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ clientesId: string }> }
) {
  try {
    const { clientesId } = await context.params;

    const result = await pool.query(
      `
      SELECT
        id,
        cliente_id,
        telefono,
        mensaje,
        tipo,
        remitente,
        created_at
      FROM conversaciones
      WHERE cliente_id = $1
      ORDER BY created_at ASC
      `,
      [clientesId]
    );

    return NextResponse.json({
      success: true,
      conversaciones: result.rows,
    });
  } catch (error) {
    console.error("ERROR API CONVERSACIONES:", error);

    return NextResponse.json(
      { success: false, conversaciones: [] },
      { status: 500 }
    );
  }
}