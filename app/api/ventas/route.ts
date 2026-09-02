import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ETAPA_PAGO = "Pag\u00f3 Adelanto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = Number(searchParams.get("cliente_id"));
    const whatsappQrId = Number(searchParams.get("whatsapp_qr_id"));

    if (!clienteId || !whatsappQrId) {
      return NextResponse.json(
        { error: "cliente_id y whatsapp_qr_id requeridos" },
        { status: 400 }
      );
    }

    const resultado = await pool.query(
      `
      SELECT
        id,
        cliente_id,
        whatsapp_qr_id,
        producto,
        estado,
        monto,
        adelanto,
        GREATEST(monto - adelanto, 0) AS saldo,
        agencia,
        numero_guia,
        estado_envio,
        created_at,
        updated_at
      FROM ventas
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      ORDER BY id DESC
      LIMIT 1
      `,
      [clienteId, whatsappQrId]
    );

    return NextResponse.json({
      venta: resultado.rows[0] || null,
    });
  } catch (error) {
    console.error("Error obteniendo venta:", error);

    return NextResponse.json(
      { error: "Error obteniendo venta" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const body = await req.json();

    const clienteId = Number(body.cliente_id);
    const whatsappQrId = Number(body.whatsapp_qr_id);
    const producto = String(body.producto || "").trim();
    const monto = Number(body.monto);
    const adelanto = Number(body.adelanto);

    if (!clienteId || !whatsappQrId) {
      return NextResponse.json(
        { error: "Cliente o canal de WhatsApp no valido" },
        { status: 400 }
      );
    }

    if (!producto) {
      return NextResponse.json(
        { error: "Producto requerido" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "Monto total no valido" },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(adelanto) ||
      adelanto < 0 ||
      adelanto > monto
    ) {
      return NextResponse.json(
        { error: "Adelanto no valido" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    const clienteResultado = await client.query(
      `
      SELECT id, empresa_id
      FROM clientes
      WHERE id = $1
      FOR UPDATE
      `,
      [clienteId]
    );

    if (clienteResultado.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const empresaId = clienteResultado.rows[0].empresa_id;

    const relacionResultado = await client.query(
      `
      SELECT rel.id
      FROM clientes_whatsapp_qr rel
      JOIN integraciones_whatsapp_qr iq
        ON iq.id = rel.whatsapp_qr_id
       AND iq.empresa_id = rel.empresa_id
      WHERE rel.cliente_id = $1
        AND rel.empresa_id = $2
        AND rel.whatsapp_qr_id = $3
      LIMIT 1
      `,
      [clienteId, empresaId, whatsappQrId]
    );

    if (relacionResultado.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "El cliente no pertenece a este canal de WhatsApp" },
        { status: 400 }
      );
    }

    const ventaActualResultado = await client.query(
      `
      SELECT id, estado
      FROM ventas
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $2
      ORDER BY id DESC
      LIMIT 1
      `,
      [clienteId, whatsappQrId]
    );

    let venta;

    const ventaActual = ventaActualResultado.rows[0];

    if (ventaActual && ventaActual.estado !== "Entregado") {
      const actualizado = await client.query(
        `
        UPDATE ventas
        SET producto = $1,
            monto = $2,
            adelanto = $3,
            estado = $4,
            estado_envio = COALESCE(estado_envio, 'Pendiente'),
            updated_at = NOW()
        WHERE id = $5
        RETURNING *,
          GREATEST(monto - adelanto, 0) AS saldo
        `,
        [
          producto,
          monto,
          adelanto,
          ETAPA_PAGO,
          ventaActual.id,
        ]
      );

      venta = actualizado.rows[0];
    } else {
      const creado = await client.query(
        `
        INSERT INTO ventas (
          cliente_id,
          whatsapp_qr_id,
          producto,
          estado,
          monto,
          adelanto,
          estado_envio,
          empresa_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'Pendiente', $7)
        RETURNING *,
          GREATEST(monto - adelanto, 0) AS saldo
        `,
        [
          clienteId,
          whatsappQrId,
          producto,
          ETAPA_PAGO,
          monto,
          adelanto,
          empresaId,
        ]
      );

      venta = creado.rows[0];
    }

    await client.query(
      `
      UPDATE clientes_whatsapp_qr
      SET etapa = $2,
          cerrado_por = CASE
            WHEN cerrado_at IS NULL THEN
              CASE
                WHEN handoff_motivo = 'validar_pago' THEN 'BOT'
                WHEN handoff_motivo IN (
                  'pide_humano',
                  'bot_no_puede',
                  'intervencion_manual'
                ) THEN 'CLOSER'
                ELSE 'BOT'
              END
            ELSE cerrado_por
          END,
          cerrado_at = COALESCE(cerrado_at, NOW()),
          requiere_closer = false,
          bot_paso = 'postventa',
          bot_activo = CASE
            WHEN humano_hasta IS NOT NULL
             AND humano_hasta > NOW()
            THEN false
            ELSE true
          END,
          updated_at = NOW()
      WHERE cliente_id = $1
        AND whatsapp_qr_id = $3
      `,
      [clienteId, ETAPA_PAGO, whatsappQrId]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      venta,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error registrando venta:", error);

    return NextResponse.json(
      { error: "Error registrando venta" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}