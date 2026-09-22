import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const EMPRESA_ID = 1;
const CLOSER_ID = 4;

const POST_ID = "122100065109269499";

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existente = await client.query(
      `
      SELECT id
      FROM grupos_distribucion
      WHERE empresa_id = $1
        AND nombre = 'BROCA'
      LIMIT 1
      `,
      [EMPRESA_ID]
    );

    let grupoId;

    if (existente.rowCount > 0) {
      grupoId = existente.rows[0].id;

      await client.query(
        `
        UPDATE grupos_distribucion
        SET producto_slug = 'broca-escalonada',
            bot_slug = 'broca-escalonada',
            closer_principal_id = $2,
            activo = true,
            updated_at = NOW()
        WHERE id = $1
        `,
        [grupoId, CLOSER_ID]
      );
    } else {
      const nuevo = await client.query(
        `
        INSERT INTO grupos_distribucion (
          empresa_id,
          nombre,
          producto_slug,
          bot_slug,
          closer_principal_id,
          activo
        )
        VALUES ($1, 'BROCA', 'broca-escalonada', 'broca-escalonada', $2, true)
        RETURNING id
        `,
        [EMPRESA_ID, CLOSER_ID]
      );

      grupoId = nuevo.rows[0].id;
    }

    await client.query(
      `
      INSERT INTO posts_distribucion (
        empresa_id,
        grupo_id,
        post_id,
        nombre,
        activo
      )
      VALUES (
        $1,
        $2,
        $3,
        'Broca - Post 1',
        true
      )
      ON CONFLICT (empresa_id, post_id)
      DO UPDATE SET
        grupo_id = EXCLUDED.grupo_id,
        nombre = EXCLUDED.nombre,
        activo = true
      `,
      [EMPRESA_ID, grupoId, POST_ID]
    );

    await client.query(
      `
      INSERT INTO closers_disponibilidad (
        empresa_id,
        usuario_id,
        disponible
      )
      VALUES ($1, $2, true)
      ON CONFLICT (empresa_id, usuario_id)
      DO NOTHING
      `,
      [EMPRESA_ID, CLOSER_ID]
    );

    await client.query("COMMIT");

    console.log("GRUPO BROCA CONFIGURADO OK");
    console.log("Grupo ID:", grupoId);
    console.log("Post ID:", POST_ID);
    console.log("Closer ID:", CLOSER_ID);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("ERROR:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();