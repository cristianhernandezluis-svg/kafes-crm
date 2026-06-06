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
  created_at: string;
  ultimo_mensaje?: string | null;
  ultimo_tipo?: string | null;
  ultimo_mensaje_fecha?: string | null;
  no_leidos?: number;
};

type Conversacion = {
  id: number;
  cliente_id: number;
  telefono: string | null;
  mensaje: string;
  tipo: string;
  remitente: string;
  created_at: string;
media_id?: string | null;
mime_type?: string | null;
filename?: string | null;
};

export default function ChatsPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [enviando, setEnviando] = useState(false);

const cargarClientes = async () => {
  const res = await fetch("/api/chats", {
    cache: "no-store",
  });

  const data = await res.json();

  if (data.success) {
    setClientes(data.chats);
  }
};

  const abrirConversacion = async (cliente: Cliente) => {
    setClienteActivo(cliente);

await fetch("/api/chats", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    cliente_id: cliente.id,
  }),
});

cargarClientes();

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
      abrirConversacion(clienteActivo);
      cargarClientes();
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      alert("Error enviando mensaje");
    } finally {
      setEnviando(false);
    }
  };

  useEffect(() => {
    cargarClientes();

    const intervalo = setInterval(() => {
      cargarClientes();

      if (clienteActivo) {
        abrirConversacion(clienteActivo);
      }
    }, 5000);

    return () => clearInterval(intervalo);
  }, [clienteActivo]);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold text-yellow-400">Kafes CRM</h1>

        <div className="mt-10 space-y-4">
          <Link href="/" className="block p-3 hover:bg-zinc-800 rounded-lg">
            Dashboard
          </Link>

          <Link href="/mis-pendientes" className="block p-3 hover:bg-zinc-800 rounded-lg">
            Mis Pendientes
          </Link>

          <Link href="/seguimientos" className="block p-3 hover:bg-zinc-800 rounded-lg">
            Seguimientos
          </Link>

          <Link href="/adelantos" className="block p-3 hover:bg-zinc-800 rounded-lg">
            Adelantos
          </Link>

          <div className="bg-yellow-500 text-black p-3 rounded-lg font-bold">
            Chats
          </div>

          <Link href="/productividad" className="block p-3 hover:bg-zinc-800 rounded-lg">
            Productividad
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex">
        <section className="w-[360px] bg-white border-r overflow-y-auto">
          <div className="p-5 border-b">
            <h2 className="text-2xl font-bold">💬 Chats</h2>
            <p className="text-sm text-gray-500">
              Mensajes recibidos desde WhatsApp Cloud API.
            </p>
          </div>

          <div>
            {clientes.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => abrirConversacion(cliente)}
                className={`w-full text-left p-4 border-b hover:bg-gray-100 ${
                  clienteActivo?.id === cliente.id ? "bg-yellow-100" : ""
                }`}
              >
                <div className="flex justify-between gap-2">
  <div className="min-w-0">
    <p className="font-bold truncate">
      {cliente.nombre || "Sin nombre"}
    </p>

    <p className="text-sm">📱 {cliente.telefono}</p>
  </div>

  <div className="text-right shrink-0">
    {cliente.ultimo_mensaje_fecha && (
      <p className="text-xs text-gray-500">
        {new Date(cliente.ultimo_mensaje_fecha).toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    )}

    {(cliente.no_leidos || 0) > 0 && (
      <span className="inline-block bg-green-500 text-white text-xs rounded-full px-2 py-0.5 mt-1 font-bold">
        {cliente.no_leidos}
      </span>
    )}
  </div>
</div>

<p className="text-sm text-gray-600 truncate mt-1">
  {cliente.ultimo_tipo === "image"
    ? "📷 Imagen"
    : cliente.ultimo_tipo === "document"
    ? "📄 Documento"
    : cliente.ultimo_mensaje || "Sin mensajes"}
</p>

<p className="text-xs text-gray-500">Etapa: {cliente.etapa}</p>

{cliente.asesor && (
  <p className="text-xs text-gray-500">
    Asesor: {cliente.asesor}
  </p>
)}

</button>
))}
</div>
</section>
        <section className="flex-1 flex flex-col">
          {!clienteActivo ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Selecciona un chat para responder.
            </div>
          ) : (
            <>
              <div className="bg-white p-5 border-b">
                <h2 className="text-xl font-bold">{clienteActivo.nombre}</h2>
                <p className="text-sm">📱 {clienteActivo.telefono}</p>
                <p className="text-sm text-gray-500">
                  📍 {clienteActivo.ciudad || "Sin ciudad"}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {conversaciones.length === 0 ? (
                  <p className="text-gray-500">No hay mensajes todavía.</p>
                ) : (
                  conversaciones.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[70%] p-3 rounded-xl text-sm ${
                        msg.remitente === "cliente"
                          ? "bg-green-100 mr-auto"
                          : "bg-gray-200 ml-auto"
                      }`}
                    >
{msg.tipo === "image" && msg.media_id ? (
  <img
    src={`/api/whatsapp/media/${msg.media_id}`}
    alt="Imagen enviada por cliente"
    className="max-w-xs rounded-lg border cursor-pointer"
    onClick={() =>
      window.open(`/api/whatsapp/media/${msg.media_id}`, "_blank")
    }
  />
) : msg.tipo === "document" && msg.media_id ? (
  <button
    onClick={() =>
      window.open(`/api/whatsapp/media/${msg.media_id}`, "_blank")
    }
    className="bg-white border rounded-lg p-3 text-left hover:bg-gray-50"
  >
    <p className="font-bold">📄 Documento recibido</p>
    <p className="text-xs text-gray-500">
      {msg.filename || "Abrir documento"}
    </p>
  </button>
) : (
  <p>{msg.mensaje}</p>
)}
                      <p className="text-xs text-gray-500 mt-1">
                        {msg.remitente} ·{" "}
                        {new Date(msg.created_at).toLocaleString("es-PE")}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white border-t p-4">
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
            </>
          )}
        </section>
      </main>
    </div>
  );
}