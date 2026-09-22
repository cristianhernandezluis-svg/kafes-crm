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
      return NextResponse.json({ success: false, error: "empresa_id obligatorio" });
    }

    const result = await pool.query(
      `
      SELECT id, empresa_id, phone_number_id, waba_id, verify_token, estado, created_at
      FROM integraciones_whatsapp
      WHERE empresa_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      integracion: result.rows[0] || null,
    });
  } catch (error) {
    console.error("ERROR GET WHATSAPP CONFIG:", error);
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      empresa_id,
      phone_number_id,
      waba_id,
      token,
      verify_token,
    } = body;

    if (!empresa_id || !phone_number_id || !token) {
      return NextResponse.json(
        { success: false, error: "empresa_id, phone_number_id y token son obligatorios" },
        { status: 400 }
      );
    }

    await pool.query(
      `
      DELETE FROM integraciones_whatsapp
      WHERE empresa_id = $1
      `,
      [empresa_id]
    );

    const result = await pool.query(
      `
      INSERT INTO integraciones_whatsapp (
        empresa_id,
        phone_number_id,
        waba_id,
        token,
        verify_token,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, 'activo')
      RETURNING id, empresa_id, phone_number_id, waba_id, verify_token, estado, created_at
      `,
      [empresa_id, phone_number_id, waba_id, token, verify_token]
    );

    return NextResponse.json({
      success: true,
      integracion: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR GUARDANDO WHATSAPP CONFIG:", error);
    return NextResponse.json({ success: false, error: "No se pudo guardar" }, { status: 500 });
  }
}