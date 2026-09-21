"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useTemaCRM } from "@/components/TemaProvider";

type PostDistribucion = {
  id: number;
  post_id: string;
  nombre: string | null;
  activo: boolean;
};

type GrupoDistribucion = {
  id: number;
  nombre: string;
  producto_slug: string | null;
  bot_slug: string | null;
  closer_principal_id: number | null;
  closer_principal_nombre: string | null;
  closer_reemplazo_id: number | null;
  closer_reemplazo_nombre: string | null;
  activo: boolean;
  posts: PostDistribucion[];
};

type Closer = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  disponible: boolean;
  reemplazo_usuario_id: number | null;
};

type FormularioGrupo = {
  id: number | null;
  nombre: string;
  producto_slug: string;
  closer_principal_id: string;
  closer_reemplazo_id: string;
  activo: boolean;
  post_ids: string[];
};

const formularioVacio: FormularioGrupo = {
  id: null,
  nombre: "",
  producto_slug: "",
  closer_principal_id: "",
  closer_reemplazo_id: "",
  activo: true,
  post_ids: [""],
};

export default function DistribucionPage() {
  const { temaClaro, cambiarTema } = useTemaCRM();

  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [grupos, setGrupos] = useState<GrupoDistribucion[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);

  const [formulario, setFormulario] =
    useState<FormularioGrupo>(formularioVacio);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
const [cambiandoCloserId, setCambiandoCloserId] =
  useState<number | null>(null);

  const fondo = temaClaro
    ? "bg-slate-50 text-slate-900"
    : "bg-[#0b1117] text-white";

  const panel = temaClaro
    ? "bg-white border-slate-200"
    : "bg-[#111820] border-[#25303a]";

  const input = temaClaro
    ? "bg-white border-slate-300 text-slate-900"
    : "bg-[#0b1117] border-slate-700 text-white";

  function ponerGrupoEnFormulario(grupo: GrupoDistribucion) {
    setFormulario({
      id: grupo.id,
      nombre: grupo.nombre || "",
      producto_slug: grupo.producto_slug || "",
      closer_principal_id: grupo.closer_principal_id
        ? String(grupo.closer_principal_id)
        : "",
      closer_reemplazo_id: grupo.closer_reemplazo_id
        ? String(grupo.closer_reemplazo_id)
        : "",
      activo: grupo.activo !== false,
      post_ids:
        grupo.posts.length > 0
          ? grupo.posts.map((post) => post.post_id)
          : [""],
    });
  }

  async function cargarDatos(
    empresa: number,
    grupoSeleccionado?: number
  ) {
    try {
      setCargando(true);

      const response = await fetch(
        `/api/distribucion?empresa_id=${empresa}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "No se pudo cargar la distribución"
        );
      }

      const nuevosGrupos: GrupoDistribucion[] =
        data.grupos || [];

      setGrupos(nuevosGrupos);
      setClosers(data.closers || []);

      if (grupoSeleccionado) {
        const encontrado = nuevosGrupos.find(
          (grupo) =>
            Number(grupo.id) === Number(grupoSeleccionado)
        );

        if (encontrado) {
          ponerGrupoEnFormulario(encontrado);
          return;
        }
      }

      if (
        formulario.id &&
        nuevosGrupos.some(
          (grupo) => Number(grupo.id) === Number(formulario.id)
        )
      ) {
        const actual = nuevosGrupos.find(
          (grupo) => Number(grupo.id) === Number(formulario.id)
        );

        if (actual) {
          ponerGrupoEnFormulario(actual);
          return;
        }
      }

      if (nuevosGrupos.length > 0) {
        ponerGrupoEnFormulario(nuevosGrupos[0]);
      }
    } catch (error) {
      console.error(error);

      setMensaje(
        error instanceof Error
          ? error.message
          : "Error cargando distribución"
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    const usuario = JSON.parse(
      localStorage.getItem("usuario") || "{}"
    );

    const id = Number(
      usuario.empresa_id || usuario.empresaId || 0
    );

    if (!id) {
      setMensaje("No se encontró la empresa del usuario.");
      setCargando(false);
      return;
    }

    setEmpresaId(id);
    cargarDatos(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nuevoGrupo() {
    setFormulario({
      ...formularioVacio,
      post_ids: [""],
    });

    setMensaje("");
  }

  function agregarPost() {
    setFormulario((actual) => ({
      ...actual,
      post_ids: [...actual.post_ids, ""],
    }));
  }

  function actualizarPost(index: number, valor: string) {
    setFormulario((actual) => ({
      ...actual,
      post_ids: actual.post_ids.map((postId, i) =>
        i === index ? valor : postId
      ),
    }));
  }

  function eliminarPost(index: number) {
    setFormulario((actual) => {
      const nuevos = actual.post_ids.filter(
        (_, i) => i !== index
      );

      return {
        ...actual,
        post_ids: nuevos.length ? nuevos : [""],
      };
    });
  }

  async function guardarGrupo() {
    if (!empresaId) return;

    if (!formulario.nombre.trim()) {
      setMensaje("Escribe el nombre del grupo.");
      return;
    }

    if (!formulario.producto_slug.trim()) {
      setMensaje("Escribe el producto del grupo.");
      return;
    }

    try {
      setGuardando(true);
      setMensaje("");

      const response = await fetch("/api/distribucion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: formulario.id,
          empresa_id: empresaId,
          nombre: formulario.nombre.trim(),
          producto_slug: formulario.producto_slug.trim(),

          // Por ahora el bot usa el mismo slug del producto.
          bot_slug: formulario.producto_slug.trim(),

          closer_principal_id:
            formulario.closer_principal_id || null,

          closer_reemplazo_id:
            formulario.closer_reemplazo_id || null,

          activo: formulario.activo,

          post_ids: formulario.post_ids
            .map((postId) => postId.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "No se pudo guardar el grupo"
        );
      }

      setMensaje("Configuración guardada correctamente.");

      await cargarDatos(
        empresaId,
        Number(data.grupo_id)
      );
    } catch (error) {
      console.error(error);

      setMensaje(
        error instanceof Error
          ? error.message
          : "Error guardando distribución"
      );
    } finally {
      setGuardando(false);
    }
  }

async function cambiarDisponibilidadCloser(
  usuarioId: number,
  disponible: boolean
) {
  if (!empresaId) return;

  try {
    setCambiandoCloserId(usuarioId);
    setMensaje("");

    const response = await fetch("/api/distribucion", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        usuario_id: usuarioId,
        disponible,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "No se pudo cambiar la disponibilidad"
      );
    }

    setClosers((actuales) =>
      actuales.map((closer) =>
        closer.id === usuarioId
          ? { ...closer, disponible }
          : closer
      )
    );

    setMensaje(
      disponible
        ? `${data.nombre} ahora está DISPONIBLE.`
        : `${data.nombre} ahora está AUSENTE.`
    );
  } catch (error) {
    console.error(error);

    setMensaje(
      error instanceof Error
        ? error.message
        : "Error cambiando disponibilidad"
    );
  } finally {
    setCambiandoCloserId(null);
  }
}

  return (
    <div className={`min-h-screen flex ${fondo}`}>
      <Sidebar
        temaClaro={temaClaro}
        onCambiarTema={cambiarTema}
      />

      <main className="flex-1 min-w-0 p-4 md:p-7 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
            <div>
              <p className="text-green-500 text-xs font-black uppercase tracking-widest">
                Automatización comercial
              </p>

              <h1 className="text-2xl md:text-3xl font-black mt-1">
                Distribución de Leads
              </h1>

              <p
                className={`text-sm mt-1 ${
                  temaClaro
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                Configura qué producto, bot y closer recibe
                cada Post ID.
              </p>
            </div>

            <button
              type="button"
              onClick={nuevoGrupo}
              className="bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-xl font-black text-sm"
            >
              + Nuevo grupo
            </button>
          </div>

          {mensaje && (
            <div
              className={`mb-5 border rounded-xl px-4 py-3 text-sm ${
                mensaje.includes("correctamente")
                  ? "border-green-500/40 bg-green-500/10 text-green-500"
                  : "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
              }`}
            >
              {mensaje}
            </div>
          )}

          {cargando ? (
            <div className={`border rounded-2xl p-8 ${panel}`}>
              Cargando distribución...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
              <section
                className={`border rounded-2xl overflow-hidden ${panel}`}
              >
                <div className="p-4 border-b border-slate-700/30">
                  <p className="font-black">
                    Grupos
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {grupos.length} configurado
                    {grupos.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="p-2 space-y-2">
                  {grupos.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">
                      Todavía no hay grupos.
                    </div>
                  )}

                  {grupos.map((grupo) => {
                    const activo =
                      Number(formulario.id) ===
                      Number(grupo.id);

                    return (
                      <button
                        key={grupo.id}
                        type="button"
                        onClick={() =>
                          ponerGrupoEnFormulario(grupo)
                        }
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          activo
                            ? "border-green-500 bg-green-500/10"
                            : temaClaro
                            ? "border-slate-200 hover:bg-slate-50"
                            : "border-slate-800 hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black">
                            {grupo.nombre}
                          </p>

                          <span
                            className={`text-[10px] font-black px-2 py-1 rounded-full ${
                              grupo.activo
                                ? "bg-green-500/15 text-green-500"
                                : "bg-slate-500/15 text-slate-500"
                            }`}
                          >
                            {grupo.activo
                              ? "ACTIVO"
                              : "PAUSADO"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                          {grupo.producto_slug ||
                            "Sin producto"}
                        </p>

                        <div className="flex justify-between mt-3 text-xs">
                          <span className="text-slate-500">
                            Post IDs
                          </span>

                          <span className="font-black">
                            {grupo.posts.length}
                          </span>
                        </div>

                        <div className="flex justify-between mt-1 text-xs">
                          <span className="text-slate-500">
                            Closer
                          </span>

                          <span className="font-semibold">
                            {grupo.closer_principal_nombre ||
                              "Sin asignar"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section
                className={`border rounded-2xl p-5 md:p-7 ${panel}`}
              >
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <p className="text-lg font-black">
                      {formulario.id
                        ? formulario.nombre
                        : "Nuevo grupo"}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Los cambios de esta pantalla quedan
                      guardados en PostgreSQL.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormulario((actual) => ({
                        ...actual,
                        activo: !actual.activo,
                      }))
                    }
                    className={`px-3 py-2 rounded-lg text-xs font-black ${
                      formulario.activo
                        ? "bg-green-500/15 text-green-500"
                        : "bg-slate-500/15 text-slate-500"
                    }`}
                  >
                    {formulario.activo
                      ? "● Activo"
                      : "○ Pausado"}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Nombre del grupo
                    </label>

                    <input
                      value={formulario.nombre}
                      onChange={(e) =>
                        setFormulario((actual) => ({
                          ...actual,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="BROCA"
                      className={`w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:border-green-500 ${input}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Producto
                    </label>

                    <input
                      value={formulario.producto_slug}
                      onChange={(e) =>
                        setFormulario((actual) => ({
                          ...actual,
                          producto_slug: e.target.value,
                        }))
                      }
                      placeholder="broca-escalonada"
                      className={`w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:border-green-500 ${input}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Closer principal
                    </label>

                    <select
                      value={
                        formulario.closer_principal_id
                      }
                      onChange={(e) =>
                        setFormulario((actual) => ({
                          ...actual,
                          closer_principal_id:
                            e.target.value,
                        }))
                      }
                      className={`w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:border-green-500 ${input}`}
                    >
                      <option value="">
                        Sin asignar
                      </option>

                      {closers.map((closer) => (
                        <option
                          key={closer.id}
                          value={closer.id}
                        >
                          {closer.nombre}
                          {closer.disponible
                            ? ""
                            : " - AUSENTE"}
                        </option>
                      ))}
                    </select>

{formulario.closer_principal_id && (() => {
  const closerPrincipal = closers.find(
    (closer) =>
      String(closer.id) ===
      formulario.closer_principal_id
  );

  if (!closerPrincipal) return null;

  const cambiando =
    cambiandoCloserId === closerPrincipal.id;

  return (
    <div
      className={`mt-3 border rounded-xl p-4 ${
        closerPrincipal.disponible
          ? "border-green-500/30 bg-green-500/10"
          : "border-red-500/30 bg-red-500/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            Estado del closer
          </p>

          <p
            className={`font-black mt-1 ${
              closerPrincipal.disponible
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {closerPrincipal.disponible
              ? "🟢 DISPONIBLE"
              : "🔴 AUSENTE"}
          </p>
        </div>

        <button
          type="button"
          disabled={cambiando}
          onClick={() =>
            cambiarDisponibilidadCloser(
              closerPrincipal.id,
              !closerPrincipal.disponible
            )
          }
          className={`px-4 py-2 rounded-lg text-xs font-black disabled:opacity-50 ${
            closerPrincipal.disponible
              ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
              : "bg-green-500/15 text-green-500 hover:bg-green-500/25"
          }`}
        >
          {cambiando
            ? "Cambiando..."
            : closerPrincipal.disponible
            ? "Marcar AUSENTE"
            : "Marcar DISPONIBLE"}
        </button>
      </div>

      {!closerPrincipal.disponible &&
        formulario.closer_reemplazo_id && (
          <p className="text-xs text-slate-500 mt-3">
            Los nuevos leads usarán el closer de reemplazo.
          </p>
        )}
    </div>
  );
})()}

</div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">
                      Reemplazo
                    </label>

                    <select
                      value={
                        formulario.closer_reemplazo_id
                      }
                      onChange={(e) =>
                        setFormulario((actual) => ({
                          ...actual,
                          closer_reemplazo_id:
                            e.target.value,
                        }))
                      }
                      className={`w-full border rounded-xl px-4 py-3 mt-2 outline-none focus:border-green-500 ${input}`}
                    >
                      <option value="">
                        Sin reemplazo
                      </option>

                      {closers
                        .filter(
                          (closer) =>
                            String(closer.id) !==
                            formulario.closer_principal_id
                        )
                        .map((closer) => (
                          <option
                            key={closer.id}
                            value={closer.id}
                          >
                            {closer.nombre}
                          </option>
                        ))}
                    </select>
{formulario.closer_reemplazo_id && (() => {
  const closerReemplazo = closers.find(
    (closer) =>
      String(closer.id) ===
      formulario.closer_reemplazo_id
  );

  if (!closerReemplazo) return null;

  const cambiando =
    cambiandoCloserId === closerReemplazo.id;

  return (
    <div
      className={`mt-3 border rounded-xl p-4 ${
        closerReemplazo.disponible
          ? "border-green-500/30 bg-green-500/10"
          : "border-red-500/30 bg-red-500/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            Estado del reemplazo
          </p>

          <p
            className={`font-black mt-1 ${
              closerReemplazo.disponible
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {closerReemplazo.disponible
              ? "🟢 DISPONIBLE"
              : "🔴 AUSENTE"}
          </p>
        </div>

        <button
          type="button"
          disabled={cambiando}
          onClick={() =>
            cambiarDisponibilidadCloser(
              closerReemplazo.id,
              !closerReemplazo.disponible
            )
          }
          className={`px-4 py-2 rounded-lg text-xs font-black disabled:opacity-50 ${
            closerReemplazo.disponible
              ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
              : "bg-green-500/15 text-green-500 hover:bg-green-500/25"
          }`}
        >
          {cambiando
            ? "Cambiando..."
            : closerReemplazo.disponible
            ? "Marcar AUSENTE"
            : "Marcar DISPONIBLE"}
        </button>
      </div>
    </div>
  );
})()}
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="font-black">
                        Post IDs
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Todos estos Post ID utilizarán esta
                        misma configuración.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={agregarPost}
                      className="border border-green-500 text-green-500 hover:bg-green-500/10 px-3 py-2 rounded-lg text-xs font-black"
                    >
                      + Agregar Post ID
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formulario.post_ids.map(
                      (postId, index) => (
                        <div
                          key={index}
                          className="flex gap-2"
                        >
                          <input
                            value={postId}
                            onChange={(e) =>
                              actualizarPost(
                                index,
                                e.target.value
                              )
                            }
                            placeholder="122100065109269499"
                            className={`flex-1 border rounded-xl px-4 py-3 outline-none focus:border-green-500 ${input}`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              eliminarPost(index)
                            }
                            className="px-4 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10"
                          >
                            Eliminar
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-5 border-t border-slate-700/30">
                  <button
                    type="button"
                    disabled={guardando}
                    onClick={guardarGrupo}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-7 py-3 rounded-xl font-black"
                  >
                    {guardando
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}