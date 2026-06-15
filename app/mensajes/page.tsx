"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
  ciudad: string | null;
  etapa: string;
  asesor: string | null;
  ultimo_mensaje?: string | null;
  no_leidos?: number;
};

type Conversacion = {
  id: number;
  cliente_id: number;
  telefono: string;
  mensaje: string;
  remitente: string;
  created_at: string;
};

export default function MensajesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
const [mensajeNuevo, setMensajeNuevo] = useState("");
const [enviando, setEnviando] = useState(false);

  const cargarClientes = async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

    const res = await fetch(`/api/clientes?empresa_id=${usuario.empresa_id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setClientes(data.clientes);
    }
  };

  const abrirConversacion = async (cliente: Cliente) => {
  setClienteActivo(cliente);

  const res = await fetch(`/api/conversaciones/${cliente.id}`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (data.success) {
    setConversaciones(data.conversaciones);
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
    await abrirConversacion(clienteActivo);
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    alert("Error enviando mensaje");
  } finally {
    setEnviando(false);
  }
};

useEffect(() => {
  cargarClientes();
}, []);

useEffect(() => {
  const intervalo = setInterval(() => {
    cargarClientes();

    if (clienteActivo) {
      abrirConversacion(clienteActivo);
    }
  }, 5000);

  return () => clearInterval(intervalo);
}, [clienteActivo]);

const clientesFiltrados = clientes.filter((c) =>
  `${c.nombre} ${c.telefono} ${c.etapa || ""}`
    .toLowerCase()
    .includes(busqueda.toLowerCase())
);

  return (
    <div className="min-h-screen bg-[#08111f] text-white flex">
      <aside className="hidden lg:flex w-[220px] bg-[#101820] text-white flex-col min-h-screen border-r border-[#1f2a33]">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2a33]">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
            K
          </div>
          <h1 className="text-xl font-black">
            Kafes <span className="text-green-400">CRM</span>
          </h1>
        </Link>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] text-slate-400 uppercase font-bold">Principal</p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Dashboard</Link>
          <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">💬 Conversaciones</Link>
          <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">👤 Contactos</Link>
          <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">🧩 Kanban</Link>
          <Link href="/mensajes" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">✉️ Mensajes</Link>
          <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📄 Plantillas</Link>
          <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">⚙️ Automatizaciones</Link>
          <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Reportes</Link>
          <Link href="/ajustes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">⚙️ Ajustes</Link>
        </nav>

        <div className="p-3">
          <div className="border border-[#26323d] rounded-xl p-4 bg-[#111c24]">
            <p className="text-sm font-bold text-slate-300 mb-3">Conexión WhatsApp</p>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">🟢</div>
              <div>
                <p className="text-green-400 font-bold text-sm">Conectado</p>
                <p className="text-xs text-slate-400">QR activo</p>
              </div>
            </div>

            <Link href="/dashboard/canales" className="block w-full text-center border border-slate-700 rounded-lg py-2 text-xs font-bold hover:bg-slate-800">
              VER QR
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5">
          <h1 className="text-sm font-bold text-white">Mensajes</h1>

          <div className="flex items-center gap-4 text-slate-300">
            <button className="hover:text-white">🔍</button>
            <button className="hover:text-white">🔔</button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
                C
              </div>
              <div>
                <p className="text-xs font-bold text-white">Administrador</p>
                <p className="text-[10px] text-green-400">● En línea</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[320px_1fr_320px] h-[calc(100vh-48px)]">
          <section className="border-r border-slate-800 bg-[#0f172a] overflow-y-auto">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-2xl font-black">
                Mensajes{" "}
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                  {clientes.length}
                </span>
              </h2>

              <div className="flex gap-2 mt-4">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar mensajes..."
                  className="w-full bg-[#111827] border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
                />
                <button className="bg-[#111827] border border-slate-700 rounded-xl px-3">⚙️</button>
              </div>

              <div className="flex gap-4 mt-4 text-xs">
                <button className="text-green-400 font-bold">Todos</button>
                <button className="text-slate-400">No leídos</button>
                <button className="text-slate-400">Asignados</button>
                <button className="text-slate-400">Archivados</button>
              </div>
            </div>

            <div>
              {clientesFiltrados.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => abrirConversacion(cliente)}
                  className={`w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800 ${
                    clienteActivo?.id === cliente.id ? "bg-green-900/40" : "bg-[#0f172a]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black">
                      {(cliente.nombre || "S").charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between">
                        <p className="font-bold truncate">{cliente.nombre || "Sin nombre"}</p>
                        <span className="text-xs text-slate-400">Hoy</span>
                      </div>

                      <p className="text-sm text-slate-400 truncate">
                        {cliente.ultimo_mensaje || "Sin último mensaje"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[#08111f] flex flex-col">
            {clienteActivo ? (
              <>
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-500 text-black flex items-center justify-center font-black">
                      {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h2 className="font-black text-lg">{clienteActivo.nombre || "Sin nombre"}</h2>
                      <p className="text-sm text-slate-400">
                        +51 {clienteActivo.telefono} · <span className="text-green-400">En línea</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2">⭐</button>
                    <button className="bg-[#111827] border border-slate-700 rounded-lg px-3 py-2">🏷️</button>
                    <button className="bg-green-700 rounded-lg px-4 py-2 font-bold">Asignar</button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {conversaciones.length === 0 ? (
                    <p className="text-slate-400 text-center">
                      No hay mensajes para este contacto
                    </p>
                  ) : (
                    conversaciones.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[60%] rounded-2xl p-4 ${
                          msg.remitente === "cliente"
                            ? "bg-slate-800 mr-auto rounded-bl-sm"
                            : "bg-green-700 ml-auto rounded-br-sm"
                        }`}
                      >
                        <p>{msg.mensaje}</p>
                        <p className="text-xs text-slate-300 mt-2">
                          {new Date(msg.created_at).toLocaleString("es-PE")}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-[#0f172a]">
                  <div className="flex gap-2 mb-3">
                    <button className="bg-[#111827] px-3 py-2 rounded-full text-xs">📄 Catálogo</button>
                    <button className="bg-[#111827] px-3 py-2 rounded-full text-xs">💰 Precios</button>
                    <button className="bg-[#111827] px-3 py-2 rounded-full text-xs">🚚 Envíos</button>
                    <button className="bg-[#111827] px-3 py-2 rounded-full text-xs">📍 Ubicación</button>
                  </div>

                  <div className="flex gap-3">
                    <input
  placeholder="Escribe un mensaje..."
  value={mensajeNuevo}
  onChange={(e) => setMensajeNuevo(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      enviarMensaje();
    }
  }}
  className="flex-1 bg-[#08111f] border border-slate-700 rounded-xl px-4 py-3 outline-none"
/>

                    <button
  onClick={enviarMensaje}
  disabled={enviando}
  className="w-12 h-12 rounded-full bg-green-600 font-black disabled:bg-slate-600"
>
  {enviando ? "..." : "➤"}
</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Selecciona un contacto
              </div>
            )}
          </section>

          <section className="border-l border-slate-800 bg-[#0f172a] overflow-y-auto">
            {clienteActivo && (
              <div>
                <div className="p-5 border-b border-slate-800">
                  <h3 className="font-bold text-white">Detalles del contacto</h3>
                </div>

                <div className="p-5 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500 text-black flex items-center justify-center text-3xl font-black">
                    {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
                  </div>

                  <h2 className="mt-4 text-xl font-black">
                    {clienteActivo.nombre || "Sin nombre"}
                  </h2>

                  <p className="text-slate-400 text-sm">+51 {clienteActivo.telefono}</p>

                  <span className="inline-block mt-3 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                    {clienteActivo.etapa || "Nuevo"}
                  </span>
                </div>

                <div className="p-5 border-t border-slate-800">
                  <h3 className="font-bold mb-4">Información</h3>

                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-slate-500">Teléfono</p>
                      <p>+51 {clienteActivo.telefono}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Ciudad</p>
                      <p>{clienteActivo.ciudad || "Sin ciudad"}</p>
                    </div>

                    <div>
                      <p className="text-slate-500">Asesor</p>
                      <p>{clienteActivo.asesor || "Sin asesor"}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-800">
                  <h3 className="font-bold mb-3">Etiquetas</h3>

                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                      Cliente
                    </span>
                    <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs">
                      Interesado
                    </span>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-800">
                  <h3 className="font-bold mb-3">Notas</h3>

                  <div className="bg-[#111827] border border-slate-800 rounded-xl p-3 text-sm">
                    Cliente interesado en más información.
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}