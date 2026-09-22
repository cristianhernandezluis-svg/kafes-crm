"use client";

import { useEffect, useState } from "react";

type Empresa = {
  id: number;
  nombre: string;
  plan: string;
  estado: string;
  usuarios: number;
  fecha_vencimiento: string | null;
  created_at: string;
};

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  const cargarEmpresas = async () => {
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

    const res = await fetch("/api/admin/empresas", {
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setEmpresas(data.empresas);
    }
  };

  const actualizarEmpresa = async (
  empresa_id: number,
  plan: string,
  estado: string,
  fecha_vencimiento?: string
) => {
    const res = await fetch("/api/admin/empresas", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  empresa_id,
  plan,
  estado,
  fecha_vencimiento,
}),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "No se pudo actualizar");
      return;
    }

    cargarEmpresas();
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Empresas</h1>
            <p className="text-gray-500">
              Gestiona planes y estado de las empresas registradas.
            </p>
          </div>

          <a href="/dashboard" className="bg-black text-white px-5 py-3 rounded-lg font-bold">
            Volver
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3 text-left">ID</th>
                <th className="border p-3 text-left">Empresa</th>
                <th className="border p-3 text-left">Usuarios</th>
                <th className="border p-3 text-left">Plan</th>
                <th className="border p-3 text-left">Estado</th>
		<th className="border p-3 text-left">Vencimiento</th>
		<th className="border p-3 text-left">Creada</th>
              </tr>
            </thead>

            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td className="border p-3">{empresa.id}</td>
                  <td className="border p-3 font-bold">{empresa.nombre}</td>
                  <td className="border p-3">{empresa.usuarios}</td>

                  <td className="border p-3">
                    <select
                      className="border rounded p-2"
                      value={empresa.plan}
                      onChange={(e) =>
                        actualizarEmpresa(
                          empresa.id,
                          e.target.value,
                          empresa.estado
                        )
                      }
                    >
                      <option value="gratis">gratis</option>
                      <option value="pro">pro</option>
                      <option value="empresa">empresa</option>
                    </select>
                  </td>

                  <td className="border p-3">
                    <select
                      className="border rounded p-2"
                      value={empresa.estado}
                      onChange={(e) =>
                        actualizarEmpresa(
                          empresa.id,
                          empresa.plan,
                          e.target.value
                        )
                      }
                    >
                      <option value="activo">activo</option>
                      <option value="suspendido">suspendido</option>
                    </select>
                  </td>
<td className="border p-3">
  <input
  type="text"
  placeholder="2026-07-09"
  className="border rounded p-2 w-32"
  defaultValue={
    empresa.fecha_vencimiento
      ? empresa.fecha_vencimiento.slice(0, 10)
      : ""
  }
  onBlur={(e) =>
    actualizarEmpresa(
      empresa.id,
      empresa.plan,
      empresa.estado,
      e.target.value
    )
  }
/>
</td>
                  <td className="border p-3">
                    {new Date(empresa.created_at).toLocaleDateString("es-PE")}
                  </td>
                </tr>
              ))}

              {empresas.length === 0 && (
                <tr>
                  <td className="p-5 text-center text-gray-500" colSpan={7}>
                    No hay empresas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}