"use client";

import Link from "next/link";

export default function ContactosPage() {
  return (
    <div className="min-h-screen bg-[#08111f] text-white">

      {/* CABECERA */}

      <div className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">
            Contactos
          </h1>

          <p className="text-slate-400">
            Gestiona todos tus clientes
          </p>
        </div>

        <div className="flex gap-3">
          <button className="bg-slate-800 px-4 py-2 rounded-xl">
            Importar
          </button>

          <button className="bg-green-600 px-4 py-2 rounded-xl font-bold">
            + Agregar contacto
          </button>
        </div>
      </div>

      {/* FILTROS */}

      <div className="p-6">

        <div className="flex gap-3 mb-5">

          <input
            placeholder="🔍 Buscar contactos..."
            className="bg-[#111827] border border-slate-700 rounded-xl px-4 py-3 w-[350px]"
          />

          <button className="bg-[#111827] border border-slate-700 px-4 rounded-xl">
            Filtros
          </button>

        </div>

        {/* ETIQUETAS */}

        <div className="flex gap-2 mb-5">

          <button className="bg-green-600 px-4 py-2 rounded-xl text-sm">
            Todos
          </button>

          <button className="bg-[#111827] px-4 py-2 rounded-xl text-sm">
            Clientes
          </button>

          <button className="bg-[#111827] px-4 py-2 rounded-xl text-sm">
            Prospectos
          </button>

          <button className="bg-[#111827] px-4 py-2 rounded-xl text-sm">
            No contactados
          </button>

        </div>

        {/* TABLA */}

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">

          <table className="w-full">

            <thead className="bg-[#111827]">
              <tr>
                <th className="text-left p-4">Nombre</th>
                <th className="text-left p-4">Teléfono</th>
                <th className="text-left p-4">Ciudad</th>
                <th className="text-left p-4">Asesor</th>
                <th className="text-left p-4">Etapa</th>
                <th className="text-left p-4">Acciones</th>
              </tr>
            </thead>

            <tbody>

              {[1,2,3,4,5].map((item) => (
                <tr
                  key={item}
                  className="border-t border-slate-800 hover:bg-slate-900"
                >
                  <td className="p-4">
                    Cliente {item}
                  </td>

                  <td className="p-4">
                    +51 999999999
                  </td>

                  <td className="p-4">
                    Lima
                  </td>

                  <td className="p-4">
                    Cristian
                  </td>

                  <td className="p-4">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs">
                      Interesado
                    </span>
                  </td>

                  <td className="p-4 flex gap-2">

                    <Link
                      href={`/clientes/${item}`}
                      className="bg-slate-800 px-3 py-1 rounded-lg text-sm"
                    >
                      Ver
                    </Link>

                    <button className="bg-green-600 px-3 py-1 rounded-lg text-sm">
                      WhatsApp
                    </button>

                  </td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}