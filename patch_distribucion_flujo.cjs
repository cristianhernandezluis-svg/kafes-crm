const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "api", "distribucion", "route.ts");
const backup = path.join(process.cwd(), "app", "api", "distribucion", "route.ts.backup-flujo");

if (!fs.existsSync(file)) {
  console.error("No existe:", file);
  process.exit(1);
}

let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

if (s.includes("g.flujo_id") && s.includes("flujos: flujosResult.rows")) {
  console.log("La API ya parece tener soporte para flujo_id. No se aplicaron cambios.");
  process.exit(0);
}

fs.copyFileSync(file, backup);

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) {
    console.error("No encontre el bloque:", label);
    console.error("Backup:", backup);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
}

// 1) GET: agregar flujo_id y nombre del flujo al grupo.
replaceOnce(
`        g.bot_slug,
        g.closer_principal_id,`,
`        g.bot_slug,
        g.flujo_id,
        f.nombre AS flujo_nombre,
        f.slug AS flujo_slug,
        g.closer_principal_id,`,
"SELECT grupos flujo"
);

replaceOnce(
`      FROM grupos_distribucion g
      LEFT JOIN usuarios principal`,
`      FROM grupos_distribucion g
      LEFT JOIN flujos_bot f
        ON f.id = g.flujo_id
       AND f.empresa_id = g.empresa_id
      LEFT JOIN usuarios principal`,
"JOIN flujos_bot"
);

// 2) GET: traer lista de flujos disponibles.
replaceOnce(
`    const closersResult = await pool.query(
      \`
      SELECT`,
`    const flujosResult = await pool.query(
      \`
      SELECT
        id,
        nombre,
        slug,
        producto_slug,
        activo
      FROM flujos_bot
      WHERE empresa_id = $1
        AND activo = true
      ORDER BY nombre ASC
      \`,
      [empresaId]
    );

    const closersResult = await pool.query(
      \`
      SELECT`,
"query flujos"
);

replaceOnce(
`      grupos,
      closers: closersResult.rows,`,
`      grupos,
      flujos: flujosResult.rows,
      closers: closersResult.rows,`,
"retorno flujos"
);

// 3) POST: leer flujo_id.
replaceOnce(
`    const botSlug = String(
      body.bot_slug || body.producto_slug || ""
    ).trim();

    const closerPrincipalId = body.closer_principal_id`,
`    const botSlug = String(
      body.bot_slug || body.producto_slug || ""
    ).trim();

    const flujoId = body.flujo_id
      ? Number(body.flujo_id)
      : null;

    const closerPrincipalId = body.closer_principal_id`,
"leer flujo_id"
);

// 4) Validar flujo antes de guardar.
replaceOnce(
`    await client.query("BEGIN");

    let idFinal: number;`,
`    await client.query("BEGIN");

    if (flujoId) {
      const flujoResult = await client.query(
        \`
        SELECT id
        FROM flujos_bot
        WHERE id = $1
          AND empresa_id = $2
          AND activo = true
        LIMIT 1
        \`,
        [flujoId, empresaId]
      );

      if (flujoResult.rowCount === 0) {
        throw new Error(
          "El flujo seleccionado no existe o no pertenece a esta empresa"
        );
      }
    }

    let idFinal: number;`,
"validar flujo"
);

// 5) UPDATE grupo.
replaceOnce(
`          bot_slug = $5,
          closer_principal_id = $6,
          closer_reemplazo_id = $7,
          activo = $8,
          updated_at = NOW()`,
`          bot_slug = $5,
          closer_principal_id = $6,
          closer_reemplazo_id = $7,
          flujo_id = $8,
          activo = $9,
          updated_at = NOW()`,
"update flujo_id"
);

replaceOnce(
`          closerPrincipalId,
          closerReemplazoId,
          activo,
        ]`,
`          closerPrincipalId,
          closerReemplazoId,
          flujoId,
          activo,
        ]`,
"valores update flujo_id"
);

// 6) INSERT grupo.
replaceOnce(
`          bot_slug,
          closer_principal_id,
          closer_reemplazo_id,
          activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
`          bot_slug,
          closer_principal_id,
          closer_reemplazo_id,
          flujo_id,
          activo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
"insert columnas flujo_id"
);

replaceOnce(
`          botSlug || null,
          closerPrincipalId,
          closerReemplazoId,
          activo,
        ]`,
`          botSlug || null,
          closerPrincipalId,
          closerReemplazoId,
          flujoId,
          activo,
        ]`,
"valores insert flujo_id"
);

fs.writeFileSync(file, s, "utf8");

console.log("OK - app/api/distribucion/route.ts actualizado con flujo_id.");
console.log("Backup:", backup);
console.log("Siguiente paso: npm run build");
