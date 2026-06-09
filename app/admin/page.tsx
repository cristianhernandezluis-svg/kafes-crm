"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Metricas = {
  empresas: number;
  usuarios: number;
  clientes: number;
  activas: number;
  suspendidas: number;
  vencidas: number;
};

export default function AdminPage() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);

  const cargarMetricas = async () => {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (!usuarioGuardado) {
      window.location.href = "/login";
      return;
    }

    const usuario = JSON.parse(usuarioGuardado);

    if (usuario.email !== "cristianluis_03@live.com") {
      alert("No tienes permiso para acceder a esta página");
      window.location.href = "/dashboard";
      return;
    }

    const res = await fetch("/api/admin/dashboard", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setMetricas(data.metricas);
    }
  };

  useEffect(() => {
    cargarMetricas();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Panel Admin Kafes CRM</h1>
        <p className="text-gray-500 mb-8">
          Control interno del SaaS. Solo visible para Cristian.
        </p>

        {metricas && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <MetricCard titulo="🏢 Empresas" valor={metricas.empresas} />
            <MetricCard titulo="👥 Usuarios" valor={metricas.usuarios} />
            <MetricCard titulo="💬 Clientes CRM" valor={metricas.clientes} />
            <MetricCard titulo="🟢 Activas" valor={metricas.activas} />
            <MetricCard titulo="🔴 Suspendidas" valor={metricas.suspendidas} />
            <MetricCard titulo="⏰ Vencidas" valor={metricas.vencidas} />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <AdminCard
            title="Empresas"
            text="Ver empresas registradas, planes, estados y vencimientos."
            href="/admin/empresas"
          />

          <AdminCard
            title="Suscripciones"
            text="Controlar planes activos, vencidos y suspendidos."
            href="/admin/empresas"
          />

          <AdminCard
            title="Soporte"
            text="Revisar clientes que necesitan ayuda para configurar WhatsApp."
            href="/admin/empresas"
          />
        </div>

        <Link
          href="/dashboard"
          className="inline-block mt-8 bg-black text-white px-6 py-3 rounded-lg font-bold"
        >
          Volver al CRM
        </Link>
      </div>
    </main>
  );
}

function MetricCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <p className="text-gray-500">{titulo}</p>
      <p className="text-4xl font-black mt-2">{valor}</p>
    </div>
  );
}

function AdminCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition block"
    >
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-gray-500 mt-2">{text}</p>
    </Link>
  );
}