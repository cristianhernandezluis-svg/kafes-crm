"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3, MessageCircle, Users, KanbanSquare, Mail, FileText,
  Workflow, Settings, ShieldCheck, CreditCard, Plug,
  Building2, Cloud, CheckCircle2, AlertTriangle, Save,
  LockKeyhole, UserRound, Database, Globe2, Camera, Phone, Send, Globe, ArrowLeft, ChevronRight, Radio,
} from "lucide-react";

type Tab = "General" | "Canales" | "Integraciones" | "Administradores" | "Seguridad" | "Facturación";
type Business = { empresa: string; correo: string; telefono: string; pais: string; zona: string; idioma: string };
const tabs: Tab[] = ["General", "Canales", "Integraciones", "Administradores", "Seguridad", "Facturación"];
const initial: Business = {
  empresa: "Kafes Online", correo: "", telefono: "", pais: "Perú",
  zona: "America/Lima", idioma: "Español",
};
const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/chat", label: "Conversaciones", icon: MessageCircle },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/mensajes", label: "Mensajes", icon: Mail },
  { href: "/plantillas", label: "Plantillas", icon: FileText },
  { href: "/automatizaciones", label: "Automatizaciones", icon: Workflow },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];


// Componente de registro de WhatsApp mediante Meta Embedded Signup.
// Requiere useEffect, useRef y useState de React en los imports de page.tsx.
// El backend debe validar los activos autorizados; el intento_id no prueba
// por sí mismo que los dos eventos pertenezcan a la misma autorización.
type FacebookSDK = {
  init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } }) => void,
    options: Record<string, unknown>
  ) => void;
};
type MetaWindow = Window & { FB?: FacebookSDK; fbAsyncInit?: () => void };

type SignupInfo = { waba_id?: string; phone_number_id?: string };

function MetaSignupButton() {
  const [sdkReady, setSdkReady] = useState(false);
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const signupData = useRef<SignupInfo>({});
  const codigoMeta = useRef<string | null>(null);
  const intentoId = useRef<string | null>(null);
  const intentoActivo = useRef(false);
  const envioIniciado = useRef(false);
  const intentoSeq = useRef(0);
  const enviarRef = useRef<() => void>(() => {});

  const limpiar = () => {
    signupData.current = {};
    codigoMeta.current = null;
    intentoId.current = null;
    intentoActivo.current = false;
    envioIniciado.current = false;
    setBusy(false);
  };

  const intentarEnviar = async () => {
    if (!intentoActivo.current || envioIniciado.current) return;
    const code = codigoMeta.current;
    const id = intentoId.current;
    const { waba_id, phone_number_id } = signupData.current;
    if (!code || !id || !waba_id || !phone_number_id) return;

    envioIniciado.current = true;
    const seq = intentoSeq.current;
    setInfo("Verificando autorización y número con Meta...");
    try {
      const respuesta = await fetch("/api/meta/whatsapp/callback", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intento_id: id, code, waba_id, phone_number_id }),
      });
      const resultado: { success?: boolean; error?: string } = await respuesta.json();
      if (seq !== intentoSeq.current) return;
      if (!respuesta.ok || !resultado.success) {
        setInfo(resultado.error || "No se pudo guardar la autorización. Inicia otro registro.");
        return;
      }
      setInfo("Autorización guardada en estado pendiente. Aún faltan activación y webhooks.");
    } catch {
      if (seq === intentoSeq.current) {
        setInfo("No se pudo comunicar con el servidor. Inicia otro registro.");
      }
    } finally {
      if (seq === intentoSeq.current) limpiar();
    }
  };

  // El manejador de window.message se instala una vez. Esta referencia permite
  // invocar la versión actualizada de intentarEnviar sin capturar estado antiguo.
  enviarRef.current = () => { void intentarEnviar(); };

  useEffect(() => {
    const w = window as MetaWindow;
    const init = () => {
      if (!w.FB) return;
      w.FB.init({ appId: "974673448505002", cookie: true, xfbml: false, version: "v25.0" });
      setSdkReady(true);
    };
    w.fbAsyncInit = init;
    if (w.FB) init();
    else if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/es_LA/sdk.js";
      script.async = true;
      script.onerror = () => setInfo("No se pudo cargar el SDK de Meta.");
      document.body.appendChild(script);
    }

    const receive = (event: MessageEvent) => {
      let hostname = "";
      try { hostname = new URL(event.origin).hostname; } catch { return; }
      if (hostname !== "facebook.com" && !hostname.endsWith(".facebook.com")) return;
      if (typeof event.data !== "string") return;
      if (!intentoActivo.current || envioIniciado.current || !intentoId.current) return;

      try {
        const data: unknown = JSON.parse(event.data);
        if (!data || typeof data !== "object" || !("type" in data) || data.type !== "WA_EMBEDDED_SIGNUP") return;
        if (!("event" in data) || typeof data.event !== "string") return;
        if (data.event === "CANCEL" || data.event === "ERROR") {
          intentoSeq.current += 1;
          limpiar();
          setInfo(data.event === "CANCEL" ? "Registro cancelado." : "Meta informó un error durante el registro.");
          return;
        }
        if (data.event !== "FINISH" && data.event !== "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") return;
        const inner = "data" in data ? data.data : null;
        if (!inner || typeof inner !== "object") {
          setInfo("Meta no devolvió los identificadores del número.");
          return;
        }
        const payload = inner as { waba_id?: unknown; phone_number_id?: unknown };
        const waba = String(payload.waba_id ?? "");
        const phone = String(payload.phone_number_id ?? "");
        if (!/^\d{5,30}$/.test(waba) || !/^\d{5,30}$/.test(phone)) {
          setInfo("Meta devolvió identificadores incompletos.");
          return;
        }
        signupData.current = { waba_id: waba, phone_number_id: phone };
        setInfo("Datos del número recibidos. Verificando autorización...");
        enviarRef.current();
      } catch {
        // Ignorar mensajes ajenos al registro de Meta.
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  const launch = async () => {
    if (intentoActivo.current) {
      setInfo("Ya hay un registro en curso.");
      return;
    }
    const fb = (window as MetaWindow).FB;
    if (!fb) {
      setInfo("SDK de Meta no disponible. Recarga la página.");
      return;
    }

    const seq = ++intentoSeq.current;
    intentoActivo.current = true;
    envioIniciado.current = false;
    codigoMeta.current = null;
    signupData.current = {};
    intentoId.current = null;
    setBusy(true);
    setInfo("Creando intento seguro...");
    try {
      const respuesta = await fetch("/api/meta/whatsapp/intento", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
      const result: { success?: boolean; intento_id?: string; error?: string } = await respuesta.json();
      if (seq !== intentoSeq.current || !intentoActivo.current) return;
      if (!respuesta.ok || !result.success || typeof result.intento_id !== "string") {
        throw new Error(result.error || "No se pudo crear el intento");
      }
      intentoId.current = result.intento_id;
      setInfo("Abriendo registro oficial de Meta...");

      fb.login((response) => {
        if (seq !== intentoSeq.current || !intentoActivo.current || envioIniciado.current) return;
        const code = response.authResponse?.code;
        if (!code) {
          limpiar();
          setInfo("No se completó la autorización. Puedes intentarlo nuevamente.");
          return;
        }
        codigoMeta.current = code;
        setInfo("Código de Meta recibido. Comprobando los datos del número...");
        enviarRef.current();
      }, {
        config_id: "1429383608700708",
        response_type: "code",
        override_default_response_type: true,
        auth_type: "rerequest",
        extras: { feature: "whatsapp_embedded_signup", sessionInfoVersion: "3" },
      });
    } catch (error) {
      if (seq !== intentoSeq.current) return;
      limpiar();
      setInfo(error instanceof Error ? error.message : "Error al iniciar el registro");
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-green-500/30 p-4">
      <p className="font-bold mb-2">Conexión oficial de WhatsApp con Meta</p>
      <p className="text-xs text-slate-400 mb-3">
        La autorización se guardará como pendiente; no sustituye la conexión anterior ni activa por sí sola los webhooks.
      </p>
      <button type="button" onClick={launch} disabled={!sdkReady || busy}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-5 py-3 font-semibold">
        {!sdkReady ? "Cargando Meta..." : busy ? "Registro en curso..." : "Conectar WhatsApp con Meta"}
      </button>
      {info && <p role="status" className="text-sm mt-3 text-amber-500">{info}</p>}
    </div>
  );
}

export default function AjustesPage() {
  const [light, setLight] = useState(false);
  const [tab, setTab] = useState<Tab>("Canales");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business>(initial);
  const [saved, setSaved] = useState(false);
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");

  useEffect(() => {
    setLight(localStorage.getItem("tema-crm") === "claro");
    try {
      const data = localStorage.getItem("kafes-crm-preferencias-v1");
      if (data) setBusiness({ ...initial, ...JSON.parse(data) });
    } catch { /* Usar datos predeterminados */ }
  }, []);

  const container = light ? "bg-white border-slate-200" : "bg-[#111c2b] border-slate-800";
  const inputClass = `w-full rounded-xl border px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/40 ${light ? "bg-white border-slate-300 text-slate-900" : "bg-[#0a1423] border-slate-700 text-white"}`;
  const muted = light ? "text-slate-600" : "text-slate-400";
  const save = () => {
    localStorage.setItem("kafes-crm-preferencias-v1", JSON.stringify(business));
    setSaved(true);
  };

  return (
    <div className={`min-h-screen flex ${light ? "bg-slate-100 text-slate-900" : "bg-[#08111f] text-white"}`}>
      <aside className={`hidden lg:flex w-[230px] shrink-0 flex-col min-h-screen border-r ${light ? "bg-white border-slate-200" : "bg-[#101820] border-[#1f2a33]"}`}>
        <Link href="/dashboard" className="flex items-center gap-3 p-5 border-b border-slate-700/30">
          <span className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center font-black text-white">K</span>
          <span className="text-xl font-black">Kafes <span className="text-green-500">CRM</span></span>
        </Link>
        <div className="px-5 pt-6 pb-3 text-[11px] uppercase tracking-widest text-slate-500 font-bold">Principal</div>
        <nav className="px-3 space-y-1 flex-1">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${href === "/ajustes" ? "bg-green-600 text-white font-bold" : light ? "hover:bg-slate-100" : "hover:bg-slate-800"}`}>
              <Icon size={17} />{label}
            </Link>
          ))}
        </nav>
        <div className="p-4">
          <div className={`rounded-xl border p-3 text-xs ${container}`}>
            <div className="flex items-center gap-2 font-bold"><Cloud size={17} /> WhatsApp Cloud API</div>
            <div className="mt-2 text-amber-500">● Pendiente de configurar</div>
            <p className={`${muted} mt-1`}>No se ha verificado una conexión oficial.</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className={`h-16 flex items-center justify-between px-6 border-b ${light ? "bg-white border-slate-200" : "bg-[#0b1218] border-[#1f2a33]"}`}>
          <div className="font-bold">Ajustes</div>
          <div className="flex items-center gap-2 text-sm"><span className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white font-black">K</span> Administrador</div>
        </header>
        <div className="p-5 md:p-8 max-w-[1300px] mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-black">Configuración del CRM</h1>
            <p className={`mt-1 ${muted}`}>Administra Kafes Online, los canales, integraciones y accesos.</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-7 border-b border-slate-500/20 pb-3">
            {tabs.map(t => (
              <button type="button" key={t} onClick={() => { setTab(t); setSelectedChannel(null); setSaved(false); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition ${tab === t ? "bg-green-600 text-white" : light ? "hover:bg-white text-slate-600" : "hover:bg-slate-800 text-slate-300"}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === "General" && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
              <section className={`border rounded-2xl p-6 ${container}`}>
                <h2 className="text-xl font-bold flex items-center gap-2"><Building2 size={20} /> Información del negocio</h2>
                <p className={`${muted} text-sm mt-1 mb-6`}>Estas preferencias se guardan solo en este navegador; todavía no se sincronizan con el servidor.</p>
                <div className="grid md:grid-cols-2 gap-5">
                  {([ ["empresa", "Empresa"], ["correo", "Correo empresarial"], ["telefono", "Teléfono"] ] as const).map(([k, label]) => (
                    <label className="block" key={k}><span className="block text-sm font-medium mb-2">{label}</span>
                      <input className={inputClass} value={business[k]} onChange={e => { setBusiness({ ...business, [k]: e.target.value }); setSaved(false); }} placeholder={label} /></label>
                  ))}
                  <label className="block"><span className="block text-sm font-medium mb-2">País</span><input className={inputClass} value={business.pais} readOnly /></label>
                  <label className="block"><span className="block text-sm font-medium mb-2">Zona horaria</span><input className={inputClass} value={business.zona} readOnly /></label>
                  <label className="block"><span className="block text-sm font-medium mb-2">Idioma</span><input className={inputClass} value={business.idioma} readOnly /></label>
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <button type="button" onClick={save} className="rounded-xl bg-green-600 hover:bg-green-700 text-white py-3 px-5 font-bold inline-flex items-center gap-2"><Save size={17}/> Guardar preferencias</button>
                  {saved && <span className="text-green-500 text-sm inline-flex items-center gap-1"><CheckCircle2 size={16} /> Guardado en este navegador</span>}
                </div>
              </section>
              <aside className={`border rounded-2xl p-5 h-fit ${container}`}>
                <h3 className="font-bold mb-4">Información de la cuenta</h3>
                <div className="rounded-xl bg-green-600/15 p-4 mb-5 flex items-center gap-3"><span className="w-12 h-12 rounded-full bg-green-600 text-white font-black flex items-center justify-center">K</span><div><strong>Kafes CRM</strong><p className={`text-xs ${muted}`}>Sistema propio</p></div></div>
                <dl className="space-y-3 text-sm">
                  <div><dt className={muted}>Empresa</dt><dd>{business.empresa}</dd></div>
                  <div><dt className={muted}>País</dt><dd>{business.pais}</dd></div>
                  <div><dt className={muted}>Zona horaria</dt><dd>{business.zona}</dd></div>
                  <div><dt className={muted}>Moneda</dt><dd>Soles (PEN)</dd></div>
                </dl>
              </aside>
            </div>
          )}

          {tab === "Canales" && (
            <div className="max-w-[810px] mx-auto">
              {!selectedChannel ? (
                <div className="space-y-2">
                  <div className="mb-5">
                    <h2 className="font-bold text-xl">Canales de comunicación</h2>
                    <p className={`text-sm mt-1 ${muted}`}>Selecciona un canal para revisar sus opciones. Ninguna conexión nueva se activa automáticamente.</p>
                  </div>
                  {[
                    { name: "Facebook Messenger", icon: Globe2, color: "text-blue-500", detail: "Mensajes de tu página de Facebook" },
                    { name: "WhatsApp", icon: MessageCircle, color: "text-green-500", detail: "Cloud API oficial de Meta · prioridad" },
                    { name: "Instagram", icon: Camera, color: "text-pink-500", detail: "Mensajes directos de Instagram" },
                    { name: "TikTok", icon: Radio, color: "text-slate-400", detail: "Canal pendiente de evaluar" },
                    { name: "Chatbot Web", icon: Globe, color: "text-cyan-500", detail: "Chat de atención para tu página web" },
                    { name: "SMS", icon: Send, color: "text-amber-500", detail: "Mensajería SMS" },
                    { name: "Voz", icon: Phone, color: "text-indigo-500", detail: "Llamadas y telefonía" },
                    { name: "Telegram", icon: Send, color: "text-sky-500", detail: "Mensajes de Telegram" },
                  ].map(({ name, icon: Icon, color, detail }) => (
                    <button type="button" key={name} onClick={() => setSelectedChannel(name)}
                      className={`w-full text-left rounded-lg border px-5 py-4 flex items-center gap-4 transition ${light ? "bg-slate-100 border-slate-200 hover:bg-slate-200" : "bg-[#162334] border-slate-700 hover:bg-[#1d3147]"}`}>
                      <Icon size={21} className={color} aria-hidden="true" />
                      <div className="min-w-0 flex-1"><span className="font-semibold text-sm block">{name}</span><span className={`text-xs ${muted}`}>{detail}</span></div>
                      <ChevronRight size={17} className={muted} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  <button type="button" onClick={() => setSelectedChannel(null)} className={`inline-flex items-center gap-2 text-sm font-semibold ${muted} hover:text-green-500`}>
                    <ArrowLeft size={17} /> Volver a canales
                  </button>
                  {selectedChannel === "WhatsApp" ? (
                    <>
                      <section className={`border rounded-xl p-6 ${container}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="text-green-500" /> WhatsApp Cloud API</h2>
                            <p className={`${muted} text-sm mt-1`}>Integración oficial con Meta para recibir y enviar mensajes sin QR.</p></div>
                          <span className="text-xs font-bold text-amber-500 rounded-full bg-amber-500/10 px-3 py-2">Sin conexión verificada</span>
                        </div>
                        <div className="mt-6 grid sm:grid-cols-3 gap-3">
                          {[["1", "Registrar la aplicación en Meta"], ["2", "Obtener identificadores del número"], ["3", "Activar webhook y probar mensajes"]].map(([number, label]) => (
                            <div key={number} className={`border rounded-xl p-4 ${light ? "border-slate-200" : "border-slate-700"}`}>
                              <strong className="text-green-500">{number}</strong><p className="text-sm mt-2">{label}</p>
                            </div>
                          ))}
                        </div>
                        <MetaSignupButton />
                        <div className="grid sm:grid-cols-2 gap-4 mt-6">
                          <label><span className="text-sm block mb-2">Phone Number ID</span><input className={inputClass} value={phoneId} onChange={e => setPhoneId(e.target.value)} placeholder="ID proporcionado por Meta" /></label>
                          <label><span className="text-sm block mb-2">WhatsApp Business Account ID</span><input className={inputClass} value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="Identificador WABA" /></label>
                        </div>
                        <p className={`mt-3 text-xs ${muted}`}>Campos de referencia solamente. No se guardan ni envían a un servidor. No introduzcas contraseñas, tokens ni secretos aquí.</p>
                        <div className="mt-5 border border-amber-500/30 bg-amber-500/10 rounded-xl p-4 flex gap-3 text-sm">
                          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
                          <p>No desconectes Lilibot. Primero hay que configurar la API en el servidor, validar webhooks y determinar cómo migrar el número que hoy utiliza QR.</p>
                        </div>
                      </section>
                      <section className={`border rounded-xl p-5 ${container}`}><h3 className="font-bold">Estado técnico</h3>
                        <p className={`${muted} text-sm mt-2`}>Webhook: sin verificar · Credenciales del servidor: sin verificar · Envío y recepción: sin probar</p>
                      </section>
                    </>
                  ) : (
                    <section className={`border rounded-xl p-6 ${container}`}>
                      <h2 className="text-xl font-bold">{selectedChannel}</h2>
                      <p className={`${muted} text-sm mt-3`}>Integración pendiente de implementar. No hay una conexión confirmada para este canal y todavía no se realizan cambios en tu CRM.</p>
                      <span className="mt-5 inline-block px-3 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-semibold">Próximamente</span>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "Integraciones" && (
            <div className="grid md:grid-cols-2 gap-4">
              {[[Cloud, "Meta / WhatsApp", "API oficial y webhooks", "Pendiente"], [Workflow, "Automatizaciones", "Flujos y respuestas automáticas", "Por revisar"], [Plug, "Inteligencia artificial", "Asistente de respuestas", "Por configurar"], [Database, "Base de datos", "Contactos, pedidos y conversaciones", "Revisar conexión"]].map(([Icon, name, description, status]) => {
                const I = Icon as typeof Cloud;
                return <section key={name as string} className={`border rounded-2xl p-5 ${container}`}><div className="flex gap-3 items-center"><I size={22} className="text-green-500" /><h3 className="font-bold">{name as string}</h3></div><p className={`${muted} text-sm mt-2`}>{description as string}</p><p className="mt-4 text-xs text-amber-500">{status as string}</p></section>;
              })}
            </div>
          )}

          {tab === "Administradores" && (
            <section className={`border rounded-2xl p-6 ${container}`}><h2 className="text-xl font-bold flex items-center gap-2"><UserRound size={20}/> Administradores y asesoras</h2><p className={`${muted} mt-3 text-sm`}>Próxima etapa: conectar este panel al sistema de usuarios y permisos existente. No se han creado, borrado ni modificado cuentas.</p><div className="mt-5 rounded-lg p-4 bg-green-600/10 text-sm">Roles previstos: Administrador · Supervisora · Asesora</div></section>
          )}

          {tab === "Seguridad" && (
            <section className={`border rounded-2xl p-6 ${container}`}><h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={20}/> Seguridad</h2><p className={`${muted} mt-3 text-sm`}>Las sesiones y permisos se deben consultar desde el backend. No mostraremos sesiones inventadas ni botones que simulen cerrarlas.</p><div className="mt-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm flex gap-3"><LockKeyhole className="text-amber-500 shrink-0"/><span>Las claves de Meta y los tokens solo deben guardarse en variables de entorno del servidor, nunca en el navegador.</span></div></section>
          )}

          {tab === "Facturación" && (
            <section className={`border rounded-2xl p-6 ${container}`}><h2 className="text-xl font-bold flex items-center gap-2"><CreditCard size={20}/> Facturación</h2><p className={`${muted} text-sm mt-3`}>Kafes CRM es tu sistema propio. Aquí mostraremos los costos reales de infraestructura y mensajería cuando conectemos sus fuentes. Se retiraron los datos de planes y límites ficticios.</p></section>
          )}
        </div>
      </main>
    </div>
  );
}
