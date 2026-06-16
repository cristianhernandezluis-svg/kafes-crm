"use client";

import Link from "next/link";

export default function ReportesPage() {
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
          <Link href="/reportes" className="flex items-center gap-3 bg-green-700/70 text-white px-3 py-3 rounded-lg font-bold text-sm">📊 Reportes</Link>
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
          <h1 className="text-sm font-bold text-white">Reportes</h1>
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
          <div className="flex justify-between items-start mb-5">
            <div>
              <h1 className="text-3xl font-black">Reportes</h1>
              <p className="text-slate-400 mt-1">
                Analiza el rendimiento de tu CRM y toma mejores decisiones.
              </p>
            </div>

            <button className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-bold text-sm">
              ⬇ Exportar reporte
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            <button className="bg-[#0f172a] border border-slate-800 px-4 py-3 rounded-xl text-sm">
              📅 01/05/2024 - 31/05/2024
            </button>
            <button className="bg-[#0f172a] border border-slate-800 px-4 py-3 rounded-xl text-sm">
              Comparar con: 01/04/2024 - 30/04/2024
            </button>
            <button className="bg-[#0f172a] border border-slate-800 px-4 py-3 rounded-xl text-sm">
              Todos los equipos
            </button>
          </div>

          <div className="flex gap-8 mb-5 text-sm">
            <button className="text-green-400 border-b-2 border-green-500 pb-2">Resumen</button>
            <button className="text-slate-400 pb-2">Conversaciones</button>
            <button className="text-slate-400 pb-2">Leads</button>
            <button className="text-slate-400 pb-2">Ventas</button>
            <button className="text-slate-400 pb-2">Mensajes</button>
            <button className="text-slate-400 pb-2">Agentes</button>
            <button className="text-slate-400 pb-2">Clientes</button>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-4">
            {[
              ["👥", "Conversaciones totales", "1.245", "↑ 18% vs periodo anterior"],
              ["🎯", "Leads nuevos", "128", "↑ 12% vs periodo anterior"],
              ["💵", "Ventas totales", "S/ 32.450", "↑ 15% vs periodo anterior"],
              ["✅", "Ventas entregadas", "89", "↑ 10% vs periodo anterior"],
              ["❌", "No responden", "34", "↓ 8% vs periodo anterior"],
            ].map((item) => (
              <div key={item[1]} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">
                    {item[0]}
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm font-bold">{item[1]}</p>
                    <h2 className="text-2xl font-black mt-1">{item[2]}</h2>
                    <p className="text-green-400 text-xs mt-1">{item[3]}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 col-span-1">
              <h3 className="font-black mb-5">Conversaciones por día</h3>
              <div className="h-40 flex items-end gap-2">
                {[30, 45, 60, 80, 65, 90, 120, 160, 130, 140, 110, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-green-500/70 rounded-t" style={{ height: `${h}px` }} />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">01 May - 31 May</p>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black mb-5">Leads por etapa</h3>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-full border-[22px] border-green-500 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-black">256</p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p>🟢 Nuevo <span className="text-slate-400">23</span></p>
                  <p>🟡 Interesado <span className="text-slate-400">45</span></p>
                  <p>🟣 Pagó adelanto <span className="text-slate-400">57</span></p>
                  <p>🔴 No responde <span className="text-slate-400">33</span></p>
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black mb-5">Ventas por mes</h3>
              <div className="h-40 flex items-end gap-4">
                {[70, 66, 78, 88, 120, 65].map((h, i) => (
                  <div key={i} className="flex-1 bg-green-500 rounded-t" style={{ height: `${h}px` }} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-3">
                <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black mb-5">Tasa de respuesta</h3>
              <div className="text-center py-8">
                <p className="text-5xl font-black text-green-400">78%</p>
                <p className="text-slate-400 mt-2">Respondidas</p>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black mb-5">Conversaciones por agente</h3>
              {["María González", "Carlos Martínez", "Laura Sánchez", "Juan Pérez", "Ana Rodríguez"].map((n, i) => (
                <div key={n} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{n}</span>
                    <span>{245 - i * 35}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full">
                    <div className="h-2 bg-green-500 rounded-full" style={{ width: `${90 - i * 12}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black mb-5">Mensajes enviados</h3>
              <div className="text-center py-8">
                <p className="text-5xl font-black text-green-400">3.856</p>
                <p className="text-slate-400 mt-2">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="font-black">Reporte de conversaciones</h3>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-[#111827] text-slate-400">
                <tr>
                  <th className="text-left p-4">Canal</th>
                  <th className="text-left p-4">Conversaciones</th>
                  <th className="text-left p-4">Respondidas</th>
                  <th className="text-left p-4">No respondidas</th>
                  <th className="text-left p-4">Tasa respuesta</th>
                  <th className="text-left p-4">Tiempo promedio</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["WhatsApp", "1.102", "876", "203", "79%", "2m 34s"],
                  ["Instagram", "87", "71", "14", "82%", "5m 12s"],
                  ["Facebook", "56", "42", "14", "75%", "4m 02s"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-slate-800">
                    {row.map((cell) => (
                      <td key={cell} className="p-4">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}