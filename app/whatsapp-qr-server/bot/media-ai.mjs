import OpenAI from "openai";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribirAudio(ruta) {
  const resultado = await client.audio.transcriptions.create({
    file: createReadStream(ruta),
    model: "gpt-4o-mini-transcribe",
  });
  return String(resultado.text || "").trim();
}

export async function analizarImagen(ruta, mimeType = "image/jpeg") {
  const buffer = await readFile(ruta);
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const respuesta = await client.responses.create({
    model: "gpt-5.6-terra",
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: "Describe brevemente esta imagen para dar contexto a un asesor de ventas por WhatsApp. Identifica productos, texto visible, comprobantes u objetos relevantes. No inventes marcas, modelos, pagos confirmados ni datos que no sean visibles. Si no estas seguro, indicalo." },
        { type: "input_image", image_url: dataUrl, detail: "low" }
      ]
    }]
  });
  return String(respuesta.output_text || "").trim();
}
