
CREATE TABLE IF NOT EXISTS whatsapp_intentos_meta (
  id UUID PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  empresa_id INTEGER NOT NULL REFERENCES empresas(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
    DEFAULT (NOW() + INTERVAL '10 minutes'),
  usado_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_intentos_expiracion
ON whatsapp_intentos_meta (expires_at);
