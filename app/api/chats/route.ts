import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
import { gzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

const usuarioResult = await pool.query(
  `SELECT id, empresa_id, rol, nombre
   FROM usuarios
   WHERE id = $1 AND empresa_id = $2
   LIMIT 1`,
  [sesion.id, sesion.empresa_id]
);

    if (usuarioResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Usuario no autorizado" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const empresaIdSolicitada = searchParams.get("empresa_id");

    if (
      empresaIdSolicitada !== null &&
      Number(empresaIdSolicitada) !== sesion.empresa_id
    ) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado a esta empresa" },
        { status: 403 }
      );
    }

    const empresaId = sesion.empresa_id;
    const whatsappQrId = searchParams.get("whatsapp_qr_id");

    const limitRaw = Number(
      searchParams.get("limit") || 100
    );

    const offsetRaw = Number(
      searchParams.get("offset") || 0
    );

    const limit = Number.isFinite(limitRaw)
  ? Math.min(Math.max(Math.trunc(limitRaw), 1), 5000)
  : 100;

    const offset = Number.isFinite(offsetRaw)
      ? Math.max(Math.trunc(offsetRaw), 0)
      : 0;

    const buscar = (
      searchParams.get("buscar") || ""
    ).trim();

const filtroRaw =
  searchParams.get("filtro") || "todas";

const filtrosValidos = [
  "todas",
  "no_leidas",
  "asignadas",
  "sin_asignar",
];

const filtro = filtrosValidos.includes(filtroRaw)
  ? filtroRaw
  : "todas";

    if (!empresaId || !whatsappQrId) {
  return NextResponse.json({
    success: true,
    chats: [],
    closers: [],
    total: 0,
    total_general: 0,
    limit,
    offset,
  });
}

    const result = await pool.query(
      `
      WITH no_leidos AS (
        SELECT
          cliente_id,
          COUNT(*) AS total
        FROM conversaciones
        WHERE empresa_id = $1
          AND whatsapp_qr_id = $2
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
           AND empresa_id = $1
          AND whatsapp_qr_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ult ON true

      LEFT JOIN no_leidos
        ON no_leidos.cliente_id = c.id

      WHERE c.empresa_id = $1

  AND ($7 = 'admin' OR ($7 = 'asesor' AND rel.asesor_usuario_id = $8))

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

AND (
  $6 = 'todas'

  OR (
    $6 = 'no_leidas'
    AND COALESCE(no_leidos.total, 0) > 0
  )

  OR (
    $6 = 'asignadas'
    AND rel.asesor_usuario_id IS NOT NULL
  )

  OR (
    $6 = 'sin_asignar'
    AND rel.asesor_usuario_id IS NULL
  )
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
  filtro,
  usuarioResult.rows[0].rol,
  usuarioResult.rows[0].id,
]
    );

const totalResult = await pool.query(
  `
  SELECT
    COUNT(DISTINCT conv.cliente_id)::int AS total
  FROM conversaciones conv
  INNER JOIN clientes_whatsapp_qr rel ON rel.cliente_id = conv.cliente_id AND rel.empresa_id = conv.empresa_id AND rel.whatsapp_qr_id = conv.whatsapp_qr_id
  WHERE conv.empresa_id = $1
    AND conv.whatsapp_qr_id = $2
    AND ($3 = 'admin' OR ($3 = 'asesor' AND rel.asesor_usuario_id = $4))
  `,
  [
    empresaId,
    whatsappQrId,
    usuarioResult.rows[0].rol,
    usuarioResult.rows[0].id,
  ]
);

const totalChats = Number(
  totalResult.rows[0]?.total || 0
);

let totalFiltrado = totalChats;

if (buscar || filtro !== "todas") {
  const totalFiltradoResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM (
      SELECT c.id

      FROM clientes c

      LEFT JOIN clientes_whatsapp_qr rel
        ON rel.cliente_id = c.id
       AND rel.empresa_id = c.empresa_id
       AND rel.whatsapp_qr_id = $2

      LEFT JOIN LATERAL (
        SELECT mensaje
        FROM conversaciones
        WHERE cliente_id = c.id
           AND empresa_id = $1
          AND whatsapp_qr_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      ) ult_busqueda ON true

      WHERE c.empresa_id = $1

        AND ($5 = 'admin' OR ($5 = 'asesor' AND rel.asesor_usuario_id = $6))

        AND EXISTS (
          SELECT 1
          FROM conversaciones conv
          WHERE conv.cliente_id = c.id
            AND conv.empresa_id = $1
            AND conv.whatsapp_qr_id = $2
        )

        AND (
          $3 = ''
          OR COALESCE(c.nombre, '') ILIKE '%' || $3 || '%'
          OR COALESCE(c.telefono, '') ILIKE '%' || $3 || '%'
          OR COALESCE(ult_busqueda.mensaje, '') ILIKE '%' || $3 || '%'
        )

        AND (
          $4 = 'todas'

          OR (
            $4 = 'no_leidas'
            AND EXISTS (
              SELECT 1
              FROM conversaciones nl
              WHERE nl.cliente_id = c.id
                AND nl.whatsapp_qr_id = $2
                AND nl.remitente = 'cliente'
                AND COALESCE(nl.leido, false) = false
            )
          )

          OR (
            $4 = 'asignadas'
            AND rel.asesor_usuario_id IS NOT NULL
          )

          OR (
            $4 = 'sin_asignar'
            AND rel.asesor_usuario_id IS NULL
          )
        )
    ) resultados
    `,
    [
      empresaId,
      whatsappQrId,
      buscar,
      filtro,
      usuarioResult.rows[0].rol,
      usuarioResult.rows[0].id,
    ]
  );

  totalFiltrado = Number(
    totalFiltradoResult.rows[0]?.total || 0
  );
}

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

const respuesta = {
  success: true,
  chats: result.rows,
  closers: closersResult.rows,
  total: totalFiltrado,
  total_general: totalChats,
  limit,
  offset,
};

const acceptEncoding =
  request.headers.get("accept-encoding") || "";

if (acceptEncoding.includes("gzip")) {
  const json = JSON.stringify(respuesta);

  const comprimido = await gzipAsync(
    Buffer.from(json, "utf-8")
  );

  return new NextResponse(comprimido, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Encoding": "gzip",
      "Vary": "Accept-Encoding",
      "Cache-Control": "no-store",
    },
  });
}

return NextResponse.json(respuesta);
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
const sesion = await obtenerSesion();

if (!sesion) {
  return NextResponse.json(
    { success: false, error: "No autorizado" },
    { status: 401 }
  );
}

const usuarioResult = await pool.query(
  `SELECT id, empresa_id, rol
   FROM usuarios
   WHERE id = $1 AND empresa_id = $2
   LIMIT 1`,
  [sesion.id, sesion.empresa_id]
);

if (usuarioResult.rowCount === 0) {
  return NextResponse.json(
    { success: false, error: "Usuario no autorizado" },
    { status: 403 }
  );
}
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
if (usuarioResult.rows[0].rol !== "admin") {
  return NextResponse.json(
    {
      success: false,
      error: "Solo un administrador puede asignar asesores",
    },
    { status: 403 }
  );
}
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
  AND empresa_id = $3
LIMIT 1
        `,
        [
  cliente_id,
  whatsapp_qr_id,
  sesion.empresa_id,
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
  AND empresa_id = $5
        `,
        [
  cliente_id,
  whatsapp_qr_id,
  asesor.nombre,
  asesor.id,
  sesion.empresa_id,
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

    // Verificar permisos antes de modificar el chat.
    const usuarioActual = usuarioResult.rows[0];
    if (usuarioActual.rol !== "admin" && usuarioActual.rol !== "asesor") {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }
    const permisoChat = await pool.query(
      "SELECT 1 FROM clientes_whatsapp_qr WHERE cliente_id = $1 AND whatsapp_qr_id = $2 AND empresa_id = $3 AND ($4 = 'admin' OR asesor_usuario_id = $5) LIMIT 1",
      [cliente_id, whatsapp_qr_id, sesion.empresa_id, usuarioActual.rol, usuarioActual.id]
    );
    if (permisoChat.rowCount !== 1) {
      return NextResponse.json({ success: false, error: "Conversacion no autorizada" }, { status: 403 });
    }

    if (accion === "liberar") {
      const resultadoLiberacion = await pool.query(
        `
        UPDATE clientes_whatsapp_qr

        SET
          bot_activo = true,
          humano_hasta = NULL,
          updated_at = NOW()

        WHERE cliente_id = $1
  AND whatsapp_qr_id = $2
  AND empresa_id = $3
  AND COALESCE(
    modo_humano_permanente,
    false
  ) = false
  AND humano_hasta IS NOT NULL
AND COALESCE(handoff_motivo, '') <> 'validar_pago'
        `,
        [
  cliente_id,
  whatsapp_qr_id,
  sesion.empresa_id,
]
      );

      return NextResponse.json({
  success: true,
  liberado: (resultadoLiberacion.rowCount ?? 0) > 0,
  motivo:
    (resultadoLiberacion.rowCount ?? 0) > 0
      ? null
      : "No se liberó la conversación. Puede existir un pago pendiente o una restricción de atención humana.",
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
  AND empresa_id = $3
  AND remitente = 'cliente'
  AND COALESCE(leido, false) = false
      `,
      [
  cliente_id,
  whatsapp_qr_id,
  sesion.empresa_id,
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
  WHEN handoff_motivo = 'validar_pago' THEN true
  WHEN COALESCE(BTRIM(asesor), '') = '' THEN requiere_closer
  ELSE false
END,

        humano_hasta =
          NOW() + INTERVAL '90 seconds',

        updated_at = NOW()

      WHERE cliente_id = $1
  AND whatsapp_qr_id = $2
  AND empresa_id = $3
      `,
      [
  cliente_id,
  whatsapp_qr_id,
  sesion.empresa_id,
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