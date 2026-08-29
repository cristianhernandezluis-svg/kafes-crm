CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_anterior NUMERIC(12,2),
  descripcion TEXT,
  caracteristicas JSONB NOT NULL DEFAULT '[]'::jsonb,
  usos JSONB NOT NULL DEFAULT '[]'::jsonb,
  incluye JSONB NOT NULL DEFAULT '[]'::jsonb,
  garantia TEXT,
  stock INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  ia_activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, slug),
  UNIQUE (id, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_productos_empresa_activo
  ON productos(empresa_id, activo, ia_activo);

CREATE INDEX IF NOT EXISTS idx_productos_empresa_nombre
  ON productos(empresa_id, nombre);


CREATE TABLE IF NOT EXISTS producto_promociones (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL,
  empresa_id INTEGER NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  texto TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_producto_promociones_producto_empresa
    FOREIGN KEY (producto_id, empresa_id)
    REFERENCES productos(id, empresa_id)
    ON DELETE CASCADE,
  UNIQUE (producto_id, cantidad)
);

CREATE INDEX IF NOT EXISTS idx_producto_promociones_empresa_producto
  ON producto_promociones(empresa_id, producto_id, activo, orden);


CREATE TABLE IF NOT EXISTS producto_multimedia (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL,
  empresa_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'video', 'audio', 'gif')),
  url TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_producto_multimedia_producto_empresa
    FOREIGN KEY (producto_id, empresa_id)
    REFERENCES productos(id, empresa_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_producto_multimedia_empresa_producto
  ON producto_multimedia(empresa_id, producto_id, activo, orden);
