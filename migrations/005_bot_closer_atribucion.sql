ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS handoff_motivo TEXT DEFAULT 'ninguno',
  ADD COLUMN IF NOT EXISTS cerrado_por TEXT,
  ADD COLUMN IF NOT EXISTS cerrado_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clientes_cerrado_at
  ON clientes (cerrado_at);

CREATE INDEX IF NOT EXISTS idx_clientes_cerrado_por
  ON clientes (cerrado_por);