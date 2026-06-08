"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const estados = [
  "Nuevo",
  "Interesado",
  "Seguimiento",
  "Pendiente Adelanto",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
  "No Responde",
];

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  etapa: string;
  asesor: string | null;
  observacion?: string | null;
  proximo_seguimiento?: string | null;
  ultima_gestion?: string | null;
  cantidad_seguimientos?: number;
  created_at: string;
};

type Conversacion = {
  id: number;
  cliente_id: number;
  telefono: string | null;
  mensaje: string;
  tipo: string;
  remitente: string;
  created_at: string;
};

export default function Home() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
useEffect(() => {
  const usuario = localStorage.getItem("usuario");

  if (!usuario) {
    window.location.href = "/login";
  }
}, []);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [clienteSeguimiento, setClienteSeguimiento] =
    useState<Cliente | null>(null);
  const [fechaSeguimiento, setFechaSeguimiento] = useState("");
  const [observacionSeguimiento, setObservacionSeguimiento] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    ciudad: "",
    etapa: "Nuevo",
    asesor: "",
  });

  const seguimientosPendientes = clientes.filter(
    (c) =>
      c.proximo_seguimiento &&
      new Date(c.proximo_seguimiento) <= new Date() &&
      !["Pagó Adelanto", "Enviado", "Entregado"].includes(c.etapa)
  );

const seguimientosVencidos = clientes.filter(
  (c) =>
    c.proximo_seguimiento &&
    new Date(c.proximo_seguimiento) < new Date() &&
    !["Pagó Adelanto", "Enviado", "Entregado"].includes(c.etapa)
);

const seguimientosHoy = clientes.filter((c) => {
  if (!c.proximo_seguimiento) return false;

  const fecha = new Date(c.proximo_seguimiento);
  const hoy = new Date();

  return (
    fecha.toDateString() === hoy.toDateString() &&
    !["Pagó Adelanto", "Enviado", "Entregado"].includes(c.etapa)
  );
});

  const cargarClientes = async () => {
    try {
      const usuarioGuardado = localStorage.getItem("usuario");

if (!usuarioGuardado) {
  window.location.href = "/login";
  return;
}

const usuario = JSON.parse(usuarioGuardado);

const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
  cache: "no-store",
});
      const data = await res.json();

      if (data.success) {
        setClientes(data.clientes);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    } finally {
      setCargando(false);
    }
  };

  const abrirConversacion = async (cliente: Cliente) => {
    setClienteActivo(cliente);

    try {
      const res = await fetch(`/api/conversaciones/${cliente.id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setConversaciones(data.conversaciones);
      }
    } catch (error) {
      console.error("Error abriendo conversación:", error);
    }
  };

  useEffect(() => {
    cargarClientes();

    const intervalo = setInterval(() => {
      cargarClientes();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  const cambiarEtapa = async (id: number, nuevaEtapa: string) => {
    try {
      setClientes((prev) =>
        prev.map((cliente) =>
          cliente.id === id ? { ...cliente, etapa: nuevaEtapa } : cliente
        )
      );

      const res = await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: nuevaEtapa }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("No se pudo actualizar la etapa");
        cargarClientes();
      }
    } catch (error) {
      console.error("Error cambiando etapa:", error);
      alert("Error cambiando etapa");
      cargarClientes();
    }
  };

  const crearCliente = async () => {
    if (!form.nombre || !form.telefono) {
      alert("Completa nombre y teléfono");
      return;
    }

    try {
      const usuario = JSON.parse(
  localStorage.getItem("usuario") || "{}"
);

const res = await fetch("/api/clientes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...form,
    empresa_id: usuario.empresa_id,
  }),
});

      const data = await res.json();

      if (!data.success) {
        alert("No se pudo crear el cliente");
        return;
      }

      setMostrarModal(false);
      setForm({
        nombre: "",
        telefono: "",
        ciudad: "",
        etapa: "Nuevo",
        asesor: "",
      });

      cargarClientes();
    } catch (error) {
      console.error("Error creando cliente:", error);
      alert("Error creando cliente");
    }
  };

const guardarSeguimiento = async () => {
  if (!clienteSeguimiento || !fechaSeguimiento) {
    alert("Selecciona fecha y hora");
    return;
  }

  const nuevaCantidad =
    (clienteSeguimiento.cantidad_seguimientos || 0) + 1;

  try {
    console.log("GUARDANDO SEGUIMIENTO");

    console.log({
      cliente: clienteSeguimiento.id,
      fechaSeguimiento,
      observacionSeguimiento,
      nuevaCantidad,
    });

alert(
  `Cliente: ${clienteSeguimiento.nombre} | ID: ${clienteSeguimiento.id}`
);

    const res = await fetch(
      `/api/clientes/${clienteSeguimiento.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
proximo_seguimiento: new Date(fechaSeguimiento).toISOString(),          observacion: observacionSeguimiento,
          ultima_gestion: new Date().toISOString(),
          cantidad_seguimientos: nuevaCantidad,
          etapa: "Seguimiento",
        }),
      }
    );

    const data = await res.json();

    if (!data.success) {
      alert("No se pudo guardar el seguimiento");
      return;
    }

    setClienteSeguimiento(null);
    setFechaSeguimiento("");
    setObservacionSeguimiento("");

    await cargarClientes();

    alert("Seguimiento guardado correctamente");
  } catch (error) {
    console.error("Error guardando seguimiento:", error);
    alert("Error guardando seguimiento");
  }
};

  const enviarMensaje = async () => {
    if (!clienteActivo || !mensajeNuevo.trim()) return;

    try {
      setEnviando(true);

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cliente_id: clienteActivo.id,
          telefono: clienteActivo.telefono,
          mensaje: mensajeNuevo,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("No se pudo enviar el mensaje");
        return;
      }

      setMensajeNuevo("");
      abrirConversacion(clienteActivo);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      alert("Error enviando mensaje");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold text-yellow-400">Kafes CRM</h1>

        <div className="mt-10 space-y-4">
  <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
    Dashboard
  </div>

  <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
    Clientes
  </div>

  <Link
    href="/seguimientos"
    className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
  >
    Seguimientos
  </Link>

  <Link
    href="/mis-pendientes"
    className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
  >
    Mis Pendientes
  </Link>

  <Link
    href="/adelantos"
    className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
  >
    Adelantos
  </Link>

  <Link
    href="/chat"
    className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
  >
    Chats
  </Link>

  <Link
    href="/productividad"
    className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
  >
    Productividad
  </Link>

  <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
    Ventas
  </div>

  <div className="p-3 hover:bg-zinc-800 rounded-lg cursor-pointer">
    Reportes
  </div>

<Link
  href="/usuarios"
  className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
>
  Usuarios
</Link>

<Link
  href="/configuracion/whatsapp"
  className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
>
  Configuración WhatsApp
</Link>

<Link
  href="/plantillas"
  className="block p-3 hover:bg-zinc-800 rounded-lg cursor-pointer"
>
  Plantillas
</Link>

</div>
        <div className="mt-10 bg-zinc-900 p-4 rounded-xl">
          <p className="text-sm text-gray-400">Resumen hoy</p>
          <p className="mt-2">Clientes: {clientes.length}</p>
          <p>Seguimientos: {seguimientosPendientes.length}</p>
          <p>
            Adelantos:{" "}
            {clientes.filter((c) => c.etapa === "Pagó Adelanto").length}
          </p>
          <p>
            Entregados:{" "}
            {clientes.filter((c) => c.etapa === "Entregado").length}
          </p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-x-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Embudo de Ventas</h2>

<button
  onClick={() => {
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  }}
  className="bg-red-600 text-white px-5 py-3 rounded-lg font-bold"
>
  Cerrar sesión
</button>

          <div className="flex gap-3">
            <button
              onClick={cargarClientes}
              className="bg-gray-800 text-white px-5 py-3 rounded-lg font-bold"
            >
              Actualizar
            </button>

            <button
              onClick={() => setMostrarModal(true)}
              className="bg-yellow-500 text-black px-5 py-3 rounded-lg font-bold hover:bg-yellow-400"
            >
              + Nuevo Cliente
            </button>
          </div>
        </div>

<div className="grid grid-cols-4 gap-4 mt-6">
  <div className="bg-red-600 text-white rounded-xl p-4 shadow">
    <p className="text-sm opacity-90">🚨 Vencidos</p>
    <p className="text-3xl font-bold">
      {seguimientosVencidos.length}
    </p>
  </div>

  <div className="bg-orange-500 text-white rounded-xl p-4 shadow">
    <p className="text-sm opacity-90">📅 Para hoy</p>
    <p className="text-3xl font-bold">
      {seguimientosHoy.length}
    </p>
  </div>

  <div className="bg-gray-800 text-white rounded-xl p-4 shadow">
    <p className="text-sm opacity-90">👥 Clientes</p>
    <p className="text-3xl font-bold">
      {clientes.length}
    </p>
  </div>

  <div className="bg-green-600 text-white rounded-xl p-4 shadow">
    <p className="text-sm opacity-90">💰 Adelantos</p>
    <p className="text-3xl font-bold">
      {clientes.filter((c) => c.etapa === "Pagó Adelanto").length}
    </p>
  </div>
</div>

        {seguimientosPendientes.length > 0 && (
          <div className="mt-6 bg-orange-100 border border-orange-300 rounded-xl p-4">
            <p className="font-bold text-orange-700">
              🔥 Seguimientos pendientes: {seguimientosPendientes.length}
            </p>
            <p className="text-sm text-orange-700">
              Estos clientes ya deberían ser contactados nuevamente.
            </p>
          </div>
        )}

        {cargando ? (
          <p className="mt-8 text-gray-500">Cargando clientes...</p>
        ) : (
          <div className="grid grid-cols-7 gap-4 mt-8 min-w-[1400px]">
            {estados.map((estado) => (
              <div
                key={estado}
                className="bg-white rounded-xl shadow p-4 min-h-[500px]"
              >
                <h3 className="font-bold mb-3">
                  {estado}{" "}
                  <span className="text-gray-400">
                    {clientes.filter((c) => c.etapa === estado).length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {clientes
                    .filter((cliente) => cliente.etapa === estado)
                    .map((cliente) => {
                      const seguimientoVencido =
                        cliente.proximo_seguimiento &&
                        new Date(cliente.proximo_seguimiento) <= new Date() &&
                        !["Pagó Adelanto", "Enviado", "Entregado"].includes(
                          cliente.etapa
                        );

                      return (
                        <div
                          key={cliente.id}
                          className={`p-3 rounded-lg ${
                            seguimientoVencido
                              ? "bg-red-100 border-2 border-red-500"
                              : "bg-gray-100"
                          }`}
                        >
                          <p className="font-semibold">
                            {cliente.nombre || "Sin nombre"}
                          </p>

                          <p className="text-sm">📱 {cliente.telefono}</p>

                          <p className="text-green-600 text-sm">
                            📍 {cliente.ciudad || "Sin ciudad"}
                          </p>

                          {cliente.proximo_seguimiento && (
                            <p className="text-orange-600 text-xs mt-1">
                              📅 Seguimiento:{" "}
                              {new Date(
                                cliente.proximo_seguimiento
                              ).toLocaleString()}
                            </p>
                          )}

                          {cliente.observacion && (
                            <p className="text-xs text-gray-600 mt-1">
                              📝 {cliente.observacion}
                            </p>
                          )}

                          <p className="text-blue-600 text-xs">
                            🔥 Seguimientos:{" "}
                            {cliente.cantidad_seguimientos || 0}
                          </p>

{cliente.ultima_gestion && (
  <p className="text-xs text-purple-600 mt-1">
    📞 Última gestión:
    {" "}
    {new Date(cliente.ultima_gestion).toLocaleDateString("es-PE")}
  </p>
)}

                          <p className="text-xs mt-2 text-gray-500">
                            Etapa: {cliente.etapa}
                          </p>

                          <select
                            className="border w-full p-2 mt-3 rounded text-sm bg-white"
                            value={cliente.etapa}
                            onChange={(e) =>
                              cambiarEtapa(cliente.id, e.target.value)
                            }
                          >
                            {estados.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>

                          {cliente.asesor && (
                            <p className="text-xs text-gray-500 mt-2">
                              Asesor: {cliente.asesor}
                            </p>
                          )}

                          <button
                            onClick={() => abrirConversacion(cliente)}
                            className="block bg-blue-600 text-white text-center mt-3 py-2 rounded text-sm font-bold w-full"
                          >
                            Ver conversación
                          </button>

                          <button
                            onClick={() => {
                              setClienteSeguimiento(cliente);
                              setFechaSeguimiento("");
                              setObservacionSeguimiento(
                                cliente.observacion || ""
                              );
                            }}
                            className="block bg-orange-500 text-white text-center mt-2 py-2 rounded text-sm font-bold w-full"
                          >
                            📅 Programar seguimiento
                          </button>

                          <a
                            href={`https://wa.me/51${cliente.telefono.replace(
                              /\s/g,
                              ""
                            )}`}
                            target="_blank"
                            className="block bg-green-600 text-white text-center mt-2 py-2 rounded text-sm font-bold"
                          >
                            Abrir WhatsApp
                          </a>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {clienteActivo && (
        <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="text-xl font-bold">Conversación</h2>
            <button
              onClick={() => setClienteActivo(null)}
              className="text-red-500 font-bold"
            >
              Cerrar
            </button>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg m-5">
            <p className="font-bold">{clienteActivo.nombre}</p>
            <p className="text-sm">📱 {clienteActivo.telefono}</p>
            <p className="text-sm">📍 {clienteActivo.ciudad || "Sin ciudad"}</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto p-5">
            {conversaciones.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Aún no hay mensajes guardados para este cliente.
              </p>
            ) : (
              conversaciones.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg text-sm ${
                    msg.remitente === "cliente"
                      ? "bg-green-100"
                      : "bg-gray-200"
                  }`}
                >
                  <p>{msg.mensaje}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {msg.remitente} ·{" "}
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-4">
            <textarea
              className="w-full border rounded-lg p-3"
              rows={3}
              placeholder="Escribe un mensaje..."
              value={mensajeNuevo}
              onChange={(e) => setMensajeNuevo(e.target.value)}
            />

            <button
              onClick={enviarMensaje}
              disabled={enviando}
              className="w-full bg-green-600 text-white py-3 rounded-lg mt-3 font-bold disabled:bg-gray-400"
            >
              {enviando ? "Enviando..." : "Enviar WhatsApp"}
            </button>
          </div>
        </div>
      )}

      {clienteSeguimiento && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[430px] shadow-xl">
            <h2 className="text-2xl font-bold mb-4">
              Programar Seguimiento
            </h2>

            <p className="mb-3 text-sm">
              Cliente: <strong>{clienteSeguimiento.nombre}</strong>
            </p>

            <input
              type="datetime-local"
              className="border w-full p-3 mb-3 rounded-lg"
              value={fechaSeguimiento}
              onChange={(e) => setFechaSeguimiento(e.target.value)}
            />

            <textarea
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Observación del seguimiento"
              value={observacionSeguimiento}
              onChange={(e) => setObservacionSeguimiento(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setClienteSeguimiento(null)}
                className="bg-gray-300 px-4 py-2 rounded-lg w-full"
              >
                Cancelar
              </button>

              <button
                onClick={guardarSeguimiento}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg w-full font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[430px] shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Nuevo Cliente</h2>

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Teléfono / WhatsApp"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Ciudad"
              value={form.ciudad}
              onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
            />

            <input
              className="border w-full p-3 mb-3 rounded-lg"
              placeholder="Asesor"
              value={form.asesor}
              onChange={(e) => setForm({ ...form, asesor: e.target.value })}
            />

            <select
              className="border w-full p-3 mb-4 rounded-lg"
              value={form.etapa}
              onChange={(e) => setForm({ ...form, etapa: e.target.value })}
            >
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="bg-gray-300 px-4 py-2 rounded-lg w-full"
              >
                Cancelar
              </button>

              <button
                onClick={crearCliente}
                className="bg-green-600 text-white px-4 py-2 rounded-lg w-full font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}