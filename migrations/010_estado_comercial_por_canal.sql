ALTER TABLE clientes_whatsapp_qr
  ADD COLUMN IF NOT EXISTS etapa TEXT NOT NULL DEFAULT 'Nuevo',
  ADD COLUMN IF NOT EXISTS asesor TEXT,
  ADD COLUMN IF NOT EXISTS observacion TEXT,
  ADD COLUMN IF NOT EXISTS proximo_seguimiento TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ultima_gestion TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cantidad_seguimientos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temperatura TEXT NOT NULL DEFAULT 'frio',
  ADD COLUMN IF NOT EXISTS bot_activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requiere_closer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_senales JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bot_producto TEXT,
  ADD COLUMN IF NOT EXISTS bot_paso TEXT,
  ADD COLUMN IF NOT EXISTS bot_contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS handoff_motivo TEXT NOT NULL DEFAULT 'ninguno',
  ADD COLUMN IF NOT EXISTS cerrado_por TEXT,
  ADD COLUMN IF NOT EXISTS cerrado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS humano_hasta TIMESTAMPTZ;

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS whatsapp_qr_id INTEGER REFERENCES integraciones_whatsapp_qr(id);

CREATE INDEX IF NOT EXISTS ventas_cliente_whatsapp_qr_idx
ON ventas (cliente_id, whatsapp_qr_id);

-- Conserva el estado comercial existente dentro del canal legado.
UPDATE clientes_whatsapp_qr rel
SET etapa = COALESCE(c.etapa, 'Nuevo'),
    asesor = c.asesor,
    observacion = c.observacion,
    proximo_seguimiento = c.proximo_seguimiento,
    ultima_gestion = c.ultima_gestion,
    cantidad_seguimientos = COALESCE(c.cantidad_seguimientos, 0),
    score = COALESCE(c.score, 0),
    temperatura = COALESCE(c.temperatura, 'frio'),
    bot_activo = COALESCE(c.bot_activo, true),
    requiere_closer = COALESCE(c.requiere_closer, false),
    bot_senales = COALESCE(c.bot_senales, '[]'::jsonb),
    bot_producto = c.bot_producto,
    bot_paso = c.bot_paso,
    bot_contexto = COALESCE(c.bot_contexto, '{}'::jsonb),
    handoff_motivo = COALESCE(c.handoff_motivo, 'ninguno'),
    cerrado_por = c.cerrado_por,
    cerrado_at = c.cerrado_at,
    humano_hasta = c.humano_hasta,
    updated_at = NOW()
FROM clientes c, integraciones_whatsapp_qr iq
WHERE rel.cliente_id = c.id
  AND rel.empresa_id = c.empresa_id
  AND iq.id = rel.whatsapp_qr_id
  AND iq.numero_whatsapp IS NULL;

-- Asigna las ventas históricas al canal legado de su empresa.
UPDATE ventas v
SET whatsapp_qr_id = (
  SELECT iq.id
  FROM integraciones_whatsapp_qr iq
  WHERE iq.empresa_id = v.empresa_id
    AND iq.numero_whatsapp IS NULL
  ORDER BY iq.id ASC
  LIMIT 1
)
WHERE v.whatsapp_qr_id IS NULL;
