export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#020817] text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* CABECERA */}

        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 mb-6">

          <div className="flex items-center gap-4">

            <div className="w-20 h-20 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-2xl">
              C
            </div>

            <div>
              <h1 className="text-3xl font-bold">
                Cliente #{id}
              </h1>

              <p className="text-slate-400">
                Información del cliente
              </p>

              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                Interesado
              </span>
            </div>

          </div>

        </div>

        {/* MENU */}

        <div className="flex gap-6 border-b border-slate-800 mb-6 pb-4">

          <button className="text-green-400 font-semibold">
            Información
          </button>

          <button className="text-slate-400">
            Conversación
          </button>

          <button className="text-slate-400">
            Notas
          </button>

          <button className="text-slate-400">
            Actividades
          </button>

          <button className="text-slate-400">
            Historial
          </button>

        </div>

        {/* CONTENIDO */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">

            <h2 className="font-bold text-lg mb-4">
              Información del contacto
            </h2>

            <div className="space-y-4">

              <div>
                <p className="text-slate-400 text-sm">
                  Teléfono
                </p>
                <p>+51 999999999</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm">
                  Ciudad
                </p>
                <p>Lima</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm">
                  Asesor
                </p>
                <p>Cristian</p>
              </div>

            </div>

          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6">

            <h2 className="font-bold text-lg mb-4">
              Acciones rápidas
            </h2>

            <div className="space-y-3">

              <button className="w-full bg-green-600 hover:bg-green-700 rounded-lg py-3">
                Enviar WhatsApp
              </button>

              <button className="w-full bg-slate-800 rounded-lg py-3">
                Cambiar etapa
              </button>

              <button className="w-full bg-slate-800 rounded-lg py-3">
                Asignar asesor
              </button>

              <button className="w-full bg-red-600 rounded-lg py-3">
                Marcar como no responde
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}