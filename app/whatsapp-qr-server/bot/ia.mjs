import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PROMPT_VENDEDOR } from "./prompt.mjs";
import { AnalisisVenta } from "./esquema.mjs";
import { PRODUCTOS } from "./catalogo.mjs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function prepararCatalogo() {
  return PRODUCTOS.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    aliases: p.aliases,
    precio: p.precio,
    precioAntes: p.precioAntes,
    descripcion: p.descripcion,
    beneficios: p.beneficios,
  }));
}

export async function consultarIA(input) {
  const mensaje =
    typeof input === "string"
      ? input
      : input?.mensaje || "";

  const memoria =
    typeof input === "object"
      ? input?.memoria || {}
      : {};

  const historial =
    typeof input === "object"
      ? input?.historial || []
      : [];

  const contexto = `
CATALOGO REAL:
${JSON.stringify(prepararCatalogo(), null, 2)}

MEMORIA DEL CLIENTE:
${JSON.stringify(memoria, null, 2)}

HISTORIAL RECIENTE:
${JSON.stringify(historial, null, 2)}

MENSAJE ACTUAL:
${mensaje}

REGLAS IMPORTANTES:
- Si identificas un producto del catalogo, en "producto" devuelve EXACTAMENTE su slug.
- Ejemplo: "sierra" o "BOMVINK" corresponde a "sierra-bomvink-8".
- No inventes productos.
- No inventes precios, promociones, caracteristicas ni beneficios.
- Usa solamente la informacion del CATALOGO REAL.
- Si no puedes identificar el producto, devuelve producto=null.
- Usa la memoria para no volver a preguntar datos que el cliente ya dio.
- Responde en español natural usado en Peru.
- Evita expresiones como "compartís", "querés" o "podés".
- La respuesta debe ser corta y natural para WhatsApp.
- Responde primero la duda del cliente y luego avanza la venta.
`;

  const response = await client.responses.parse({
    model: "gpt-5.6-terra",
    instructions: PROMPT_VENDEDOR,
    input: contexto,
    text: {
      format: zodTextFormat(
        AnalisisVenta,
        "analisis_venta"
      ),
    },
  });

  return response.output_parsed;
}