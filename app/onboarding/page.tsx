"use client";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-8">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenido a Kafes CRM 🚀
        </h1>

        <p className="text-gray-500 mb-8">
          Sigue estos pasos para empezar a vender por WhatsApp.
        </p>

        <div className="space-y-4">
          <a
            href="/configuracion/whatsapp"
            className="block border rounded-xl p-5 hover:bg-gray-50"
          >
            <h2 className="text-xl font-bold">1. Conecta tu WhatsApp</h2>
            <p className="text-gray-500">
              Agrega tu Phone Number ID, WABA ID y token permanente.
            </p>
          </a>

          <a
            href="/usuarios"
            className="block border rounded-xl p-5 hover:bg-gray-50"
          >
            <h2 className="text-xl font-bold">2. Crea tus asesores</h2>
            <p className="text-gray-500">
              Agrega a tu equipo para atender clientes.
            </p>
          </a>

          <a
            href="/"
            className="block border rounded-xl p-5 hover:bg-gray-50"
          >
            <h2 className="text-xl font-bold">3. Abre tu embudo</h2>
            <p className="text-gray-500">
              Empieza a gestionar leads, seguimientos y ventas.
            </p>
          </a>
        </div>

        <a
          href="/"
          className="block bg-black text-white text-center rounded-xl py-4 mt-8 font-bold"
        >
          Ir al CRM
        </a>
      </div>
    </main>
  );
}