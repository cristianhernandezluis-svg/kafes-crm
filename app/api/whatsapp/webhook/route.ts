import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Error de verificación", { status: 403 });
}

export async function POST(req: Request) {
  const body = await req.json();

  console.log("MENSAJE DE WHATSAPP:", JSON.stringify(body, null, 2));

  return NextResponse.json({ success: true });
}