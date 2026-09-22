"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  NodeToolbar,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import Sidebar from "../components/Sidebar";
import { useTemaCRM } from "@/components/TemaProvider";

type Flujo = {
  id: number;
  nombre: string;
  slug?: string | null;
  producto_slug?: string | null;
  activo: boolean;
  total_nodos?: number;
};

type TipoContenido =
  | "texto"
  | "imagen"
  | "video"
  | "escribiendo"
  | "boton"
  | "respuesta_rapida";

type ContenidoNodo = {
  id: string;
  tipo: TipoContenido;
  texto?: string;
  url?: string;
  segundos?: number;
};

type OperadorCondicion =
  | "igual"
  | "no_igual"
  | "contiene"
  | "no_contiene"
  | "empieza_con"
  | "termina_con"
  | "tiene_valor"
  | "sin_valor"
  | "mayor_que"
  | "menor_que"
  | "mayor_igual"
  | "menor_igual";

type CampoCondicion =
  | "ultimo_mensaje"
  | "tipo_ultimo_mensaje"
  | "telefono"
  | "producto"
  | "etapa"
  | "score"
  | "temperatura"
  | "requiere_closer"
  | "bot_activo"
  | "seguimiento"
  | "source_id"
  | "grupo_distribucion"
  | "closer_asignado"
  | "usa_reemplazo"
  | "canal"
  | "flujo_id"
  | "flujo_estado"
  | "hora_actual"
  | "dia_semana";

type ReglaCondicion = {
  id: string;
  campo: CampoCondicion;
  operador: OperadorCondicion;
  valor?: string;
};

type GrupoCondicion = {
  id: string;
  nombre?: string;
  modo: "todas" | "cualquiera";
  reglas: ReglaCondicion[];
};

type DatosNodo = {
  titulo?: string;
  contenidos?: ContenidoNodo[];
  subtitulo?: string;
  tipoMensaje?: "omnichannel" | "webchat";
  esperaSegundos?: number;
  accionFlujo?:
    | "activar_bot"
    | "finalizar_flujo";
  flujoDestinoId?: number | null;
  flujoDestinoNombre?: string;

  /*
   * Compatibilidad con la primera versión de Condición.
   * No eliminar: flujos antiguos pueden seguir teniendo estos campos.
   */
  condicionOperador?: OperadorCondicion;
  condicionValor?: string;

  /*
   * Motor genérico de condiciones.
   */
  condicionGrupos?: GrupoCondicion[];
};

type TipoCampoCondicion =
  | "texto"
  | "numero"
  | "booleano";

type DefinicionCampoCondicion = {
  id: CampoCondicion;
  etiqueta: string;
  categoria: string;
  tipo: TipoCampoCondicion;
};

const CAMPOS_CONDICION: DefinicionCampoCondicion[] = [
  {
    id: "ultimo_mensaje",
    etiqueta: "Último mensaje del usuario",
    categoria: "Campos del sistema",
    tipo: "texto",
  },
  {
    id: "tipo_ultimo_mensaje",
    etiqueta: "Tipo de último mensaje",
    categoria: "Campos del sistema",
    tipo: "texto",
  },
  {
    id: "telefono",
    etiqueta: "Número de teléfono",
    categoria: "Cliente",
    tipo: "texto",
  },
  {
    id: "producto",
    etiqueta: "Producto",
    categoria: "CRM",
    tipo: "texto",
  },
  {
    id: "etapa",
    etiqueta: "Etapa CRM",
    categoria: "CRM",
    tipo: "texto",
  },
  {
    id: "score",
    etiqueta: "Score",
    categoria: "CRM",
    tipo: "numero",
  },
  {
    id: "temperatura",
    etiqueta: "Temperatura",
    categoria: "CRM",
    tipo: "texto",
  },
  {
    id: "requiere_closer",
    etiqueta: "Requiere closer",
    categoria: "CRM",
    tipo: "booleano",
  },
  {
    id: "bot_activo",
    etiqueta: "Bot activo",
    categoria: "CRM",
    tipo: "booleano",
  },
  {
    id: "seguimiento",
    etiqueta: "Seguimiento programado",
    categoria: "CRM",
    tipo: "booleano",
  },
  {
    id: "source_id",
    etiqueta: "Post / sourceId",
    categoria: "Distribución",
    tipo: "texto",
  },
  {
    id: "grupo_distribucion",
    etiqueta: "Grupo de distribución",
    categoria: "Distribución",
    tipo: "numero",
  },
  {
    id: "closer_asignado",
    etiqueta: "Closer asignado",
    categoria: "Distribución",
    tipo: "numero",
  },
  {
    id: "usa_reemplazo",
    etiqueta: "Usa closer de reemplazo",
    categoria: "Distribución",
    tipo: "booleano",
  },
  {
    id: "canal",
    etiqueta: "Canal actual",
    categoria: "Canal",
    tipo: "texto",
  },
  {
    id: "flujo_id",
    etiqueta: "Flujo actual",
    categoria: "Flujo",
    tipo: "numero",
  },
  {
    id: "flujo_estado",
    etiqueta: "Estado del flujo",
    categoria: "Flujo",
    tipo: "texto",
  },
  {
    id: "hora_actual",
    etiqueta: "Hora actual",
    categoria: "Fecha y hora",
    tipo: "texto",
  },
  {
    id: "dia_semana",
    etiqueta: "Día actual de la semana",
    categoria: "Fecha y hora",
    tipo: "texto",
  },
];

const ETIQUETAS_OPERADOR_CONDICION: Record<
  OperadorCondicion,
  string
> = {
  igual: "Es",
  no_igual: "No es",
  contiene: "Contiene",
  no_contiene: "No contiene",
  empieza_con: "Empieza por",
  termina_con: "Termina en",
  tiene_valor: "Tiene algún valor",
  sin_valor: "No tiene valor",
  mayor_que: "Mayor que",
  menor_que: "Menor que",
  mayor_igual: "Mayor o igual a",
  menor_igual: "Menor o igual a",
};

function campoCondicion(
  id: CampoCondicion
) {
  return (
    CAMPOS_CONDICION.find(
      (campo) => campo.id === id
    ) || CAMPOS_CONDICION[0]
  );
}

function operadoresParaCampo(
  id: CampoCondicion
): OperadorCondicion[] {
  const tipo = campoCondicion(id).tipo;

  if (tipo === "numero") {
    return [
      "igual",
      "no_igual",
      "mayor_que",
      "menor_que",
      "mayor_igual",
      "menor_igual",
      "tiene_valor",
      "sin_valor",
    ];
  }

  if (tipo === "booleano") {
    return [
      "igual",
      "no_igual",
    ];
  }

  return [
    "igual",
    "no_igual",
    "contiene",
    "no_contiene",
    "empieza_con",
    "termina_con",
    "tiene_valor",
    "sin_valor",
  ];
}

function operadorUsaValor(
  operador: OperadorCondicion
) {
  return ![
    "tiene_valor",
    "sin_valor",
  ].includes(operador);
}

function crearReglaCondicion(): ReglaCondicion {
  return {
    id: idNuevo("regla"),
    campo: "ultimo_mensaje",
    operador: "contiene",
    valor: "",
  };
}

function crearGrupoCondicion(): GrupoCondicion {
  return {
    id: idNuevo("grupo-condicion"),
    modo: "todas",
    reglas: [
      crearReglaCondicion(),
    ],
  };
}

function gruposCondicionDesdeDatos(
  datos: DatosNodo
): GrupoCondicion[] {
  if (
    Array.isArray(datos.condicionGrupos) &&
    datos.condicionGrupos.length > 0
  ) {
    return datos.condicionGrupos.map(
      (grupo, indice) => ({
        id:
          String(grupo?.id || "").trim() ||
          `grupo-${indice + 1}`,
        nombre: grupo?.nombre,
        modo:
          grupo?.modo === "cualquiera"
            ? "cualquiera"
            : "todas",
        reglas:
          Array.isArray(grupo?.reglas) &&
          grupo.reglas.length > 0
            ? grupo.reglas.map(
                (regla, reglaIndice) => ({
                  id:
                    String(
                      regla?.id || ""
                    ).trim() ||
                    `regla-${indice + 1}-${reglaIndice + 1}`,
                  campo:
                    (regla?.campo ||
                      "ultimo_mensaje") as CampoCondicion,
                  operador:
                    (regla?.operador ||
                      "contiene") as OperadorCondicion,
                  valor:
                    regla?.valor == null
                      ? ""
                      : String(regla.valor),
                })
              )
            : [
                {
                  id: `regla-${indice + 1}-1`,
                  campo: "ultimo_mensaje",
                  operador: "contiene",
                  valor: "",
                },
              ],
      })
    );
  }

  /*
   * Migración en memoria del nodo antiguo SÍ/NO.
   * El primer grupo seguirá utilizando handle "si";
   * el fallback seguirá utilizando handle "no".
   */
  return [
    {
      id: "legacy",
      modo: "todas",
      reglas: [
        {
          id: "legacy-regla",
          campo: "ultimo_mensaje",
          operador:
            datos.condicionOperador ||
            "contiene",
          valor:
            datos.condicionValor || "",
        },
      ],
    },
  ];
}

function resumenGrupoCondicion(
  grupo: GrupoCondicion
) {
  const primera = grupo.reglas[0];

  if (!primera) {
    return "Sin reglas";
  }

  const campo =
    campoCondicion(primera.campo);

  const operador =
    ETIQUETAS_OPERADOR_CONDICION[
      primera.operador
    ] || primera.operador;

  const valor =
    operadorUsaValor(
      primera.operador
    ) &&
    String(primera.valor || "").trim()
      ? ` “${primera.valor}”`
      : "";

  const extra =
    grupo.reglas.length > 1
      ? ` +${grupo.reglas.length - 1}`
      : "";

  return `${campo.etiqueta} · ${operador}${valor}${extra}`;
}

type CloudinarySignatureResponse = {
  timestamp: number;
  signature: string;
  folder: string;
  apiKey: string;
  cloudName: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

function idNuevo(prefijo: string) {
  return `${prefijo}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

type AccionNodo =
  | "preview"
  | "inicial"
  | "enlace"
  | "id"
  | "renombrar"
  | "duplicar"
  | "eliminar";

function dispararAccionNodo(
  nodeId: string,
  accion: AccionNodo
) {
  window.dispatchEvent(
    new CustomEvent("flujo:accion-nodo", {
      detail: {
        nodeId,
        accion,
      },
    })
  );
}

function BarraAccionesNodo({
  nodeId,
  selected,
}: {
  nodeId: string;
  selected: boolean;
}) {
  if (!selected) return null;

  const acciones: Array<{
    accion: AccionNodo;
    icono: string;
    titulo: string;
  }> = [
    {
      accion: "preview",
      icono: "👁",
      titulo: "Vista previa",
    },
    {
      accion: "inicial",
      icono: "▶",
      titulo: "Asignar como paso inicial",
    },
    {
      accion: "enlace",
      icono: "🔗",
      titulo: "Obtener enlace publicado",
    },
    {
      accion: "id",
      icono: "ID",
      titulo: "Obtener ID de Paso",
    },
    {
      accion: "renombrar",
      icono: "T",
      titulo: "Renombrar",
    },
    {
      accion: "duplicar",
      icono: "⧉",
      titulo: "Duplicar",
    },
    {
      accion: "eliminar",
      icono: "🗑",
      titulo: "Eliminar",
    },
  ];

  return (
    <NodeToolbar
      isVisible={selected}
      position={Position.Top}
    >
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        {acciones.map((item) => (
          <button
            key={item.accion}
            type="button"
            title={item.titulo}
            onClick={(e) => {
              e.stopPropagation();
              dispararAccionNodo(
                nodeId,
                item.accion
              );
            }}
            className="flex h-7 min-w-7 items-center justify-center rounded px-1 text-[10px] font-black text-slate-700 hover:bg-orange-50 hover:text-orange-600"
          >
            {item.icono}
          </button>
        ))}
      </div>
    </NodeToolbar>
  );
}

function NodoInicio({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  return (
    <div
      className={`min-w-[190px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-slate-300"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <div className="absolute -top-6 left-1 text-[10px] font-bold text-orange-500">
        ▶ Paso inicial
      </div>

      <div className="px-4 py-4">
        <p className="text-xs font-bold">
          💬 {d.titulo || "Enviar mensaje"}
        </p>
      </div>

      <div className="flex items-center justify-end border-t border-slate-200 px-3 py-2">
        <span className="mr-2 text-[10px] text-slate-500">
          Continuar
        </span>

        <Handle
          type="source"
          position={Position.Right}
          className="!relative !right-auto !top-auto !h-3 !w-3 !translate-x-0 !translate-y-0 !border !border-slate-400 !bg-white"
        />
      </div>
    </div>
  );
}

function PreviewContenido({
  contenido,
}: {
  contenido: ContenidoNodo;
}) {
  if (contenido.tipo === "texto") {
    return (
      <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
        {contenido.texto || "Texto vacío"}
      </div>
    );
  }

  if (contenido.tipo === "imagen") {
    return contenido.url ? (
      <img
        src={contenido.url}
        alt=""
        className="max-h-[180px] w-full rounded-lg object-cover"
      />
    ) : (
      <div className="flex h-24 items-center justify-center rounded-lg bg-slate-100 text-3xl">
        🖼️
      </div>
    );
  }

  if (contenido.tipo === "video") {
    return contenido.url ? (
      <video
        src={contenido.url}
        className="max-h-[180px] w-full rounded-lg bg-black object-contain"
        controls
        muted
      />
    ) : (
      <div className="flex h-20 items-center justify-center rounded-lg bg-slate-900 text-3xl text-white">
        VIDEO
      </div>
    );
  }

  if (contenido.tipo === "escribiendo") {
    return (
      <div className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
        ⌨️ Escribiendo...{" "}
        {contenido.segundos || 1.5}s
      </div>
    );
  }

  if (contenido.tipo === "boton") {
    return (
      <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-bold text-slate-700">
        {contenido.texto || "Botón"}
      </div>
    );
  }

  if (contenido.tipo === "respuesta_rapida") {
    return (
      <div className="inline-block rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700">
        {contenido.texto ||
          "Respuesta rápida"}
      </div>
    );
  }

  return null;
}

function NodoMensaje({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const contenidos =
    Array.isArray(d.contenidos)
      ? d.contenidos
      : [];

  return (
    <div
      className={`w-[250px] rounded-xl bg-white text-slate-900 shadow-xl ${
        selected
          ? "border-2 border-orange-500"
          : "border border-slate-300"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border !border-slate-400 !bg-white"
      />

      <div className="border-b border-slate-200 px-3 py-2">
        <p className="text-xs font-bold">
          ⬡ {d.titulo || "Enviar mensaje"}
        </p>
      </div>

      <div className="max-h-[340px] space-y-2 overflow-hidden p-3">
        {contenidos.length === 0 ? (
          <div className="rounded-lg bg-slate-100 px-3 py-5 text-center text-xs text-slate-400">
            Añade contenido
          </div>
        ) : (
          contenidos.map((contenido) => (
            <PreviewContenido
              key={contenido.id}
              contenido={contenido}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-end border-t border-slate-200 px-3 py-2">
        <span className="mr-2 text-[10px] text-slate-500">
          Continuar
        </span>

        <Handle
          type="source"
          position={Position.Right}
          className="!relative !right-auto !top-auto !h-3 !w-3 !translate-x-0 !translate-y-0 !border !border-slate-400 !bg-white"
        />
      </div>
    </div>
  );
}

function NodoEsperar({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  return (
    <div
      className={`min-w-[220px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-slate-300"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="px-4 py-3">
        <p className="text-xs font-black">
          ⏸ {d.titulo || "Esperar respuesta"}
        </p>

        <p className="mt-1 text-[11px] text-slate-500">
          {d.subtitulo ||
            "Esperar mensaje del cliente"}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-white"
      />
    </div>
  );
}

function NodoBot({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  return (
    <div
      className={`min-w-[220px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-green-500"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="rounded-t-xl bg-green-500 px-4 py-2 text-xs font-black text-white">
        🤖 {d.titulo || "Activar bot"}
      </div>

      <div className="px-4 py-3 text-[11px] text-slate-500">
        {d.subtitulo ||
          "A partir de aquí responde OpenAI"}
      </div>
    </div>
  );
}

function NodoIniciarFlujo({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  return (
    <div
      className={`relative min-w-[250px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-violet-300"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="rounded-t-xl border-b border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-800">
        ↗ {d.titulo || "Iniciar Flujo"}
      </div>

      <div className="px-4 py-4">
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-3 py-3 text-center">
          <p className="text-[10px] font-black uppercase text-slate-500">
            Enviar flujo
          </p>

          <p className="mt-1 max-w-[210px] truncate text-xs font-semibold text-slate-700">
            {d.flujoDestinoNombre ||
              "Click para escoger un flujo"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-slate-200 px-3 py-2">
        <span className="mr-2 text-[10px] text-slate-500">
          Continuar
        </span>

        <Handle
          type="source"
          position={Position.Right}
          className="!relative !right-auto !top-auto !h-3 !w-3 !translate-x-0 !translate-y-0 !border !border-slate-400 !bg-white"
        />
      </div>
    </div>
  );
}

function NodoCondicion({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const grupos =
    gruposCondicionDesdeDatos(d);

  return (
    <div
      className={`relative min-w-[270px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-emerald-300"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="rounded-t-xl border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800">
        ▽ {d.titulo || "Condición"}
      </div>

      <div className="divide-y divide-slate-100">
        {grupos.map(
          (grupo, indice) => (
            <div
              key={grupo.id}
              className="relative px-4 py-3"
            >
              <div className="pr-6">
                <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Condición {indice + 1}
                  {" · "}
                  {grupo.modo ===
                  "cualquiera"
                    ? "CUALQUIERA"
                    : "TODAS"}
                </p>

                <p className="mt-1 max-w-[220px] text-[11px] leading-4 text-slate-700">
                  {resumenGrupoCondicion(
                    grupo
                  )}
                </p>
              </div>

              <Handle
                id={
                  indice === 0
                    ? "si"
                    : `grupo:${grupo.id}`
                }
                type="source"
                position={Position.Right}
                className="!absolute !right-[-7px] !top-1/2 !h-3 !w-3 !-translate-y-1/2 !border !border-emerald-500 !bg-emerald-500"
              />
            </div>
          )
        )}
      </div>

      <div className="relative border-t border-slate-200 px-4 py-3">
        <p className="max-w-[220px] pr-6 text-[10px] font-bold leading-4 text-rose-600">
          El usuario no cumple ninguna
          de estas condiciones
        </p>

        <Handle
          id="no"
          type="source"
          position={Position.Right}
          className="!absolute !right-[-7px] !top-1/2 !h-3 !w-3 !-translate-y-1/2 !border !border-rose-500 !bg-rose-500"
        />
      </div>
    </div>
  );
}

function NodoAccion({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const accion =
    d.accionFlujo ||
    "activar_bot";

  const descripcion =
    accion === "finalizar_flujo"
      ? "Finalizar flujo"
      : "Activar bot";

  return (
    <div
      className={`min-w-[220px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-violet-300"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="rounded-t-xl bg-violet-100 px-4 py-2 text-xs font-black text-violet-800">
        ⚙ {d.titulo || "Acciones"}
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] text-slate-500">
          {descripcion}
        </p>
      </div>

      {accion !== "finalizar_flujo" && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !bg-white"
        />
      )}
    </div>
  );
}

function NodoEsperarTiempo({
  id,
  data,
  selected,
}: NodeProps) {
  const d = data as DatosNodo;

  const segundos = Math.max(
    1,
    Number(d.esperaSegundos || 3)
  );

  return (
    <div
      className={`min-w-[220px] rounded-xl bg-white text-slate-900 shadow-lg ${
        selected
          ? "border-2 border-orange-500"
          : "border border-amber-400"
      }`}
    >
      <BarraAccionesNodo
        nodeId={id}
        selected={selected}
      />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-white"
      />

      <div className="rounded-t-xl bg-amber-100 px-4 py-2 text-xs font-black text-amber-800">
        ⏱ {d.titulo || "Esperar"}
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] text-slate-500">
          Pausar {segundos} segundo
          {segundos === 1 ? "" : "s"}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-white"
      />
    </div>
  );
}

const nodeTypes = {
  inicio: NodoInicio,
  mensaje: NodoMensaje,
  iniciar_flujo: NodoIniciarFlujo,
  condicion: NodoCondicion,
  accion: NodoAccion,
  esperar_tiempo: NodoEsperarTiempo,
  esperar_respuesta: NodoEsperar,
  activar_bot: NodoBot,
};

export default function FlujosPage() {
  const { temaClaro, cambiarTema } =
    useTemaCRM();

  const [empresaId, setEmpresaId] =
    useState<number | null>(null);

  const [flujos, setFlujos] = useState<
    Flujo[]
  >([]);

  const [flujoActivo, setFlujoActivo] =
    useState<Flujo | null>(null);

  const [nodes, setNodes] = useState<
    Node[]
  >([]);

  const [edges, setEdges] = useState<
    Edge[]
  >([]);

  const [
    nodoSeleccionadoId,
    setNodoSeleccionadoId,
  ] = useState<string | null>(null);

  const [nuevoNombre, setNuevoNombre] =
    useState("");

  const [
    nuevoProducto,
    setNuevoProducto,
  ] = useState("");

  const [guardando, setGuardando] =
    useState(false);

  const [
    nodoPreviewId,
    setNodoPreviewId,
  ] = useState<string | null>(null);

  const [creando, setCreando] =
    useState(false);

  const [
    subiendoContenidoId,
    setSubiendoContenidoId,
  ] = useState<string | null>(null);

  useEffect(() => {
    const usuarioGuardado =
      localStorage.getItem("usuario");

    if (!usuarioGuardado) return;

    try {
      const usuario =
        JSON.parse(usuarioGuardado);

      if (usuario?.empresa_id) {
        setEmpresaId(
          Number(usuario.empresa_id)
        );
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const cargarFlujos =
    useCallback(async () => {
      if (!empresaId) return;

      const res = await fetch(
        `/api/flujos?empresa_id=${empresaId}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (data.success) {
        setFlujos(data.flujos || []);
      }
    }, [empresaId]);

  useEffect(() => {
    cargarFlujos();
  }, [cargarFlujos]);

  const abrirFlujo = async (
    flujo: Flujo
  ) => {
    if (!empresaId) return;

    const res = await fetch(
      `/api/flujos?empresa_id=${empresaId}&id=${flujo.id}`,
      {
        cache: "no-store",
      }
    );

    const data = await res.json();

    if (!data.success) {
      alert(
        data.error ||
          "No se pudo abrir el flujo"
      );

      return;
    }

    setFlujoActivo(data.flujo);

    const nodosCargados: Node[] = (
      data.nodos || []
    ).map(
      (nodo: {
        nodo_uid: string;
        tipo: string;
        posicion_x: number;
        posicion_y: number;
        config: DatosNodo;
      }) => {
        let tipo = nodo.tipo;
        let config = nodo.config || {};

        /*
        Compatibilidad con nodos de la
        primera versión del editor.
        */

        if (
          tipo === "imagen" ||
          tipo === "video" ||
          tipo === "escribiendo"
        ) {
          const contenido: ContenidoNodo =
            {
              id: idNuevo("contenido"),
              tipo:
                tipo as TipoContenido,
            };

          if (tipo === "imagen") {
            contenido.url =
              (
                config as {
                  url?: string;
                }
              ).url || "";
          }

          if (tipo === "video") {
            contenido.url =
              (
                config as {
                  url?: string;
                }
              ).url || "";
          }

          if (tipo === "escribiendo") {
            contenido.segundos = 1.5;
          }

          tipo = "mensaje";

          config = {
            titulo: "Enviar mensaje",
            contenidos: [contenido],
          };
        }

        if (
          tipo === "mensaje" &&
          !(config as DatosNodo).tipoMensaje
        ) {
          config = {
            ...config,
            tipoMensaje: "omnichannel",
          };
        }

        return {
          id: nodo.nodo_uid,
          type: tipo,
          position: {
            x: Number(
              nodo.posicion_x || 0
            ),
            y: Number(
              nodo.posicion_y || 0
            ),
          },
          data: config,
        };
      }
    );

    setNodes(nodosCargados);

    setEdges(
      (data.conexiones || []).map(
        (conexion: {
          conexion_uid: string;
          source_uid: string;
          target_uid: string;
          source_handle?: string | null;
          target_handle?: string | null;
          config?: Record<
            string,
            unknown
          >;
        }) => ({
          id: conexion.conexion_uid,
          source: conexion.source_uid,
          target: conexion.target_uid,
          sourceHandle:
            conexion.source_handle ||
            undefined,
          targetHandle:
            conexion.target_handle ||
            undefined,
          data: conexion.config || {},
          animated: false,
        })
      )
    );

    setNodoSeleccionadoId(null);
  };

  const crearFlujo = async () => {
    if (
      !empresaId ||
      !nuevoNombre.trim()
    ) {
      return;
    }

    try {
      setCreando(true);

      const res = await fetch(
        "/api/flujos",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            empresa_id: empresaId,
            nombre:
              nuevoNombre.trim(),
            producto_slug:
              nuevoProducto.trim() ||
              null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(
          data.error ||
            "No se pudo crear el flujo"
        );

        return;
      }

      setNuevoNombre("");
      setNuevoProducto("");

      await cargarFlujos();
      await abrirFlujo(data.flujo);
    } finally {
      setCreando(false);
    }
  };

const renombrarFlujo = async (
  flujo: Flujo
) => {
  if (!empresaId) return;

  const nuevoNombreFlujo =
    window.prompt(
      "Nuevo nombre del flujo:",
      flujo.nombre
    )?.trim();

  if (
    !nuevoNombreFlujo ||
    nuevoNombreFlujo === flujo.nombre
  ) {
    return;
  }

  try {
    const res = await fetch(
      "/api/flujos",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          flujo_id: flujo.id,
          nombre: nuevoNombreFlujo,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(
        data.error ||
          "No se pudo renombrar el flujo"
      );

      return;
    }

    if (
      flujoActivo?.id === flujo.id
    ) {
      setFlujoActivo(
        (actual) =>
          actual
            ? {
                ...actual,
                nombre:
                  data.flujo.nombre,
              }
            : actual
      );
    }

    await cargarFlujos();
  } catch (error) {
    console.error(
      "ERROR RENOMBRANDO FLUJO:",
      error
    );

    alert(
      "No se pudo renombrar el flujo"
    );
  }
};

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((actuales) =>
        applyNodeChanges(
          changes,
          actuales
        )
      );
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((actuales) =>
        applyEdgeChanges(
          changes,
          actuales
        )
      );
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((actuales) =>
        addEdge(
          {
            ...connection,
            id: idNuevo("conexion"),
            type: "smoothstep",
          },
          actuales
        )
      );
    },
    []
  );

  const nodoSeleccionado = useMemo(
    () =>
      nodes.find(
        (nodo) =>
          nodo.id ===
          nodoSeleccionadoId
      ) || null,
    [nodes, nodoSeleccionadoId]
  );

  const nodoPreview = useMemo(
    () =>
      nodes.find(
        (nodo) =>
          nodo.id === nodoPreviewId
      ) || null,
    [nodes, nodoPreviewId]
  );

  useEffect(() => {
    const manejarAccion = (
      event: Event
    ) => {
      const detalle = (
        event as CustomEvent<{
          nodeId?: string;
          accion?: AccionNodo;
        }>
      ).detail;

      const nodeId = String(
        detalle?.nodeId || ""
      );

      const accion =
        detalle?.accion;

      if (!nodeId || !accion) return;

      const nodo = nodes.find(
        (item) => item.id === nodeId
      );

      if (!nodo) return;

      if (accion === "preview") {
        setNodoPreviewId(nodeId);
        return;
      }

      if (accion === "inicial") {
        if (nodo.type === "inicio") {
          alert(
            "Este nodo ya es el paso inicial."
          );
          return;
        }

        const inicio = nodes.find(
          (item) =>
            item.type === "inicio"
        );

        if (!inicio) {
          alert(
            "No se encontro el nodo Paso inicial."
          );
          return;
        }

        setEdges((actuales) => [
          ...actuales.filter(
            (edge) =>
              edge.source !== inicio.id
          ),
          {
            id: idNuevo("conexion"),
            source: inicio.id,
            target: nodeId,
            type: "smoothstep",
          },
        ]);

        alert(
          "Paso inicial actualizado."
        );
        return;
      }

      if (accion === "enlace") {
        if (
          !empresaId ||
          !flujoActivo
        ) {
          alert(
            "Primero abre un flujo."
          );
          return;
        }

        const params =
          new URLSearchParams({
            empresa_id:
              String(empresaId),
            flujo_id:
              String(
                flujoActivo.id
              ),
            nodo_uid:
              nodeId,
          });

        const enlace =
          `${window.location.origin}/flujos/preview?${params.toString()}`;

        navigator.clipboard
          .writeText(enlace)
          .then(() =>
            alert(
              `Enlace publicado copiado:\n\n${enlace}`
            )
          )
          .catch(() =>
            window.prompt(
              "Copia este enlace:",
              enlace
            )
          );

        return;
      }

      if (accion === "id") {
        navigator.clipboard
          .writeText(nodeId)
          .then(() =>
            alert(
              `ID copiado: ${nodeId}`
            )
          )
          .catch(() =>
            alert(
              `ID del paso: ${nodeId}`
            )
          );

        return;
      }

      if (accion === "renombrar") {
        const data =
          nodo.data as DatosNodo;

        const nombreActual =
          data.titulo ||
          (nodo.type ===
          "esperar_respuesta"
            ? "Esperar respuesta"
            : nodo.type ===
              "activar_bot"
            ? "Activar bot"
            : nodo.type === "inicio"
            ? "Paso inicial"
            : "Enviar mensaje");

        const nuevoNombre =
          window.prompt(
            "Nuevo nombre del paso:",
            nombreActual
          );

        if (
          !nuevoNombre ||
          !nuevoNombre.trim()
        ) {
          return;
        }

        setNodes((actuales) =>
          actuales.map((item) =>
            item.id === nodeId
              ? {
                  ...item,
                  data: {
                    ...item.data,
                    titulo:
                      nuevoNombre.trim(),
                  },
                }
              : item
          )
        );

        return;
      }

      if (accion === "duplicar") {
        if (nodo.type === "inicio") {
          alert(
            "Paso inicial no se puede duplicar."
          );
          return;
        }

        const nuevoId = idNuevo(
          String(
            nodo.type || "nodo"
          )
        );

        const dataClonada =
          JSON.parse(
            JSON.stringify(
              nodo.data || {}
            )
          );

        if (
          dataClonada?.titulo
        ) {
          dataClonada.titulo =
            `${dataClonada.titulo} copia`;
        }

        setNodes((actuales) => [
          ...actuales,
          {
            ...nodo,
            id: nuevoId,
            selected: false,
            position: {
              x:
                Number(
                  nodo.position.x || 0
                ) + 50,
              y:
                Number(
                  nodo.position.y || 0
                ) + 50,
            },
            data: dataClonada,
          },
        ]);

        setNodoSeleccionadoId(
          nuevoId
        );

        return;
      }

      if (accion === "eliminar") {
        if (nodo.type === "inicio") {
          alert(
            "Paso inicial no se puede eliminar."
          );
          return;
        }

        const confirmar =
          window.confirm(
            "¿Eliminar este paso y sus conexiones?"
          );

        if (!confirmar) return;

        setNodes((actuales) =>
          actuales.filter(
            (item) =>
              item.id !== nodeId
          )
        );

        setEdges((actuales) =>
          actuales.filter(
            (edge) =>
              edge.source !== nodeId &&
              edge.target !== nodeId
          )
        );

        if (
          nodoSeleccionadoId ===
          nodeId
        ) {
          setNodoSeleccionadoId(
            null
          );
        }

        if (
          nodoPreviewId === nodeId
        ) {
          setNodoPreviewId(null);
        }
      }
    };

    window.addEventListener(
      "flujo:accion-nodo",
      manejarAccion
    );

    return () => {
      window.removeEventListener(
        "flujo:accion-nodo",
        manejarAccion
      );
    };
  }, [
    nodes,
    nodoSeleccionadoId,
    nodoPreviewId,
  ]);

  const actualizarDataNodo = (
    nuevoData: Partial<DatosNodo>
  ) => {
    if (!nodoSeleccionadoId) return;

    setNodes((actuales) =>
      actuales.map((nodo) =>
        nodo.id ===
        nodoSeleccionadoId
          ? {
              ...nodo,
              data: {
                ...nodo.data,
                ...nuevoData,
              },
            }
          : nodo
      )
    );
  };

  const obtenerPosicionNuevoPaso = () => {
    if (nodes.length === 0) {
      return {
        x: 450,
        y: 260,
      };
    }

    const ultimoNodo = [...nodes].sort(
      (a, b) =>
        Number(b.position.x || 0) -
        Number(a.position.x || 0)
    )[0];

    return {
      x:
        Number(
          ultimoNodo?.position.x || 0
        ) + 300,
      y:
        Number(
          ultimoNodo?.position.y || 0
        ),
    };
  };

  const agregarPasoMensaje = () => {
    if (!flujoActivo) return;

    const mensajesExistentes =
      nodes.filter(
        (nodo) =>
          nodo.type === "mensaje"
      ).length;

    const titulo =
      mensajesExistentes === 0
        ? "Enviar mensaje"
        : `Enviar mensaje #${mensajesExistentes}`;

    const id = idNuevo("mensaje");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "mensaje",
        position,
        data: {
          titulo,
          tipoMensaje: "omnichannel",
          contenidos: [],
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoIniciarFlujo = () => {
    if (!flujoActivo) return;

    const id =
      idNuevo("iniciar-flujo");

    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "iniciar_flujo",
        position,
        data: {
          titulo: "Iniciar Flujo",
          flujoDestinoId: null,
          flujoDestinoNombre: "",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoCondicion = () => {
    if (!flujoActivo) return;

    const id = idNuevo("condicion");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "condicion",
        position,
        data: {
          titulo: "Condición",
          condicionGrupos: [
            crearGrupoCondicion(),
          ],
          /*
           * Compatibilidad hacia atrás.
           */
          condicionOperador:
            "contiene",
          condicionValor: "",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoAccion = () => {
    if (!flujoActivo) return;

    const id = idNuevo("accion");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "accion",
        position,
        data: {
          titulo: "Acciones",
          accionFlujo:
            "activar_bot",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoEsperaTiempo = () => {
    if (!flujoActivo) return;

    const id = idNuevo("esperar-tiempo");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "esperar_tiempo",
        position,
        data: {
          titulo: "Esperar",
          esperaSegundos: 3,
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoEsperar = () => {
    if (!flujoActivo) return;

    const id = idNuevo("esperar");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "esperar_respuesta",
        position,
        data: {
          subtitulo:
            "Esperar mensaje del cliente",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarPasoBot = () => {
    if (!flujoActivo) return;

    const id = idNuevo("bot");
    const position =
      obtenerPosicionNuevoPaso();

    setNodes((actuales) => [
      ...actuales,
      {
        id,
        type: "activar_bot",
        position,
        data: {
          subtitulo:
            "Continuar con OpenAI",
        },
      },
    ]);

    setNodoSeleccionadoId(id);
  };

  const agregarContenido = (
    tipo: TipoContenido
  ) => {
    if (
      !nodoSeleccionado ||
      nodoSeleccionado.type !==
        "mensaje"
    ) {
      return;
    }

    const data =
      nodoSeleccionado.data as DatosNodo;

    const actuales =
      Array.isArray(data.contenidos)
        ? data.contenidos
        : [];

    const nuevo: ContenidoNodo = {
      id: idNuevo("contenido"),
      tipo,
    };

    if (tipo === "texto") {
      nuevo.texto =
        "Escribe tu mensaje...";
    }

    if (tipo === "imagen") {
      nuevo.url = "";
    }

    if (tipo === "video") {
      nuevo.url = "";
    }

    if (tipo === "escribiendo") {
      nuevo.segundos = 1.5;
    }

    if (tipo === "boton") {
      nuevo.texto = "Botón";
    }

    if (
      tipo === "respuesta_rapida"
    ) {
      nuevo.texto =
        "Respuesta rápida";
    }

    actualizarDataNodo({
      contenidos: [
        ...actuales,
        nuevo,
      ],
    });
  };

  const actualizarContenido = (
    contenidoId: string,
    cambios: Partial<ContenidoNodo>
  ) => {
    if (
      !nodoSeleccionado ||
      nodoSeleccionado.type !==
        "mensaje"
    ) {
      return;
    }

    const data =
      nodoSeleccionado.data as DatosNodo;

    const contenidos =
      Array.isArray(data.contenidos)
        ? data.contenidos
        : [];

    actualizarDataNodo({
      contenidos: contenidos.map(
        (contenido) =>
          contenido.id === contenidoId
            ? {
                ...contenido,
                ...cambios,
              }
            : contenido
      ),
    });
  };

  const subirArchivoContenido = async (
    contenidoId: string,
    archivo: File,
    tipo: "imagen" | "video"
  ) => {
    if (!flujoActivo) {
      alert("Primero selecciona un flujo.");
      return;
    }

    if (
      tipo === "imagen" &&
      !archivo.type.startsWith("image/")
    ) {
      alert("Selecciona un archivo de imagen.");
      return;
    }

    if (
      tipo === "video" &&
      !archivo.type.startsWith("video/")
    ) {
      alert("Selecciona un archivo de video.");
      return;
    }

    try {
      setSubiendoContenidoId(contenidoId);

      const firmaResponse = await fetch(
        "/api/cloudinary/signature",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "flujo",
            flujoId: flujoActivo.id,
          }),
        }
      );

      const firma =
        (await firmaResponse.json()) as
          | CloudinarySignatureResponse
          | { error?: string };

      if (
        !firmaResponse.ok ||
        !("signature" in firma) ||
        !firma.signature ||
        !firma.cloudName ||
        !firma.apiKey
      ) {
        throw new Error(
          "error" in firma && firma.error
            ? firma.error
            : "No se pudo preparar la carga."
        );
      }

      const formData = new FormData();

      formData.append("file", archivo);
      formData.append("api_key", firma.apiKey);
      formData.append(
        "timestamp",
        String(firma.timestamp)
      );
      formData.append(
        "signature",
        firma.signature
      );
      formData.append("folder", firma.folder);

      const resourceType =
        tipo === "video" ? "video" : "image";

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${firma.cloudName}/${resourceType}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const upload =
        (await uploadResponse.json()) as
          CloudinaryUploadResponse;

      if (
        !uploadResponse.ok ||
        !upload.secure_url
      ) {
        throw new Error(
          upload.error?.message ||
            "Cloudinary no pudo subir el archivo."
        );
      }

      actualizarContenido(contenidoId, {
        url: upload.secure_url,
      });
    } catch (error) {
      console.error(
        "Error subiendo archivo:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "No se pudo subir el archivo."
      );
    } finally {
      setSubiendoContenidoId(null);
    }
  };

  const eliminarContenido = (
    contenidoId: string
  ) => {
    if (
      !nodoSeleccionado ||
      nodoSeleccionado.type !==
        "mensaje"
    ) {
      return;
    }

    const data =
      nodoSeleccionado.data as DatosNodo;

    const contenidos =
      Array.isArray(data.contenidos)
        ? data.contenidos
        : [];

    actualizarDataNodo({
      contenidos: contenidos.filter(
        (contenido) =>
          contenido.id !==
          contenidoId
      ),
    });
  };

  const guardarFlujo = async () => {
    if (
      !empresaId ||
      !flujoActivo
    ) {
      return;
    }

    try {
      setGuardando(true);

      const res = await fetch(
        "/api/flujos",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            empresa_id: empresaId,
            flujo_id:
              flujoActivo.id,
            nodos: nodes,
            conexiones: edges,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(
          data.error ||
            "No se pudo guardar"
        );

        return;
      }

      await cargarFlujos();

      alert("Flujo guardado");
    } finally {
      setGuardando(false);
    }
  };

  const volverAFlujos = () => {
    setFlujoActivo(null);
    setNodoSeleccionadoId(null);
    setNodes([]);
    setEdges([]);
  };

  const contenidosSeleccionados =
    nodoSeleccionado?.type ===
    "mensaje"
      ? (
          nodoSeleccionado.data as DatosNodo
        ).contenidos || []
      : [];

  return (
    <div
      className={`flex min-h-screen ${
        temaClaro
          ? "bg-slate-100 text-slate-900"
          : "bg-[#0b1220] text-white"
      }`}
    >
      <Sidebar
        temaClaro={temaClaro}
        onCambiarTema={
          cambiarTema
        }
      />

      <main className="ml-60 flex h-screen flex-1 overflow-hidden">
        <aside
          className={`w-[355px] shrink-0 overflow-y-auto border-r ${
            temaClaro
              ? "border-slate-200 bg-white"
              : "border-slate-800 bg-[#0f172a]"
          }`}
        >
          <div className="border-b border-slate-200/20 p-4">
  {!flujoActivo ? (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">
            Flujos
          </h1>

          <p className="text-xs text-slate-500">
            Administra tus flujos de atención
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <input
          value={nuevoNombre}
          onChange={(e) =>
            setNuevoNombre(
              e.target.value
            )
          }
          placeholder="Nombre del flujo"
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none"
        />

        <input
          value={nuevoProducto}
          onChange={(e) =>
            setNuevoProducto(
              e.target.value
            )
          }
          placeholder="Producto / slug"
          className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none"
        />

        <button
          onClick={crearFlujo}
          disabled={creando}
          className="w-full rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-white"
        >
          {creando
            ? "CREANDO..."
            : "+ Crear flujo"}
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {flujos.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            Todavía no tienes flujos creados.
          </div>
        )}

        {flujos.map((flujo) => (
          <div
            key={flujo.id}
            className="flex items-center gap-2 rounded-xl border border-slate-300 p-2 transition"
          >
            <button
              type="button"
              onClick={() =>
                abrirFlujo(flujo)
              }
              className="min-w-0 flex-1 px-2 py-1 text-left"
            >
              <div className="truncate text-sm font-black">
                {flujo.nombre}
              </div>

              <div className="mt-1 truncate text-[11px] text-slate-400">
                {flujo.producto_slug
                  ? `Producto: ${flujo.producto_slug}`
                  : "Sin producto asignado"}
              </div>
            </button>

            <button
              type="button"
              title="Renombrar flujo"
              onClick={() =>
                renombrarFlujo(flujo)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-orange-500 hover:text-orange-500"
            >
              ✏️
            </button>
          </div>
        ))}
      </div>
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={volverAFlujos}
        className="mb-4 text-xs font-bold text-orange-500 hover:underline"
      >
        ← Volver a flujos
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-black">
            {flujoActivo.nombre}
          </h1>

          <p className="mt-1 truncate text-xs text-slate-500">
            {flujoActivo.producto_slug
              ? `Producto: ${flujoActivo.producto_slug}`
              : "Sin producto asignado"}
          </p>
        </div>

        <button
          type="button"
          title="Renombrar flujo"
          onClick={() =>
            renombrarFlujo(
              flujoActivo
            )
          }
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-orange-500 hover:text-orange-500"
        >
          ✏️
        </button>
      </div>
    </>
  )}
</div>

          {flujoActivo &&
            !nodoSeleccionado && (
              <div className="p-4">
                <p className="text-xs font-black">
                  AÑADIR PASO
                </p>

                <button
                  onClick={
                    agregarPasoMensaje
                  }
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  💬 Enviar mensaje
                </button>                <button
                  onClick={
                    agregarPasoIniciarFlujo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ↗ Iniciar Flujo
                </button>



                <button
                  onClick={
                    agregarPasoCondicion
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ◇ Condición
                </button>

                <button
                  onClick={
                    agregarPasoAccion
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⚙ Acciones
                </button>

                <button
                  onClick={
                    agregarPasoEsperaTiempo
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏱ Esperar
                </button>

                <button
                  onClick={
                    agregarPasoEsperar
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  ⏸ Esperar respuesta
                </button>

                <button
                  onClick={
                    agregarPasoBot
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-left text-sm"
                >
                  🤖 Activar bot
                </button>
              </div>
            )}

          {nodoSeleccionado?.type ===
            "mensaje" && (
            <div className="p-4">
              <button
                onClick={() =>
                  setNodoSeleccionadoId(
                    null
                  )
                }
                className="mb-4 text-xs text-orange-500"
              >
                ← Volver
              </button>

              <input
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).titulo || ""
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    titulo:
                      e.target.value,
                  })
                }
                className="w-full border-b border-slate-300 bg-transparent pb-2 text-sm font-bold outline-none"
              />

              <div className="mt-4">
                <label className="mb-1 block text-[11px] font-bold text-slate-500">
                  Tipo de mensaje
                </label>

                <select
                  value={
                    (
                      nodoSeleccionado.data as DatosNodo
                    ).tipoMensaje ||
                    "omnichannel"
                  }
                  onChange={(e) =>
                    actualizarDataNodo({
                      tipoMensaje:
                        e.target.value as
                          | "omnichannel"
                          | "webchat",
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                >
                  <option value="omnichannel">
                    Omnichannel
                  </option>
                  <option value="webchat">
                    Webchat
                  </option>
                </select>
              </div>

              <div className="mt-5 space-y-3">
                {contenidosSeleccionados.map(
                  (contenido) => (
                    <div
                      key={
                        contenido.id
                      }
                      className="rounded-xl bg-slate-100 p-3 text-slate-900"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase">
                          {
                            contenido.tipo
                          }
                        </span>

                        <button
                          onClick={() =>
                            eliminarContenido(
                              contenido.id
                            )
                          }
                          className="text-xs text-red-500"
                        >
                          Eliminar
                        </button>
                      </div>

                      {contenido.tipo ===
                        "texto" && (
                        <textarea
                          value={
                            contenido.texto ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            actualizarContenido(
                              contenido.id,
                              {
                                texto:
                                  e
                                    .target
                                    .value,
                              }
                            )
                          }
                          rows={4}
                          className="w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none"
                        />
                      )}

                      {contenido.tipo ===
                        "imagen" && (
                        <>
                          <label className="flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center hover:border-orange-400">
                            {contenido.url ? (
                              <img
                                src={contenido.url}
                                alt=""
                                className="mb-3 max-h-[220px] w-full rounded-lg object-contain"
                              />
                            ) : (
                              <div className="mb-3 text-4xl">
                                IMAGEN
                              </div>
                            )}

                            <span className="text-sm font-bold text-orange-500">
                              {subiendoContenidoId ===
                              contenido.id
                                ? "Subiendo..."
                                : "Subir imagen"}
                            </span>

                            <span className="mt-1 text-[11px] text-slate-400">
                              desde tu computadora
                            </span>

                            <input
                              type="file"
                              accept="image/*"
                              disabled={
                                subiendoContenidoId ===
                                contenido.id
                              }
                              className="hidden"
                              onChange={async (e) => {
                                const archivo =
                                  e.target.files?.[0];

                                if (archivo) {
                                  await subirArchivoContenido(
                                    contenido.id,
                                    archivo,
                                    "imagen"
                                  );
                                }

                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          <div className="my-3 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400">
                              O INSERTAR URL
                            </span>
                            <div className="h-px flex-1 bg-slate-300" />
                          </div>

                          <input
                            value={contenido.url || ""}
                            onChange={(e) =>
                              actualizarContenido(
                                contenido.id,
                                {
                                  url: e.target.value,
                                }
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                        </>
                      )}

                      {contenido.tipo ===
                        "video" && (
                        <>
                          <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-center hover:border-orange-400">
                            {contenido.url ? (
                              <video
                                src={contenido.url}
                                controls
                                className="mb-3 max-h-[220px] w-full rounded-lg bg-black"
                              />
                            ) : (
                              <div className="mb-3 text-4xl">
                                VIDEO
                              </div>
                            )}

                            <span className="text-sm font-bold text-orange-500">
                              {subiendoContenidoId ===
                              contenido.id
                                ? "Subiendo..."
                                : "Subir video"}
                            </span>

                            <span className="mt-1 text-[11px] text-slate-400">
                              desde tu computadora
                            </span>

                            <input
                              type="file"
                              accept="video/*"
                              disabled={
                                subiendoContenidoId ===
                                contenido.id
                              }
                              className="hidden"
                              onChange={async (e) => {
                                const archivo =
                                  e.target.files?.[0];

                                if (archivo) {
                                  await subirArchivoContenido(
                                    contenido.id,
                                    archivo,
                                    "video"
                                  );
                                }

                                e.currentTarget.value = "";
                              }}
                            />
                          </label>

                          <div className="my-3 flex items-center gap-2">
                            <div className="h-px flex-1 bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400">
                              O INSERTAR URL
                            </span>
                            <div className="h-px flex-1 bg-slate-300" />
                          </div>

                          <input
                            value={contenido.url || ""}
                            onChange={(e) =>
                              actualizarContenido(
                                contenido.id,
                                {
                                  url: e.target.value,
                                }
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                          />
                        </>
                      )}

                      {contenido.tipo ===
                        "escribiendo" && (
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={
                            contenido.segundos ||
                            1.5
                          }
                          onChange={(
                            e
                          ) =>
                            actualizarContenido(
                              contenido.id,
                              {
                                segundos:
                                  Number(
                                    e
                                      .target
                                      .value
                                  ),
                              }
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      )}

                      {(contenido.tipo ===
                        "boton" ||
                        contenido.tipo ===
                          "respuesta_rapida") && (
                        <input
                          value={
                            contenido.texto ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            actualizarContenido(
                              contenido.id,
                              {
                                texto:
                                  e
                                    .target
                                    .value,
                              }
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="mt-5 border-t border-slate-300 pt-4">
                <p className="mb-3 text-xs font-black">
                  + AÑADIR CONTENIDO
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      agregarContenido(
                        "texto"
                      )
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    ☰ Texto
                  </button>

                  <button
                    onClick={() =>
                      agregarContenido(
                        "imagen"
                      )
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    🖼 Imagen
                  </button>

                  <button
                    onClick={() =>
                      agregarContenido(
                        "video"
                      )
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    🎥 Video
                  </button>

                  <button
                    onClick={() =>
                      agregarContenido(
                        "escribiendo"
                      )
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    ⌨️ Escribiendo
                  </button>

                  <button
                    onClick={() =>
                      agregarContenido(
                        "boton"
                      )
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    + Botón
                  </button>

                  <button
                    onClick={() =>
                      agregarContenido(
                        "respuesta_rapida"
                      )
                    }
                    className="rounded-lg border p-2 text-xs"
                  >
                    ⚡ Respuesta rápida
                  </button>
                </div>
              </div>
            </div>
          )}          {nodoSeleccionado?.type ===
            "iniciar_flujo" && (
            <div className="p-4">
              <button
                onClick={() =>
                  setNodoSeleccionadoId(
                    null
                  )
                }
                className="mb-4 text-xs text-orange-500"
              >
                ← Volver
              </button>

              <p className="text-xs font-black">
                INICIAR OTRO FLUJO
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Ejecuta otro flujo y, cuando
                ese flujo termine de forma
                natural, vuelve a este punto
                para continuar.
              </p>

              <label className="mt-5 block text-xs font-bold text-slate-500">
                Flujo
              </label>

              <select
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).flujoDestinoId || ""
                }
                onChange={(e) => {
                  const idDestino =
                    Number(
                      e.target.value
                    ) || null;

                  const destino =
                    flujos.find(
                      (flujo) =>
                        flujo.id ===
                        idDestino
                    );

                  actualizarDataNodo({
                    flujoDestinoId:
                      idDestino,
                    flujoDestinoNombre:
                      destino?.nombre ||
                      "",
                  });
                }}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              >
                <option value="">
                  No hay selección
                </option>

                {flujos
                  .filter(
                    (flujo) =>
                      flujo.id !==
                      flujoActivo?.id
                  )
                  .map((flujo) => (
                    <option
                      key={flujo.id}
                      value={flujo.id}
                    >
                      {flujo.nombre}
                    </option>
                  ))}
              </select>

              {(
                nodoSeleccionado.data as DatosNodo
              ).flujoDestinoId ? (
                <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <p className="text-[10px] font-black uppercase text-violet-500">
                    Flujo seleccionado
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {(
                      nodoSeleccionado.data as DatosNodo
                    ).flujoDestinoNombre ||
                      `ID ${
                        (
                          nodoSeleccionado.data as DatosNodo
                        ).flujoDestinoId
                      }`}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                  Selecciona un flujo antes de
                  guardar. El flujo actual no
                  aparece en la lista para
                  evitar que se llame a sí
                  mismo directamente.
                </div>
              )}

              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
                La salida Continuar se usará
                cuando el subflujo termine.
                En el siguiente paso
                conectaremos la ejecución
                persistente en WhatsApp QR y
                la Vista previa.
              </div>
            </div>
          )}



                    {nodoSeleccionado?.type ===
            "condicion" &&
            (() => {
              const datos =
                nodoSeleccionado.data as DatosNodo;

              const grupos =
                gruposCondicionDesdeDatos(
                  datos
                );

              const guardarGrupos = (
                nuevos: GrupoCondicion[]
              ) => {
                actualizarDataNodo({
                  condicionGrupos:
                    nuevos,
                });
              };

              return (
                <div className="p-4">
                  <button
                    onClick={() =>
                      setNodoSeleccionadoId(
                        null
                      )
                    }
                    className="mb-4 text-xs text-orange-500"
                  >
                    ← Volver
                  </button>

                  <p className="text-xs font-black">
                    CONDICIÓN
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Crea grupos de reglas.
                    Cada grupo genera una
                    salida propia y la salida
                    roja se usa cuando ninguno
                    coincide.
                  </p>

                  <div className="mt-4 space-y-4">
                    {grupos.map(
                      (
                        grupo,
                        grupoIndice
                      ) => (
                        <div
                          key={grupo.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-black text-slate-700">
                                Condición{" "}
                                {grupoIndice +
                                  1}
                              </p>
                              <p className="text-[10px] text-emerald-600">
                                Salida{" "}
                                {grupoIndice ===
                                0
                                  ? "SÍ"
                                  : `#${grupoIndice + 1}`}
                              </p>
                            </div>

                            {grupos.length >
                              1 && (
                              <button
                                onClick={() =>
                                  guardarGrupos(
                                    grupos.filter(
                                      (
                                        item
                                      ) =>
                                        item.id !==
                                        grupo.id
                                    )
                                  )
                                }
                                className="text-xs font-bold text-rose-500"
                                title="Eliminar condición"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <label className="mt-3 block text-[10px] font-bold uppercase text-slate-500">
                            ¿El usuario
                            coincide con?
                          </label>

                          <select
                            value={
                              grupo.modo
                            }
                            onChange={(
                              e
                            ) => {
                              guardarGrupos(
                                grupos.map(
                                  (
                                    item
                                  ) =>
                                    item.id ===
                                    grupo.id
                                      ? {
                                          ...item,
                                          modo:
                                            e
                                              .target
                                              .value ===
                                            "cualquiera"
                                              ? "cualquiera"
                                              : "todas",
                                        }
                                      : item
                                )
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                          >
                            <option value="todas">
                              Todas las
                              condiciones
                              siguientes
                            </option>
                            <option value="cualquiera">
                              Cualquiera de
                              las condiciones
                              siguientes
                            </option>
                          </select>

                          <div className="mt-3 space-y-3">
                            {grupo.reglas.map(
                              (
                                regla,
                                reglaIndice
                              ) => {
                                const operadores =
                                  operadoresParaCampo(
                                    regla.campo
                                  );

                                const tipoCampo =
                                  campoCondicion(
                                    regla.campo
                                  ).tipo;

                                return (
                                  <div
                                    key={
                                      regla.id
                                    }
                                    className="rounded-lg border border-slate-200 bg-white p-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold uppercase text-slate-400">
                                        Regla{" "}
                                        {reglaIndice +
                                          1}
                                      </span>

                                      {grupo
                                        .reglas
                                        .length >
                                        1 && (
                                        <button
                                          onClick={() => {
                                            guardarGrupos(
                                              grupos.map(
                                                (
                                                  item
                                                ) =>
                                                  item.id ===
                                                  grupo.id
                                                    ? {
                                                        ...item,
                                                        reglas:
                                                          item.reglas.filter(
                                                            (
                                                              r
                                                            ) =>
                                                              r.id !==
                                                              regla.id
                                                          ),
                                                      }
                                                    : item
                                              )
                                            );
                                          }}
                                          className="text-[10px] font-bold text-rose-500"
                                        >
                                          Quitar
                                        </button>
                                      )}
                                    </div>

                                    <select
                                      value={
                                        regla.campo
                                      }
                                      onChange={(
                                        e
                                      ) => {
                                        const nuevoCampo =
                                          e
                                            .target
                                            .value as CampoCondicion;

                                        const nuevosOperadores =
                                          operadoresParaCampo(
                                            nuevoCampo
                                          );

                                        guardarGrupos(
                                          grupos.map(
                                            (
                                              item
                                            ) =>
                                              item.id ===
                                              grupo.id
                                                ? {
                                                    ...item,
                                                    reglas:
                                                      item.reglas.map(
                                                        (
                                                          r
                                                        ) =>
                                                          r.id ===
                                                          regla.id
                                                            ? {
                                                                ...r,
                                                                campo:
                                                                  nuevoCampo,
                                                                operador:
                                                                  nuevosOperadores[
                                                                    0
                                                                  ],
                                                                valor:
                                                                  "",
                                                              }
                                                            : r
                                                      ),
                                                  }
                                                : item
                                          )
                                        );
                                      }}
                                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                                    >
                                      {[
                                        ...new Set(
                                          CAMPOS_CONDICION.map(
                                            (
                                              campo
                                            ) =>
                                              campo.categoria
                                          )
                                        ),
                                      ].map(
                                        (
                                          categoria
                                        ) => (
                                          <optgroup
                                            key={
                                              categoria
                                            }
                                            label={
                                              categoria
                                            }
                                          >
                                            {CAMPOS_CONDICION.filter(
                                              (
                                                campo
                                              ) =>
                                                campo.categoria ===
                                                categoria
                                            ).map(
                                              (
                                                campo
                                              ) => (
                                                <option
                                                  key={
                                                    campo.id
                                                  }
                                                  value={
                                                    campo.id
                                                  }
                                                >
                                                  {
                                                    campo.etiqueta
                                                  }
                                                </option>
                                              )
                                            )}
                                          </optgroup>
                                        )
                                      )}
                                    </select>

                                    <select
                                      value={
                                        regla.operador
                                      }
                                      onChange={(
                                        e
                                      ) => {
                                        const nuevoOperador =
                                          e
                                            .target
                                            .value as OperadorCondicion;

                                        guardarGrupos(
                                          grupos.map(
                                            (
                                              item
                                            ) =>
                                              item.id ===
                                              grupo.id
                                                ? {
                                                    ...item,
                                                    reglas:
                                                      item.reglas.map(
                                                        (
                                                          r
                                                        ) =>
                                                          r.id ===
                                                          regla.id
                                                            ? {
                                                                ...r,
                                                                operador:
                                                                  nuevoOperador,
                                                              }
                                                            : r
                                                      ),
                                                  }
                                                : item
                                          )
                                        );
                                      }}
                                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                                    >
                                      {operadores.map(
                                        (
                                          operador
                                        ) => (
                                          <option
                                            key={
                                              operador
                                            }
                                            value={
                                              operador
                                            }
                                          >
                                            {
                                              ETIQUETAS_OPERADOR_CONDICION[
                                                operador
                                              ]
                                            }
                                          </option>
                                        )
                                      )}
                                    </select>

                                    {operadorUsaValor(
                                      regla.operador
                                    ) &&
                                      (tipoCampo ===
                                      "booleano" ? (
                                        <select
                                          value={
                                            regla.valor ||
                                            "true"
                                          }
                                          onChange={(
                                            e
                                          ) => {
                                            guardarGrupos(
                                              grupos.map(
                                                (
                                                  item
                                                ) =>
                                                  item.id ===
                                                  grupo.id
                                                    ? {
                                                        ...item,
                                                        reglas:
                                                          item.reglas.map(
                                                            (
                                                              r
                                                            ) =>
                                                              r.id ===
                                                              regla.id
                                                                ? {
                                                                    ...r,
                                                                    valor:
                                                                      e
                                                                        .target
                                                                        .value,
                                                                  }
                                                                : r
                                                          ),
                                                      }
                                                    : item
                                              )
                                            );
                                          }}
                                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                                        >
                                          <option value="true">
                                            Sí /
                                            Verdadero
                                          </option>
                                          <option value="false">
                                            No /
                                            Falso
                                          </option>
                                        </select>
                                      ) : (
                                        <input
                                          value={
                                            regla.valor ||
                                            ""
                                          }
                                          onChange={(
                                            e
                                          ) => {
                                            guardarGrupos(
                                              grupos.map(
                                                (
                                                  item
                                                ) =>
                                                  item.id ===
                                                  grupo.id
                                                    ? {
                                                        ...item,
                                                        reglas:
                                                          item.reglas.map(
                                                            (
                                                              r
                                                            ) =>
                                                              r.id ===
                                                              regla.id
                                                                ? {
                                                                    ...r,
                                                                    valor:
                                                                      e
                                                                        .target
                                                                        .value,
                                                                  }
                                                                : r
                                                          ),
                                                      }
                                                    : item
                                              )
                                            );
                                          }}
                                          placeholder={
                                            tipoCampo ===
                                            "numero"
                                              ? "Ejemplo: 80"
                                              : "Valor"
                                          }
                                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none"
                                        />
                                      ))}
                                  </div>
                                );
                              }
                            )}
                          </div>

                          <button
                            onClick={() => {
                              guardarGrupos(
                                grupos.map(
                                  (
                                    item
                                  ) =>
                                    item.id ===
                                    grupo.id
                                      ? {
                                          ...item,
                                          reglas:
                                            [
                                              ...item.reglas,
                                              crearReglaCondicion(),
                                            ],
                                        }
                                      : item
                                )
                              );
                            }}
                            className="mt-3 w-full rounded-lg border border-dashed border-orange-300 px-3 py-2 text-xs font-bold text-orange-500"
                          >
                            + Condición
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    onClick={() =>
                      guardarGrupos([
                        ...grupos,
                        crearGrupoCondicion(),
                      ])
                    }
                    className="mt-4 w-full rounded-xl border border-dashed border-emerald-400 px-3 py-3 text-xs font-black text-emerald-600"
                  >
                    + Comprobar nueva
                    condición
                  </button>

                  <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
                    Cada condición tiene su
                    propia salida verde. La
                    salida roja se ejecuta si
                    ninguna condición coincide.
                    La primera condición conserva
                    la salida SÍ antigua y la
                    salida roja conserva NO para
                    no romper tus conexiones
                    existentes.
                  </div>
                </div>
              );
            })()}

          {nodoSeleccionado?.type ===
            "accion" && (
            <div className="p-4">
              <button
                onClick={() =>
                  setNodoSeleccionadoId(
                    null
                  )
                }
                className="mb-4 text-xs text-orange-500"
              >
                ← Volver
              </button>

              <p className="text-xs font-black">
                ACCIÓN DEL FLUJO
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Ejecuta una acción sin enviar un mensaje al cliente.
              </p>

              <label className="mt-5 block text-xs font-bold text-slate-500">
                Acción
              </label>

              <select
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).accionFlujo ||
                  "activar_bot"
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    accionFlujo:
                      e.target.value as
                        | "activar_bot"
                        | "finalizar_flujo",
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              >
                <option value="activar_bot">
                  Activar bot
                </option>

                <option value="finalizar_flujo">
                  Finalizar flujo
                </option>
              </select>

              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                {(
                  nodoSeleccionado.data as DatosNodo
                ).accionFlujo ===
                "finalizar_flujo"
                  ? "Finaliza este flujo sin enviar el mensaje actual a OpenAI. El siguiente mensaje del cliente ya podrá continuar con el bot normal."
                  : "Finaliza el flujo y permite que el mensaje actual continúe hacia el bot con OpenAI."}
              </div>
            </div>
          )}

          {nodoSeleccionado?.type ===
            "esperar_tiempo" && (
            <div className="p-4">
              <button
                onClick={() =>
                  setNodoSeleccionadoId(
                    null
                  )
                }
                className="mb-4 text-xs text-orange-500"
              >
                ← Volver
              </button>

              <p className="text-xs font-black">
                ESPERAR
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Pausa el flujo antes de continuar al siguiente paso.
              </p>

              <label className="mt-5 block text-xs font-bold text-slate-500">
                Duración en segundos
              </label>

              <input
                type="number"
                min="1"
                max="60"
                step="1"
                value={
                  (
                    nodoSeleccionado.data as DatosNodo
                  ).esperaSegundos || 3
                }
                onChange={(e) =>
                  actualizarDataNodo({
                    esperaSegundos:
                      Math.min(
                        60,
                        Math.max(
                          1,
                          Number(
                            e.target.value ||
                              1
                          )
                        )
                      ),
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
              />

              <p className="mt-2 text-[11px] text-slate-500">
                Por ahora admite de 1 a 60 segundos.
              </p>
            </div>
          )}

{nodoSeleccionado &&
            nodoSeleccionado.type !==
              "mensaje" &&
            nodoSeleccionado.type !==
              "condicion" &&
            nodoSeleccionado.type !==
              "accion" &&
            nodoSeleccionado.type !==
              "esperar_tiempo" && (
              <div className="p-4">
                <button
                  onClick={() =>
                    setNodoSeleccionadoId(
                      null
                    )
                  }
                  className="mb-3 text-xs text-orange-500"
                >
                  ← Volver
                </button>

                <p className="font-bold">
                  {nodoSeleccionado.type}
                </p>
              </div>
            )}
        </aside>

        <section className="relative flex-1 bg-[#eef0f3]">
          {!flujoActivo ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              Selecciona o crea un
              flujo
            </div>
          ) : (
            <>
              <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow">
                <div>
                  <p className="font-black text-slate-900">
                    {
                      flujoActivo.nombre
                    }
                  </p>

                  <p className="text-xs text-slate-500">
                    {flujoActivo.producto_slug ||
                      "Sin producto"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setNodoSeleccionadoId(
                        null
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    + Añadir paso
                  </button>

                  <button
                    onClick={
                      guardarFlujo
                    }
                    disabled={
                      guardando
                    }
                    className="rounded-lg bg-orange-500 px-5 py-2 text-xs font-black text-white"
                  >
                    {guardando
                      ? "GUARDANDO..."
                      : "GUARDAR"}
                  </button>
                </div>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={
                  onNodesChange
                }
                onEdgesChange={
                  onEdgesChange
                }
                onConnect={onConnect}
                onNodeClick={(
                  _,
                  nodo
                ) =>
                  setNodoSeleccionadoId(
                    nodo.id
                  )
                }
                onPaneClick={() =>
                  setNodoSeleccionadoId(
                    null
                  )
                }
                fitView
                deleteKeyCode={[
                  "Backspace",
                  "Delete",
                ]}
                defaultEdgeOptions={{
                  type: "smoothstep",
                }}
              >
                <Background
                  gap={20}
                  size={1}
                />

                <Controls />

                <MiniMap
                  pannable
                  zoomable
                />
              </ReactFlow>
            </>
          )}
        </section>
      </main>

      {nodoPreview && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 p-4 pt-10">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Seleccionar Canal
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Vista previa desde este paso
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNodoPreviewId(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-7">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-slate-900 text-2xl">
                    ▣
                  </div>

                  <div>
                    <p className="font-semibold">
                      Webchat
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Simula el flujo sin enviar mensajes reales.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      !empresaId ||
                      !flujoActivo ||
                      !nodoPreviewId
                    ) {
                      return;
                    }

                    const params =
                      new URLSearchParams({
                        empresa_id:
                          String(empresaId),
                        flujo_id:
                          String(
                            flujoActivo.id
                          ),
                        nodo_uid:
                          nodoPreviewId,
                      });

                    window.open(
                      `/flujos/preview?${params.toString()}`,
                      "_blank",
                      "noopener,noreferrer"
                    );

                    setNodoPreviewId(null);
                  }}
                  className="rounded-lg bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}