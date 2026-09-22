"use client";

import { useEffect, useState } from "react";
type ProductoOpcion = {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  ia_activo: boolean;
};

export default function CanalesPage() {
  const [qr, setQr] = useState("");
  const [estado, setEstado] = useState("cargando");
  const [desconectando, setDesconectando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [numeroWhatsapp, setNumeroWhatsapp] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [productoPrincipal, setProductoPrincipal] = useState("");
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [guardandoProducto, setGuardandoProducto] = useState(false);

  async function cargarQR() {
    try {
      const res = await fetch("/api/whatsapp-qr", {
        cache: "no-store",
      });

      const data = await res.json();

      setQr(data.qr || "");
      setEstado(data.estado || "desconectado");
      setNumeroWhatsapp(data.numero_whatsapp || "");
      setEmpresaId(data.empresa_id ? Number(data.empresa_id) : null);
      setProductoPrincipal((actual) => actual || data.producto_slug || "");
    } catch (error) {
      console.error(error);
      setEstado("error");
    }
  }

  async function cargarProductosDisponibles(id: number) {
    try {
      const res = await fetch(`/api/productos?empresa_id=${id}`, {
        cache: "no-store",
      });

      const data = await res.json();
      const disponibles = Array.isArray(data.productos)
        ? data.productos.filter((p: ProductoOpcion) => p.activo && p.ia_activo)
        : [];

      setProductos(disponibles);
    } catch (error) {
      console.error(error);
      setProductos([]);
    }
  }

  async function desconectarWhatsApp() {
    const confirmar = window.confirm(
      "¿Seguro que deseas desconectar este WhatsApp? Se generará un nuevo código QR para vincular otro teléfono."
    );

    if (!confirmar) return;

    try {
      setDesconectando(true);
      setMensaje("");

      const res = await fetch("/api/whatsapp-qr/desconectar", {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        setMensaje(data.error || "No se pudo desconectar WhatsApp");
        return;
      }

      setEstado("desconectado");
      setQr("");
      setMensaje("WhatsApp desconectado. Generando nuevo QR...");

      setTimeout(() => {
        cargarQR();
      }, 1500);
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo desconectar WhatsApp");
    } finally {
      setDesconectando(false);
    }
  }

  async function guardarProductoPrincipal() {
    if (!productoPrincipal) {
      setMensaje("Selecciona un producto principal");
      return;
    }

    try {
      setGuardandoProducto(true);
      setMensaje("");

      const res = await fetch("/api/whatsapp-qr", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producto_slug: productoPrincipal }),
      });

      const data = await res.json();

      if (!data.success) {
        setMensaje(data.error || "No se pudo actualizar el producto principal");
        return;
      }

      setProductoPrincipal(data.producto_slug || productoPrincipal);
      setMensaje("Producto principal actualizado correctamente");
      await cargarQR();
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo actualizar el producto principal");
    } finally {
      setGuardandoProducto(false);
    }
  }

  useEffect(() => {
    cargarQR();

    const intervalo = setInterval(() => {
      cargarQR();
    }, 3000);

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!empresaId) {
      setProductos([]);
      return;
    }

    cargarProductosDisponibles(empresaId);
  }, [empresaId]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">WhatsApp QR</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-md">
        <p className="mb-4">
          Estado:
          <strong className="ml-2">{estado}</strong>
        </p>

        {estado === "conectado" ? (
          <div className="text-center py-10">
            <div className="text-green-600 text-5xl mb-4">✅</div>

            <p className="font-bold text-green-600 mb-6">
              WhatsApp conectado correctamente
            </p>

            {numeroWhatsapp && (
              <p className="text-sm text-gray-600 mb-4">
                Numero conectado: <strong>+{numeroWhatsapp}</strong>
              </p>
            )}

            <div className="text-left border rounded-xl p-4 mb-5">
              <label className="block font-bold mb-2">
                Producto principal de este WhatsApp
              </label>

              <select
                value={productoPrincipal}
                onChange={(e) => setProductoPrincipal(e.target.value)}
                className="w-full border rounded-lg px-3 py-3 mb-3"
              >
                <option value="">Selecciona un producto</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.slug}>
                    {producto.nombre}
                  </option>
                ))}
              </select>

              <button
                onClick={guardarProductoPrincipal}
                disabled={guardandoProducto || !productoPrincipal}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-bold w-full"
              >
                {guardandoProducto ? "Guardando..." : "Guardar producto"}
              </button>

              <p className="text-xs text-gray-500 mt-3">
                Los mensajes como Info, Precio o Me interesa se atenderan usando este producto.
              </p>
            </div>

            <button
              onClick={desconectarWhatsApp}
              disabled={desconectando}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-bold w-full"
            >
              {desconectando
                ? "Desconectando..."
                : "Desconectar WhatsApp"}
            </button>
          </div>
        ) : qr ? (
          <img
            src={qr}
            alt="QR WhatsApp"
            className="w-72 h-72 mx-auto"
          />
        ) : (
          <p>Generando QR...</p>
        )}

        {mensaje && (
          <p className="text-center mt-4 text-sm text-gray-600">
            {mensaje}
          </p>
        )}

        <p className="text-center mt-4 text-gray-500">
          Escanee con WhatsApp Business
        </p>
      </div>
    </div>
  );
}