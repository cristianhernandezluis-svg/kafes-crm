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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await context.params;
    const productoId = Number(id);
    const body = await request.json();
    const empresaId = Number(body.empresa_id);
    const nombre = String(body.nombre || "").trim();
    const precio = Number(body.precio);

    if (!productoId || !empresaId) {
      return NextResponse.json(
        { success: false, error: "Producto o empresa inválidos" },
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
      UPDATE productos
      SET
        nombre = $1,
        slug = $2,
        sku = $3,
        precio = $4,
        precio_anterior = $5,
        descripcion = $6,
        caracteristicas = $7::jsonb,
        usos = $8::jsonb,
        incluye = $9::jsonb,
        garantia = $10,
        stock = $11,
        activo = $12,
        ia_activo = $13,
        updated_at = NOW()
      WHERE id = $14
        AND empresa_id = $15
      RETURNING *
      `,
      [
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
        productoId,
        empresaId,
      ]
    );

    if (productoResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    await client.query(
      `
      DELETE FROM producto_promociones
      WHERE producto_id = $1
        AND empresa_id = $2
      `,
      [productoId, empresaId]
    );

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
          productoId,
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
      producto: productoResult.rows[0],
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

    console.error("ERROR API PRODUCTOS PATCH:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo actualizar el producto" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const productoId = Number(id);
    const { searchParams } = new URL(request.url);
    const empresaId = Number(searchParams.get("empresa_id"));

    if (!productoId || !empresaId) {
      return NextResponse.json(
        { success: false, error: "Producto o empresa inválidos" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM productos
      WHERE id = $1
        AND empresa_id = $2
      RETURNING id
      `,
      [productoId, empresaId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERROR API PRODUCTOS DELETE:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo eliminar el producto" },
      { status: 500 }
    );
  }
}
