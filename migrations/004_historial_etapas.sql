CREATE TABLE IF NOT EXISTS historial_etapas (
  id BIGSERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL,
  cliente_id INTEGER NOT NULL,
  etapa_anterior TEXT,
  etapa_nueva TEXT NOT NULL,
  asesor TEXT,
  es_baseline BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS historial_etapas_empresa_fecha_idx
ON historial_etapas (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS historial_etapas_cliente_fecha_idx
ON historial_etapas (cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS historial_etapas_etapa_fecha_idx
ON historial_etapas (empresa_id, etapa_nueva, created_at DESC);

CREATE OR REPLACE FUNCTION registrar_historial_etapa()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial_etapas (
      empresa_id,
      cliente_id,
      etapa_anterior,
      etapa_nueva,
      asesor,
      es_baseline
    )
    VALUES (
      NEW.empresa_id,
      NEW.id,
      NULL,
      NEW.etapa,
      NEW.asesor,
      FALSE
    );

  ELSIF OLD.etapa IS DISTINCT FROM NEW.etapa THEN
    INSERT INTO historial_etapas (
      empresa_id,
      cliente_id,
      etapa_anterior,
      etapa_nueva,
      asesor,
      es_baseline
    )
    VALUES (
      NEW.empresa_id,
      NEW.id,
      OLD.etapa,
      NEW.etapa,
      NEW.asesor,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_historial_etapa ON clientes;

CREATE TRIGGER trigger_historial_etapa
AFTER INSERT OR UPDATE OF etapa ON clientes
FOR EACH ROW
EXECUTE FUNCTION registrar_historial_etapa();

INSERT INTO historial_etapas (
  empresa_id,
  cliente_id,
  etapa_anterior,
  etapa_nueva,
  asesor,
  es_baseline
)
SELECT
  c.empresa_id,
  c.id,
  NULL,
  c.etapa,
  c.asesor,
  TRUE
FROM clientes c
WHERE NOT EXISTS (
  SELECT 1
  FROM historial_etapas h
  WHERE h.cliente_id = c.id
);
