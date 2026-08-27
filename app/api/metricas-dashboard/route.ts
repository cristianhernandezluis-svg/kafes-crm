import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");
    const whatsappQrId = searchParams.get("whatsapp_qr_id");

    if (!empresaId || !whatsappQrId) {
      return NextResponse.json(
        {
          success: false,
          error: "empresa_id y whatsapp_qr_id son obligatorios",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      WITH fechas AS (
        SELECT (NOW() AT TIME ZONE 'America/Lima')::date AS hoy
      ),
      conversaciones_metricas AS (
        SELECT
          COUNT(DISTINCT c.cliente_id) FILTER (
            WHERE
              c.remitente = 'cliente'
              AND (
                c.created_at
                AT TIME ZONE 'UTC'
                AT TIME ZONE 'America/Lima'
              )::date = f.hoy
          )::int AS conversaciones_hoy,

          COUNT(DISTINCT c.cliente_id) FILTER (
            WHERE
              c.remitente = 'cliente'
              AND (
                c.created_at
                AT TIME ZONE 'UTC'
                AT TIME ZONE 'America/Lima'
              )::date = f.hoy - 1
          )::int AS conversaciones_ayer
        FROM conversaciones c
        CROSS JOIN fechas f
        WHERE c.empresa_id = $1
          AND c.whatsapp_qr_id = $2
      ),
      cierres_metricas AS (
        SELECT
          COUNT(DISTINCT h.cliente_id) FILTER (
            WHERE
              h.etapa_nueva = 'PagÃ³ Adelanto'
              AND h.es_baseline = false
              AND (h.created_at AT TIME ZONE 'America/Lima')::date = f.hoy
              AND EXISTS (
                SELECT 1
                FROM clientes_whatsapp_qr rel
                WHERE rel.empresa_id = h.empresa_id
                  AND rel.cliente_id = h.cliente_id
                  AND rel.whatsapp_qr_id = $2
              )
          )::int AS cierres_hoy,

          COUNT(DISTINCT h.cliente_id) FILTER (
            WHERE
              h.etapa_nueva = 'PagÃ³ Adelanto'
              AND h.es_baseline = false
              AND (h.created_at AT TIME ZONE 'America/Lima')::date = f.hoy - 1
              AND EXISTS (
                SELECT 1
                FROM clientes_whatsapp_qr rel
                WHERE rel.empresa_id = h.empresa_id
                  AND rel.cliente_id = h.cliente_id
                  AND rel.whatsapp_qr_id = $2
              )
          )::int AS cierres_ayer
        FROM historial_etapas h
        CROSS JOIN fechas f
        WHERE h.empresa_id = $1
      )
      SELECT
        c.conversaciones_hoy,
        c.conversaciones_ayer,
        h.cierres_hoy,
        h.cierres_ayer
      FROM conversaciones_metricas c
      CROSS JOIN cierres_metricas h
      `,
      [empresaId, whatsappQrId]
    );

    return NextResponse.json({
      success: true,
      metricas: result.rows[0] ?? {
        conversaciones_hoy: 0,
        conversaciones_ayer: 0,
        cierres_hoy: 0,
        cierres_ayer: 0,
      },
    });
  } catch (error) {
    console.error("ERROR METRICAS DASHBOARD:", error);

    return NextResponse.json(
      {
        success: false,
        metricas: {
          conversaciones_hoy: 0,
          conversaciones_ayer: 0,
          cierres_hoy: 0,
          cierres_ayer: 0,
        },
      },
      { status: 500 }
     );
  }
}

