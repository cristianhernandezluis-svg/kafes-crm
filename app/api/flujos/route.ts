import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/*
=========================================================
GET

/api/flujos?empresa_id=1
→ lista flujos

/api/flujos?empresa_id=1&id=2
→ devuelve flujo + nodos + conexiones
=========================================================
*/

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const empresaId = Number(searchParams.get("empresa_id"));
    const flujoId = Number(searchParams.get("id"));

    if (!empresaId) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta empresa_id",
        },
        { status: 400 }
      );
    }

    if (flujoId) {
      const flujoResult = await pool.query(
        `
        SELECT
          id,
          empresa_id,
          nombre,
          slug,
          producto_slug,
          activo,
          created_at,
          updated_at

        FROM flujos_bot

        WHERE id = $1
          AND empresa_id = $2

        LIMIT 1
        `,
        [flujoId, empresaId]
      );

      if (flujoResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Flujo no encontrado",
          },
          { status: 404 }
        );
      }

      const nodosResult = await pool.query(
        `
        SELECT
          id,
          nodo_uid,
          tipo,
          posicion_x,
          posicion_y,
          config

        FROM flujo_nodos

        WHERE flujo_id = $1

        ORDER BY id ASC
        `,
        [flujoId]
      );

      const conexionesResult = await pool.query(
        `
        SELECT
          id,
          conexion_uid,
          source_uid,
          target_uid,
          source_handle,
          target_handle,
          config

        FROM flujo_conexiones

        WHERE flujo_id = $1

        ORDER BY id ASC
        `,
        [flujoId]
      );

      return NextResponse.json({
        success: true,
        flujo: flujoResult.rows[0],
        nodos: nodosResult.rows,
        conexiones: conexionesResult.rows,
      });
    }

    const result = await pool.query(
      `
      SELECT
        f.id,
        f.empresa_id,
        f.nombre,
        f.slug,
        f.producto_slug,
        f.activo,
        f.created_at,
        f.updated_at,

        COUNT(DISTINCT n.id)::int AS total_nodos

      FROM flujos_bot f

      LEFT JOIN flujo_nodos n
        ON n.flujo_id = f.id

      WHERE f.empresa_id = $1

      GROUP BY f.id

      ORDER BY
        f.updated_at DESC,
        f.id DESC
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      flujos: result.rows,
    });
  } catch (error) {
    console.error("ERROR GET FLUJOS:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error cargando flujos",
      },
      { status: 500 }
    );
  }
}

/*
=========================================================
POST
Crear flujo nuevo
=========================================================
*/

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const empresaId = Number(body.empresa_id);
    const nombre = String(body.nombre || "").trim();
    const productoSlug =
      String(body.producto_slug || "").trim() || null;

    if (!empresaId || !nombre) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta empresa_id o nombre",
        },
        { status: 400 }
      );
    }

    const slugBase = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const slug =
      `${slugBase || "flujo"}-${Date.now()}`;

    await client.query("BEGIN");

    const flujoResult = await client.query(
      `
      INSERT INTO flujos_bot (
        empresa_id,
        nombre,
        slug,
        producto_slug,
        activo,
        created_at,
        updated_at
      )

      VALUES (
        $1,
        $2,
        $3,
        $4,
        true,
        NOW(),
        NOW()
      )

      RETURNING *
      `,
      [
        empresaId,
        nombre,
        slug,
        productoSlug,
      ]
    );

    const flujo = flujoResult.rows[0];

    /*
    Creamos automáticamente el PASO INICIAL
    */

    await client.query(
      `
      INSERT INTO flujo_nodos (
        flujo_id,
        nodo_uid,
        tipo,
        posicion_x,
        posicion_y,
        config,
        created_at,
        updated_at
      )

      VALUES (
        $1,
        'inicio',
        'inicio',
        100,
        150,
        $2::jsonb,
        NOW(),
        NOW()
      )
      `,
      [
        flujo.id,
        JSON.stringify({
          titulo: "Paso inicial",
        }),
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      flujo,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "ERROR CREANDO FLUJO:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo crear el flujo",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/*
=========================================================
PUT
Guardar nodos y conexiones del constructor visual
=========================================================
*/

export async function PUT(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const empresaId = Number(body.empresa_id);
    const flujoId = Number(body.flujo_id);

    const nodos =
      Array.isArray(body.nodos)
        ? body.nodos
        : [];

    const conexiones =
      Array.isArray(body.conexiones)
        ? body.conexiones
        : [];

    if (!empresaId || !flujoId) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta empresa_id o flujo_id",
        },
        { status: 400 }
      );
    }

    const flujoResult = await client.query(
      `
      SELECT id
      FROM flujos_bot

      WHERE id = $1
        AND empresa_id = $2

      LIMIT 1
      `,
      [flujoId, empresaId]
    );

    if (flujoResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Flujo no encontrado",
        },
        { status: 404 }
      );
    }

    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM flujo_conexiones
      WHERE flujo_id = $1
      `,
      [flujoId]
    );

    await client.query(
      `
      DELETE FROM flujo_nodos
      WHERE flujo_id = $1
      `,
      [flujoId]
    );

    for (const nodo of nodos) {
      const nodoUid =
        String(nodo.id || "").trim();

      const tipo =
        String(nodo.type || nodo.tipo || "").trim();

      if (!nodoUid || !tipo) {
        continue;
      }

      await client.query(
        `
        INSERT INTO flujo_nodos (
          flujo_id,
          nodo_uid,
          tipo,
          posicion_x,
          posicion_y,
          config,
          created_at,
          updated_at
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          NOW(),
          NOW()
        )
        `,
        [
          flujoId,
          nodoUid,
          tipo,
          Number(nodo.position?.x || 0),
          Number(nodo.position?.y || 0),
          JSON.stringify(
            nodo.data || nodo.config || {}
          ),
        ]
      );
    }

    for (const conexion of conexiones) {
      const conexionUid =
        String(conexion.id || "").trim();

      const sourceUid =
        String(conexion.source || "").trim();

      const targetUid =
        String(conexion.target || "").trim();

      if (
        !conexionUid ||
        !sourceUid ||
        !targetUid
      ) {
        continue;
      }

      await client.query(
        `
        INSERT INTO flujo_conexiones (
          flujo_id,
          conexion_uid,
          source_uid,
          target_uid,
          source_handle,
          target_handle,
          config,
          created_at
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          NOW()
        )
        `,
        [
          flujoId,
          conexionUid,
          sourceUid,
          targetUid,
          conexion.sourceHandle || null,
          conexion.targetHandle || null,
          JSON.stringify(
            conexion.data || {}
          ),
        ]
      );
    }

    await client.query(
      `
      UPDATE flujos_bot
      SET updated_at = NOW()
      WHERE id = $1
        AND empresa_id = $2
      `,
      [flujoId, empresaId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      guardado: true,
      total_nodos: nodos.length,
      total_conexiones: conexiones.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error(
      "ERROR GUARDANDO FLUJO:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo guardar el flujo",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}