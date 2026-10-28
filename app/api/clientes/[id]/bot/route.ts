import { NextResponse } from "next/server";
import { Pool } from "pg";
import { obtenerSesion } from "@/lib/auth";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
  const sesion = await obtenerSesion();

  if (!sesion) {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 401 }
    );
  }

const usuarioResult = await pool.query(
  `SELECT id, rol
   FROM usuarios
   WHERE id = $1
     AND empresa_id = $2
   LIMIT 1`,
  [sesion.id, sesion.empresa_id]
);

if (usuarioResult.rows.length === 0) {
  return NextResponse.json(
    { success: false, error: "Usuario no autorizado" },
    { status: 403 }
  );
}

if (usuarioResult.rows[0].rol !== "admin") {
  return NextResponse.json(
    {
      success: false,
      error: "Solo el administrador puede controlar el bot",
    },
    { status: 403 }
  );
}

  const { id } = await context.params;
  const body = await request.json();

    const whatsappQrId = Number(body.whatsapp_qr_id);
    const accion = String(body.accion || "").toLowerCase();

    if (!whatsappQrId) {
      return NextResponse.json(
        { success: false, error: "Canal de WhatsApp no valido" },
        { status: 400 }
      );
    }

    const actual = await pool.query(
  `
  SELECT
    cwq.id,
    cwq.etapa,
    cwq.bot_activo,
    cwq.modo_humano_permanente,
    cwq.handoff_motivo
  FROM clientes_whatsapp_qr cwq
  JOIN clientes c
    ON c.id = cwq.cliente_id
   AND c.empresa_id = cwq.empresa_id
  WHERE cwq.cliente_id = $1
    AND cwq.whatsapp_qr_id = $2
    AND cwq.empresa_id = $3
  LIMIT 1
  `,
  [id, whatsappQrId, sesion.empresa_id]
);

    if (!actual.rows[0]) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado en este canal" },
        { status: 404 }
      );
    }

    if (accion === "pausar") {
      const result = await pool.query(
        `
        UPDATE clientes_whatsapp_qr
        SET bot_activo = false,
            modo_humano_permanente = true,
            humano_hasta = NULL,
            proximo_seguimiento = NULL,
            requiere_closer = CASE
  WHEN handoff_motivo = 'validar_pago' THEN true
  ELSE false
END,
handoff_motivo = CASE
  WHEN handoff_motivo = 'validar_pago' THEN 'validar_pago'
  ELSE 'intervencion_manual'
END,
            bot_contexto =
              COALESCE(bot_contexto, '{}'::jsonb) ||
              jsonb_build_object(
                'seguimiento_silencio_activo', false,
                'seguimiento_explicito_activo', false
              ),
            updated_at = NOW()
        WHERE cliente_id = $1
  AND whatsapp_qr_id = $2
  AND empresa_id = $3
        RETURNING *
        `,
        [id, whatsappQrId, sesion.empresa_id]
      );

      return NextResponse.json({
        success: true,
        accion: "pausado",
        cliente: result.rows[0],
      });
    }

    if (accion === "activar") {
      const result = await pool.query(
        `
        UPDATE clientes_whatsapp_qr
        SET bot_activo = true,
            modo_humano_permanente = false,
            humano_hasta = NULL,
            updated_at = NOW()
        WHERE cliente_id = $1
  AND whatsapp_qr_id = $2
  AND empresa_id = $3
  AND COALESCE(handoff_motivo, '') <> 'validar_pago'
RETURNING *
        `,
        [id, whatsappQrId, sesion.empresa_id]
      );

if (result.rowCount === 0) {
  return NextResponse.json(
    {
      success: false,
      error: "No se puede activar el bot mientras exista un pago pendiente de validación",
    },
    { status: 409 }
  );
}

      return NextResponse.json({
        success: true,
        accion: "activado",
        cliente: result.rows[0],
      });
    }

if (actual.rows[0].modo_humano_permanente === true) {
  return NextResponse.json(
    {
      success: false,
      error: "El bot esta pausado manualmente. Debes activarlo con el boton Activar bot.",
    },
    { status: 409 }
  );
}

    const etapa = String(actual.rows[0].etapa || "");

    const esPostventa =
      (etapa.startsWith("Pag") && etapa.includes("Adelanto")) ||
      etapa === "Enviado" ||
      etapa === "Entregado";

    if (!esPostventa) {
      return NextResponse.json(
        { success: false, error: "El cliente aun no esta en postventa" },
        { status: 400 }
      );
    }

    const result = await pool.query(
  `
  UPDATE clientes_whatsapp_qr
  SET bot_activo = true,
      modo_humano_permanente = false,
      requiere_closer = false,
      humano_hasta = NULL,
      bot_paso = 'postventa',
      updated_at = NOW()
  WHERE cliente_id = $1
    AND whatsapp_qr_id = $2
    AND empresa_id = $3
    AND COALESCE(handoff_motivo, '') <> 'validar_pago'
  RETURNING *
  `,
  [id, whatsappQrId, sesion.empresa_id]
);

if (result.rowCount === 0) {
  return NextResponse.json(
    {
      success: false,
      error: "No se puede reactivar la postventa mientras exista un pago pendiente de validación",
    },
    { status: 409 }
  );
}

    return NextResponse.json({
      success: true,
      cliente: result.rows[0],
    });
  } catch (error) {
    console.error("ERROR CONTROLANDO BOT:", error);

    return NextResponse.json(
      { success: false, error: "Error controlando conversacion del bot" },
      { status: 500 }
    );
  }
}