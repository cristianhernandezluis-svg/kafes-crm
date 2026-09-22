import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grupos_distribucion (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        producto_slug TEXT,
        bot_slug TEXT,
        closer_principal_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        closer_reemplazo_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts_distribucion (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL,
        grupo_id INTEGER NOT NULL
          REFERENCES grupos_distribucion(id)
          ON DELETE CASCADE,
        post_id TEXT NOT NULL,
        nombre TEXT,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (empresa_id, post_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS closers_disponibilidad (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL
          REFERENCES usuarios(id)
          ON DELETE CASCADE,
        disponible BOOLEAN NOT NULL DEFAULT true,
        reemplazo_usuario_id INTEGER
          REFERENCES usuarios(id)
          ON DELETE SET NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (empresa_id, usuario_id)
      );
    `);

    console.log("TABLAS DISTRIBUCION CREADAS OK");
  } catch (error) {
    console.error("ERROR:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();