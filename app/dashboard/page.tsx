"use client";

import {
  Users,
  Search,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

  import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";

const estados = [
  "Nuevo",
  "Interesado",
  "Seguimiento",
  "Pagó Adelanto",
  "Enviado",
  "Entregado",
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
const [filtroFechaVentas, setFiltroFechaVentas] = useState("esta_semana");
const [filtroFecha, setFiltroFecha] = useState("esta_semana");
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
const [editEtapa, setEditEtapa] = useState("");
const [editAsesor, setEditAsesor] = useState("");
const [editCiudad, setEditCiudad] = useState("");
const [editSeguimiento, setEditSeguimiento] = useState("");
const [editObservacion, setEditObservacion] = useState("");
const [guardandoGestion, setGuardandoGestion] = useState(false);
  const [enviando, setEnviando] = useState(false);
const [tabCliente, setTabCliente] = useState("informacion");
const [editandoInfo, setEditandoInfo] = useState(false);

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
setEditandoInfo(false);
setEditCiudad(cliente.ciudad || "");    
setClienteActivo(cliente);
setEditEtapa(cliente.etapa || "Nuevo");
setEditAsesor(cliente.asesor || "");
setEditSeguimiento(
  cliente.proximo_seguimiento
    ? cliente.proximo_seguimiento.slice(0, 16)
    : ""
);
setEditObservacion(cliente.observacion || "");

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

  try {
    const res = await fetch(`/api/clientes/${clienteSeguimiento.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proximo_seguimiento: new Date(fechaSeguimiento).toISOString(),
        observacion: observacionSeguimiento,
        ultima_gestion: new Date().toISOString(),
        etapa: "Seguimiento",
      }),
    });

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
const guardarGestionCliente = async () => {
  if (!clienteActivo) return;

  try {
    setGuardandoGestion(true);

    const res = await fetch(`/api/clientes/${clienteActivo.id}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    etapa: editEtapa,
    asesor: editAsesor,
    ciudad: editCiudad,
    observacion: editObservacion,
    proximo_seguimiento: editSeguimiento || null,
    ultima_gestion: new Date().toISOString(),
  }),
});

const data = await res.json();

    if (!data.success) {
      alert("No se pudo guardar la gestión");
      return;
    }

    await fetch("/api/actividades", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    empresa_id: 1,
    cliente_id: clienteActivo.id,
    asesor: editAsesor || clienteActivo.asesor || "Sin asesor",
    tipo: "gestion",
    descripcion: editObservacion || "Gestión registrada",
  }),
});

setClienteActivo(data.cliente);
await cargarClientes();

alert("Gestión guardada correctamente");
  } catch (error) {
    console.error("Error guardando gestión:", error);
    alert("Error guardando gestión");
  } finally {
    setGuardandoGestion(false);
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

const leadsNuevos = clientes.filter(
  (c) => c.etapa === "Nuevo"
).length;

const enSeguimiento = clientes.filter(
  (c) => c.etapa === "Seguimiento"
).length;

const pagoAdelanto = clientes.filter(
  (c) => c.etapa === "Pagó Adelanto"
).length;

const ventasEntregadas = clientes.filter(
  (c) => c.etapa === "Entregado"
).length;

const noResponden = clientes.filter(
  (c) => c.etapa === "No Responde"
).length;

const obtenerVentasFiltradas = () => {
  const hoy = new Date();

  return clientes.filter((c) => {
    if (c.etapa !== "Entregado") return false;

    const fecha = new Date(c.created_at);

    if (filtroFechaVentas === "hoy") {
      return fecha.toDateString() === hoy.toDateString();
    }

    if (filtroFechaVentas === "ayer") {
      const ayer = new Date();
      ayer.setDate(hoy.getDate() - 1);
      return fecha.toDateString() === ayer.toDateString();
    }

    if (filtroFechaVentas === "ultimos_7_dias") {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 7);
      return fecha >= inicio && fecha <= hoy;
    }

    if (filtroFechaVentas === "este_mes") {
      return (
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getFullYear() === hoy.getFullYear()
      );
    }

    if (filtroFechaVentas === "ultimos_30_dias") {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 30);
      return fecha >= inicio && fecha <= hoy;
    }

    const inicioSemana = new Date();
    inicioSemana.setDate(hoy.getDate() - 6);
    return fecha >= inicioSemana && fecha <= hoy;
  });
};

const ventasFiltradas = obtenerVentasFiltradas();

const ventasPorDia = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
  (dia, index) => ({
    dia,
    ventas: ventasFiltradas.filter((c) => {
      const fecha = new Date(c.created_at);
      const diaSemana = fecha.getDay();
      const orden = diaSemana === 0 ? 6 : diaSemana - 1;
      return orden === index;
    }).length,
  })
);

  return (
    <div className="min-h-screen bg-[#0b1220] flex text-white">
      <aside className="hidden lg:flex w-60 bg-[#101820] text-white flex-col h-screen sticky top-0 border-r border-[#1f2a33]">
  <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2a33]">
    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
      K
    </div>
    <h1 className="text-xl font-black">
      Kafes <span className="text-green-400">CRM</span>
    </h1>
  </div>

  <div className="px-4 pt-5 pb-2">
    <p className="text-[11px] text-slate-400 uppercase font-bold">
      Principal
    </p>
  </div>

  <nav className="flex-1 px-2 space-y-1">
    <Link href="/dashboard" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">
      📊 Dashboard
    </Link>

    <Link href="/chat" className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      <span className="flex items-center gap-3">💬 Conversaciones</span>
      <span className="bg-green-500 text-white text-[11px] px-2 py-0.5 rounded-full">
        {clientes.length}
      </span>
    </Link>

    <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      👤 Contactos
    </Link>

    <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      🧩 Kanban
    </Link>

    <Link href="/mensajes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ✉️ Mensajes
    </Link>

    <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      📄 Plantillas
    </Link>

    <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ⚙️ Automatizaciones
    </Link>

    <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      📊 Reportes
    </Link>

    <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">
      ⚙️ Ajustes
    </Link>
  </nav>

  <div className="p-3">
    <div className="border border-[#26323d] rounded-xl p-4 bg-[#111c24]">
      <p className="text-sm font-bold text-slate-300 mb-3">
        Conexión WhatsApp
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl">
          🟢
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
    </div>
  </div>

  <button
    onClick={() => {
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }}
    className="px-4 pb-4 text-left text-slate-400 hover:text-red-400 text-sm"
  >
    ↩ Cerrar sesión
  </button>
</aside>
<main className="flex-1 min-w-0 h-screen overflow-hidden bg-[#0b1220]">
  <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5 shrink-0">
    <h1 className="text-sm font-bold text-white">Dashboard</h1>

    <div className="flex items-center gap-4 text-slate-300">
      <button className="hover:text-white">🔍</button>
      <button className="hover:text-white">🔔</button>

      <Link
        href="/administracion"
        className="flex items-center gap-2 hover:bg-slate-800 px-2 py-1 rounded-lg"
      >
        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
          C
        </div>

        <div>
          <p className="text-xs font-bold text-white">Administrador</p>
          <p className="text-[10px] text-green-400">● En línea</p>
        </div>
      </Link>
    </div>
  </div>

  <div className="h-[calc(100vh-48px)] overflow-y-auto p-3 md:p-6">
        <div className="flex justify-between items-center">
  <div>
    <h1 className="text-2xl md:text-3xl font-black text-white">
      Hola Cristian 👋
    </h1>

    <p className="text-slate-400 mt-1">
      Aquí tienes el resumen general de tu CRM
    </p>
  </div>

          <div className="flex flex-col md:flex-row gap-3">
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

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
  <Link href="/leads-nuevos">
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 hover:border-green-500 cursor-pointer transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Leads nuevos</p>
          <h2 className="text-3xl font-black text-white mt-2">{leadsNuevos}</h2>
          <p className="text-green-400 text-sm mt-2">↑ 12% vs ayer</p>
        </div>
        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Users className="text-blue-400" size={28} />
        </div>
      </div>
    </div>
  </Link>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm">En seguimiento</p>
        <h2 className="text-4xl font-black text-white mt-2">{enSeguimiento}</h2>
        <p className="text-green-400 text-sm mt-2">↑ 8% vs ayer</p>
      </div>
      <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center">
        <Search className="text-yellow-400" size={28} />
      </div>
    </div>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm">Pagó adelanto</p>
        <h2 className="text-4xl font-black text-white mt-2">{pagoAdelanto}</h2>
        <p className="text-green-400 text-sm mt-2">↑ 15% vs ayer</p>
      </div>
      <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
        <DollarSign className="text-green-400" size={28} />
      </div>
    </div>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm">Ventas entregadas</p>
        <h2 className="text-4xl font-black text-white mt-2">{ventasEntregadas}</h2>
        <p className="text-green-400 text-sm mt-2">↑ 10% vs ayer</p>
      </div>
      <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
        <CheckCircle className="text-purple-400" size={28} />
      </div>
    </div>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm">No responden</p>
        <h2 className="text-4xl font-black text-white mt-2">{noResponden}</h2>
        <p className="text-red-400 text-sm mt-2">↓ 5% vs ayer</p>
      </div>
      <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
        <AlertCircle className="text-red-400" size={28} />
      </div>
    </div>
  </div>
</div>
    <h2 className="text-4xl font-black text-white mt-2">
     
    </h2>

<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3">
    <h3 className="text-base font-bold text-white">📈 📈 Ventas por día</h3>
    <select
  value={filtroFechaVentas}
  onChange={(e) => setFiltroFechaVentas(e.target.value)}
  className="bg-[#0f172a] border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 mb-3 outline-none"
>
  <option value="hoy">Hoy</option>
  <option value="ayer">Ayer</option>
  <option value="esta_semana">Esta semana</option>
  <option value="ultimos_7_dias">Últimos 7 días</option>
  <option value="este_mes">Este mes</option>
  <option value="ultimos_30_dias">Últimos 30 días</option>
</select>

    <div className="h-52 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={ventasPorDia}>
  <defs>
    <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6} />
      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
    </linearGradient>
  </defs>

  <XAxis dataKey="dia" stroke="#94a3b8" />
  <YAxis stroke="#94a3b8" />
  <Tooltip />

  <Area
    type="monotone"
    dataKey="ventas"
    stroke="#22c55e"
    strokeWidth={3}
    fill="url(#ventasGradient)"
    dot={{ r: 4 }}
    activeDot={{ r: 6 }}
  />
</AreaChart>
      </ResponsiveContainer>
    </div>
  </div>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
  <h3 className="text-sm font-bold text-white mb-4">
    Leads por asesor
  </h3>

  <div className="grid grid-cols-2 gap-4 items-center">
    <div className="h-40">
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
              .slice(0, 4)
              .map(([asesor, total]: any) => ({
                name: asesor.charAt(0).toUpperCase() + asesor.slice(1),
                value: total,
              }))}
            dataKey="value"
            nameKey="name"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={4}
          >
<Label
  value={clientes.length}
  position="center"
  fill="#ffffff"
/>

            {["#22c55e", "#3b82f6", "#eab308", "#14b8a6"].map(
              (color, index) => (
                <Cell key={index} fill={color} />
              )
            )}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>

    <div className="space-y-3">
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
        .slice(0, 4)
        .map(([asesor, total]: any, index) => (
          <div key={asesor} className="flex justify-between text-xs">
            <span className="text-slate-300">
              {index + 1}. {asesor.charAt(0).toUpperCase() + asesor.slice(1)}
            </span>
            <span className="text-green-400 font-bold">{total}</span>
          </div>
        ))}
    </div>
  </div>
</div>

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3">
    <h3 className="text-base font-bold text-white mb-2">
      📊 Conversión
    </h3>

    <div className="space-y-2">
      {estados.map((estado) => {
        const total = clientes.length || 1;
        const cantidad = clientes.filter((c) => c.etapa === estado).length;
        const porcentaje = Math.round((cantidad / total) * 100);

        return (
          <div key={estado}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-300 truncate">{estado}</span>
              <span className="text-green-400 font-bold">
                {cantidad} ({porcentaje}%)
              </span>
            </div>

            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
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

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3">
    <div className="flex justify-between items-center mb-3">
      <div>
        <h3 className="text-base font-bold text-white">
          🚨 Clientes sin respuesta
        </h3>
        <p className="text-slate-400 text-xs">
          Sin gestión reciente
        </p>
      </div>

      <Link href="/mis-pendientes" className="text-green-400 text-xs font-bold">
        Ver
      </Link>
    </div>

    <div className="space-y-2">
      {clientes
        .filter((c) => !c.ultima_gestion)
        .slice(0, 3)
        .map((cliente) => (
          <div
            key={cliente.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-black font-black text-xs">
                {(cliente.nombre || "S").charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="font-bold text-white text-xs truncate max-w-[110px]">
                  {cliente.nombre || "Sin nombre"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Sin gestión
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/51${cliente.telefono.replace(/\s/g, "")}`}
              target="_blank"
              className="text-green-400 text-sm"
            >
              🟢
            </a>
          </div>
        ))}
    </div>
  </div>
</div>
{seguimientosPendientes.length > 0 && (
          <div className="mt-6 bg-orange-100 border border-orange-300 rounded-xl p-3">
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
          <div className="grid grid-cols-6 gap-4 mt-8 min-w-[1300px]">
            {estados.map((estado) => (
              <div
                key={estado}
                className="bg-[#111827] border border-slate-800 rounded-2xl p-3 min-h-[420px]"
              >
                <h3 className="font-bold mb-3 text-white text-sm uppercase">
  {estado}
                  <span className="text-gray-400">
                    {clientes.filter((c) => c.etapa === estado).length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {clientes
  .filter((cliente) => cliente.etapa === estado)
  .slice(0, 3)
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
  onClick={() => abrirConversacion(cliente)}
  className={`p-3 rounded-xl border cursor-pointer transition-all hover:border-green-500 ${
    seguimientoVencido
      ? "bg-red-950/60 border-red-500"
      : "bg-[#0f172a] border-slate-800"
  }`}
>
  <div className="flex items-start justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-black font-black text-xs shrink-0">
        {(cliente.nombre || "S").charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        <p className="font-bold text-white text-xs truncate max-w-[110px]">
          {cliente.nombre || "Sin nombre"}
        </p>

        <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
          {cliente.observacion?.slice(0, 28) || "Sin último mensaje"}
        </p>
      </div>
    </div>

    <a
      href={`https://wa.me/51${cliente.telefono.replace(/\s/g, "")}`}
      target="_blank"
      onClick={(e) => e.stopPropagation()}
      className="text-green-400 hover:text-green-300 text-xs shrink-0"
    >
      🟢
    </a>
  </div>

  <div className="flex items-center justify-between mt-2">
    <span className="text-[11px] text-slate-500">
      {cliente.ultima_gestion
        ? new Date(cliente.ultima_gestion).toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Sin gestión"}
    </span>

    <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-400">
      {cliente.etapa}
    </span>
  </div>
</div>


                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
            </div>
      </main>

      {clienteActivo && (
  <div className="fixed right-0 top-0 h-full w-[520px] bg-[#0b1220] border-l border-slate-800 shadow-2xl z-50 flex flex-col text-white overflow-y-auto">

    <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800">
      <h2 className="font-bold text-lg">Detalle del contacto</h2>

      <button
        onClick={() => setClienteActivo(null)}
        className="text-slate-400 hover:text-red-400 font-bold"
      >
        Cerrar
      </button>
    </div>

    <div className="p-5 border-b border-slate-800">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center font-black text-black text-xl">
          {clienteActivo.nombre?.charAt(0)}
        </div>

        <div>
          <h2 className="text-xl font-black text-white">
            {clienteActivo.nombre}
          </h2>

          <p className="text-slate-400 text-sm">
            {clienteActivo.telefono}
          </p>

          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
            {clienteActivo.etapa}
          </span>
        </div>
      </div>
    </div>

    <div className="flex border-b border-slate-800 px-5">

  <button
    onClick={() => setTabCliente("informacion")}
    className={`py-4 px-3 text-sm font-bold ${
      tabCliente === "informacion"
        ? "text-green-400 border-b-2 border-green-400"
        : "text-slate-400"
    }`}
  >
    Información
  </button>

  <button
    onClick={() => setTabCliente("conversacion")}
    className={`py-4 px-3 text-sm font-bold ${
      tabCliente === "conversacion"
        ? "text-green-400 border-b-2 border-green-400"
        : "text-slate-400"
    }`}
  >
    Conversación
  </button>

  <button
    onClick={() => setTabCliente("notas")}
    className={`py-4 px-3 text-sm font-bold ${
      tabCliente === "notas"
        ? "text-green-400 border-b-2 border-green-400"
        : "text-slate-400"
    }`}
  >
    Notas
  </button>

  <button
    onClick={() => setTabCliente("actividades")}
    className={`py-4 px-3 text-sm font-bold ${
      tabCliente === "actividades"
        ? "text-green-400 border-b-2 border-green-400"
        : "text-slate-400"
    }`}
  >
    Actividades
  </button>

</div>

    <div className="p-5 space-y-5">
{tabCliente === "informacion" && (
  <>
  </>
)}

{tabCliente === "conversacion" && (
  <>    
<div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white">Información del contacto</h3>
        
<button
  onClick={() => setEditandoInfo(!editandoInfo)}
  className="text-xs text-slate-400 border border-slate-700 px-3 py-1 rounded-lg"
>
  {editandoInfo ? "Cancelar" : "Editar información"}
</button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Teléfono</p>
            <p className="text-white">{clienteActivo.telefono}</p>
          </div>

          <div>
            <p className="text-slate-400">Ciudad</p>
            <input
  disabled={!editandoInfo}
  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm text-white disabled:opacity-60"
  value={editCiudad}
  onChange={(e) => setEditCiudad(e.target.value)}
/>
          </div>

          <div>
            <p className="text-slate-400">Asesor</p>
            <input
disabled={!editandoInfo}
  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm text-white"
  value={editAsesor}
  onChange={(e) => setEditAsesor(e.target.value)}
/>
          </div>

          <div>
            <select
  className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm text-white"
  value={editEtapa}
  onChange={(e) => setEditEtapa(e.target.value)}
>
  {estados.map((estado) => (
    <option key={estado} value={estado}>
      {estado}
    </option>
  ))}
</select>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <h3 className="font-bold text-white mb-3">Notas internas</h3>

        <textarea
          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-sm text-white"
          rows={4}
          value={editObservacion}
          onChange={(e) => setEditObservacion(e.target.value)}
          placeholder="Agregar nota del cliente..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3">Actividad reciente</h3>

          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="text-green-400">🟢</span>
              <div>
                <p className="text-white">Gestión registrada</p>
                <p className="text-slate-400 text-xs">
                  {clienteActivo.ultima_gestion
                    ? new Date(clienteActivo.ultima_gestion).toLocaleString("es-PE")
                    : "Sin gestión"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-green-400">💬</span>
              <div>
                <p className="text-white">Conversación iniciada</p>
                <p className="text-slate-400 text-xs">WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3">Acciones rápidas</h3>

          <div className="space-y-3">
            <button
              onClick={enviarMensaje}
              className="w-full bg-green-600 hover:bg-green-700 rounded-lg py-2 text-sm font-bold"
            >
              Enviar mensaje
            </button>

            <select
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm"
              value={editEtapa}
              onChange={(e) => setEditEtapa(e.target.value)}
            >
              {estados.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <input
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm"
              placeholder="Asesor"
              value={editAsesor}
              onChange={(e) => setEditAsesor(e.target.value)}
            />

            <input
              type="datetime-local"
              className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm"
              value={editSeguimiento}
              onChange={(e) => setEditSeguimiento(e.target.value)}
            />

            <button
  onClick={guardarGestionCliente}
  disabled={guardandoGestion}
  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg py-2 text-sm font-bold"
>
  {guardandoGestion ? "Guardando..." : "Guardar gestión"}
</button>

            <button
              onClick={() => setEditEtapa("No Responde")}
              className="w-full bg-red-600 hover:bg-red-700 rounded-lg py-2 text-sm font-bold"
            >
              Marcar como no responde
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
  <h3 className="font-bold text-white">Conversación</h3>

  <Link
  href={`/chat?cliente_id=${clienteActivo.id}`}
  className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg font-bold"
>
  Ver conversación
</Link>
</div>

        <div className="space-y-3 max-h-56 overflow-y-auto">
          {conversaciones.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Aún no hay mensajes guardados para este cliente.
            </p>
          ) : (
            conversaciones.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg text-sm ${
                  msg.remitente === "cliente"
                    ? "bg-green-500/10 text-green-300"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                <p>{msg.mensaje}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {msg.remitente} · {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>

        <textarea
          className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-sm text-white mt-4"
          rows={3}
          placeholder="Escribe un mensaje..."
          value={mensajeNuevo}
          onChange={(e) => setMensajeNuevo(e.target.value)}
onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviarMensaje();
  }
}}
        />

        <button
          onClick={enviarMensaje}
          disabled={enviando}
          className="w-full bg-green-600 hover:bg-green-700 rounded-lg py-3 mt-3 font-bold"
        >
          {enviando ? "Enviando..." : "Enviar WhatsApp"}
        </button>
      </div>

        </>
  )}

  {tabCliente === "notas" && (
  <div className="bg-blue-500 p-5 rounded-xl">
    NOTAS FUNCIONA
  </div>
)}

{tabCliente === "actividades" && (
  <div className="bg-green-500 p-5 rounded-xl">
    ACTIVIDADES FUNCIONA
  </div>
)}
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