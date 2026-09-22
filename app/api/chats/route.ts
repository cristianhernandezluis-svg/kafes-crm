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

const buscar = (
  searchParams.get("buscar") || ""
).trim();

const limit = Math.min(
  Math.max(Number(searchParams.get("limit") || 100), 1),
  200
);

const offset = Math.max(
  Number(searchParams.get("offset") || 0),
  0
);

    if (!empresaId || !whatsappQrId) {
      return NextResponse.json({
        success: true,
        chats: [],
        closers: [],
      });
    }

    const result = await pool.query(
      `
      WITH no_leidos AS (
        SELECT
          cliente_id,
          COUNT(*) AS total
        FROM conversaciones
        WHERE whatsapp_qr_id = $2
          AND remitente = 'cliente'
          AND COALESCE(leido, false) = false
        GROUP BY cliente_id
      )

      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.ciudad,

        COALESCE(rel.etapa, 'Nuevo') AS etapa,
        rel.asesor AS asesor,

        COALESCE(rel.score, 0) AS score,
        COALESCE(rel.temperatura, 'frio') AS temperatura,

        COALESCE(rel.bot_activo, true) AS bot_activo,

        COALESCE(
          rel.modo_humano_permanente,
          false
        ) AS modo_humano_permanente,

        COALESCE(
          rel.requiere_closer,
          false
        ) AS requiere_closer,

        rel.bot_producto AS bot_producto,
        rel.bot_paso AS bot_paso,

        rel.handoff_motivo AS handoff_motivo,

        rel.distribucion_post_id AS distribucion_post_id,
        rel.distribucion_grupo_id AS distribucion_grupo_id,
        rel.distribucion_closer_id AS distribucion_closer_id,

        COALESCE(
          rel.distribucion_usando_reemplazo,
          false
        ) AS distribucion_usando_reemplazo,

        COALESCE(
          rel.bot_contexto,
          '{}'::jsonb
        ) AS bot_contexto,

        c.created_at,

COUNT(*) OVER() AS total_chats,

ult.mensaje AS ultimo_mensaje,
        ult.tipo AS ultimo_tipo,
        ult.created_at AS ultimo_mensaje_fecha,

        COALESCE(
          no_leidos.total,
          0
        ) AS no_leidos

      FROM clientes c

      LEFT JOIN clientes_whatsapp_qr rel
        ON rel.cliente_id = c.id
       AND rel.empresa_id = c.empresa_id
       AND rel.whatsapp_qr_id = $2

      LEFT JOIN LATERAL (
        SELECT
          mensaje,
          tipo,
          created_at
        FROM conversaciones
        WHERE cliente_id = c.id
          AND whatsapp_qr_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ult ON true

      LEFT JOIN no_leidos
        ON no_leidos.cliente_id = c.id

      WHERE c.empresa_id = $1

  AND EXISTS (
    SELECT 1
    FROM conversaciones conv
    WHERE conv.cliente_id = c.id
      AND conv.empresa_id = $1
      AND conv.whatsapp_qr_id = $2
  )

  AND (
    $5 = ''
    OR COALESCE(c.nombre, '') ILIKE '%' || $5 || '%'
    OR COALESCE(c.telefono, '') ILIKE '%' || $5 || '%'
    OR COALESCE(ult.mensaje, '') ILIKE '%' || $5 || '%'
  )
          SELECT 1
          FROM conversaciones conv
          WHERE conv.cliente_id = c.id
            AND conv.empresa_id = $1
            AND conv.whatsapp_qr_id = $2
        )

      ORDER BY
  ult.created_at DESC NULLS LAST,
  c.created_at DESC

LIMIT $3
OFFSET $4
      `,
      [
  empresaId,
  whatsappQrId,
  limit,
  offset,
  buscar,
]
    );

const totalChats =
  result.rows.length > 0
    ? Number(result.rows[0].total_chats || 0)
    : 0;

    const closersResult = await pool.query(
      `
      SELECT
        u.id,
        u.nombre,

        COALESCE(
          cd.disponible,
          true
        ) AS disponible

      FROM usuarios u

      LEFT JOIN closers_disponibilidad cd
        ON cd.empresa_id = u.empresa_id
       AND cd.usuario_id = u.id

      WHERE u.empresa_id = $1
        AND u.rol = 'asesor'

      ORDER BY
        u.nombre ASC
      `,
      [empresaId]
    );

return NextResponse.json({
  success: true,
  chats: result.rows,
  closers: closersResult.rows,
  total: totalChats,
  limit,
  offset,
});
  } catch (error) {
    console.error("ERROR API CHATS:", error);

    return NextResponse.json(
      {
        success: false,
        chats: [],
        closers: [],
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      cliente_id,
      whatsapp_qr_id,
      accion,
      asesor_id,
    } = await req.json();

    if (!cliente_id || !whatsapp_qr_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta cliente_id o whatsapp_qr_id",
        },
        {
          status: 400,
        }
      );
    }

    /*
    =========================================================
    ASIGNAR CLOSER MANUALMENTE
    =========================================================
    */

    if (accion === "asignar_closer") {
      if (!asesor_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Falta asesor_id",
          },
          {
            status: 400,
          }
        );
      }

      const relacionResult = await pool.query(
        `
        SELECT
          empresa_id

        FROM clientes_whatsapp_qr

        WHERE cliente_id = $1
          AND whatsapp_qr_id = $2

        LIMIT 1
        `,
        [
          cliente_id,
          whatsapp_qr_id,
        ]
      );

      if (relacionResult.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cliente no encontrado",
          },
          {
            status: 404,
          }
        );
      }

      const empresaId =
        relacionResult.rows[0].empresa_id;

      const asesorResult = await pool.query(
        `
        SELECT
          u.id,
          u.nombre,

          COALESCE(
            cd.disponible,
            true
          ) AS disponible

        FROM usuarios u

        LEFT JOIN closers_disponibilidad cd
          ON cd.empresa_id = u.empresa_id
         AND cd.usuario_id = u.id

        WHERE u.id = $1
          AND u.empresa_id = $2
          AND u.rol = 'asesor'

        LIMIT 1
        `,
        [
          asesor_id,
          empresaId,
        ]
      );

      if (asesorResult.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Asesor no encontrado",
          },
          {
            status: 404,
          }
        );
      }

      const asesor =
        asesorResult.rows[0];

      if (asesor.disponible === false) {
        return NextResponse.json(
          {
            success: false,
            error: "El asesor está marcado como AUSENTE",
          },
          {
            status: 409,
          }
        );
      }

      await pool.query(
        `
        UPDATE clientes_whatsapp_qr

        SET
          asesor = $3,

          distribucion_closer_id = CASE
            WHEN distribucion_grupo_id IS NOT NULL
            THEN $4
            ELSE distribucion_closer_id
          END,

          requiere_closer = true,

          updated_at = NOW()

        WHERE cliente_id = $1
          AND whatsapp_qr_id = $2
        `,
        [
          cliente_id,
          whatsapp_qr_id,
          asesor.nombre,
          asesor.id,
        ]
      );

      return NextResponse.json({
        success: true,

        asesor: {
          id: asesor.id,
          nombre: asesor.nombre,
        },
      });
    }

    /*
    =========================================================
    LIBERAR CHAT Y DEVOLVER AL BOT
    =========================================================
    */

    if (accion === "liberar") {
      await pool.query(
        `
        UPDATE clientes_whatsapp_qr

        SET
          bot_activo = true,
          humano_hasta = NULL,
          updated_at = NOW()

        WHERE cliente_id = $1
          AND whatsapp_qr_id = $2
          AND COALESCE(
            modo_humano_permanente,
            false
          ) = false
          AND humano_hasta IS NOT NULL
        `,
        [
          cliente_id,
          whatsapp_qr_id,
        ]
      );

      return NextResponse.json({
        success: true,
        liberado: true,
      });
    }

    /*
    =========================================================
    ABRIR / LEER CONVERSACION
    =========================================================
    */

    await pool.query(
      `
      UPDATE conversaciones

      SET leido = true

      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
        AND remitente = 'cliente'
      `,
      [
        cliente_id,
        whatsapp_qr_id,
      ]
    );

    /*
    IMPORTANTE:

    Si requiere closer pero todavía NO tiene asesor,
    NO quitamos requiere_closer.

    Eso permite mantener:

    PENDIENTE DE ASIGNACIÓN

    aunque alguien abra la conversación.
    */

    await pool.query(
      `
      UPDATE clientes_whatsapp_qr

      SET
        bot_activo = false,

        requiere_closer = CASE
          WHEN COALESCE(
            BTRIM(asesor),
            ''
          ) = ''
          THEN requiere_closer
          ELSE false
        END,

        humano_hasta =
          NOW() + INTERVAL '90 seconds',

        updated_at = NOW()

      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      `,
      [
        cliente_id,
        whatsapp_qr_id,
      ]
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "ERROR MARCANDO CHAT LEIDO:",
      error
    );

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}