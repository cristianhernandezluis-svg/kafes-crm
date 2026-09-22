import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const mediaDb = await pool.query(
      "SELECT canal, mime_type FROM conversaciones WHERE media_id = $1 ORDER BY id DESC LIMIT 1",
      [id]
    );

    if (mediaDb.rows[0]?.canal === "qr") {
      const qrUrl = process.env.WHATSAPP_QR_URL || "http://localhost:4001";
      const qrRes = await fetch(`${qrUrl}/media/${encodeURIComponent(id)}`);

      if (!qrRes.ok) {
        return NextResponse.json({ success: false, error: "Media QR no encontrado" }, { status: 404 });
      }

      const buffer = await qrRes.arrayBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": mediaDb.rows[0].mime_type || qrRes.headers.get("content-type") || "application/octet-stream",
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v25.0/${id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        },
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok || !metaData.url) {
      console.error("ERROR OBTENIENDO MEDIA:", metaData);
      return NextResponse.json(
        { success: false, error: metaData },
        { status: 500 }
      );
    }

    const fileRes = await fetch(metaData.url, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    });

    const buffer = await fileRes.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": metaData.mime_type || "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("ERROR DESCARGANDO MEDIA:", error);

    return NextResponse.json(
      { success: false, error: "No se pudo descargar media" },
      { status: 500 }
    );
  }
}