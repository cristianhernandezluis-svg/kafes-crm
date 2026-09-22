import { NextResponse } from "next/server";

import { decidirRespuestaBot } from "../../../whatsapp-qr-server/bot/cerebro.mjs";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();

    const texto = String(
      body?.texto || ""
    ).trim();

    const empresaId =
      Number(body?.empresaId || 0) ||
      null;

    const memoria =
      body?.memoria &&
      typeof body.memoria === "object"
        ? body.memoria
        : {};

    const historial =
      Array.isArray(body?.historial)
        ? body.historial
        : [];

    const productoPrincipal =
      body?.productoPrincipal ||
      null;

    if (!texto) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El mensaje está vacío.",
        },
        {
          status: 400,
        }
      );
    }

    if (!empresaId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo determinar la empresa.",
        },
        {
          status: 400,
        }
      );
    }

    const resultado =
      await decidirRespuestaBot({
        texto,
        textoAccion: texto,
        calificacion: {
          score: 0,
          senales: [],
          temperatura: null,
        },
        memoria,
        historial,
        empresaId,
        productoPrincipal,
      });

    return NextResponse.json({
      ok: true,
      resultado,
    });
  } catch (error) {
    console.error(
      "ERROR PREVIEW IA:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo consultar al bot.",
      },
      {
        status: 500,
      }
    );
  }
}