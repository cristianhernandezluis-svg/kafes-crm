
import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ clientesId: string }> }
) {
  try {
    // 1. Verificar sesión
    const sesion = await obtenerSesion();

    if (!sesion) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    // 2. Validar cliente y canal
    const { clientesId } = await context.params;
    const clienteId = Number(clientesId);

    const { searchParams } = new URL(request.url);
    const canalRaw = searchParams.get("whatsapp_qr_id");
    const whatsappQrId = Number(canalRaw);

    if (
      !Number.isSafeInteger(clienteId) ||
      clienteId <= 0 ||
      canalRaw === null ||
      canalRaw.trim() === "" ||
      !Number.isSafeInteger(whatsappQrId) ||
      whatsappQrId <= 0
    ) {
      return NextResponse.json(
        { success: false, error: "Parámetros inválidos" },
        { status: 400 }
      );
    }

    // 3. Verificar usuario en la empresa
    const usuarioResult = await pool.query(
      `SELECT id, empresa_id, rol
       FROM usuarios
       WHERE id = $1
         AND empresa_id = $2
       LIMIT 1`,
      [sesion.id, sesion.empresa_id]
    );

    if (usuarioResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      );
    }

    const usuario = usuarioResult.rows[0];

    if (usuario.rol !== "admin" && usuario.rol !== "asesor") {
      return NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      );
    }

    // 4. Comprobar permisos por empresa, cliente y canal
    const result = await pool.query(
      `SELECT
         conv.id,
         conv.cliente_id,
         conv.telefono,
         conv.mensaje,
         conv.tipo,
         conv.remitente,
         conv.created_at,
         conv.media_id,
         conv.mime_type,
         conv.filename
       FROM conversaciones conv
       INNER JOIN clientes c
         ON c.id = conv.cliente_id
        AND c.empresa_id = conv.empresa_id
       LEFT JOIN clientes_whatsapp_qr rel
         ON rel.cliente_id = conv.cliente_id
        AND rel.empresa_id = conv.empresa_id
        AND rel.whatsapp_qr_id = conv.whatsapp_qr_id
       WHERE conv.cliente_id = $1
         AND conv.empresa_id = $2
         AND conv.whatsapp_qr_id = $3
         AND (
           $4 = 'admin'
           OR (
             $4 = 'asesor'
             AND rel.asesor_usuario_id = $5
           )
         )
       ORDER BY conv.created_at ASC`,
      [
        clienteId,
        usuario.empresa_id,
        whatsappQrId,
        usuario.rol,
        usuario.id,
      ]
    );

    return NextResponse.json({
      success: true,
      conversaciones: result.rows,
    });
  } catch (error) {
    console.error("ERROR API CONVERSACIONES:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al consultar conversaciones",
        conversaciones: [],
      },
      { status: 500 }
    );
  }
}
