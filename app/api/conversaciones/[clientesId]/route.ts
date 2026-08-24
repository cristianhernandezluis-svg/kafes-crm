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

    const { searchParams } = new URL(request.url);
    const whatsappQrId = searchParams.get("whatsapp_qr_id");

    if (!whatsappQrId) return NextResponse.json({ success: true, conversaciones: [] });

    const result = await pool.query(
      `
      SELECT
        id,
        cliente_id,
        telefono,
        mensaje,
        tipo,
        remitente,
        created_at,
        media_id,
        mime_type,
        filename
      FROM conversaciones
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      ORDER BY created_at ASC
      `,
      [clientesId, whatsappQrId]
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