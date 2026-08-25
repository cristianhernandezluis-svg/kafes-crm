import OpenAI from "openai";
import { createReadStream } from "node:fs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribirAudio(ruta) {
  const resultado = await client.audio.transcriptions.create({
    file: createReadStream(ruta),
    model: "gpt-4o-mini-transcribe",
  });
  return String(resultado.text || "").trim();
}
