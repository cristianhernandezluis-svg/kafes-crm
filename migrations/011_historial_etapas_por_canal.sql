ALTER TABLE historial_etapas
  ADD COLUMN IF NOT EXISTS whatsapp_qr_id INTEGER
  REFERENCES integraciones_whatsapp_qr(id);

CREATE INDEX IF NOT EXISTS historial_etapas_empresa_qr_fecha_idx
ON historial_etapas (
  empresa_id,
  whatsapp_qr_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS historial_etapas_cliente_qr_fecha_idx
ON historial_etapas (
  cliente_id,
  whatsapp_qr_id,
  created_at DESC
);

-- El historial antiguo venia del estado global de clientes.
-- Lo conservamos dentro del canal legado.
UPDATE historial_etapas h
SET whatsapp_qr_id = (
  SELECT iq.id
  FROM integraciones_whatsapp_qr iq
  WHERE iq.empresa_id = h.empresa_id
    AND iq.numero_whatsapp IS NULL
  ORDER BY iq.id ASC
  LIMIT 1
)
WHERE h.whatsapp_qr_id IS NULL;

-- El estado comercial ya no se registra desde clientes.
DROP TRIGGER IF EXISTS trigger_historial_etapa ON clientes;
DROP FUNCTION IF EXISTS registrar_historial_etapa();

CREATE OR REPLACE FUNCTION registrar_historial_etapa_canal()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial_etapas (
      empresa_id,
      cliente_id,
      whatsapp_qr_id,
      etapa_anterior,
      etapa_nueva,
      asesor,
      es_baseline
    )
    VALUES (
      NEW.empresa_id,
      NEW.cliente_id,
      NEW.whatsapp_qr_id,
      NULL,
      NEW.etapa,
      NEW.asesor,
      FALSE
    );

  ELSIF OLD.etapa IS DISTINCT FROM NEW.etapa THEN
    INSERT INTO historial_etapas (
      empresa_id,
      cliente_id,
      whatsapp_qr_id,
      etapa_anterior,
      etapa_nueva,
      asesor,
      es_baseline
    )
    VALUES (
      NEW.empresa_id,
      NEW.cliente_id,
      NEW.whatsapp_qr_id,
      OLD.etapa,
      NEW.etapa,
      NEW.asesor,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_historial_etapa_canal
ON clientes_whatsapp_qr;

CREATE TRIGGER trigger_historial_etapa_canal
AFTER INSERT OR UPDATE OF etapa ON clientes_whatsapp_qr
FOR EACH ROW
EXECUTE FUNCTION registrar_historial_etapa_canal();

-- Crea una fotografia inicial por cada canal existente
-- solamente si ese cliente/canal aun no tiene historial.
INSERT INTO historial_etapas (
  empresa_id,
  cliente_id,
  whatsapp_qr_id,
  etapa_anterior,
  etapa_nueva,
  asesor,
  es_baseline
)
SELECT
  rel.empresa_id,
  rel.cliente_id,
  rel.whatsapp_qr_id,
  NULL,
  rel.etapa,
  rel.asesor,
  TRUE
FROM clientes_whatsapp_qr rel
WHERE NOT EXISTS (
  SELECT 1
  FROM historial_etapas h
  WHERE h.empresa_id = rel.empresa_id
    AND h.cliente_id = rel.cliente_id
    AND h.whatsapp_qr_id = rel.whatsapp_qr_id
);