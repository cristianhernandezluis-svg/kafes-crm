import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function prepararColumnas() {
  await pool.query(`
    ALTER TABLE conversaciones
    ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT false;
  `);
}

export async function GET() {
  try {
    await prepararColumnas();

    const result = await pool.query(`
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.ciudad,
        c.etapa,
        c.asesor,
        c.created_at,

        ult.mensaje AS ultimo_mensaje,
        ult.tipo AS ultimo_tipo,
        ult.created_at AS ultimo_mensaje_fecha,

        COALESCE(no_leidos.total, 0) AS no_leidos

      FROM clientes c

      LEFT JOIN LATERAL (
        SELECT mensaje, tipo, created_at
        FROM conversaciones
        WHERE cliente_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ult ON true

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM conversaciones
        WHERE cliente_id = c.id
          AND remitente = 'cliente'
          AND COALESCE(leido, false) = false
      ) no_leidos ON true

      ORDER BY
        ult.created_at DESC NULLS LAST,
        c.created_at DESC;
    `);

    return NextResponse.json({
      success: true,
      chats: result.rows,
    });
  } catch (error) {
    console.error("ERROR API CHATS:", error);
    return NextResponse.json(
      { success: false, chats: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await prepararColumnas();

    const { cliente_id } = await req.json();

    if (!cliente_id) {
      return NextResponse.json(
        { success: false, error: "Falta cliente_id" },
        { status: 400 }
      );
    }

    await pool.query(
      `
      UPDATE conversaciones
      SET leido = true
      WHERE cliente_id = $1
        AND remitente = 'cliente'
      `,
      [cliente_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR MARCANDO CHAT LEIDO:", error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}