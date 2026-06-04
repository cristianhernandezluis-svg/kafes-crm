"use client";

import WhatsAppButton from "@/components/WhatsAppButton";
import {
  ShoppingCart,
  Search,
  Truck,
  ShieldCheck,
  Headphones,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="bg-yellow-400 text-black p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-black">KAFES ONLINE</h1>

          <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-4 py-2 w-[400px]">
            <Search className="text-black" size={20} />
            <input
              placeholder="Buscar productos..."
              className="outline-none text-black w-full"
            />
          </div>

          <button className="bg-black text-yellow-400 p-3 rounded-full">
            <ShoppingCart />
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto py-20 px-6 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="bg-yellow-400 text-black px-4 py-2 rounded-full font-bold">
            NUEVO INGRESO
          </span>

          <h2 className="text-5xl md:text-6xl font-black mt-6 leading-tight">
            Herramientas Profesionales
          </h2>

          <p className="text-zinc-300 mt-6 text-lg">
            Compra herramientas de calidad con envío a todo el Perú y pago seguro mediante Izipay.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <a
              href="#productos"
              className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black text-xl hover:scale-105 transition text-center"
            >
              VER CATÁLOGO
            </a>

            <a
              href="https://wa.me/51980296583?text=Hola,%20quiero%20ver%20ofertas%20de%20Kafes%20Online"
              target="_blank"
              className="border border-yellow-400 text-yellow-400 px-8 py-4 rounded-2xl font-black text-xl hover:bg-yellow-400 hover:text-black transition text-center"
            >
              OFERTAS
            </a>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-[40px] p-6 md:p-10 border border-zinc-800">
          <img
            src="/logo-kafes.jpg"
            alt="Kafes Online"
            className="rounded-3xl w-full"
          />
        </div>
      </section>

      <section className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 px-6 pb-20">
        <Benefit icon={<Truck />} title="Envíos a todo el Perú" text="Despachamos rápido y seguro." />
        <Benefit icon={<ShieldCheck />} title="Pago Seguro" text="Compra segura y atención confiable." />
        <Benefit icon={<Headphones />} title="Atención Personalizada" text="Soporte rápido por WhatsApp." />
      </section>

      <section id="productos" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-4xl font-black">Productos Destacados</h2>
          <span className="text-yellow-400 font-bold">Stock limitado</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ProductCard
            href="/producto/sierra-bomvink-8"
            image="/sierra-bomvink-8.jpg"
            alt="Sierra BOMVINK"
            badge="MÁS VENDIDO"
            title='Sierra Inalámbrica BOMVINK 8"'
            description="Incluye 2 baterías de 21V. Ideal para poda, corte de madera y trabajos de campo."
            price="S/249"
            beforePrice="S/299"
          />

          <ProductCard
            href="/producto/soporte-telescopico-xtd"
            image="/soporte-telescopico-xtd.jpg"
            alt="Soporte Telescópico XTD"
            badge="NUEVO"
            title="Soporte Telescópico XTD"
            description="Soporte profesional para amoladora con mayor estabilidad, precisión y seguridad al cortar."
            price="S/209"
            beforePrice="S/249"
          />
        </div>
      </section>

      <WhatsAppButton />
    </main>
  );
}

function Benefit({ icon, title, text }: any) {
  return (
    <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 hover:border-yellow-400 transition">
      <div className="text-yellow-400">{icon}</div>
      <h3 className="text-2xl font-black mt-4">{title}</h3>
      <p className="text-zinc-400 mt-2">{text}</p>
    </div>
  );
}

function ProductCard({
  href,
  image,
  alt,
  badge,
  title,
  description,
  price,
  beforePrice,
}: any) {
  return (
    <a
      href={href}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer hover:-translate-y-2 hover:border-yellow-400 transition duration-300 block group"
    >
      <div className="bg-white p-6 overflow-hidden">
        <img
          src={image}
          alt={alt}
          className="w-full h-72 object-contain group-hover:scale-105 transition duration-300"
        />
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between">
          <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-black">
            {badge}
          </span>

          <span className="text-green-400 text-sm font-bold">
            Disponible
          </span>
        </div>

        <h3 className="text-2xl font-black mt-4 leading-tight">
          {title}
        </h3>

        <p className="text-zinc-400 mt-3 leading-relaxed">
          {description}
        </p>

        <div className="mt-5 flex items-center gap-3">
          <p className="text-yellow-400 text-4xl font-black">
            {price}
          </p>

          <span className="line-through text-zinc-500 text-lg">
            {beforePrice}
          </span>
        </div>

        <button className="mt-6 w-full bg-yellow-400 hover:bg-yellow-300 text-black py-4 rounded-2xl font-black text-lg transition">
          Ver detalles
        </button>
      </div>
    </a>
  );
}