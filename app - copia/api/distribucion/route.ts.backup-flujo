import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaId = Number(searchParams.get("empresa_id"));

    if (!empresaId) {
      return NextResponse.json(
        {
          success: false,
          error: "empresa_id es obligatorio",
        },
        { status: 400 }
      );
    }

    const gruposResult = await pool.query(
      `
      SELECT
        g.id,
        g.empresa_id,
        g.nombre,
        g.producto_slug,
        g.bot_slug,
        g.closer_principal_id,
        principal.nombre AS closer_principal_nombre,
        g.closer_reemplazo_id,
        reemplazo.nombre AS closer_reemplazo_nombre,
        g.activo,
        g.created_at,
        g.updated_at
      FROM grupos_distribucion g
      LEFT JOIN usuarios principal
        ON principal.id = g.closer_principal_id
      LEFT JOIN usuarios reemplazo
        ON reemplazo.id = g.closer_reemplazo_id
      WHERE g.empresa_id = $1
      ORDER BY g.id ASC
      `,
      [empresaId]
    );

    const postsResult = await pool.query(
      `
      SELECT
        id,
        empresa_id,
        grupo_id,
        post_id,
        nombre,
        activo,
        created_at
      FROM posts_distribucion
      WHERE empresa_id = $1
      ORDER BY id ASC
      `,
      [empresaId]
    );

    const closersResult = await pool.query(
      `
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.rol,
        COALESCE(cd.disponible, true) AS disponible,
        cd.reemplazo_usuario_id
      FROM usuarios u
      LEFT JOIN closers_disponibilidad cd
        ON cd.empresa_id = u.empresa_id
       AND cd.usuario_id = u.id
      WHERE u.empresa_id = $1
        AND u.rol = 'asesor'
      ORDER BY u.nombre ASC
      `,
      [empresaId]
    );

    const grupos = gruposResult.rows.map((grupo) => ({
      ...grupo,

      posts: postsResult.rows.filter(
        (post) => Number(post.grupo_id) === Number(grupo.id)
      ),
    }));

    return NextResponse.json({
      success: true,
      grupos,
      closers: closersResult.rows,
    });
  } catch (error) {
    console.error("ERROR GET DISTRIBUCION:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo cargar la distribución",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const empresaId = Number(body.empresa_id);
    const grupoId = body.id ? Number(body.id) : null;

    const nombre = String(body.nombre || "").trim();
    const productoSlug = String(body.producto_slug || "").trim();
    const botSlug = String(
      body.bot_slug || body.producto_slug || ""
    ).trim();

    const closerPrincipalId = body.closer_principal_id
      ? Number(body.closer_principal_id)
      : null;

    const closerReemplazoId = body.closer_reemplazo_id
      ? Number(body.closer_reemplazo_id)
      : null;

    const activo = body.activo !== false;

    const postIds = Array.isArray(body.post_ids)
      ? [
          ...new Set(
            body.post_ids
              .map((postId: unknown) => String(postId || "").trim())
              .filter(Boolean)
          ),
        ]
      : [];

    if (!empresaId) {
      return NextResponse.json(
        {
          success: false,
          error: "empresa_id es obligatorio",
        },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre del grupo es obligatorio",
        },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    let idFinal: number;

    if (grupoId) {
      const actualizado = await client.query(
        `
        UPDATE grupos_distribucion
        SET
          nombre = $3,
          producto_slug = $4,
          bot_slug = $5,
          closer_principal_id = $6,
          closer_reemplazo_id = $7,
          activo = $8,
          updated_at = NOW()
        WHERE id = $1
          AND empresa_id = $2
        RETURNING id
        `,
        [
          grupoId,
          empresaId,
          nombre,
          productoSlug || null,
          botSlug || null,
          closerPrincipalId,
          closerReemplazoId,
          activo,
        ]
      );

      if (actualizado.rowCount === 0) {
        throw new Error("Grupo no encontrado");
      }

      idFinal = actualizado.rows[0].id;
    } else {
      const creado = await client.query(
        `
        INSERT INTO grupos_distribucion (
          empresa_id,
          nombre,
          producto_slug,
          bot_slug,
          closer_principal_id,
          closer_reemplazo_id,
          activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        `,
        [
          empresaId,
          nombre,
          productoSlug || null,
          botSlug || null,
          closerPrincipalId,
          closerReemplazoId,
          activo,
        ]
      );

      idFinal = creado.rows[0].id;
    }

    await client.query(
      `
      DELETE FROM posts_distribucion
      WHERE empresa_id = $1
        AND grupo_id = $2
      `,
      [empresaId, idFinal]
    );

    for (const postId of postIds) {
      await client.query(
        `
        INSERT INTO posts_distribucion (
          empresa_id,
          grupo_id,
          post_id,
          nombre,
          activo
        )
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (empresa_id, post_id)
        DO UPDATE SET
          grupo_id = EXCLUDED.grupo_id,
          activo = true
        `,
        [
          empresaId,
          idFinal,
          postId,
          `${nombre} - ${postId}`,
        ]
      );
    }

    if (closerPrincipalId) {
      await client.query(
        `
        INSERT INTO closers_disponibilidad (
          empresa_id,
          usuario_id,
          disponible,
          reemplazo_usuario_id
        )
        VALUES ($1, $2, true, $3)
        ON CONFLICT (empresa_id, usuario_id)
        DO UPDATE SET
          reemplazo_usuario_id = EXCLUDED.reemplazo_usuario_id,
          updated_at = NOW()
        `,
        [
          empresaId,
          closerPrincipalId,
          closerReemplazoId,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      grupo_id: idFinal,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("ERROR GUARDANDO DISTRIBUCION:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error guardando distribución",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const empresaId = Number(body.empresa_id);
    const usuarioId = Number(body.usuario_id);
    const disponible = body.disponible;

    if (!empresaId) {
      return NextResponse.json(
        {
          success: false,
          error: "empresa_id es obligatorio",
        },
        { status: 400 }
      );
    }

    if (!usuarioId) {
      return NextResponse.json(
        {
          success: false,
          error: "usuario_id es obligatorio",
        },
        { status: 400 }
      );
    }

    if (typeof disponible !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "disponible debe ser true o false",
        },
        { status: 400 }
      );
    }

    const closerResult = await pool.query(
      `
      SELECT id, nombre
      FROM usuarios
      WHERE id = $1
        AND empresa_id = $2
        AND rol = 'asesor'
      LIMIT 1
      `,
      [usuarioId, empresaId]
    );

    if (closerResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Closer no encontrado",
        },
        { status: 404 }
      );
    }

    await pool.query(
      `
      INSERT INTO closers_disponibilidad (
        empresa_id,
        usuario_id,
        disponible,
        updated_at
      )
      VALUES ($1, $2, $3, NOW())

      ON CONFLICT (empresa_id, usuario_id)
      DO UPDATE SET
        disponible = EXCLUDED.disponible,
        updated_at = NOW()
      `,
      [empresaId, usuarioId, disponible]
    );

    return NextResponse.json({
      success: true,
      usuario_id: usuarioId,
      nombre: closerResult.rows[0].nombre,
      disponible,
    });
  } catch (error) {
    console.error(
      "ERROR CAMBIANDO DISPONIBILIDAD CLOSER:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo cambiar la disponibilidad",
      },
      { status: 500 }
    );
  }
}