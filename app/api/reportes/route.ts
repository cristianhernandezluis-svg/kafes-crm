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
    const diasSolicitados = Number(searchParams.get("dias") || "30");
    const dias = Number.isFinite(diasSolicitados)
      ? Math.min(Math.max(Math.trunc(diasSolicitados), 1), 90)
      : 30;

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
        SELECT generate_series(
          (NOW() AT TIME ZONE 'America/Lima')::date - ($3::int - 1),
          (NOW() AT TIME ZONE 'America/Lima')::date,
          interval '1 day'
        )::date AS fecha
      ),
      inicio_historial AS (
        SELECT MIN((created_at AT TIME ZONE 'America/Lima')::date) AS fecha_inicio
        FROM historial_etapas
        WHERE empresa_id = $1
          AND whatsapp_qr_id = $2
          AND es_baseline = true
      ),
      conversaciones_por_dia AS (
        SELECT
          (
            c.created_at
            AT TIME ZONE 'UTC'
            AT TIME ZONE 'America/Lima'
          )::date AS fecha,
          COUNT(DISTINCT c.cliente_id)::int AS conversaciones
        FROM conversaciones c
        WHERE c.empresa_id = $1
          AND c.whatsapp_qr_id = $2
          AND c.remitente = 'cliente'
        GROUP BY 1
      ),
      etapas_por_dia AS (
        SELECT
          (h.created_at AT TIME ZONE 'America/Lima')::date AS fecha,
          COUNT(DISTINCT h.cliente_id) FILTER (
            WHERE h.etapa_nueva = 'Pagó Adelanto'
              AND h.es_baseline = false
          )::int AS cierres,
          COUNT(DISTINCT h.cliente_id) FILTER (
            WHERE h.etapa_nueva = 'Enviado'
              AND h.es_baseline = false
          )::int AS enviados,
          COUNT(DISTINCT h.cliente_id) FILTER (
            WHERE h.etapa_nueva = 'Entregado'
              AND h.es_baseline = false
          )::int AS entregados
        FROM historial_etapas h
        WHERE h.empresa_id = $1
          AND h.whatsapp_qr_id = $2
        GROUP BY 1
      )
      SELECT
        TO_CHAR(f.fecha, 'YYYY-MM-DD') AS fecha,
        COALESCE(c.conversaciones, 0)::int AS conversaciones,
        CASE
          WHEN i.fecha_inicio IS NULL OR f.fecha < i.fecha_inicio THEN NULL
          ELSE (
            SELECT COUNT(DISTINCT c2.cliente_id)::int
            FROM conversaciones c2
            JOIN LATERAL (
              SELECT h.etapa_nueva
              FROM historial_etapas h
              WHERE h.empresa_id = $1
                AND h.whatsapp_qr_id = $2
                AND h.cliente_id = c2.cliente_id
                AND (h.created_at AT TIME ZONE 'America/Lima') < (f.fecha + 1)
              ORDER BY h.created_at DESC
              LIMIT 1
            ) ultimo ON true
            WHERE c2.empresa_id = $1
              AND c2.whatsapp_qr_id = $2
              AND c2.remitente = 'cliente'
              AND (c2.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima')::date = f.fecha
              AND ultimo.etapa_nueva NOT IN ('Enviado', 'Entregado')
              AND ultimo.etapa_nueva NOT LIKE 'Pag%Adelanto'
          )
        END AS pendientes,
        COALESCE(e.cierres, 0)::int AS cierres,
        COALESCE(e.enviados, 0)::int AS enviados,
        COALESCE(e.entregados, 0)::int AS entregados
      FROM fechas f
      CROSS JOIN inicio_historial i
      LEFT JOIN conversaciones_por_dia c ON c.fecha = f.fecha
      LEFT JOIN etapas_por_dia e ON e.fecha = f.fecha
      ORDER BY f.fecha DESC
      `,
      [empresaId, whatsappQrId, dias]
    );

    return NextResponse.json({
      success: true,
      historial: result.rows,
    });
  } catch (error) {
    console.error("ERROR REPORTE DIARIO:", error);

    return NextResponse.json(
      {
        success: false,
        historial: [],
      },
      { status: 500 }
    );
  }
}
