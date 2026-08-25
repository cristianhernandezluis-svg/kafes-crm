import OpenAI from "openai";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
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

export async function analizarDocumento(ruta, filename = "documento.pdf") {
  const buffer = await readFile(ruta);
  const respuesta = await client.responses.create({
    model: "gpt-5.6-terra",
    input: [{ role: "user", content: [
      { type: "input_text", text: "Resume este documento para dar contexto a un asesor de ventas por WhatsApp. Identifica productos, cotizaciones, especificaciones, precios o datos comerciales relevantes. No inventes informacion ni confirmes pagos." },
      { type: "input_file", file_data: "data:application/pdf;base64," + buffer.toString("base64"), filename, detail: "low" }
    ] }]
  });
  return String(respuesta.output_text || "").trim();
}

async function analizarFotogramas(rutas) {
  if (!rutas.length) return "";

  const content = [
    {
      type: "input_text",
      text: "Estos son fotogramas extraidos de un video enviado por WhatsApp. Resume brevemente lo que ocurre para dar contexto a un asesor de ventas. Identifica productos, texto visible, comprobantes, fallas, demostraciones u objetos relevantes. No inventes marcas, modelos, pagos confirmados ni datos que no sean visibles. Si algo no esta claro, indicalo."
    }
  ];

  for (const ruta of rutas) {
    const buffer = await readFile(ruta);
    content.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      detail: "low"
    });
  }

  const respuesta = await client.responses.create({
    model: "gpt-5.6-terra",
    input: [{ role: "user", content }]
  });

  return String(respuesta.output_text || "").trim();
}

export async function analizarVideo(ruta) {
  if (!ffmpegPath) throw new Error("FFmpeg no esta disponible");

  const carpetaTemporal = await mkdtemp(join(tmpdir(), "kafes-video-"));
  const patronFotogramas = join(carpetaTemporal, "frame-%02d.jpg");
  const rutaAudio = join(carpetaTemporal, "audio.mp3");

  try {
    await execFileAsync(ffmpegPath, [
      "-hide_banner",
      "-loglevel", "error",
      "-i", ruta,
      "-vf", "fps=1/4,scale=960:-2:force_original_aspect_ratio=decrease",
      "-frames:v", "6",
      "-q:v", "3",
      "-y",
      patronFotogramas
    ]);

    let transcripcion = "";
    try {
      await execFileAsync(ffmpegPath, [
        "-hide_banner",
        "-loglevel", "error",
        "-i", ruta,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "libmp3lame",
        "-b:a", "64k",
        "-y",
        rutaAudio
      ]);
      transcripcion = await transcribirAudio(rutaAudio);
    } catch {
      transcripcion = "";
    }

    const archivos = (await readdir(carpetaTemporal))
      .filter((nombre) => /^frame-\d+\.jpg$/i.test(nombre))
      .sort()
      .slice(0, 6)
      .map((nombre) => join(carpetaTemporal, nombre));

    const analisisVisual = await analizarFotogramas(archivos);

    const partes = [];
    if (analisisVisual) partes.push(`ANALISIS VISUAL DEL VIDEO:
${analisisVisual}`);
    if (transcripcion) partes.push(`AUDIO TRANSCRITO DEL VIDEO:
${transcripcion}`);

    return partes.join("\n\n").trim() || "No se pudo obtener contenido util del video.";
  } finally {
    await rm(carpetaTemporal, { recursive: true, force: true }).catch(() => {});
  }
}
