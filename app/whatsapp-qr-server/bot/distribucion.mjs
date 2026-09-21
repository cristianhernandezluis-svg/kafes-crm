export async function resolverDistribucionPorPostId(
  pool,
  {
    empresaId,
    postId,
  }
) {
  const postIdLimpio = String(postId || "").trim();

  if (!empresaId || !postIdLimpio) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT
      p.post_id,
      p.nombre AS post_nombre,

      g.id AS grupo_id,
      g.nombre AS grupo_nombre,
      g.producto_slug,
      g.bot_slug,

      g.closer_principal_id,
      principal.nombre AS closer_principal_nombre,

      COALESCE(cd.disponible, true) AS closer_principal_disponible,

      COALESCE(
        cd.reemplazo_usuario_id,
        g.closer_reemplazo_id
      ) AS closer_reemplazo_id,

      reemplazo.nombre AS closer_reemplazo_nombre

    FROM posts_distribucion p

    JOIN grupos_distribucion g
      ON g.id = p.grupo_id
     AND g.empresa_id = p.empresa_id

    LEFT JOIN usuarios principal
      ON principal.id = g.closer_principal_id

    LEFT JOIN closers_disponibilidad cd
      ON cd.empresa_id = g.empresa_id
     AND cd.usuario_id = g.closer_principal_id

    LEFT JOIN usuarios reemplazo
      ON reemplazo.id = COALESCE(
        cd.reemplazo_usuario_id,
        g.closer_reemplazo_id
      )

    WHERE p.empresa_id = $1
      AND p.post_id = $2
      AND p.activo = true
      AND g.activo = true

    LIMIT 1
    `,
    [empresaId, postIdLimpio]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const fila = result.rows[0];

  const principalDisponible =
    fila.closer_principal_disponible !== false;

  const closerId = principalDisponible
    ? fila.closer_principal_id
    : fila.closer_reemplazo_id;

  const closerNombre = principalDisponible
    ? fila.closer_principal_nombre
    : fila.closer_reemplazo_nombre;

  return {
    postId: fila.post_id,
    postNombre: fila.post_nombre,

    grupoId: fila.grupo_id,
    grupoNombre: fila.grupo_nombre,

    productoSlug: fila.producto_slug,
    botSlug: fila.bot_slug,

    closerPrincipalId: fila.closer_principal_id,
    closerPrincipalNombre:
      fila.closer_principal_nombre,

    principalDisponible,

    closerId: closerId || null,
    closerNombre: closerNombre || null,

    usandoReemplazo:
      !principalDisponible && Boolean(closerId),
  };
}