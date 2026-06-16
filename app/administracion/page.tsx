"use client";

import Link from "next/link";

export default function AdministracionPage() {
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

      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        <div className="h-12 bg-[#0b1218] border-b border-[#1f2a33] flex items-center justify-between px-5 shrink-0">
          <h1 className="text-sm font-bold text-white">Panel de Control - WhatsApp Manager</h1>

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
          <div className="grid grid-cols-[1fr_300px] gap-6">
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-black">Administración</h1>
                <p className="text-slate-400 mt-1">
                  Gestiona tu cuenta, equipo, permisos y configuración del sistema.
                </p>
              </div>

              <div className="flex gap-8 mb-5 text-sm">
                <button className="text-green-400 border-b-2 border-green-500 pb-2">Resumen</button>
                <button className="text-slate-400 pb-2">Usuarios</button>
                <button className="text-slate-400 pb-2">Roles y permisos</button>
                <button className="text-slate-400 pb-2">Planes y facturación</button>
                <button className="text-slate-400 pb-2">Seguridad</button>
                <button className="text-slate-400 pb-2">Registros de actividad</button>
                <button className="text-slate-400 pb-2">Configuración avanzada</button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                  ["👥", "Usuarios activos", "12", "↑ 20% vs mes anterior"],
                  ["🛡️", "Roles definidos", "6", "↑ 0% vs mes anterior"],
                  ["🧩", "Automatizaciones activas", "24", "↑ 14% vs mes anterior"],
                  ["💳", "Plan actual", "Premium", "Renovación: 02/06/2024"],
                ].map((card) => (
                  <div key={card[1]} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">
                        {card[0]}
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm font-bold">{card[1]}</p>
                        <h2 className="text-2xl font-black mt-1">{card[2]}</h2>
                        <p className="text-green-400 text-xs mt-1">{card[3]}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <h3 className="font-black mb-5">Información de la cuenta</h3>
                  {[
                    ["Nombre de la empresa", "Tu Empresa SAS"],
                    ["ID de cuenta", "12345678"],
                    ["Correo", "admin@tuempresa.com"],
                    ["Teléfono", "+57 300 123 4567"],
                    ["País", "Colombia"],
                    ["Zona horaria", "(GMT-05:00) Bogotá"],
                    ["Idioma", "Español"],
                  ].map((item) => (
                    <div key={item[0]} className="flex justify-between border-b border-slate-800 py-3 text-sm">
                      <span className="text-slate-400">{item[0]}</span>
                      <span>{item[1]}</span>
                    </div>
                  ))}

                  <button className="w-full mt-5 border border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-800">
                    Editar información
                  </button>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <h3 className="font-black mb-5">Uso del plan</h3>
                  {[
                    ["Contactos", "8.450 / 20.000", "42%"],
                    ["Conversaciones", "12.340 / 50.000", "25%"],
                    ["Mensajes", "32.100 / 100.000", "32%"],
                    ["Usuarios", "8 / 15", "53%"],
                  ].map((item) => (
                    <div key={item[0]} className="mb-5">
                      <div className="flex justify-between text-sm mb-2">
                        <span>{item[0]}</span>
                        <span className="text-slate-400">{item[1]}</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: item[2] }} />
                      </div>
                    </div>
                  ))}
                  <button className="w-full mt-5 border border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-800">
                    Ver detalles del plan
                  </button>
                </div>

                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                  <h3 className="font-black mb-5">Actividad reciente</h3>
                  {[
                    ["👤", "Nuevo usuario invitado", "María González fue invitada al equipo · Hoy, 10:30 AM"],
                    ["🛡️", "Rol actualizado", "Se actualizaron permisos del rol Agente · Hoy, 09:15 AM"],
                    ["⚙️", "Configuración modificada", "Se editó la configuración de WhatsApp · Ayer, 04:22 PM"],
                    ["💳", "Pago recibido", "Factura #F-2024-0456 pagada · Ayer, 11:08 AM"],
                  ].map((item) => (
                    <div key={item[1]} className="flex gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        {item[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{item[1]}</p>
                        <p className="text-xs text-slate-400">{item[2]}</p>
                      </div>
                    </div>
                  ))}
                  <button className="w-full border border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-800">
                    Ver toda la actividad
                  </button>
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <h3 className="font-black mb-5">Accesos rápidos</h3>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    ["👥", "Gestionar usuarios", "Agrega, edita o elimina usuarios del sistema."],
                    ["🛡️", "Roles y permisos", "Administra roles y permisos de acceso."],
                    ["🧩", "Integraciones", "Conecta tu CRM con otras herramientas."],
                    ["💳", "Facturación", "Administra tu plan y métodos de pago."],
                    ["🛡️", "Seguridad", "Configura 2FA, sesiones y políticas."],
                  ].map((item) => (
                    <div key={item[1]} className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-xl mb-4">
                        {item[0]}
                      </div>
                      <h4 className="font-black text-sm">{item[1]}</h4>
                      <p className="text-xs text-slate-400 mt-2">{item[2]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="bg-[#0f172a] border border-slate-800 rounded-2xl h-fit overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center text-black font-black text-xl">C</div>
                  <div>
                    <h3 className="font-black">Administrador</h3>
                    <p className="text-sm text-slate-400">admin@tucrm.com</p>
                    <p className="text-xs text-green-400">● En línea</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-slate-800">
                <p className="text-xs text-slate-500 font-bold mb-3">Cuenta</p>
                <div className="space-y-2 text-sm">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">👤 Mi perfil</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">⚙️ Preferencias</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">↪ Cerrar sesión</button>
                </div>
              </div>

              <div className="p-4 border-b border-slate-800">
                <p className="text-xs text-slate-500 font-bold mb-3">Administración</p>
                <div className="space-y-2 text-sm">
                  <button className="w-full text-left px-3 py-2 rounded-lg bg-green-700/70 font-bold">👥 Usuarios</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">🛡️ Roles y permisos</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">💳 Planes y facturación</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">🧩 Integraciones</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">🔐 Seguridad</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">📋 Registros de actividad</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">⚙️ Configuración avanzada</button>
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs text-slate-500 font-bold mb-3">Soporte</p>
                <div className="space-y-2 text-sm">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">❔ Centro de ayuda</button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800">💬 Enviar sugerencia</button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}