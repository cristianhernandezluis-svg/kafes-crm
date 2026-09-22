const fs = require("fs");
const path = require("path");

const files = {
  api: "app/api/productos/route.ts",
  apiId: "app/api/productos/[id]/route.ts",
  page: "app/catalogo/page.tsx",
};

for (const file of Object.values(files)) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

const api = String.raw`import { NextResponse } from "next/server";
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
  return valor
    .map((item) => String(item || "").trim())
    .filter(Boolean);
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
        ) AS promociones
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
`;

const apiId = String.raw`import { NextResponse } from "next/server";
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
  return valor
    .map((item) => String(item || "").trim())
    .filter(Boolean);
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
`;

const page = String.raw`"use client";

import { useEffect, useMemo, useState } from "react";
import VerificarSuscripcion from "@/components/VerificarSuscripcion";

type Promocion = {
  id?: number;
  cantidad: number | string;
  precio: number | string;
  texto?: string | null;
  activo?: boolean;
  orden?: number;
};

type Producto = {
  id: number;
  empresa_id: number;
  nombre: string;
  slug: string;
  sku: string | null;
  precio: number;
  precio_anterior: number | null;
  descripcion: string | null;
  caracteristicas: string[];
  usos: string[];
  incluye: string[];
  garantia: string | null;
  stock: number | null;
  activo: boolean;
  ia_activo: boolean;
  promociones: Promocion[];
};

type FormProducto = {
  id: number | null;
  nombre: string;
  sku: string;
  precio: string;
  precio_anterior: string;
  descripcion: string;
  caracteristicas: string;
  usos: string;
  incluye: string;
  garantia: string;
  stock: string;
  activo: boolean;
  ia_activo: boolean;
  promociones: Promocion[];
};

const FORM_VACIO: FormProducto = {
  id: null,
  nombre: "",
  sku: "",
  precio: "",
  precio_anterior: "",
  descripcion: "",
  caracteristicas: "",
  usos: "",
  incluye: "",
  garantia: "",
  stock: "",
  activo: true,
  ia_activo: true,
  promociones: [],
};

function lineas(valor: string) {
  return valor
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormProducto>({ ...FORM_VACIO });
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("");

  const cargarProductos = async (empresa: number) => {
    setCargando(true);

    try {
      const res = await fetch(`/api/productos?empresa_id=${empresa}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setProductos(data.productos || []);
      } else {
        setMensajeEstado(data.error || "No se pudo cargar el catálogo");
      }
    } catch {
      setMensajeEstado("No se pudo cargar el catálogo");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);
    const empresa = Number(usuario.empresa_id);

    if (!empresa) {
      setMensajeEstado("No se encontró la empresa del usuario");
      setCargando(false);
      return;
    }

    setEmpresaId(empresa);
    cargarProductos(empresa);
  }, []);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return productos;

    return productos.filter((producto) =>
      [producto.nombre, producto.sku, producto.descripcion]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(q))
    );
  }, [productos, busqueda]);

  const limpiarFormulario = () => {
    setForm({ ...FORM_VACIO, promociones: [] });
    setMensajeEstado("");
  };

  const editarProducto = (producto: Producto) => {
    setForm({
      id: producto.id,
      nombre: producto.nombre || "",
      sku: producto.sku || "",
      precio: String(producto.precio ?? ""),
      precio_anterior:
        producto.precio_anterior == null ? "" : String(producto.precio_anterior),
      descripcion: producto.descripcion || "",
      caracteristicas: Array.isArray(producto.caracteristicas)
        ? producto.caracteristicas.join("\n")
        : "",
      usos: Array.isArray(producto.usos) ? producto.usos.join("\n") : "",
      incluye: Array.isArray(producto.incluye) ? producto.incluye.join("\n") : "",
      garantia: producto.garantia || "",
      stock: producto.stock == null ? "" : String(producto.stock),
      activo: producto.activo !== false,
      ia_activo: producto.ia_activo !== false,
      promociones: Array.isArray(producto.promociones)
        ? producto.promociones.map((p) => ({ ...p }))
        : [],
    });

    setMensajeEstado("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const agregarPromocion = () => {
    setForm((actual) => ({
      ...actual,
      promociones: [
        ...actual.promociones,
        {
          cantidad: "",
          precio: "",
          texto: "",
          activo: true,
          orden: actual.promociones.length,
        },
      ],
    }));
  };

  const actualizarPromocion = (
    index: number,
    campo: "cantidad" | "precio" | "texto",
    valor: string
  ) => {
    setForm((actual) => ({
      ...actual,
      promociones: actual.promociones.map((promo, i) =>
        i === index ? { ...promo, [campo]: valor } : promo
      ),
    }));
  };

  const eliminarPromocionFormulario = (index: number) => {
    setForm((actual) => ({
      ...actual,
      promociones: actual.promociones.filter((_, i) => i !== index),
    }));
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empresaId) return;

    setGuardando(true);
    setMensajeEstado("");

    try {
      const payload = {
        empresa_id: empresaId,
        nombre: form.nombre,
        sku: form.sku,
        precio: form.precio,
        precio_anterior: form.precio_anterior,
        descripcion: form.descripcion,
        caracteristicas: lineas(form.caracteristicas),
        usos: lineas(form.usos),
        incluye: lineas(form.incluye),
        garantia: form.garantia,
        stock: form.stock,
        activo: form.activo,
        ia_activo: form.ia_activo,
        promociones: form.promociones.map((promo, index) => ({
          cantidad: Number(promo.cantidad),
          precio: Number(promo.precio),
          texto: promo.texto || null,
          activo: promo.activo !== false,
          orden: index,
        })),
      };

      const editando = Boolean(form.id);

      const res = await fetch(
        editando ? `/api/productos/${form.id}` : "/api/productos",
        {
          method: editando ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!data.success) {
        setMensajeEstado(data.error || "No se pudo guardar el producto");
        return;
      }

      setMensajeEstado(
        editando
          ? "Producto actualizado correctamente ✅"
          : "Producto creado correctamente ✅"
      );

      setForm({ ...FORM_VACIO, promociones: [] });
      await cargarProductos(empresaId);
    } catch {
      setMensajeEstado("No se pudo guardar el producto");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (
    producto: Producto,
    campo: "activo" | "ia_activo"
  ) => {
    if (!empresaId) return;

    const payload = {
      empresa_id: empresaId,
      nombre: producto.nombre,
      sku: producto.sku || "",
      precio: producto.precio,
      precio_anterior: producto.precio_anterior,
      descripcion: producto.descripcion || "",
      caracteristicas: producto.caracteristicas || [],
      usos: producto.usos || [],
      incluye: producto.incluye || [],
      garantia: producto.garantia || "",
      stock: producto.stock,
      activo: campo === "activo" ? !producto.activo : producto.activo,
      ia_activo:
        campo === "ia_activo" ? !producto.ia_activo : producto.ia_activo,
      promociones: producto.promociones || [],
    };

    const res = await fetch(`/api/productos/${producto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      await cargarProductos(empresaId);
    } else {
      setMensajeEstado(data.error || "No se pudo cambiar el estado");
    }
  };

  const eliminarProducto = async (producto: Producto) => {
    if (!empresaId) return;

    const confirmar = window.confirm(
      `¿Eliminar "${producto.nombre}" del catálogo?`
    );

    if (!confirmar) return;

    const res = await fetch(
      `/api/productos/${producto.id}?empresa_id=${empresaId}`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (!data.success) {
      setMensajeEstado(data.error || "No se pudo eliminar el producto");
      return;
    }

    if (form.id === producto.id) {
      limpiarFormulario();
    }

    await cargarProductos(empresaId);
  };

  return (
    <>
      <VerificarSuscripcion />

      <main className="min-h-screen bg-gray-100 p-4 md:p-8 text-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-bold text-green-600 uppercase tracking-wide">
                Vendedor Maestro
              </p>
              <h1 className="text-3xl font-black">📦 Catálogo IA</h1>
              <p className="text-gray-500 mt-1">
                Carga tus productos, precios y promociones. La IA usará este
                catálogo para vender.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-green-600 text-white px-5 py-3 rounded-xl font-bold"
              >
                + Nuevo producto
              </button>

              <a
                href="/dashboard"
                className="bg-black text-white px-5 py-3 rounded-xl font-bold"
              >
                Volver
              </a>
            </div>
          </div>

          {mensajeEstado && (
            <div className="mb-5 bg-white border rounded-xl px-4 py-3 font-semibold">
              {mensajeEstado}
            </div>
          )}

          <div className="grid xl:grid-cols-[440px_1fr] gap-6 items-start">
            <form
              onSubmit={guardarProducto}
              className="bg-white rounded-2xl shadow-sm border p-5 xl:sticky xl:top-4"
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-black">
                    {form.id ? "Editar producto" : "Nuevo producto"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Información que utilizará el vendedor IA.
                  </p>
                </div>

                {form.id && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="text-sm font-bold text-gray-500"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <label className="block text-sm font-bold mb-1">Nombre *</label>
              <input
                className="border w-full p-3 rounded-xl mb-3 outline-none focus:border-green-500"
                placeholder="Ej: Broca Escalonada"
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">SKU</label>
                  <input
                    className="border w-full p-3 rounded-xl mb-3"
                    placeholder="BROCA-001"
                    value={form.sku}
                    onChange={(e) =>
                      setForm({ ...form, sku: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="border w-full p-3 rounded-xl mb-3"
                    placeholder="Opcional"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Precio *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border w-full p-3 rounded-xl mb-3"
                    placeholder="89"
                    value={form.precio}
                    onChange={(e) =>
                      setForm({ ...form, precio: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">
                    Precio anterior
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border w-full p-3 rounded-xl mb-3"
                    placeholder="119"
                    value={form.precio_anterior}
                    onChange={(e) =>
                      setForm({ ...form, precio_anterior: e.target.value })
                    }
                  />
                </div>
              </div>

              <label className="block text-sm font-bold mb-1">
                Descripción comercial
              </label>
              <textarea
                className="border w-full p-3 rounded-xl mb-3 min-h-24"
                placeholder="Explica de forma clara qué es y por qué conviene."
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
              />

              <label className="block text-sm font-bold mb-1">
                Características
              </label>
              <textarea
                className="border w-full p-3 rounded-xl mb-3 min-h-20"
                placeholder={"Una por línea\nEj: Acero HSS\nEj: Varios diámetros"}
                value={form.caracteristicas}
                onChange={(e) =>
                  setForm({ ...form, caracteristicas: e.target.value })
                }
              />

              <label className="block text-sm font-bold mb-1">Usos</label>
              <textarea
                className="border w-full p-3 rounded-xl mb-3 min-h-20"
                placeholder={"Uno por línea\nEj: Metal\nEj: PVC"}
                value={form.usos}
                onChange={(e) => setForm({ ...form, usos: e.target.value })}
              />

              <label className="block text-sm font-bold mb-1">
                Qué incluye
              </label>
              <textarea
                className="border w-full p-3 rounded-xl mb-3 min-h-20"
                placeholder={"Uno por línea\nEj: 1 broca escalonada"}
                value={form.incluye}
                onChange={(e) =>
                  setForm({ ...form, incluye: e.target.value })
                }
              />

              <label className="block text-sm font-bold mb-1">Garantía</label>
              <input
                className="border w-full p-3 rounded-xl mb-4"
                placeholder="Ej: 30 días por falla de fábrica"
                value={form.garantia}
                onChange={(e) =>
                  setForm({ ...form, garantia: e.target.value })
                }
              />

              <div className="border rounded-2xl p-4 mb-4 bg-slate-50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-black">🔥 Promociones</p>
                    <p className="text-xs text-gray-500">
                      Ej: 2 unidades por S/159.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={agregarPromocion}
                    className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg font-bold"
                  >
                    + Agregar
                  </button>
                </div>

                {form.promociones.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Sin promociones adicionales.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.promociones.map((promo, index) => (
                      <div
                        key={index}
                        className="bg-white border rounded-xl p-3"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="1"
                            className="border p-2 rounded-lg"
                            placeholder="Cantidad"
                            value={promo.cantidad}
                            onChange={(e) =>
                              actualizarPromocion(
                                index,
                                "cantidad",
                                e.target.value
                              )
                            }
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="border p-2 rounded-lg"
                            placeholder="Precio"
                            value={promo.precio}
                            onChange={(e) =>
                              actualizarPromocion(
                                index,
                                "precio",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <input
                          className="border p-2 rounded-lg w-full mt-2"
                          placeholder="Texto opcional: Promo 2 por S/159"
                          value={promo.texto || ""}
                          onChange={(e) =>
                            actualizarPromocion(index, "texto", e.target.value)
                          }
                        />

                        <button
                          type="button"
                          onClick={() => eliminarPromocionFormulario(index)}
                          className="text-red-600 font-bold text-xs mt-2"
                        >
                          Quitar promoción
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <label className="border rounded-xl p-3 flex items-center gap-2 font-bold text-sm">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) =>
                      setForm({ ...form, activo: e.target.checked })
                    }
                  />
                  Producto activo
                </label>

                <label className="border rounded-xl p-3 flex items-center gap-2 font-bold text-sm">
                  <input
                    type="checkbox"
                    checked={form.ia_activo}
                    onChange={(e) =>
                      setForm({ ...form, ia_activo: e.target.checked })
                    }
                  />
                  IA puede vender
                </label>
              </div>

              <button
                disabled={guardando}
                className="bg-green-600 disabled:opacity-50 text-white w-full py-3 rounded-xl font-black"
              >
                {guardando
                  ? "Guardando..."
                  : form.id
                  ? "Guardar cambios"
                  : "Crear producto"}
              </button>
            </form>

            <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Mis productos</h2>
                    <p className="text-sm text-gray-500">
                      {productos.length} producto(s) en este negocio.
                    </p>
                  </div>

                  <input
                    className="border rounded-xl px-4 py-3 md:w-80"
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>

              {cargando ? (
                <div className="p-8 text-gray-500">Cargando catálogo...</div>
              ) : productosFiltrados.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="font-black text-lg">Aún no hay productos</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Crea el primero desde el formulario.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {productosFiltrados.map((producto) => (
                    <article key={producto.id} className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-lg">
                              {producto.nombre}
                            </h3>

                            <span
                              className={`text-xs font-black px-2 py-1 rounded-full ${
                                producto.activo
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {producto.activo ? "ACTIVO" : "INACTIVO"}
                            </span>

                            <span
                              className={`text-xs font-black px-2 py-1 rounded-full ${
                                producto.ia_activo
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {producto.ia_activo
                                ? "🤖 IA VENDE"
                                : "IA DESACTIVADA"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-baseline gap-2 mt-2">
                            <p className="text-2xl font-black text-green-600">
                              S/{Number(producto.precio).toFixed(2)}
                            </p>

                            {producto.precio_anterior != null && (
                              <p className="text-gray-400 line-through">
                                S/{Number(producto.precio_anterior).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {producto.sku && (
                            <p className="text-xs text-gray-500 mt-1">
                              SKU: {producto.sku}
                            </p>
                          )}

                          {producto.descripcion && (
                            <p className="text-sm text-gray-600 mt-3 max-w-2xl">
                              {producto.descripcion}
                            </p>
                          )}

                          {producto.promociones?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {producto.promociones.map((promo, index) => (
                                <span
                                  key={promo.id || index}
                                  className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded-full text-sm font-bold"
                                >
                                  🔥 {promo.cantidad} por S/
                                  {Number(promo.precio).toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-4">
                            <button
                              type="button"
                              onClick={() => cambiarEstado(producto, "activo")}
                              className="border px-3 py-2 rounded-lg text-sm font-bold"
                            >
                              {producto.activo ? "Desactivar" : "Activar"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                cambiarEstado(producto, "ia_activo")
                              }
                              className="border px-3 py-2 rounded-lg text-sm font-bold"
                            >
                              {producto.ia_activo
                                ? "Pausar IA"
                                : "Activar IA"}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => editarProducto(producto)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarProducto(producto)}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
`;

fs.writeFileSync(files.api, api, "utf8");
fs.writeFileSync(files.apiId, apiId, "utf8");
fs.writeFileSync(files.page, page, "utf8");

console.log("API /api/productos: OK");
console.log("API /api/productos/[id]: OK");
console.log("PAGINA /catalogo: OK");
console.log("PROMOCIONES: OK");
console.log("MULTIEMPRESA empresa_id: OK");
console.log("PATCH CATALOGO IA V1 APLICADO");
