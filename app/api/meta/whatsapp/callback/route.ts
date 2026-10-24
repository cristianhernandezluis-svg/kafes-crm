import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
import { cifrarToken } from "@/lib/crypto";
import { validarWhatsAppMeta } from "@/lib/meta-whatsapp";

export const runtime = "nodejs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type SignupBody = {
  intento_id?: unknown;
  code?: unknown;
  waba_id?: unknown;
  phone_number_id?: unknown;
};

function errorRespuesta(mensaje: string, status: number) {
  return NextResponse.json({ success: false, error: mensaje }, { status });
}

export async function POST(request: Request) {
  try {
    const origen = request.headers.get("origin");

const origenPermitido = process.env.APP_URL
  ? new URL(process.env.APP_URL).origin
  : new URL(request.url).origin;

if (!origen || origen !== origenPermitido) {
  return errorRespuesta("Origen no autorizado", 403);
}

    const sesion = await obtenerSesion();
    if (!sesion) return errorRespuesta("Inicia sesión nuevamente", 401);

    const usuarioResultado = await pool.query(
      `SELECT id, empresa_id FROM usuarios
       WHERE id = $1 AND empresa_id = $2 AND rol = 'admin' LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );
    if (usuarioResultado.rows.length !== 1) {
      return errorRespuesta("Permisos insuficientes", 403);
    }

    // Leer la solicitud una sola vez, antes de reservar el intento.
    const body: SignupBody = await request.json().catch(() => ({}));
    const { intento_id, code, waba_id, phone_number_id } = body;

    if (
      typeof intento_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intento_id) ||
      typeof code !== "string" || code.length < 10 || code.length > 4096 ||
      typeof waba_id !== "string" || !/^\d{5,30}$/.test(waba_id) ||
      typeof phone_number_id !== "string" || !/^\d{5,30}$/.test(phone_number_id)
    ) {
      return errorRespuesta("Datos de autorización incompletos o inválidos", 400);
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      return errorRespuesta("Credenciales de Meta no configuradas", 500);
    }

    // Reserva atómica: se confirma ANTES de usar el código ante Meta.
    // Si falla Meta, se necesita iniciar un intento nuevo.
    const reserva = await pool.query(
      `UPDATE whatsapp_intentos_meta
       SET usado_at = NOW()
       WHERE id = $1
         AND usuario_id = $2
         AND empresa_id = $3
         AND expires_at > NOW()
         AND usado_at IS NULL
       RETURNING id`,
      [intento_id, sesion.id, sesion.empresa_id]
    );
    if (reserva.rowCount !== 1) {
      return errorRespuesta("Intento vencido o ya utilizado. Inicia otro registro.", 409);
    }

    const parametros = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    });
    const respuestaMeta = await fetch(
      "https://graph.facebook.com/v25.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: parametros.toString(),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );
    const datosMeta: unknown = await respuestaMeta.json().catch(() => null);
    const token =
      datosMeta && typeof datosMeta === "object" && "access_token" in datosMeta
        ? datosMeta.access_token
        : undefined;
    if (!respuestaMeta.ok || typeof token !== "string" || !token) {
      return errorRespuesta("Meta no autorizó la conexión. Inicia otro registro.", 502);
    }

    // Debe fallar sin guardar nada si los activos no están autorizados.
    await validarWhatsAppMeta(token, waba_id, phone_number_id);
    const tokenCifrado = cifrarToken(token);

    const guardado = await pool.query(
      `INSERT INTO whatsapp_conexiones_meta
         (empresa_id, waba_id, phone_number_id, token_cifrado, estado)
       VALUES ($1, $2, $3, $4, 'pendiente')
       ON CONFLICT (phone_number_id) DO UPDATE SET
         waba_id = EXCLUDED.waba_id,
         token_cifrado = EXCLUDED.token_cifrado,
         estado = 'pendiente',
         updated_at = NOW()
       WHERE whatsapp_conexiones_meta.empresa_id = EXCLUDED.empresa_id
       RETURNING id, empresa_id, waba_id, phone_number_id, estado`,
      [sesion.empresa_id, waba_id, phone_number_id, tokenCifrado]
    );
    if (guardado.rows.length !== 1) {
      return errorRespuesta("El número ya pertenece a otra empresa", 409);
    }

    return NextResponse.json({
      success: true,
      conectado: false,
      integracion: guardado.rows[0],
      mensaje: "Autorización guardada; falta activar número y webhooks.",
    });
  } catch (error) {
    // No registrar tokens ni respuestas completas de Meta.
    console.error("ERROR CALLBACK META:", error instanceof Error ? error.name : "Error");
    return errorRespuesta("No se pudo completar la vinculación. Inicia un registro nuevo.", 500);
  }
}
