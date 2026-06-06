import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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