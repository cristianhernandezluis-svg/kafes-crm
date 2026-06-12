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
const [editSeguimiento, setEditSeguimiento] = useState("");
const [editObservacion, setEditObservacion] = useState("");
const [guardandoGestion, setGuardandoGestion] = useState(false);
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
        observacion: editObservacion,
        proximo_seguimiento: editSeguimiento
          ? new Date(editSeguimiento).toISOString()
          : null,
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
      <aside className="hidden lg:flex w-56 bg-[#08111f] text-white p-3 flex-col min-h-screen border-r border-slate-800">
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

  <div className="mt-auto bg-[#111827] border border-slate-700 rounded-2xl p-">
    <p className="text-sm text-slate-400 mb-3">Conexión WhatsApp</p>

    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
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

      <main className="flex-1 p-3 md:p-6 overflow-x-auto bg-[#0b1220]">
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

  <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
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
      </main>

      {clienteActivo && (
  <div className="fixed right-0 top-0 h-full w-[460px] bg-[#0b1220] border-l border-slate-800 shadow-2xl z-50 flex flex-col text-white">
          <button
  onClick={() => setClienteActivo(null)}
  className="text-slate-300 hover:text-red-400 font-bold"
>
  Cerrar
</button>

<div className="border-b border-slate-800 p-6">
  <div className="flex items-center gap-4">
    <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-black">
      {clienteActivo.nombre?.charAt(0)}
    </div>

    <div>
      <h2 className="text-xl font-bold text-white">
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

          <div className="bg-gray-100 p-3 rounded-lg m-5">
            <p className="font-bold">{clienteActivo.nombre}</p>
            <p className="text-sm">📱 {clienteActivo.telefono}</p>
            <p className="text-sm">📍 {clienteActivo.ciudad || "Sin ciudad"}</p>
          </div>

<div className="px-5 pb-4 space-y-3">

  <div>
    <label className="text-sm font-bold">
      Etapa
    </label>

    <select
      className="w-full border rounded-lg p-2 mt-1"
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

  <div>
    <label className="text-sm font-bold">
      Asesor
    </label>

    <input
      className="w-full border rounded-lg p-2 mt-1"
      value={editAsesor}
      onChange={(e) => setEditAsesor(e.target.value)}
    />
  </div>

  <div>
    <label className="text-sm font-bold">
      Próximo seguimiento
    </label>

    <input
      type="datetime-local"
      className="w-full border rounded-lg p-2 mt-1"
      value={editSeguimiento}
      onChange={(e) => setEditSeguimiento(e.target.value)}
    />
  </div>

  <div>
    <label className="text-sm font-bold">
      Observación
    </label>

    <textarea
      className="w-full border rounded-lg p-2 mt-1"
      rows={3}
      value={editObservacion}
      onChange={(e) => setEditObservacion(e.target.value)}
    />
  </div>

  <button
    onClick={guardarGestionCliente}
    disabled={guardandoGestion}
    className="w-full bg-yellow-500 text-black py-3 rounded-lg font-bold"
  >
    {guardandoGestion
      ? "Guardando..."
      : "💾 Guardar Gestión"}
  </button>

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

          <div className="border-t p-3">
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