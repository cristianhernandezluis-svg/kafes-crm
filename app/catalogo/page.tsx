"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import VerificarSuscripcion from "@/components/VerificarSuscripcion";

type Multimedia = {
  id: number;
  tipo: "foto" | "video" | "audio" | "gif";
  url: string;
  orden: number;
  activo: boolean;
  created_at?: string;
};

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
  multimedia: Multimedia[];
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
  return valor.split("\n").map((x) => x.trim()).filter(Boolean);
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState<FormProducto>({ ...FORM_VACIO });
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [subiendoMedia, setSubiendoMedia] = useState(false);
  const [temaClaro, setTemaClaro] = useState(false);

  const cambiarTema = () => {
    setTemaClaro((actual) => !actual);
  };

  const cargarProductos = async (empresa: number) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/productos?empresa_id=${empresa}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setProductos(data.productos || []);
      else setMensajeEstado(data.error || "No se pudo cargar el catálogo");
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
      precio_anterior: producto.precio_anterior == null ? "" : String(producto.precio_anterior),
      descripcion: producto.descripcion || "",
      caracteristicas: Array.isArray(producto.caracteristicas) ? producto.caracteristicas.join("\n") : "",
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
        { cantidad: "", precio: "", texto: "", activo: true, orden: actual.promociones.length },
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!data.success) {
        setMensajeEstado(data.error || "No se pudo guardar el producto");
        return;
      }

      if (editando) {
        setMensajeEstado("Producto actualizado correctamente ✅");
      } else {
        setMensajeEstado("Producto creado correctamente ✅ Ya puedes subir fotos y videos.");
        setForm((actual) => ({
          ...actual,
          id: Number(data.producto?.id || 0) || null,
        }));
      }

      await cargarProductos(empresaId);
    } catch {
      setMensajeEstado("No se pudo guardar el producto");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (producto: Producto, campo: "activo" | "ia_activo") => {
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
      ia_activo: campo === "ia_activo" ? !producto.ia_activo : producto.ia_activo,
      promociones: producto.promociones || [],
    };

    const res = await fetch(`/api/productos/${producto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) await cargarProductos(empresaId);
    else setMensajeEstado(data.error || "No se pudo cambiar el estado");
  };

  const subirMultimedia = async (archivos: FileList | null) => {
    if (!empresaId || !form.id || !archivos || archivos.length === 0) return;

    setSubiendoMedia(true);
    setMensajeEstado("");

    try {
      for (const archivo of Array.from(archivos)) {
        const data = new FormData();
        data.append("empresa_id", String(empresaId));
        data.append("archivo", archivo);

        const res = await fetch(`/api/productos/${form.id}/multimedia`, {
          method: "POST",
          body: data,
        });

        const respuesta = await res.json();

        if (!respuesta.success) {
          throw new Error(respuesta.error || "No se pudo subir un archivo");
        }
      }

      setMensajeEstado("Multimedia subida correctamente ✅");
      await cargarProductos(empresaId);
    } catch (error: any) {
      setMensajeEstado(error?.message || "No se pudo subir la multimedia");
    } finally {
      setSubiendoMedia(false);
    }
  };

  const usarComoPortada = async (mediaId: number) => {
    if (!empresaId) return;

    setMensajeEstado("");

    const res = await fetch(
      `/api/productos/media/${mediaId}?empresa_id=${empresaId}`,
      { method: "PATCH" }
    );

    const data = await res.json();

    if (!data.success) {
      setMensajeEstado(data.error || "No se pudo cambiar la portada");
      return;
    }

    setMensajeEstado("Portada del producto actualizada");
    await cargarProductos(empresaId);
  };

  const eliminarMultimedia = async (mediaId: number) => {
    if (!empresaId) return;

    const res = await fetch(
      `/api/productos/media/${mediaId}?empresa_id=${empresaId}`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (!data.success) {
      setMensajeEstado(data.error || "No se pudo eliminar el archivo");
      return;
    }

    setMensajeEstado("Archivo eliminado del catálogo");
    await cargarProductos(empresaId);
  };

  const eliminarProducto = async (producto: Producto) => {
    if (!empresaId) return;

    const confirmar = window.confirm(`¿Eliminar "${producto.nombre}" del catálogo?`);
    if (!confirmar) return;

    const res = await fetch(`/api/productos/${producto.id}?empresa_id=${empresaId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!data.success) {
      setMensajeEstado(data.error || "No se pudo eliminar el producto");
      return;
    }

    if (form.id === producto.id) limpiarFormulario();
    await cargarProductos(empresaId);
  };

  return (
    <>
      <VerificarSuscripcion />
      <div className={`min-h-screen flex transition-colors duration-300 ${temaClaro ? "bg-slate-100 text-slate-900" : "bg-[#0b1220] text-white"}`}>
        <aside className={`hidden lg:flex w-60 flex-col h-screen sticky top-0 border-r transition-colors duration-300 ${temaClaro ? "bg-white text-slate-800 border-slate-200" : "bg-[#101820] text-white border-[#1f2a33]"}`}>
          <div className={`flex items-center gap-3 px-4 py-4 border-b ${temaClaro ? "border-slate-200" : "border-[#1f2a33]"}`}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
              K
            </div>
            <h1 className="text-xl font-black">
              Kafes <span className="text-green-400">CRM</span>
            </h1>
          </div>

          <div className="px-4 pt-5 pb-2">
            <p className={`text-[11px] uppercase font-bold ${temaClaro ? "text-slate-500" : "text-slate-400"}`}>
              Principal
            </p>
          </div>

          <nav className="flex-1 px-2 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Dashboard
            </Link>

            <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Conversaciones
            </Link>

            <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Contactos
            </Link>

            <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Kanban
            </Link>

            <Link href="/catalogo" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">
              Catalogo IA
            </Link>

            <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Plantillas
            </Link>

            <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Automatizaciones
            </Link>

            <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Reportes
            </Link>

            <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
              Ajustes
            </Link>
          </nav>

          <div className="p-3">
            <div className={`border rounded-xl p-4 transition-colors duration-300 ${temaClaro ? "border-slate-200 bg-slate-50" : "border-[#26323d] bg-[#111c24]"}`}>
              <p className={`text-sm font-bold mb-3 ${temaClaro ? "text-slate-700" : "text-slate-300"}`}>
                Conexion WhatsApp
              </p>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
                  ●
                </div>

                <div>
                  <p className="text-green-400 font-bold text-sm">Conectado</p>
                  <p className="text-xs text-slate-400">Cloud API activa</p>
                </div>
              </div>

              <Link
                href="/configuracion/whatsapp"
                className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800"
              >
                VER QR
              </Link>

              <div className={`mt-3 pt-3 border-t ${temaClaro ? "border-slate-200" : "border-[#26323d]"}`}>
                <button
                  type="button"
                  onClick={cambiarTema}
                  className="w-full flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {temaClaro ? "Modo claro" : "Modo oscuro"}
                    </span>
                  </div>

                  <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${temaClaro ? "bg-green-500" : "bg-slate-600"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${temaClaro ? "left-[22px]" : "left-0.5"}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("usuario");
              window.location.href = "/login";
            }}
            className="px-4 pb-4 text-left text-slate-400 hover:text-red-400 text-sm"
          >
            Cerrar sesion
          </button>
        </aside>

        <main className="flex-1 min-w-0 min-h-screen bg-gray-100 p-4 md:p-8 text-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-bold text-green-600 uppercase tracking-wide">Vendedor Maestro</p>
              <h1 className="text-3xl font-black">📦 Catálogo IA</h1>
              <p className="text-gray-500 mt-1">Carga tus productos, precios y promociones. La IA usará este catálogo para vender.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={limpiarFormulario} className="bg-green-600 text-white px-5 py-3 rounded-xl font-bold">
                + Nuevo producto
              </button>
              <a href="/dashboard" className="bg-black text-white px-5 py-3 rounded-xl font-bold">Volver</a>
            </div>
          </div>

          {mensajeEstado && (
            <div className="mb-5 bg-white border rounded-xl px-4 py-3 font-semibold">{mensajeEstado}</div>
          )}

          <div className="grid xl:grid-cols-[440px_1fr] gap-6 items-start">
            <form onSubmit={guardarProducto} className="bg-white rounded-2xl shadow-sm border p-5 xl:sticky xl:top-4">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-black">{form.id ? "Editar producto" : "Nuevo producto"}</h2>
                  <p className="text-sm text-gray-500">Información que utilizará el vendedor IA.</p>
                </div>
                {form.id && (
                  <button type="button" onClick={limpiarFormulario} className="text-sm font-bold text-gray-500">Cancelar</button>
                )}
              </div>

              <label className="block text-sm font-bold mb-1">Nombre *</label>
              <input className="border w-full p-3 rounded-xl mb-3 outline-none focus:border-green-500" placeholder="Ej: Broca Escalonada" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">SKU</label>
                  <input className="border w-full p-3 rounded-xl mb-3" placeholder="BROCA-001" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Stock</label>
                  <input type="number" min="0" className="border w-full p-3 rounded-xl mb-3" placeholder="Opcional" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Precio *</label>
                  <input type="number" min="0" step="0.01" className="border w-full p-3 rounded-xl mb-3" placeholder="89" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Precio anterior</label>
                  <input type="number" min="0" step="0.01" className="border w-full p-3 rounded-xl mb-3" placeholder="119" value={form.precio_anterior} onChange={(e) => setForm({ ...form, precio_anterior: e.target.value })} />
                </div>
              </div>

              <label className="block text-sm font-bold mb-1">Descripción comercial</label>
              <textarea className="border w-full p-3 rounded-xl mb-3 min-h-24" placeholder="Explica de forma clara qué es y por qué conviene." value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />

              <label className="block text-sm font-bold mb-1">Características</label>
              <textarea className="border w-full p-3 rounded-xl mb-3 min-h-20" placeholder={"Una por línea\nEj: Acero HSS\nEj: Varios diámetros"} value={form.caracteristicas} onChange={(e) => setForm({ ...form, caracteristicas: e.target.value })} />

              <label className="block text-sm font-bold mb-1">Usos</label>
              <textarea className="border w-full p-3 rounded-xl mb-3 min-h-20" placeholder={"Uno por línea\nEj: Metal\nEj: PVC"} value={form.usos} onChange={(e) => setForm({ ...form, usos: e.target.value })} />

              <label className="block text-sm font-bold mb-1">Qué incluye</label>
              <textarea className="border w-full p-3 rounded-xl mb-3 min-h-20" placeholder={"Uno por línea\nEj: 1 broca escalonada"} value={form.incluye} onChange={(e) => setForm({ ...form, incluye: e.target.value })} />

              <label className="block text-sm font-bold mb-1">Garantía</label>
              <input className="border w-full p-3 rounded-xl mb-4" placeholder="Ej: 30 días por falla de fábrica" value={form.garantia} onChange={(e) => setForm({ ...form, garantia: e.target.value })} />

              <div className="border rounded-2xl p-4 mb-4 bg-slate-50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-black">🔥 Promociones</p>
                    <p className="text-xs text-gray-500">Ej: 2 unidades por S/159.</p>
                  </div>
                  <button type="button" onClick={agregarPromocion} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg font-bold">+ Agregar</button>
                </div>

                {form.promociones.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin promociones adicionales.</p>
                ) : (
                  <div className="space-y-3">
                    {form.promociones.map((promo, index) => (
                      <div key={index} className="bg-white border rounded-xl p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" min="1" className="border p-2 rounded-lg" placeholder="Cantidad" value={promo.cantidad} onChange={(e) => actualizarPromocion(index, "cantidad", e.target.value)} />
                          <input type="number" min="0" step="0.01" className="border p-2 rounded-lg" placeholder="Precio" value={promo.precio} onChange={(e) => actualizarPromocion(index, "precio", e.target.value)} />
                        </div>
                        <input className="border p-2 rounded-lg w-full mt-2" placeholder="Texto opcional: Promo 2 por S/159" value={promo.texto || ""} onChange={(e) => actualizarPromocion(index, "texto", e.target.value)} />
                        <button type="button" onClick={() => eliminarPromocionFormulario(index)} className="text-red-600 font-bold text-xs mt-2">Quitar promoción</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-2xl p-4 mb-4 bg-slate-50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="font-black">📷 Fotos y videos</p>
                    <p className="text-xs text-gray-500">
                      La IA podrá usar estos archivos al presentar el producto.
                    </p>
                  </div>
                </div>

                {!form.id ? (
                  <p className="text-sm text-gray-500">
                    Primero guarda el producto. Luego podrás subir su multimedia.
                  </p>
                ) : (
                  <>
                    <label className="block cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-4 text-center bg-white hover:bg-slate-50">
                      <input
                        type="file"
                        accept="image/*,video/*,audio/*"
                        multiple
                        className="hidden"
                        disabled={subiendoMedia}
                        onChange={(e) => {
                          subirMultimedia(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                      <span className="font-black">
                        {subiendoMedia ? "Subiendo..." : "+ Subir fotos o videos"}
                      </span>
                      <span className="block text-xs text-gray-500 mt-1">
                        Máximo 30 MB por archivo
                      </span>
                    </label>

                    {(() => {
                      const productoEditado = productos.find((p) => p.id === form.id);
                      const multimedia = productoEditado?.multimedia || [];

                      if (multimedia.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 mt-3">
                            Este producto todavía no tiene multimedia.
                          </p>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          {multimedia.map((media) => {
                            const src = `/api/productos/media/${media.id}?empresa_id=${empresaId}`;

                            return (
                              <div key={media.id} className="border rounded-xl overflow-hidden bg-white">
                                <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                                  {media.tipo === "foto" || media.tipo === "gif" ? (
                                    <img
                                      src={src}
                                      alt="Multimedia del producto"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : media.tipo === "video" ? (
                                    <video
                                      src={src}
                                      controls
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="p-3 text-center text-sm font-bold">
                                      🎵 Audio
                                    </div>
                                  )}
                                </div>

                                <div className="border-t">
                                  {(media.tipo === "foto" || media.tipo === "gif") && (
                                    media.orden === 0 ? (
                                      <div className="w-full py-2 text-center text-xs font-black text-amber-600 bg-amber-50">
                                        ⭐ Portada actual
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => usarComoPortada(media.id)}
                                        className="w-full py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                                      >
                                        ☆ Usar como portada
                                      </button>
                                    )
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => eliminarMultimedia(media.id)}
                                    className="w-full py-2 text-xs font-black text-red-600 border-t"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <label className="border rounded-xl p-3 flex items-center gap-2 font-bold text-sm">
                  <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                  Producto activo
                </label>
                <label className="border rounded-xl p-3 flex items-center gap-2 font-bold text-sm">
                  <input type="checkbox" checked={form.ia_activo} onChange={(e) => setForm({ ...form, ia_activo: e.target.checked })} />
                  IA puede vender
                </label>
              </div>

              <button disabled={guardando} className="bg-green-600 disabled:opacity-50 text-white w-full py-3 rounded-xl font-black">
                {guardando ? "Guardando..." : form.id ? "Guardar cambios" : "Crear producto"}
              </button>
            </form>

            <section className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Mis productos</h2>
                    <p className="text-sm text-gray-500">{productos.length} producto(s) en este negocio.</p>
                  </div>
                  <input className="border rounded-xl px-4 py-3 md:w-80" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
              </div>

              {cargando ? (
                <div className="p-8 text-gray-500">Cargando catálogo...</div>
              ) : productosFiltrados.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="font-black text-lg">Aún no hay productos</p>
                  <p className="text-gray-500 text-sm mt-1">Crea el primero desde el formulario.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {productosFiltrados.map((producto) => (
                    <article key={producto.id} className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-lg">{producto.nombre}</h3>
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${producto.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                              {producto.activo ? "ACTIVO" : "INACTIVO"}
                            </span>
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${producto.ia_activo ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-600"}`}>
                              {producto.ia_activo ? "🤖 IA VENDE" : "IA DESACTIVADA"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-baseline gap-2 mt-2">
                            <p className="text-2xl font-black text-green-600">S/{Number(producto.precio).toFixed(2)}</p>
                            {producto.precio_anterior != null && (
                              <p className="text-gray-400 line-through">S/{Number(producto.precio_anterior).toFixed(2)}</p>
                            )}
                          </div>

                          {producto.sku && <p className="text-xs text-gray-500 mt-1">SKU: {producto.sku}</p>}
                          {producto.descripcion && <p className="text-sm text-gray-600 mt-3 max-w-2xl">{producto.descripcion}</p>}

                          {producto.promociones?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {producto.promociones.map((promo, index) => (
                                <span key={promo.id || index} className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
                                  🔥 {promo.cantidad} por S/{Number(promo.precio).toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-4">
                            <button type="button" onClick={() => cambiarEstado(producto, "activo")} className="border px-3 py-2 rounded-lg text-sm font-bold">
                              {producto.activo ? "Desactivar" : "Activar"}
                            </button>
                            <button type="button" onClick={() => cambiarEstado(producto, "ia_activo")} className="border px-3 py-2 rounded-lg text-sm font-bold">
                              {producto.ia_activo ? "Pausar IA" : "Activar IA"}
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => editarProducto(producto)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm">Editar</button>
                          <button type="button" onClick={() => eliminarProducto(producto)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold text-sm">Eliminar</button>
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
      </div>
    </>
  );
}
