import { NextResponse } from "next/server";
import { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const STORAGE_DIR =
  process.env.CATALOGO_STORAGE_DIR ||
  path.join(process.cwd(), "storage", "catalogo");

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function detectarTipo(mime: string) {
  const tipo = String(mime || "").toLowerCase();

  if (tipo === "image/gif") return "gif";
  if (tipo.startsWith("image/")) return "foto";
  if (tipo.startsWith("video/")) return "video";
  if (tipo.startsWith("audio/")) return "audio";

  return null;
}

function extensionSegura(nombre: string, mime: string) {
  const extNombre = path.extname(nombre || "").toLowerCase().replace(/[^a-z0-9.]/g, "");

  if (extNombre && extNombre.length <= 8) {
    return extNombre;
  }

  const mapa: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
  };

  return mapa[mime] || ".bin";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const productoId = Number(id);
    const formData = await request.formData();
    const empresaId = Number(formData.get("empresa_id"));
    const archivo = formData.get("archivo");

    if (!productoId || !empresaId || !(archivo instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Faltan datos para subir el archivo" },
        { status: 400 }
      );
    }

    if (archivo.size <= 0) {
      return NextResponse.json(
        { success: false, error: "El archivo está vacío" },
        { status: 400 }
      );
    }

    if (archivo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "El archivo supera el límite de 30 MB" },
        { status: 400 }
      );
    }

    const tipo = detectarTipo(archivo.type);

    if (!tipo) {
      return NextResponse.json(
        { success: false, error: "Solo se permiten fotos, GIF, videos o audios" },
        { status: 400 }
      );
    }

    const producto = await pool.query(
      `
      SELECT id
      FROM productos
      WHERE id = $1
        AND empresa_id = $2
      LIMIT 1
      `,
      [productoId, empresaId]
    );

    if (producto.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const extension = extensionSegura(archivo.name, archivo.type);
    const nombreArchivo = `${randomUUID()}${extension}`;
    const carpetaRelativa = path.join(
      `empresa-${empresaId}`,
      `producto-${productoId}`
    );
    const carpetaAbsoluta = path.join(STORAGE_DIR, carpetaRelativa);

    await mkdir(carpetaAbsoluta, { recursive: true });

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const rutaAbsoluta = path.join(carpetaAbsoluta, nombreArchivo);
    await writeFile(rutaAbsoluta, buffer);

    const rutaRelativa = path
      .join(carpetaRelativa, nombreArchivo)
      .replace(/\\/g, "/");

    const ordenResult = await pool.query(
      `
      SELECT COALESCE(MAX(orden), -1) + 1 AS siguiente
      FROM producto_multimedia
      WHERE producto_id = $1
        AND empresa_id = $2
      `,
      [productoId, empresaId]
    );

    const orden = Number(ordenResult.rows[0]?.siguiente || 0);

    const result = await pool.query(
      `
      INSERT INTO producto_multimedia (
        producto_id,
        empresa_id,
        tipo,
        url,
        orden,
        activo
      )
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, producto_id, empresa_id, tipo, url, orden, activo, created_at
      `,
      [productoId, empresaId, tipo, rutaRelativa, orden]
    );

    const media = result.rows[0];

    return NextResponse.json({
      success: true,
      media: {
        ...media,
        preview_url: `/api/productos/media/${media.id}?empresa_id=${empresaId}`,
      },
    });
  } catch (error) {
    console.error("ERROR SUBIENDO MULTIMEDIA PRODUCTO:", error);

    return NextResponse.json(
      { success: false, error: "No se pudo subir el archivo" },
      { status: 500 }
    );
  }
}
