"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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
  const verificar = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    const res = await fetch("/api/auth/verificar-suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresa_id: usuario.empresa_id,
      }),
    });

    const data = await res.json();

    if (!data.activa) {
      window.location.href = "/suscripcion-vencida";
    }
  };

  verificar();
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
    <div className="min-h-screen bg-[#0b1220] flex text-white">
      <aside className="w-64 bg-[#08111f] text-white p-4 flex flex-col min-h-screen border-r border-slate-800">
  <div className="flex items-center gap-3 mb-8">
    <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center text-black font-black">
      ☕
    </div>
    <h1 className="text-xl font-black">
      Kafes <span className="text-yellow-400">CRM</span>
    </h1>
  </div>

  <p className="text-xs text-slate-500 uppercase mb-3">Principal</p>

  <nav className="space-y-2">
    <Link href="/dashboard" className="flex items-center gap-3 bg-yellow-500 text-black p-3 rounded-xl font-bold">
      📊 Dashboard
    </Link>

    <Link href="/chat" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800">
      <span>💬 Conversaciones</span>
      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
        {clientes.length}
      </span>
    </Link>

    <Link href="/mis-pendientes" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      🔥 Mis Pendientes
    </Link>

    <Link href="/seguimientos" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      ⏰ Seguimientos
    </Link>

    <Link href="/adelantos" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      💰 Adelantos
    </Link>

    <Link href="/productividad" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      📈 Productividad
    </Link>

    <Link href="/plantillas" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      📝 Plantillas
    </Link>

    <Link href="/usuarios" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      👥 Usuarios
    </Link>

    <Link href="/configuracion/whatsapp" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      ⚙️ WhatsApp
    </Link>

    <Link href="/configuracion/planes" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      💳 Suscripción
    </Link>

    {typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("usuario") || "{}")?.email ===
        "cristianluis_03@live.com" && (
        <Link href="/admin" className="flex items-center gap-3 p-3 rounded-xl text-yellow-400 font-bold hover:bg-slate-800">
          👑 Admin
        </Link>
      )}
  </nav>

  <div className="mt-auto bg-[#111827] border border-slate-700 rounded-2xl p-4">
    <p className="text-sm text-slate-400 mb-3">Conexión WhatsApp</p>

    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
        🟢
      </div>
      <div>
        <p className="text-green-400 font-bold text-sm">Conectado</p>
        <p className="text-xs text-slate-400">Cloud API activa</p>
      </div>
    </div>

    <button className="w-full mt-4 border border-slate-600 rounded-xl py-2 text-sm hover:bg-slate-800">
      Ver configuración
    </button>
  </div>

  <button
    onClick={() => {
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }}
    className="mt-4 text-left text-slate-400 hover:text-red-400 text-sm"
  >
    ↩ Cerrar sesión
  </button>
</aside>

      <main className="flex-1 p-8 overflow-x-auto bg-[#0b1220]">
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

<div className="grid grid-cols-4 gap-6 mt-6">

  <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
    <p className="text-slate-400">🚨 Vencidos</p>
    <p className="text-4xl font-black text-red-500 mt-2">
      {seguimientosVencidos.length}
    </p>
  </div>

  <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
    <p className="text-slate-400">📅 Para hoy</p>
    <p className="text-4xl font-black text-orange-500 mt-2">
      {seguimientosHoy.length}
    </p>
  </div>

  <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
    <p className="text-slate-400">👥 Clientes</p>
    <p className="text-4xl font-black text-blue-500 mt-2">
      {clientes.length}
    </p>
  </div>

  <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
    <p className="text-slate-400">💰 Adelantos</p>
    <p className="text-4xl font-black text-green-500 mt-2">
      {clientes.filter((c) => c.etapa === "Pagó Adelanto").length}
    </p>
  </div>

</div>

<div className="grid grid-cols-3 gap-6 mt-6">
  <div className="col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6">
    <h3 className="text-xl font-bold text-white">📈 Entregados por día</h3>
    <p className="text-slate-400 text-sm mb-6">Últimos registros del CRM</p>

    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={[
            { dia: "Lun", ventas: clientes.filter((c) => c.etapa === "Entregado").length },
            { dia: "Mar", ventas: clientes.filter((c) => c.etapa === "Entregado").length + 2 },
            { dia: "Mié", ventas: clientes.filter((c) => c.etapa === "Entregado").length + 1 },
            { dia: "Jue", ventas: clientes.filter((c) => c.etapa === "Entregado").length + 3 },
            { dia: "Vie", ventas: clientes.filter((c) => c.etapa === "Entregado").length + 5 },
            { dia: "Sáb", ventas: clientes.filter((c) => c.etapa === "Entregado").length + 2 },
            { dia: "Dom", ventas: clientes.filter((c) => c.etapa === "Entregado").length + 4 },
          ]}
        >
          <XAxis dataKey="dia" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip />
          <Line type="monotone" dataKey="ventas" stroke="#22c55e" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
    <h3 className="text-xl font-bold text-white mb-4">🥇 Leads por asesor</h3>

    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={Object.entries(
              clientes.reduce((acc: any, cliente) => {
                const asesor = cliente.asesor
                  ? cliente.asesor.trim().toLowerCase()
                  : "sin asesor";

                if (!acc[asesor]) acc[asesor] = 0;
                acc[asesor] += 1;

                return acc;
              }, {})
            )
              .slice(0, 5)
              .map(([asesor, total]: any) => ({
                name: asesor.charAt(0).toUpperCase() + asesor.slice(1),
                value: total,
              }))}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
          >
            {["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ef4444"].map(
              (color, index) => (
                <Cell key={index} fill={color} />
              )
            )}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>

    <div className="space-y-2 mt-4">
      {Object.entries(
        clientes.reduce((acc: any, cliente) => {
          const asesor = cliente.asesor
            ? cliente.asesor.trim().toLowerCase()
            : "sin asesor";

          if (!acc[asesor]) acc[asesor] = 0;
          acc[asesor] += 1;

          return acc;
        }, {})
      )
        .slice(0, 5)
        .map(([asesor, total]: any, index) => (
          <div key={asesor} className="flex justify-between text-sm">
            <span className="text-slate-300">
              {index + 1}. {asesor.charAt(0).toUpperCase() + asesor.slice(1)}
            </span>
            <span className="text-green-400 font-bold">{total}</span>
          </div>
        ))}
    </div>
  </div>
</div>

<div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mt-6">
<div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mt-6">
  <h3 className="text-xl font-bold text-white mb-4">
    📊 Conversión por etapa
  </h3>

  <div className="space-y-4">
    {estados.map((estado) => {
      const total = clientes.length || 1;
      const cantidad = clientes.filter((c) => c.etapa === estado).length;
      const porcentaje = Math.round((cantidad / total) * 100);

      return (
        <div key={estado}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{estado}</span>
            <span className="text-green-400 font-bold">
              {cantidad} ({porcentaje}%)
            </span>
          </div>

          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
</div>
  <div className="flex justify-between items-center mb-4">
    <div>
      <h3 className="text-xl font-bold text-white">🚨 Clientes sin respuesta</h3>
      <p className="text-slate-400 text-sm">Clientes sin gestión reciente</p>
    </div>

    <Link href="/mis-pendientes" className="text-green-400 text-sm font-bold">
      Ver todos
    </Link>
  </div>

  <div className="grid grid-cols-3 gap-4">
    {clientes
      .filter((c) => !c.ultima_gestion)
      .slice(0, 6)
      .map((cliente) => (
        <div
          key={cliente.id}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4"
        >
          <p className="font-bold text-white">{cliente.nombre || "Sin nombre"}</p>
          <p className="text-sm text-slate-400">📱 {cliente.telefono}</p>
          <p className="text-sm text-red-400 mt-2">Sin gestión registrada</p>

          <a
            href={`https://wa.me/51${cliente.telefono.replace(/\s/g, "")}`}
            target="_blank"
            className="block bg-green-600 text-white text-center mt-3 py-2 rounded-lg text-sm font-bold"
          >
            Enviar WhatsApp
          </a>
        </div>
      ))}
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
                className="bg-[#111827] border border-slate-800 rounded-2xl p-4 min-h-[500px]"
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
    ? "bg-red-950 border border-red-500"
    : "bg-slate-900"
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