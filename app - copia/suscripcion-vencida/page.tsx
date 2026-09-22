export default function SuscripcionVencidaPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Suscripción vencida
        </h1>

        <p className="text-gray-600 mb-6">
          Tu acceso a Kafes CRM está suspendido porque tu suscripción ha vencido.
          Para seguir usando el sistema, renueva tu plan.
        </p>

        <a
          href={`https://wa.me/51980296583?text=${encodeURIComponent(
            "Hola, quiero renovar mi suscripción de Kafes CRM"
          )}`}
          target="_blank"
          className="block bg-green-600 text-white py-3 rounded-xl font-bold"
        >
          Renovar por WhatsApp
        </a>

        <a
          href="/login"
          className="block mt-4 text-sm text-gray-500 underline"
        >
          Volver al login
        </a>
      </div>
    </main>
  );
}