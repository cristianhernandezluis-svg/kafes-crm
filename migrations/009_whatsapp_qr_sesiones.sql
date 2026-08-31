CREATE TABLE IF NOT EXISTS whatsapp_qr_sesiones (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id),
  session_key TEXT NOT NULL UNIQUE,
  whatsapp_qr_id_activo INTEGER REFERENCES integraciones_whatsapp_qr(id),
  estado TEXT NOT NULL DEFAULT 'desconectado',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integraciones_whatsapp_qr_empresa_numero_unique
ON integraciones_whatsapp_qr (empresa_id, numero_whatsapp)
WHERE numero_whatsapp IS NOT NULL;

ALTER TABLE integraciones_whatsapp_qr
ALTER COLUMN session_key DROP NOT NULL;