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
  score?: number;
  temperatura?: string;
  bot_activo?: boolean;
  requiere_closer?: boolean;
  bot_producto?: string | null;
  bot_paso?: string | null;
  bot_contexto?: {
    uso?: string;
    ciudad?: string;
    adelanto_detectado?: number;
    precio_acordado?: number;
  } | null;
  created_at: string;
  ultimo_mensaje?: string | null;
  ultimo_tipo?: string | null;
  ultimo_mensaje_fecha?: string | null;
  no_leidos?: number;
};

function etiquetaMensaje(tipo?: string | null, mensaje?: string | null) {
  const etiquetas: Record<string, string> = {
    image: "🖼 Imagen",
    audio: "🎤 Audio",
    video: "🎥 Video",
    document: "📄 Documento",
    sticker: "🏷 Sticker",
    location: "📍 Ubicacion",
    contact: "👤 Contacto",
  };
  return (tipo && etiquetas[tipo]) || mensaje || "Sin mensajes";
}

function nombreProductoBot(slug?: string | null) {
  if (slug === "sierra-bomvink-8") return "Sierra BOMVINK 8 pulgadas";
  if (slug === "soporte-telescopico-xtd") return "Soporte Telescopico XTD";
  return slug || "Sin identificar";
}

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
const [temaClaro, setTemaClaro] = useState(false);

useEffect(() => {
  const temaGuardado = localStorage.getItem("tema-crm");
  setTemaClaro(temaGuardado === "claro");
}, []);

const cambiarTema = () => {
  const nuevoTemaClaro = !temaClaro;
  setTemaClaro(nuevoTemaClaro);
  localStorage.setItem("tema-crm", nuevoTemaClaro ? "claro" : "oscuro");
};
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [whatsappQrId, setWhatsappQrId] = useState<number | null>(null);
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
const [busqueda, setBusqueda] = useState("");
const [filtroChat, setFiltroChat] = useState("todas");
const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
const [mostrarConversacion, setMostrarConversacion] = useState(false);
  const [enviando, setEnviando] = useState(false);
const [ventaProducto, setVentaProducto] = useState("");
const [ventaMonto, setVentaMonto] = useState("");
const [ventaAdelanto, setVentaAdelanto] = useState("");
const [guardandoVenta, setGuardandoVenta] = useState(false);
const [enviandoArchivo, setEnviandoArchivo] = useState(false);

const [grabandoAudio, setGrabandoAudio] = useState(false);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const mensajesFinRef = useRef<HTMLDivElement | null>(null);

const bajarAlFinal = () => {
  setTimeout(() => {
    mensajesFinRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  }, 300);
};
const cargarClientes = async () => {
  const usuarioGuardado = localStorage.getItem("usuario");
  if (!usuarioGuardado) return;

  const usuario = JSON.parse(usuarioGuardado);
  const qrRes = await fetch("/api/whatsapp-qr", { cache: "no-store" });
  const qrData = await qrRes.json();
  const qrId = qrData.whatsapp_qr_id;

  if (!qrId) {
    setWhatsappQrId(null);
    setClientes([]);
    return;
  }

  setWhatsappQrId(Number(qrId));
  const res = await fetch(`/api/chats?empresa_id=${usuario.empresa_id}&whatsapp_qr_id=${qrId}`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (data.success) {
    setClientes(data.chats);
    setClienteActivo((actual) => {
      if (!actual) return actual;
      return data.chats.find((c: Cliente) => c.id === actual.id) || actual;
    });
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
  if (!whatsappQrId) return;

  if (clienteActivo && clienteActivo.id !== cliente.id) {
    await fetch("/api/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteActivo.id,
        whatsapp_qr_id: whatsappQrId,
        accion: "liberar",
      }),
    });
  }

  setMostrarConversacion(true);
  setClienteActivo(cliente);

await fetch("/api/chats", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    cliente_id: cliente.id,
    whatsapp_qr_id: whatsappQrId,
    accion: "tomar",
  }),
});

cargarClientes();

    const res = await fetch(`/api/conversaciones/${cliente.id}?whatsapp_qr_id=${whatsappQrId}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
  setConversaciones(data.conversaciones);

  setTimeout(() => {
    mensajesFinRef.current?.scrollIntoView({
      behavior: "auto",
      block: "end",
    });
  }, 500);
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

const cerrarConversacion = async () => {
  const cliente = clienteActivo;

  if (cliente && whatsappQrId) {
    try {
      await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: cliente.id,
          whatsapp_qr_id: whatsappQrId,
          accion: "liberar",
        }),
      });
    } catch (error) {
      console.error("Error liberando chat:", error);
    }
  }

  setMostrarConversacion(false);
  setClienteActivo(null);
};

useEffect(() => {
  const clienteId = clienteActivo?.id;
  const qrId = whatsappQrId;

  if (!clienteId || !qrId) return;

  const liberarAlSalir = () => {
    fetch("/api/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteId,
        whatsapp_qr_id: qrId,
        accion: "liberar",
      }),
      keepalive: true,
    }).catch(() => {});
  };

  const manejarPageHide = () => {
    liberarAlSalir();
  };

  window.addEventListener("pagehide", manejarPageHide);

  return () => {
    window.removeEventListener("pagehide", manejarPageHide);
    liberarAlSalir();
  };
}, [clienteActivo?.id, whatsappQrId]);

const devolverAlBot = async () => {
  if (!clienteActivo) return;

  try {
    const res = await fetch(`/api/clientes/${clienteActivo.id}/bot`, {
      method: "PATCH",
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "No se pudo devolver al bot");
      return;
    }

    setClienteActivo(data.cliente);
    cargarClientes();
  } catch (error) {
    console.error("Error devolviendo al bot:", error);
    alert("Error devolviendo al bot");
  }
};

useEffect(() => {
  const clienteId = clienteActivo?.id;

  if (!clienteId) {
    setVentaProducto("");
    setVentaMonto("");
    setVentaAdelanto("");
    return;
  }

  let cancelado = false;

  const cargarVenta = async () => {
    try {
      const res = await fetch(`/api/ventas?cliente_id=${clienteId}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (cancelado) return;

      if (res.ok && data.venta) {
        setVentaProducto(data.venta.producto || "");
        setVentaMonto(String(data.venta.monto ?? ""));
        setVentaAdelanto(String(data.venta.adelanto ?? ""));
      } else {
        setVentaProducto(clienteActivo?.bot_producto || "");

        const precioAcordado =
          clienteActivo?.bot_contexto?.precio_acordado;

        setVentaMonto(
          Number.isFinite(Number(precioAcordado)) &&
            Number(precioAcordado) > 0
            ? String(precioAcordado)
            : ""
        );

        const adelantoDetectado =
          clienteActivo?.bot_contexto?.adelanto_detectado;

        setVentaAdelanto(
          Number.isFinite(Number(adelantoDetectado)) &&
            Number(adelantoDetectado) > 0
            ? String(adelantoDetectado)
            : ""
        );
      }
    } catch (error) {
      console.error("Error cargando venta:", error);
    }
  };

  cargarVenta();

  return () => {
    cancelado = true;
  };
}, [
  clienteActivo?.id,
  clienteActivo?.bot_producto,
  clienteActivo?.bot_contexto?.precio_acordado,
  clienteActivo?.bot_contexto?.adelanto_detectado,
]);

const confirmarAdelanto = async () => {
  if (!clienteActivo || guardandoVenta) return;

  const producto = ventaProducto.trim();
  const monto = Number(ventaMonto);
  const adelanto = Number(ventaAdelanto);

  if (!producto) {
    alert("Ingresa el producto");
    return;
  }

  if (!Number.isFinite(monto) || monto <= 0) {
    alert("Ingresa un monto total valido");
    return;
  }

  if (!Number.isFinite(adelanto) || adelanto < 0 || adelanto > monto) {
    alert("Ingresa un adelanto valido");
    return;
  }

  setGuardandoVenta(true);

  try {
    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: clienteActivo.id,
        producto,
        monto,
        adelanto,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || "No se pudo registrar la venta");
      return;
    }

    setVentaMonto(String(data.venta?.monto ?? monto));
    setVentaAdelanto(String(data.venta?.adelanto ?? adelanto));

    setClienteActivo((actual) =>
      actual
        ? { ...actual, etapa: "Pag\u00f3 Adelanto", bot_paso: "postventa" }
        : actual
    );

    await cargarClientes();
    alert("Adelanto registrado correctamente");
  } catch (error) {
    console.error("Error registrando adelanto:", error);
    alert("Error registrando adelanto");
  } finally {
    setGuardandoVenta(false);
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

  const intervalo = setInterval(async () => {
    cargarClientes();

    if (clienteActivo && whatsappQrId) {
      await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteActivo.id,
          whatsapp_qr_id: whatsappQrId,
          accion: "tomar",
        }),
      });

      const res = await fetch(
        `/api/conversaciones/${clienteActivo.id}?whatsapp_qr_id=${whatsappQrId}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.success) {
        setConversaciones(data.conversaciones);
      }
    }
  }, 5000);

  return () => clearInterval(intervalo);
}, [clienteActivo?.id, whatsappQrId]);
useEffect(() => {
  if (clientes.length === 0 || clienteActivo) return;

  const params = new URLSearchParams(window.location.search);
  const clienteIdUrl = params.get("cliente_id");

  if (!clienteIdUrl) return;

  const clienteEncontrado = clientes.find(
    (cliente) => String(cliente.id) === String(clienteIdUrl)
  );

  if (clienteEncontrado) {
    abrirConversacion(clienteEncontrado);
  }
}, [clientes, clienteActivo]);

  return (
  <>
    <VerificarSuscripcion />

    <div
  className={`min-h-screen flex ${
    temaClaro
      ? "bg-slate-100 text-slate-900"
      : "bg-[#0b1220] text-white"
  }`}
>
      <aside
  className={`hidden lg:flex w-60 flex-col h-screen sticky top-0 border-r transition-colors duration-300 ${
    temaClaro
      ? "bg-white text-slate-800 border-slate-200"
      : "bg-[#101820] text-white border-[#1f2a33]"
  }`}
>
  <div
  className={`flex items-center gap-3 px-4 py-4 border-b ${
    temaClaro ? "border-slate-200" : "border-[#1f2a33]"
  }`}
>
    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">
      K
    </div>
    <h1 className="text-xl font-black">
      Kafes <span className="text-green-400">CRM</span>
    </h1>
  </div>

  <div className="px-4 pt-5 pb-2">
    <p
  className={`text-[11px] uppercase font-bold ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
  Principal
</p>
  </div>

  <nav className="flex-1 px-2 space-y-1">
    <Link href="/dashboard" className={"flex items-center gap-3 px-3 py-3 rounded-lg text-sm " + (temaClaro ? "hover:bg-slate-100 text-slate-700" : "hover:bg-slate-800 text-white")}>
      📊 Dashboard
    </Link>

    <Link href="/chat" className="flex items-center justify-between bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">
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
    <div
  className={`border rounded-xl p-4 transition-colors duration-300 ${
    temaClaro
      ? "border-slate-200 bg-slate-50"
      : "border-[#26323d] bg-[#111c24]"
  }`}
>
      <p
  className={`text-sm font-bold mb-3 ${
    temaClaro ? "text-slate-700" : "text-slate-300"
  }`}
>
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
<div
  className={`mt-3 pt-3 border-t ${
    temaClaro ? "border-slate-200" : "border-[#26323d]"
  }`}
>
  <button
    type="button"
    onClick={cambiarTema}
    className="w-full flex items-center justify-between gap-3"
  >
    <div className="flex items-center gap-2">
      <span className="text-base">
        {temaClaro ? "☀️" : "🌙"}
      </span>

      <span className="text-xs font-semibold text-slate-300">
        {temaClaro ? "Modo claro" : "Modo oscuro"}
      </span>
    </div>

    <div
      className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
        temaClaro ? "bg-green-500" : "bg-slate-600"
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
          temaClaro ? "left-[22px]" : "left-0.5"
        }`}
      />
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
    ↩ Cerrar sesión
  </button>
</aside>

      <main className="flex-1 min-w-0 h-screen overflow-hidden flex">
<div
  className={`hidden md:flex fixed top-0 left-60 right-0 h-12 border-b z-40 items-center justify-between px-5 ${
    temaClaro
      ? "bg-white border-slate-200"
      : "bg-[#0b1218] border-[#1f2a33]"
  }`}
>
  <h1
  className={`text-sm font-bold ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
    Conversaciones - WhatsApp Manager
  </h1>

  <div className="flex items-center gap-4 text-slate-300">
    <button className="hover:text-white">🔍</button>

    <div className="relative">
      <button className="hover:text-white">🔔</button>
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
        3
      </span>
    </div>

    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">
        C
      </div>
      <div>
        <p
  className={`text-xs font-bold ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
  Administrador
</p>
        <p className="text-[10px] text-green-400">● En línea</p>
      </div>
    </div>
  </div>
</div>
        <section
  className={`${
    mostrarConversacion ? "hidden md:block" : "block"
  } w-full md:w-[340px] border-r overflow-y-auto h-screen pt-12 shrink-0 ${
  temaClaro
    ? "bg-white border-slate-200"
    : "bg-[#0f172a] border-slate-800"
}`}
>
          <div className="p-5 border-b border-slate-800">
  <h2
  className={`text-2xl font-black ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>💬 Conversaciones</h2>

  <p
  className={`text-sm ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
    Atiende tus mensajes de WhatsApp.
  </p>

  <div className="flex items-center gap-2 mt-4">
    <input
      type="text"
      placeholder="Buscar conversaciones..."
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none ${
  temaClaro
    ? "bg-slate-50 border-slate-300 text-slate-900"
    : "bg-[#111827] border-slate-700 text-white"
}`}
    />

    <button className={`w-10 h-10 border rounded-lg ${
  temaClaro
    ? "bg-slate-50 border-slate-300"
    : "bg-[#111827] border-slate-700"
}`}>
      ⚙️
    </button>

    <button className="w-10 h-10 bg-green-700 rounded-lg">
      🔗
    </button>
  </div>

  <div
  className={`flex gap-5 mt-4 text-xs border-b pb-3 ${
    temaClaro ? "border-slate-200" : "border-slate-800"
  }`}
>
    {[
      { id: "todas", label: "Todas" },
      { id: "no_leidas", label: "No leídas" },
      { id: "asignadas", label: "Asignadas" },
      { id: "sin_asignar", label: "Sin asignar" },
    ].map((filtro) => (
      <button
        key={filtro.id}
        onClick={() => setFiltroChat(filtro.id)}
        className={
          filtroChat === filtro.id
            ? "text-green-400 font-bold"
            : temaClaro
  ? "text-slate-500 hover:text-slate-900"
  : "text-slate-400 hover:text-white"
        }
      >
        {filtro.label}
      </button>
    ))}
  </div>
</div>

          <div className="overflow-y-auto h-[calc(100vh-90px)]">
  {clientes
  .filter((cliente) => {
    const coincideBusqueda = `${cliente.nombre} ${cliente.telefono} ${cliente.ultimo_mensaje || ""}`
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const coincideFiltro =
      filtroChat === "todas" ||
      (filtroChat === "no_leidas" && (cliente.no_leidos || 0) > 0) ||
      (filtroChat === "asignadas" && !!cliente.asesor) ||
      (filtroChat === "sin_asignar" && !cliente.asesor);

    return coincideBusqueda && coincideFiltro;
  })
  .map((cliente) => (
  <button
    key={cliente.id}
    onClick={() => abrirConversacion(cliente)}
    className={`w-full text-left p-4 border-b transition ${
  temaClaro
    ? `border-slate-200 hover:bg-slate-100 ${
        clienteActivo?.id === cliente.id ? "bg-slate-100" : "bg-white"
      }`
    : `border-slate-800 hover:bg-slate-800 ${
        clienteActivo?.id === cliente.id ? "bg-slate-800" : "bg-[#0f172a]"
      }`
}`}
  >
                <div className="flex justify-between gap-2">
  <div className="flex items-center gap-3 min-w-0">

  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black">
    {(cliente.nombre || "S").charAt(0).toUpperCase()}
  </div>

  <div className="min-w-0">
    <p
  className={`font-bold truncate ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
      {cliente.temperatura === "caliente" ? `🔥 ${cliente.nombre || "Sin nombre"}` : (cliente.nombre || "Sin nombre")}
    </p>

    {cliente.temperatura === "caliente" && <p className="text-xs font-bold text-orange-400 truncate">CALIENTE · {nombreProductoBot(cliente.bot_producto)} · {cliente.bot_contexto?.ciudad || cliente.ciudad || "Sin ciudad"}</p>}

    <p
  className={`text-sm truncate ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
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

<p
  className={`text-sm truncate mt-1 ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
  {etiquetaMensaje(cliente.ultimo_tipo, cliente.ultimo_mensaje)}
</p>

</button>
  ))}
</div>
</section>

<section
  className={`${
    mostrarConversacion ? "flex" : "hidden md:flex"
  } flex-1 ${
  temaClaro ? "bg-slate-100" : "bg-[#101820]"
}`}
>
          {!clienteActivo ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Selecciona un chat para responder.
            </div>
         ) : (
  <>
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col h-screen overflow-hidden pt-12">
        <div
  className={`p-5 border-b flex items-center justify-between ${
    temaClaro
      ? "bg-white border-slate-200"
      : "bg-[#0f172a] border-slate-800"
  }`}
>
          <div className="flex items-center gap-3">
            <button
              onClick={cerrarConversacion}
              className={`md:hidden text-2xl ${
  temaClaro ? "text-slate-900" : "text-white"
}`}
            >
              ←
            </button>

            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-lg">
              {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
            </div>

            <div>
              <h2
  className={`text-xl font-bold ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
                {clienteActivo.nombre}
              </h2>

              <p
  className={`text-sm ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
                📱 {clienteActivo.telefono}
              </p>
            </div>
          </div>

          <div className="text-green-400 text-sm font-bold">
            ● En línea
          </div>
        </div>

        <div
  className={`flex-1 overflow-y-auto p-6 space-y-3 min-h-0 ${
    temaClaro ? "bg-slate-100" : "bg-[#0b1220]"
  }`}
>
          {conversaciones.length === 0 ? (
            <p className="text-slate-400">No hay mensajes todavía.</p>
          ) : (
            conversaciones.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[70%] p-3 rounded-2xl text-sm shadow ${
  msg.remitente === "cliente"
    ? temaClaro
      ? "bg-white border border-slate-200 text-slate-900 mr-auto rounded-bl-sm"
      : "bg-[#1e293b] text-white mr-auto rounded-bl-sm"
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
                ) : msg.tipo === "video" && msg.media_id ? (
                  <video controls className="max-w-xs rounded-lg">
                    <source src={`/api/whatsapp/media/${msg.media_id}`} type={msg.mime_type || "video/mp4"} />
                  </video>
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
                  <p>{etiquetaMensaje(msg.tipo, msg.mensaje)}</p>
                )}

                <p
  className={`text-xs mt-1 ${
    msg.remitente === "cliente" && temaClaro
      ? "text-slate-500"
      : "text-slate-300"
  }`}
>
                  {msg.remitente} ·{" "}
                  {new Date(msg.created_at).toLocaleString("es-PE")}
                </p>
              </div>
            ))
          )}

          <div ref={mensajesFinRef} />
        </div>

        <div
  className={`border-t p-4 ${
    temaClaro
      ? "bg-white border-slate-200"
      : "bg-[#0f172a] border-slate-800"
  }`}
>
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
            className={`w-full border rounded-xl p-3 h-20 resize-none outline-none ${
  temaClaro
    ? "bg-slate-50 border-slate-300 text-slate-900"
    : "bg-[#020617] border-slate-700 text-white"
}`}
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
            <label
  className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer text-xl font-bold ${
    temaClaro
      ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
      : "bg-slate-700 hover:bg-slate-600 text-white"
  }`}
>
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

      <div
  className={`hidden xl:block w-[360px] border-l overflow-y-auto h-screen pt-12 shrink-0 ${
    temaClaro
      ? "bg-white border-slate-200"
      : "bg-[#101820] border-[#1f2a33]"
  }`}
>
  <div
  className={`p-4 border-b flex justify-between items-center ${
    temaClaro ? "border-slate-200" : "border-[#1f2a33]"
  }`}
>
    <h3
  className={`font-bold text-sm ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
      Detalles del contacto
    </h3>
    <button
  className={
    temaClaro
      ? "text-slate-500 hover:text-slate-900"
      : "text-slate-400 hover:text-white"
  }
>×</button>
  </div>

  <div className="p-5">
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black text-3xl font-black">
        {(clienteActivo.nombre || "S").charAt(0).toUpperCase()}
      </div>

      <h2
  className={`mt-4 text-xl font-bold ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
        {clienteActivo.nombre}
      </h2>

      <p
  className={`text-sm ${
    temaClaro ? "text-slate-500" : "text-slate-400"
  }`}
>
        +51 {clienteActivo.telefono}
      </p>

      <span className="mt-3 bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full">
        {clienteActivo.etapa || "Cliente"}
      </span>
    </div>

    <div className="grid grid-cols-4 gap-3 mt-6 text-center">
      <button className={`flex flex-col items-center gap-1 ${
  temaClaro
    ? "text-slate-500 hover:text-slate-900"
    : "text-slate-400 hover:text-white"
}`}>
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${
  temaClaro ? "border-slate-300" : "border-slate-700"
}`}>
          👤
        </div>
        <span className="text-[11px]">Perfil</span>
      </button>

      <button className={`flex flex-col items-center gap-1 ${
  temaClaro
    ? "text-slate-500 hover:text-slate-900"
    : "text-slate-400 hover:text-white"
}`}>
        <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center">
          🏷️
        </div>
        <span className="text-[11px]">Etiquetas</span>
      </button>

      <button className={`flex flex-col items-center gap-1 ${
  temaClaro
    ? "text-slate-500 hover:text-slate-900"
    : "text-slate-400 hover:text-white"
}`}>
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${
  temaClaro ? "border-slate-300" : "border-slate-700"
}`}>
          📝
        </div>
        <span className="text-[11px]">Notas</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-white">
        <div className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center">
          ⋯
        </div>
        <span className="text-[11px]">Más</span>
      </button>
    </div>

    <div
  className={`mt-6 border-t pt-5 ${
    temaClaro ? "border-slate-200" : "border-[#1f2a33]"
  }`}
>
      <h3
  className={`font-bold text-sm mb-4 ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
        Información
      </h3>

      <div className="space-y-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Teléfono</p>
          <p className={temaClaro ? "text-slate-900" : "text-white"}>
  +51 {clienteActivo.telefono}
</p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Ciudad</p>
          <p className={temaClaro ? "text-slate-900" : "text-white"}>
  {clienteActivo.ciudad || "Sin ciudad"}
</p>
        </div>

        <div>
          <p className="text-slate-500 text-xs">Asesor</p>
          <p className={temaClaro ? "text-slate-900" : "text-white"}>
  {clienteActivo.asesor || "Sin asesor"}
</p>
        </div>

        <div
  className={`rounded-xl border p-3 space-y-2 ${
    temaClaro
      ? "bg-slate-50 border-slate-200"
      : "bg-slate-900/60 border-slate-700"
  }`}
>
  <p
    className={`text-xs font-bold ${
      temaClaro ? "text-slate-900" : "text-white"
    }`}
  >
    Calificacion del bot
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Producto:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {nombreProductoBot(clienteActivo.bot_producto)}
    </span>
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Uso:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {clienteActivo.bot_contexto?.uso || "Sin identificar"}
    </span>
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Ciudad detectada:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {clienteActivo.bot_contexto?.ciudad || "Sin identificar"}
    </span>
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Score:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {clienteActivo.score ?? 0}/100
    </span>
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Temperatura:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {clienteActivo.temperatura || "frio"}
    </span>
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Bot:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {clienteActivo.bot_activo === false ? "Pausado" : "Activo"}
    </span>
  </p>

  <p className={temaClaro ? "text-xs text-slate-600" : "text-xs text-slate-300"}>
    Closer:{" "}
    <span className={temaClaro ? "text-slate-900 font-bold" : "text-white font-bold"}>
      {clienteActivo.requiere_closer ? "Requiere closer" : "Aun no"}
    </span>
  </p>

  {clienteActivo.bot_paso === "postventa" && clienteActivo.bot_activo === false && (
    <button
      type="button"
      onClick={devolverAlBot}
      className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
    >
      🤖 Devolver al bot
    </button>
  )}
</div>

        <div
          className={`rounded-xl border p-3 space-y-3 ${
            temaClaro
              ? "bg-slate-50 border-slate-200"
              : "bg-slate-900/60 border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold ${temaClaro ? "text-slate-900" : "text-white"}`}>
              Venta
            </p>
            <span className="text-[11px] text-slate-500">
              Saldo: S/ {Math.max((Number(ventaMonto) || 0) - (Number(ventaAdelanto) || 0), 0).toFixed(2)}
            </span>
          </div>

          <div>
            <label className="text-[11px] text-slate-500">Producto</label>
            <input
              type="text"
              value={ventaProducto}
              onChange={(e) => setVentaProducto(e.target.value)}
              placeholder="Producto vendido"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                temaClaro
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-950 border-slate-700 text-white"
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Total</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ventaMonto}
                onChange={(e) => setVentaMonto(e.target.value)}
                placeholder="Monto total"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                  temaClaro
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-950 border-slate-700 text-white"
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500">Adelanto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ventaAdelanto}
                onChange={(e) => setVentaAdelanto(e.target.value)}
                placeholder="Monto detectado"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                  temaClaro
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-950 border-slate-700 text-white"
                }`}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={confirmarAdelanto}
            disabled={guardandoVenta}
            className="w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:bg-slate-600"
          >
            {guardandoVenta ? "Guardando..." : "Confirmar adelanto"}
          </button>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Última actividad</p>
          <p className={temaClaro ? "text-slate-900" : "text-white"}>
  Hoy
</p>
        </div>
      </div>
    </div>

    <div
  className={`mt-6 border-t pt-5 ${
    temaClaro ? "border-slate-200" : "border-[#1f2a33]"
  }`}
>
      <h3
  className={`font-bold text-sm mb-3 ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
        Etiquetas
      </h3>

      <div className="flex flex-wrap gap-2">
        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
          Cliente
        </span>

        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">
          Interesado
        </span>

        <button
  className={`w-7 h-7 rounded-full border ${
    temaClaro
      ? "border-slate-300 text-slate-600"
      : "border-slate-700 text-slate-400"
  }`}
>
          +
        </button>
      </div>
    </div>

    <div
  className={`mt-6 border-t pt-5 ${
    temaClaro ? "border-slate-200" : "border-[#1f2a33]"
  }`}
>
      <h3
  className={`font-bold text-sm mb-3 ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
        Notas
      </h3>

      <textarea
        className={`w-full border rounded-xl p-3 text-sm outline-none ${
  temaClaro
    ? "bg-slate-50 border-slate-300 text-slate-900"
    : "bg-[#0f172a] border-slate-700 text-white"
}`}
        rows={3}
        placeholder="Agregar nota..."
      />

      <div
  className={`mt-3 border rounded-xl p-3 ${
    temaClaro
      ? "bg-slate-50 border-slate-200"
      : "bg-[#0f172a] border-slate-800"
  }`}
>
        <p
  className={`text-sm ${
    temaClaro ? "text-slate-900" : "text-white"
  }`}
>
          Cliente interesado en el producto.
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Hoy · Administrador
        </p>
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