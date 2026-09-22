import { NextResponse } from "next/server";

import { getCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

type Body = {
  tipo?: "flujo";
  flujoId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;

    const flujoId = Number(body.flujoId);

    const folder =
      Number.isInteger(flujoId) && flujoId > 0
        ? `kafes-crm/flujos/${flujoId}`
        : "kafes-crm/flujos/nuevos";

    const timestamp = Math.round(
      Date.now() / 1000
    );

    const cloudinary = getCloudinary();

    const signature =
      cloudinary.utils.api_sign_request(
        {
          timestamp,
          folder,
        },
        process.env.CLOUDINARY_API_SECRET!
      );

    return NextResponse.json({
      timestamp,
      signature,
      folder,
      apiKey:
        process.env.CLOUDINARY_API_KEY,
      cloudName:
        process.env
          .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error(
      "Error generando firma de Cloudinary:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo preparar la carga.",
      },
      {
        status: 500,
      }
    );
  }
}