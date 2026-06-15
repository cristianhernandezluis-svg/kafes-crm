import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://n8n_kafes-whatsapp-qr:4001/qr", {
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error obteniendo QR:", error);

    return NextResponse.json(
      {
        estado: "error",
        qr: null,
        error: "No se pudo conectar con WhatsApp QR",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const res = await fetch(
      "http://n8n_kafes-whatsapp-qr:4001/sync-contacts",
      {
        method: "POST",
        cache: "no-store",
      }
    );

    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error sincronizando contactos QR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo sincronizar contactos WhatsApp QR",
      },
      { status: 500 }
    );
  }
}