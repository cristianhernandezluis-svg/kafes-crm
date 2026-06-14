"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VerificarSuscripcion from "@/components/VerificarSuscripcion";

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

type Plantilla = {
  id: number;
  empresa_id: number;
  nombre: string;
  mensaje: string;
  created_at: string;
};

export default function ChatsPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
const [mostrarConversacion, setMostrarConversacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
const [enviandoArchivo, setEnviandoArchivo] = useState(false);

const [grabandoAudio, setGrabandoAudio] = useState(false);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const mensajesFinRef = useRef<HTMLDivElement | null>(null);
const bajarAlFinal = () => {
  setTimeout(() => {
    mensajesFinRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, 100);
};
const cargarClientes = async () => {
  const res = await fetch("/api/chats", {
    cache: "no-store",
  });

  const data = await res.json();

  if (data.success) {
    setClientes(data.chats);
  }
};

const cargarPlantillas = async () => {
  
  const usuarioGuardado = localStorage.getItem("usuario");

  if (!usuarioGuardado) return;

  const usuario = JSON.parse(usuarioGuardado);

  const res = await fetch(
    `/api/plantillas?empresa_id=${usuario.empresa_id}`,
    {
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (data.success) {
    setPlantillas(data.plantillas);
  }
};

  const abrirConversacion = async (cliente: Cliente) => {
  setMostrarConversacion(true);
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
  bajarAlFinal();
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

const enviarArchivo = async (archivo: File) => {
  if (!clienteActivo) return;

  try {
    setEnviandoArchivo(true);

    const formData = new FormData();
    formData.append("cliente_id", String(clienteActivo.id));
    formData.append("telefono", clienteActivo.telefono);
    formData.append("archivo", archivo);

    const res = await fetch("/api/whatsapp/send-media", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      alert("No se pudo enviar el archivo");
      return;
    }

    abrirConversacion(clienteActivo);
    cargarClientes();
  } catch (error) {
    console.error("Error enviando archivo:", error);
    alert("Error enviando archivo");
  } finally {
    setEnviandoArchivo(false);
  }
};

const iniciarGrabacion = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

audioChunksRef.current = [];

// WhatsApp Cloud API acepta audio/ogg
const mimeType = "audio/webm;codecs=opus";

const mediaRecorder = new MediaRecorder(stream, {
  mimeType,
});

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
const extension = "webm";

      const audioBlob = new Blob(
        audioChunksRef.current,
        {
          type: mimeType,
        }
      );

      const audioFile = new File(
        [audioBlob],
        `audio-${Date.now()}.${extension}`,
        {
          type: mimeType,
        }
      );

      stream.getTracks().forEach((track) =>
        track.stop()
      );

      await enviarArchivo(audioFile);
    };

    mediaRecorder.start();
    setGrabandoAudio(true);
  } catch (error) {
  console.error("MIC ERROR:", error);
  alert(String(error));
}
};

const detenerGrabacion = () => {
  if (mediaRecorderRef.current) {
    mediaRecorderRef.current.stop();
    setGrabandoAudio(false);
  }
};

  useEffect(() => {
  cargarClientes();
  cargarPlantillas();

    const intervalo = setInterval(() => {
      cargarClientes();

      if (clienteActivo) {
        abrirConversacion(clienteActivo);
      }
    }, 5000);

    return () => clearInterval(intervalo);
  }, [clienteActivo]);

  return (
  <>
    <VerificarSuscripcion />

    <div className="min-h-screen bg-[#0b1220] flex text-white">
      <aside className="hidden lg:flex w-64 bg-[#08111f] text-white p-4 flex-col min-h-screen border-r border-slate-800">
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
    <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800">
      📊 Dashboard
    </Link>

    <Link href="/chat" className="flex items-center justify-between bg-yellow-500 text-black p-3 rounded-xl font-bold">
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
  </nav>
</aside>

      <main className="flex-1 flex overflow-hidden">
        <section
  className={`${
    mostrarConversacion ? "hidden md:block" : "block"
  } w-full md:w-[320px] bg-[#0f172a] border-r border-slate-800 overflow-y-auto h-screen`}
>
          <div className="p-5 border-b border-slate-800">
  <h2 className="text-2xl font-black text-white">💬 Conversaciones</h2>
  <p className="text-sm text-slate-400">
    Atiende tus mensajes de WhatsApp.
  </p>
</div>

          <div className="overflow-y-auto h-[calc(100vh-90px)]">
  {clientes.map((cliente) => (
  <button
    key={cliente.id}
    onClick={() => abrirConversacion(cliente)}
    className={`w-full text-left p-4 border-b border-slate-800 hover:bg-slate-800 transition ${
      clienteActivo?.id === cliente.id ? "bg-slate-800" : "bg-[#0f172a]"
    }`}
  >
                <div className="flex justify-between gap-2">
  <div className="flex items-center gap-3 min-w-0">

  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black">
    {(cliente.nombre || "S").charAt(0).toUpperCase()}
  </div>

  <div className="min-w-0">
    <p className="font-bold truncate text-white">
      {cliente.nombre || "Sin nombre"}
    </p>

    <p className="text-sm text-slate-400 truncate">
      {cliente.ultimo_mensaje || cliente.telefono}
    </p>
  </div>

</div>

  <div className="text-right shrink-0">
    {cliente.ultimo_mensaje_fecha && (
      <p className="text-xs text-slate-400">
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

<p className="text-sm text-slate-400 truncate mt-1">
  {cliente.ultimo_tipo === "image"
    ? "📷 Imagen"
    : cliente.ultimo_tipo === "document"
    ? "📄 Documento"
    : cliente.ultimo_mensaje || "Sin mensajes"}
</p>

</button>
))}
</div>
</section>
        <section
  className={`${
    mostrarConversacion ? "flex" : "hidden md:flex"
  } flex-1 bg-[#0b1220]`}
>
          {!clienteActivo ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Selecciona un chat para responder.
            </div>
         ) : (
  <>
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="bg-[#0f172a] p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarConversacion(false)}
              className="md:hidden text-white text-2xl"
            >
              ←
            </button>

            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-lg">
              {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                {clienteActivo.nombre}
              </h2>

              <p className="text-sm text-slate-400">
                📱 {clienteActivo.telefono}
              </p>
            </div>
          </div>

          <div className="text-green-400 text-sm font-bold">
            ● En línea
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#0b1220] min-h-0">
          {conversaciones.length === 0 ? (
            <p className="text-slate-400">No hay mensajes todavía.</p>
          ) : (
            conversaciones.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[70%] p-3 rounded-2xl text-sm shadow ${
                  msg.remitente === "cliente"
                    ? "bg-[#1e293b] text-white mr-auto rounded-bl-sm"
                    : "bg-green-600 text-white ml-auto rounded-br-sm"
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
                    className="bg-white border rounded-lg p-3 text-left hover:bg-gray-50 text-black"
                  >
                    <p className="font-bold">📄 Documento recibido</p>
                    <p className="text-xs text-slate-400">
                      {msg.filename || "Abrir documento"}
                    </p>
                  </button>
                ) : msg.tipo === "audio" && msg.media_id ? (
                  <audio controls className="max-w-xs">
                    <source
                      src={`/api/whatsapp/media/${msg.media_id}`}
                      type={msg.mime_type || "audio/ogg"}
                    />
                  </audio>
                ) : (
                  <p>{msg.mensaje}</p>
                )}

                <p className="text-xs text-slate-300 mt-1">
                  {msg.remitente} ·{" "}
                  {new Date(msg.created_at).toLocaleString("es-PE")}
                </p>
              </div>
            ))
          )}

          <div ref={mensajesFinRef} />
        </div>

        <div className="bg-[#0f172a] border-t border-slate-800 p-4">
          <button
            onClick={() => {
              const fecha = prompt("Fecha seguimiento (2026-06-15 10:00)");
              const observacion = prompt("Observación");

              if (!fecha || !observacion || !clienteActivo) return;

              fetch(`/api/clientes/${clienteActivo.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  observacion,
                  proximo_seguimiento: fecha,
                  etapa: "Seguimiento",
                }),
              }).then(() => {
                alert("Seguimiento programado");
              });
            }}
            className="mb-3 bg-yellow-500 text-black px-4 py-2 rounded-xl font-bold"
          >
            📅 Programar seguimiento
          </button>

          <textarea
            className="w-full bg-[#020617] border border-slate-700 text-white rounded-xl p-3 h-20 resize-none"
            rows={2}
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

          <div className="flex items-center gap-2 mt-3">
            <label className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-full cursor-pointer text-white text-xl font-bold">
              +
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf,audio/*"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];

                  if (archivo) {
                    enviarArchivo(archivo);
                  }

                  e.target.value = "";
                }}
              />
            </label>

            <button
              onClick={() => setMostrarPlantillas(!mostrarPlantillas)}
              className="w-10 h-10 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 rounded-full text-black"
            >
              📝
            </button>

            <button
              onClick={grabandoAudio ? detenerGrabacion : iniciarGrabacion}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                grabandoAudio
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-white"
              }`}
            >
              🎤
            </button>

            <button
  onClick={enviarMensaje}
  disabled={enviando}
  className="ml-auto w-12 h-12 flex items-center justify-center bg-green-600 hover:bg-green-700 rounded-full text-white text-xl disabled:bg-slate-600"
>
  {enviando ? "..." : "➤"}
</button>
          </div>
        </div>
      </div>

      <div className="block w-[360px] bg-[#0b1220] border-l border-slate-800 overflow-y-auto">
  <div className="p-5 border-b border-slate-800">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xl font-black">
        {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
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

  <div className="p-5 space-y-5">
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
      <h3 className="font-bold text-white mb-4">
        Información del contacto
      </h3>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-400">Teléfono</p>
          <p className="text-white">{clienteActivo.telefono}</p>
        </div>

        <div>
          <p className="text-slate-400">Ciudad</p>
          <p className="text-white">
            {clienteActivo.ciudad || "Sin ciudad"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Asesor</p>
          <p className="text-white">
            {clienteActivo.asesor || "Sin asesor"}
          </p>
        </div>

        <div>
          <p className="text-slate-400">Etapa</p>
          <p className="text-green-400">
            {clienteActivo.etapa}
          </p>
        </div>
      </div>
    </div>

    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
      <h3 className="font-bold text-white mb-3">
        Notas internas
      </h3>

      <textarea
        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-sm text-white"
        rows={4}
        placeholder="Agregar nota del cliente..."
      />
    </div>

    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
      <h3 className="font-bold text-white mb-3">
        Actividad reciente
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex gap-3">
          <span className="text-green-400">🟢</span>
          <div>
            <p className="text-white">
              Conversación iniciada
            </p>
            <p className="text-slate-400 text-xs">
              WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

    </div>
  </>
)}
        </section>
      </main>
    </div>
  </>
);
}