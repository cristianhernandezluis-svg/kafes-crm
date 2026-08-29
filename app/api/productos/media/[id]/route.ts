import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const STORAGE_DIR =
  process.env.CATALOGO_STORAGE_DIR ||
  path.join(process.cwd(), "storage", "catalogo");

function mimeDesdeRuta(ruta: string, tipo: string) {
  const ext = path.extname(ruta || "").toLowerCase();

  const mapa: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
  };

  if (mapa[ext]) return mapa[ext];
  if (tipo === "foto") return "image/jpeg";
  if (tipo === "gif") return "image/gif";
  if (tipo === "video") return "video/mp4";
  if (tipo === "audio") return "audio/mpeg";

  return "application/octet-stream";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const mediaId = Number(id);
    const { searchParams } = new URL(request.url);
    const empresaId = Number(searchParams.get("empresa_id"));

    if (!mediaId || !empresaId) {
      return new Response("Datos inválidos", { status: 400 });
    }

    const result = await pool.query(
      `
      SELECT id, empresa_id, tipo, url
      FROM producto_multimedia
      WHERE id = $1
        AND empresa_id = $2
        AND activo = true
      LIMIT 1
      `,
      [mediaId, empresaId]
    );

    if (result.rowCount === 0) {
      return new Response("Archivo no encontrado", { status: 404 });
    }

    const media = result.rows[0];
    const rutaRelativa = String(media.url || "").replace(/^[/\\]+/, "");
    const rutaAbsoluta = path.resolve(STORAGE_DIR, rutaRelativa);
    const raizAbsoluta = path.resolve(STORAGE_DIR);

    if (
      rutaAbsoluta !== raizAbsoluta &&
      !rutaAbsoluta.startsWith(raizAbsoluta + path.sep)
    ) {
      return new Response("Ruta inválida", { status: 400 });
    }

    const buffer = await readFile(rutaAbsoluta);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeDesdeRuta(media.url, media.tipo),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("ERROR LEYENDO MULTIMEDIA PRODUCTO:", error);
    return new Response("Archivo no disponible", { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const mediaId = Number(id);
    const { searchParams } = new URL(request.url);
    const empresaId = Number(searchParams.get("empresa_id"));

    if (!mediaId || !empresaId) {
      return new Response(
        JSON.stringify({ success: false, error: "Datos inválidos" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM producto_multimedia
      WHERE id = $1
        AND empresa_id = $2
      RETURNING id
      `,
      [mediaId, empresaId]
    );

    if (result.rowCount === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Archivo no encontrado" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ERROR ELIMINANDO MULTIMEDIA PRODUCTO:", error);

    return new Response(
      JSON.stringify({ success: false, error: "No se pudo eliminar" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
