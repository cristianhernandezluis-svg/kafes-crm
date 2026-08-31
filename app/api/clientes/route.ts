import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresa_id");
    const whatsappQrId = searchParams.get("whatsapp_qr_id");
    const incluirContactos = searchParams.get("incluir_contactos") === "1";

    if (!empresaId) {
      return NextResponse.json({
        success: false,
        clientes: [],
        error: "empresa_id es obligatorio",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        empresa_id,
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
        requiere_closer,
        handoff_motivo,
        observacion,
        proximo_seguimiento,
        ultima_gestion,
        cantidad_seguimientos,
        created_at
      FROM clientes
      WHERE empresa_id = $1
        AND (
          $2::integer IS NULL
          OR ($3::boolean = true AND EXISTS (SELECT 1 FROM clientes_whatsapp_qr rel WHERE rel.cliente_id = clientes.id AND rel.empresa_id = $1 AND rel.whatsapp_qr_id = $2::integer))
          OR (
  $3::boolean = false
  AND EXISTS (
    SELECT 1
    FROM conversaciones conv
    JOIN integraciones_whatsapp_qr iq
      ON iq.id = $2::integer
    WHERE conv.cliente_id = clientes.id
      AND conv.empresa_id = $1
      AND conv.whatsapp_qr_id = $2::integer
      AND conv.created_at >= iq.created_at
  )
)
        )
      ORDER BY created_at DESC;
      `,
      [empresaId, whatsappQrId || null, incluirContactos]
    );

    return NextResponse.json({
      success: true,
      clientes: result.rows,
    });
  } catch (error) {
    console.error("ERROR API CLIENTES:", error);

    return NextResponse.json(
      { success: false, clientes: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      empresa_id,
      nombre,
      telefono,
      ciudad,
      etapa = "Nuevo",
      asesor = null,
      observacion = null,
      proximo_seguimiento = null,
    } = body;

    if (!empresa_id) {
      return NextResponse.json(
        { success: false, error: "empresa_id es obligatorio" },
        { status: 400 }
      );
    }

    let telefonoLimpio = telefono.replace(/\D/g, "");

    if (!telefonoLimpio.startsWith("51")) {
      telefonoLimpio = `51${telefonoLimpio}`;
    }

    const result = await pool.query(
      `
      INSERT INTO clientes (
        empresa_id,
        nombre,
        telefono,
        ciudad,
        etapa,
        asesor,
        observacion,
        proximo_seguimiento
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        empresa_id,
        nombre,
        telefonoLimpio,
        ciudad,
        etapa,
        asesor,
        observacion,
        proximo_seguimiento,
      ]
    );

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR CREANDO CLIENTE:", error);

    return NextResponse.json(
      {
        success: false,
        error: "No se pudo crear el cliente",
      },
      { status: 500 }
    );
  }
}