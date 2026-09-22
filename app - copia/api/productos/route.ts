import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function crearSlug(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function limpiarLista(valor: unknown) {
  if (!Array.isArray(valor)) return [];
  return valor.map((item) => String(item || "").trim()).filter(Boolean);
}

function limpiarPromociones(valor: unknown) {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((promo: any, index: number) => ({
      cantidad: Number(promo?.cantidad || 0),
      precio: Number(promo?.precio || 0),
      texto: promo?.texto ? String(promo.texto).trim() : null,
      activo: promo?.activo !== false,
      orden: Number.isFinite(Number(promo?.orden)) ? Number(promo.orden) : index,
    }))
    .filter(
      (promo) =>
        Number.isInteger(promo.cantidad) &&
        promo.cantidad > 0 &&
        Number.isFinite(promo.precio) &&
        promo.precio >= 0
    );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = Number(searchParams.get("empresa_id"));

    if (!empresaId) {
      return NextResponse.json(
        { success: false, productos: [], error: "empresa_id es obligatorio" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.empresa_id,
        p.nombre,
        p.slug,
        p.sku,
        p.precio::float8 AS precio,
        p.precio_anterior::float8 AS precio_anterior,
        p.descripcion,
        p.caracteristicas,
        p.usos,
        p.incluye,
        p.garantia,
        p.stock,
        p.activo,
        p.ia_activo,
        p.created_at,
        p.updated_at,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pp.id,
                'cantidad', pp.cantidad,
                'precio', pp.precio::float8,
                'texto', pp.texto,
                'activo', pp.activo,
                'orden', pp.orden
              )
              ORDER BY pp.orden ASC, pp.cantidad ASC
            )
            FROM producto_promociones pp
            WHERE pp.producto_id = p.id
              AND pp.empresa_id = p.empresa_id
          ),
          '[]'::json
        ) AS promociones,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pm.id,
                'tipo', pm.tipo,
                'url', pm.url,
                'orden', pm.orden,
                'activo', pm.activo,
                'created_at', pm.created_at
              )
              ORDER BY pm.orden ASC, pm.id ASC
            )
            FROM producto_multimedia pm
            WHERE pm.producto_id = p.id
              AND pm.empresa_id = p.empresa_id
              AND pm.activo = true
          ),
          '[]'::json
        ) AS multimedia
      FROM productos p
      WHERE p.empresa_id = $1
      ORDER BY p.updated_at DESC, p.id DESC
      `,
      [empresaId]
    );

    return NextResponse.json({
      success: true,
      productos: result.rows,
    });
  } catch (error) {
    console.error("ERROR API PRODUCTOS GET:", error);
    return NextResponse.json(
      { success: false, productos: [], error: "No se pudo cargar el catálogo" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const empresaId = Number(body.empresa_id);
    const nombre = String(body.nombre || "").trim();
    const precio = Number(body.precio);

    if (!empresaId) {
      return NextResponse.json(
        { success: false, error: "empresa_id es obligatorio" },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(precio) || precio < 0) {
      return NextResponse.json(
        { success: false, error: "El precio no es válido" },
        { status: 400 }
      );
    }

    const slug = crearSlug(body.slug || nombre);
    const promociones = limpiarPromociones(body.promociones);

    await client.query("BEGIN");

    const productoResult = await client.query(
      `
      INSERT INTO productos (
        empresa_id,
        nombre,
        slug,
        sku,
        precio,
        precio_anterior,
        descripcion,
        caracteristicas,
        usos,
        incluye,
        garantia,
        stock,
        activo,
        ia_activo
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8::jsonb, $9::jsonb, $10::jsonb,
        $11, $12, $13, $14
      )
      RETURNING *
      `,
      [
        empresaId,
        nombre,
        slug,
        body.sku ? String(body.sku).trim() : null,
        precio,
        body.precio_anterior === "" || body.precio_anterior == null
          ? null
          : Number(body.precio_anterior),
        body.descripcion ? String(body.descripcion).trim() : null,
        JSON.stringify(limpiarLista(body.caracteristicas)),
        JSON.stringify(limpiarLista(body.usos)),
        JSON.stringify(limpiarLista(body.incluye)),
        body.garantia ? String(body.garantia).trim() : null,
        body.stock === "" || body.stock == null ? null : Number(body.stock),
        body.activo !== false,
        body.ia_activo !== false,
      ]
    );

    const producto = productoResult.rows[0];

    for (const promo of promociones) {
      await client.query(
        `
        INSERT INTO producto_promociones (
          producto_id,
          empresa_id,
          cantidad,
          precio,
          texto,
          activo,
          orden
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          producto.id,
          empresaId,
          promo.cantidad,
          promo.precio,
          promo.texto,
          promo.activo,
          promo.orden,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      producto,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    if (error?.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un producto con ese nombre/slug o promoción repetida.",
        },
        { status: 409 }
      );
    }

    console.error("ERROR API PRODUCTOS POST:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo crear el producto" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
