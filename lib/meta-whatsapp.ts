
import "server-only";

const GRAPH_VERSION = "v25.0";

type MetaPhone = {
  id: string;
  display_phone_number?: string;
};

type MetaPhoneResponse = {
  data?: MetaPhone[];
  paging?: {
    next?: string;
  };
};

type MetaDebugResponse = {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    granular_scopes?: Array<{
      scope: string;
      target_ids?: string[];
    }>;
  };
};

async function consultarMeta<T>(
  endpoint: string,
  token: string
): Promise<T> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Meta rechazó la consulta: HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export async function validarWhatsAppMeta(
  token: string,
  wabaId: string,
  phoneNumberId: string
): Promise<void> {
  // Solo aceptamos identificadores numéricos de Meta.
  if (
    !/^\d{5,30}$/.test(wabaId) ||
    !/^\d{5,30}$/.test(phoneNumberId)
  ) {
    throw new Error("Identificadores de WhatsApp inválidos");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Credenciales de Meta no configuradas");
  }

  // Verificar a qué aplicación pertenece el token.
  const debug = await consultarMeta<MetaDebugResponse>(
    `debug_token?input_token=${encodeURIComponent(token)}`,
    `${appId}|${appSecret}`
  );

  const datos = debug.data;

  if (!datos?.is_valid || String(datos.app_id) !== appId) {
    throw new Error("El token no pertenece a Kafes CRM");
  }

  // Comprobar el permiso sobre esta cuenta de WhatsApp.
  const tienePermiso = datos.granular_scopes?.some(
    (permiso) =>
      permiso.scope === "whatsapp_business_management" &&
      permiso.target_ids?.includes(wabaId)
  );

  if (!tienePermiso) {
    throw new Error(
      "Meta no confirmó permiso sobre esta cuenta de WhatsApp"
    );
  }

  // Consultar el número directamente dentro de la WABA.
  // No confiamos únicamente en el número enviado por el navegador.
  let endpoint =
    `${wabaId}/phone_numbers?fields=id,display_phone_number&limit=100`;

  let encontrado = false;

  for (let pagina = 0; pagina < 10; pagina++) {
    const resultado =
      await consultarMeta<MetaPhoneResponse>(endpoint, token);

    if (
      resultado.data?.some(
        (phone) => String(phone.id) === phoneNumberId
      )
    ) {
      encontrado = true;
      break;
    }

    const next = resultado.paging?.next;

    if (!next) break;

    // No seguir URLs externas proporcionadas en paginación.
    const url = new URL(next);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "graph.facebook.com" ||
      !url.pathname.startsWith(`/${GRAPH_VERSION}/`)
    ) {
      throw new Error("Paginación de Meta inválida");
    }

    endpoint =
      url.pathname.slice(`/${GRAPH_VERSION}/`.length) +
      url.search;
  }

  if (!encontrado) {
    throw new Error(
      "El número no pertenece a la cuenta autorizada"
    );
  }
}
