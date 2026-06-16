"use client";

import Link from "next/link";

export default function AjustesPage() {
  return (
    <div className="min-h-screen bg-[#08111f] text-white flex">
      <aside className="hidden lg:flex w-[220px] bg-[#101820] text-white flex-col h-screen sticky top-0 border-r border-[#1f2a33]">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-4 border-b border-[#1f2a33]">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">K</div>
          <h1 className="text-xl font-black">Kafes <span className="text-green-400">CRM</span></h1>
        </Link>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[11px] text-slate-400 uppercase font-bold">Principal</p>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Dashboard</Link>
          <Link href="/chat" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">💬 Conversaciones</Link>
          <Link href="/contactos" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">👤 Contactos</Link>
          <Link href="/kanban" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">🧩 Kanban</Link>
          <Link href="/mensajes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">✉️ Mensajes</Link>
          <Link href="/plantillas" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📄 Plantillas</Link>
          <Link href="/automatizaciones" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">⚙️ Automatizaciones</Link>
          <Link href="/reportes" className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 text-sm">📊 Reportes</Link>
          <Link href="/ajustes" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">⚙️ Ajustes</Link>
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

      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5 shrink-0">
          <h1 className="text-sm font-bold text-white">Ajustes</h1>
          <div className="flex items-center gap-4 text-slate-300">
            <button className="hover:text-white">🔍</button>
            <button className="hover:text-white">🔔</button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black">C</div>
              <div>
                <p className="text-xs font-bold text-white">Administrador</p>
                <p className="text-[10px] text-green-400">● En línea</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[calc(100vh-48px)] overflow-y-auto p-6">
          <div className="grid grid-cols-[1fr_340px] gap-6">
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-black">Ajustes</h1>
                <p className="text-slate-400 mt-1">
                  Gestiona la configuración general de tu CRM.
                </p>
              </div>

              <div className="flex gap-8 mb-5 text-sm">
                <button className="text-green-400 border-b-2 border-green-500 pb-2">General</button>
                <button className="text-slate-400 pb-2">WhatsApp</button>
                <button className="text-slate-400 pb-2">Equipo</button>
                <button className="text-slate-400 pb-2">Notificaciones</button>
                <button className="text-slate-400 pb-2">Campos personalizados</button>
                <button className="text-slate-400 pb-2">Integraciones</button>
                <button className="text-slate-400 pb-2">Seguridad</button>
                <button className="text-slate-400 pb-2">Facturación</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  ["⚙️", "Configuración general", "Configura la información básica de tu cuenta, región, idioma y zona horaria."],
                  ["🟢", "WhatsApp", "Administra tu número de WhatsApp, mensajes de bienvenida y horario de atención."],
                  ["👥", "Equipo", "Administra usuarios, roles, permisos y equipos de trabajo."],
                  ["🔔", "Notificaciones", "Configura notificaciones por correo, app y alertas importantes."],
                  ["🔲", "Campos personalizados", "Crea campos personalizados para contactos y conversaciones."],
                  ["🧩", "Integraciones", "Conecta tu CRM con otras herramientas y servicios."],
                  ["🛡️", "Seguridad", "Gestiona autenticación, sesiones activas y seguridad de la cuenta."],
                  ["💳", "Facturación", "Administra tu plan, métodos de pago y facturas."],
                ].map((item) => (
                  <div key={item[1]} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:bg-slate-800/60 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">
                        {item[0]}
                      </div>
                      <div>
                        <h3 className="font-black">{item[1]}</h3>
                        <p className="text-sm text-slate-400 mt-1">{item[2]}</p>
                      </div>
                    </div>
                    <span className="text-slate-400">›</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-2xl">⚙️</div>
                  <div>
                    <h3 className="font-black">Sistema</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Configuración avanzada del sistema, respaldos y mantenimiento.
                    </p>
                  </div>
                </div>
                <span className="text-slate-400">›</span>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-black">Sesiones activas</h3>
                    <p className="text-sm text-slate-400">
                      Dispositivos y navegadores donde tu cuenta está activa.
                    </p>
                  </div>
                  <button className="bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm font-bold">
                    Cerrar todas las sesiones
                  </button>
                </div>

                {[
                  ["🌐", "Windows · Google Chrome", "Bogotá, Colombia · IP: 190.123.45.67", "Actual"],
                  ["📱", "iPhone 14 · WhatsApp Business", "Medellín, Colombia · IP: 190.123.45.68", "Hace 2 horas"],
                  ["💻", "MacOS · Safari", "Cali, Colombia · IP: 190.123.45.69", "Hace 1 día"],
                ].map((s) => (
                  <div key={s[1]} className="p-4 border-t border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">{s[0]}</div>
                      <div>
                        <p className="font-bold">{s[1]}</p>
                        <p className="text-sm text-slate-400">{s[2]}</p>
                      </div>
                    </div>
                    <p className={s[3] === "Actual" ? "text-green-400 text-sm" : "text-slate-400 text-sm"}>{s[3]}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black mb-5">Información de la cuenta</h3>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-2xl">💬</div>
                  <div>
                    <h2 className="text-xl font-black">TuCRM</h2>
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                      Plan Profesional
                    </span>
                    <p className="text-sm text-slate-400 mt-2">ID de cuenta: 12345678</p>
                  </div>
                </div>

                <div className="space-y-5 text-sm">
                  <div>
                    <p className="text-slate-500">Empresa</p>
                    <p>Tu Empresa SAS</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Correo</p>
                    <p>admin@tuempresa.com</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Teléfono</p>
                    <p>+57 300 123 4567</p>
                  </div>
                  <div>
                    <p className="text-slate-500">País</p>
                    <p>Colombia</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Zona horaria</p>
                    <p>(GMT-05:00) Bogotá</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Idioma</p>
                    <p>Español</p>
                  </div>
                </div>

                <button className="w-full mt-5 border border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-800">
                  Editar información
                </button>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black mb-5">Uso del plan</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Periodo actual: 01/05/2024 - 31/05/2024
                </p>

                {[
                  ["Contactos", "8.450 / 20.000", "42%"],
                  ["Conversaciones", "12.340 / 50.000", "25%"],
                  ["Mensajes", "32.100 / 100.000", "32%"],
                  ["Usuarios", "8 / 15", "53%"],
                ].map((item) => (
                  <div key={item[0]} className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{item[0]}</span>
                      <span className="text-slate-400">{item[1]}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: item[2] }} />
                    </div>
                  </div>
                ))}

                <button className="w-full mt-3 border border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-800">
                  Ver detalles del plan
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}