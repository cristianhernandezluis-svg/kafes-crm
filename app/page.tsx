import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-black text-yellow-400">Kafes CRM</h1>

        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-white font-bold">
            Iniciar sesión
          </Link>

          <Link
            href="/register"
            className="bg-yellow-400 text-black px-5 py-3 rounded-xl font-black"
          >
            Prueba gratis
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="bg-yellow-400 text-black px-4 py-2 rounded-full font-black">
            CRM PARA WHATSAPP
          </span>

          <h2 className="text-5xl md:text-6xl font-black mt-6 leading-tight">
            Organiza tus chats, clientes y ventas en un solo lugar
          </h2>

          <p className="text-zinc-300 mt-6 text-lg">
            Kafes CRM ayuda a tu equipo a responder más rápido, hacer
            seguimiento y no perder clientes de WhatsApp.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <Link
              href="/register"
              className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black text-xl text-center"
            >
              Probar gratis
            </Link>

            <Link
              href="/login"
              className="border border-yellow-400 text-yellow-400 px-8 py-4 rounded-2xl font-black text-xl text-center"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="bg-white text-black rounded-2xl p-6">
            <h3 className="text-2xl font-black mb-4">Embudo de ventas</h3>

            <div className="grid grid-cols-2 gap-4">
              <Card title="Nuevos leads" value="128" />
              <Card title="Seguimientos" value="42" />
              <Card title="Adelantos" value="18" />
              <Card title="Ventas" value="35" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        <Feature
          title="Chats de WhatsApp"
          text="Gestiona conversaciones desde un solo panel."
        />
        <Feature
          title="Seguimientos"
          text="Programa recordatorios para no perder ventas."
        />
        <Feature
          title="Multiusuarios"
          text="Crea asesores y controla tu equipo."
        />
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-100 rounded-xl p-4">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
      <h3 className="text-2xl font-black text-yellow-400">{title}</h3>
      <p className="text-zinc-400 mt-3">{text}</p>
    </div>
  );
}