import { NextResponse } from "next/server";

const qrUrl =
  process.env.WHATSAPP_QR_URL ||
  (process.env.NODE_ENV === "production"
    ? "http://n8n_kafes-whatsapp-qr:4001"
    : "http://localhost:4001");

export async function POST() {
  try {
    const res = await fetch(`${qrUrl}/desconectar`, {
      method: "POST",
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
    });
  } catch (error) {
    console.error("Error desconectando WhatsApp QR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo desconectar WhatsApp QR",
      },
      { status: 500 }
    );
  }
}