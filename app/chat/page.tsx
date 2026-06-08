"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
        <section className="w-[360px] bg-white border-r overflow-y-auto h-screen">
          <div className="p-5 border-b">
            <h2 className="text-2xl font-bold">💬 Chats</h2>
            <p className="text-sm text-gray-500">
              Mensajes recibidos desde WhatsApp Cloud API.
            </p>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-90px)]">
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
        <section className="flex-1 flex flex-col h-screen">
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

      <p className="text-xs text-gray-500 mt-1">
        {msg.remitente} ·{" "}
        {new Date(msg.created_at).toLocaleString("es-PE")}
      </p>
    </div>
  ))
)}

<div ref={mensajesFinRef} />

</div>

              <div className="bg-white border-t p-4">
  <button
    onClick={() => setMostrarPlantillas(!mostrarPlantillas)}
    className="w-full bg-yellow-400 text-black py-3 rounded-lg mb-3 font-bold hover:bg-yellow-300"
  >
    📋 Usar plantilla
  </button>

  {mostrarPlantillas && (
    <div className="border rounded-lg p-3 mb-3 bg-gray-50 max-h-48 overflow-y-auto space-y-2">
      {plantillas.length === 0 ? (
        <p className="text-sm text-gray-500">
          No tienes plantillas creadas.
        </p>
      ) : (
        plantillas.map((plantilla) => (
          <button
            key={plantilla.id}
            onClick={() => {
              const texto = plantilla.mensaje.replaceAll(
                "{{nombre}}",
                clienteActivo?.nombre || ""
              );

              setMensajeNuevo(texto);
              setMostrarPlantillas(false);
            }}
            className="w-full text-left bg-white border rounded-lg p-3 hover:bg-yellow-50"
          >
            <p className="font-bold">{plantilla.nombre}</p>
            <p className="text-xs text-gray-500">
              {plantilla.mensaje}
            </p>
          </button>
        ))
      )}
    </div>
  )}

<textarea
  className="w-full border rounded-lg p-3"
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

<label className="block w-full bg-gray-200 text-gray-800 py-3 rounded-lg mt-3 font-bold text-center cursor-pointer hover:bg-gray-300">
  {enviandoArchivo
    ? "Enviando archivo..."
    : "📎 Adjuntar imagen / PDF / audio"}

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
  onClick={grabandoAudio ? detenerGrabacion : iniciarGrabacion}
  className={`w-full py-3 rounded-lg mt-3 font-bold ${
    grabandoAudio
      ? "bg-red-600 text-white"
      : "bg-blue-600 text-white"
  }`}
>
  {grabandoAudio
    ? "⏹️ Detener y enviar audio"
    : "🎙️ Grabar audio"}
</button>

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