CREATE INDEX IF NOT EXISTS conversaciones_qr_cliente_fecha_idx ON conversaciones (whatsapp_qr_id, cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversaciones_no_leidos_idx ON conversaciones (whatsapp_qr_id, cliente_id) WHERE remitente = 'cliente' AND COALESCE(leido, false) = false;
