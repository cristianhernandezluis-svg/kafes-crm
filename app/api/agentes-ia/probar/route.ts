
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
import { descifrarToken } from "@/lib/crypto";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function fallo(mensaje: string, status: number) {
  return NextResponse.json(
    { success: false, error: mensaje },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    // Solo permitir solicitudes del propio CRM.
    const origen = request.headers.get("origin");
    const permitido = process.env.APP_URL;

    if (
      !origen ||
      !permitido ||
      new URL(origen).origin !== new URL(permitido).origin
    ) {
      return fallo("Origen no autorizado", 403);
    }

    // La empresa siempre se obtiene de la sesión firmada.
    const sesion = await obtenerSesion();
    if (!sesion) return fallo("Inicia sesión", 401);

    const usuario = await pool.query(
      `SELECT id FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
         AND rol = 'admin'
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (!usuario.rows.length) {
      return fallo("Permisos insuficientes", 403);
    }

    const tipo = request.headers.get("content-type") || "";
    if (!tipo.toLowerCase().includes("application/json")) {
      return fallo("Se requiere JSON", 415);
    }

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return fallo("Datos inválidos", 400);
    }

    const datos = body as Record<string, unknown>;
    const id = datos.agente_id;
    const mensaje = datos.mensaje;

    if (
      typeof id !== "string" ||
      !/^[1-9]\d*$/.test(id) ||
      typeof mensaje !== "string" ||
      !mensaje.trim() ||
      mensaje.length > 1500
    ) {
      return fallo("Agente o mensaje inválido", 400);
    }

    // Recuperar solo un agente de la empresa autenticada.
    const agenteResultado = await pool.query(
      `SELECT modelo, prompt_maestro
       FROM agentes_ia
       WHERE id = $1::bigint
         AND empresa_id = $2
         AND proveedor = 'openai'
       LIMIT 1`,
      [id, sesion.empresa_id]
    );

    if (!agenteResultado.rows.length) {
      return fallo("Agente no encontrado", 404);
    }

    const agente = agenteResultado.rows[0];

    // Solo usar modelos que hemos autorizado en el CRM.
    if (!["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"].includes(agente.modelo)) {
      return fallo("Modelo no permitido", 400);
    }

    // Recuperar la API Key cifrada de la misma empresa.
    const integracionResultado = await pool.query(
      `SELECT api_key_cifrada
       FROM integraciones_ia
       WHERE empresa_id = $1
         AND proveedor = 'openai'
         AND estado = 'activo'
       LIMIT 1`,
      [sesion.empresa_id]
    );

    if (!integracionResultado.rows.length) {
      return fallo("Primero conecta OpenAI en Ajustes", 409);
    }


    // Máximo 10 pruebas cada 15 minutos por administrador.
    // PostgreSQL realiza el incremento de forma atómica.
    const limite = await pool.query(
      `INSERT INTO agentes_ia_pruebas_limite
         (usuario_id, ventana_inicio, cantidad)
       VALUES (
         $1,
         to_timestamp(
           floor(extract(epoch FROM now()) / 900) * 900
         ),
         1
       )
       ON CONFLICT (usuario_id, ventana_inicio)
       DO UPDATE SET
         cantidad = agentes_ia_pruebas_limite.cantidad + 1
       WHERE agentes_ia_pruebas_limite.cantidad < 10
       RETURNING cantidad`,
      [sesion.id]
    );

    if (limite.rows.length === 0) {
      return fallo(
        "Alcanzaste el límite de 10 pruebas. Intenta nuevamente en la siguiente ventana de 15 minutos.",
        429
      );
    }


    const apiKey = descifrarToken(
      integracionResultado.rows[0].api_key_cifrada
    );

    // Prueba aislada: no consulta chats ni envía WhatsApp.
    const respuesta = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: agente.modelo,
          instructions: agente.prompt_maestro,
          input: mensaje.trim(),
          max_output_tokens: 350,
          store: false,
        }),
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
      }
    );

    if (!respuesta.ok) {
      console.error("PRUEBA AGENTE OPENAI HTTP:", respuesta.status);

      if (respuesta.status === 429) {
        return fallo("Límite de uso o saldo insuficiente en OpenAI", 429);
      }

      return fallo(
        "OpenAI no pudo completar la prueba. Revisa el acceso al modelo.",
        502
      );
    }

    const datosOpenAI: unknown = await respuesta.json();

    if (
      !datosOpenAI ||
      typeof datosOpenAI !== "object" ||
      !("output" in datosOpenAI) ||
      !Array.isArray(datosOpenAI.output)
    ) {
      return fallo("OpenAI devolvió una respuesta inválida", 502);
    }

    const textos: string[] = [];

    for (const item of datosOpenAI.output) {
      if (!item || typeof item !== "object" || !("content" in item)) {
        continue;
      }

      if (!Array.isArray(item.content)) continue;

      for (const contenido of item.content) {
        if (
          contenido &&
          typeof contenido === "object" &&
          "type" in contenido &&
          contenido.type === "output_text" &&
          "text" in contenido &&
          typeof contenido.text === "string"
        ) {
          textos.push(contenido.text);
        }
      }
    }

    return NextResponse.json({
      success: true,
      respuesta: textos.join("\n").trim() || "El modelo no devolvió texto.",
    });
  } catch (error) {
    console.error(
      "ERROR PROBAR AGENTE:",
      error instanceof Error ? error.name : "Error"
    );
    return fallo("No se pudo probar el agente", 500);
  }
}
