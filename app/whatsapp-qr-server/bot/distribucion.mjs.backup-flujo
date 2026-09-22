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

      COALESCE(
        cd_principal.disponible,
        true
      ) AS closer_principal_disponible,

      COALESCE(
        cd_principal.reemplazo_usuario_id,
        g.closer_reemplazo_id
      ) AS closer_reemplazo_id,

      reemplazo.nombre AS closer_reemplazo_nombre,

      COALESCE(
        cd_reemplazo.disponible,
        true
      ) AS closer_reemplazo_disponible

    FROM posts_distribucion p

    JOIN grupos_distribucion g
      ON g.id = p.grupo_id
     AND g.empresa_id = p.empresa_id

    LEFT JOIN usuarios principal
      ON principal.id = g.closer_principal_id
     AND principal.empresa_id = g.empresa_id
     AND principal.rol = 'asesor'

    LEFT JOIN closers_disponibilidad cd_principal
      ON cd_principal.empresa_id = g.empresa_id
     AND cd_principal.usuario_id = g.closer_principal_id

    LEFT JOIN usuarios reemplazo
      ON reemplazo.id = COALESCE(
        cd_principal.reemplazo_usuario_id,
        g.closer_reemplazo_id
      )
     AND reemplazo.empresa_id = g.empresa_id
     AND reemplazo.rol = 'asesor'

    LEFT JOIN closers_disponibilidad cd_reemplazo
      ON cd_reemplazo.empresa_id = g.empresa_id
     AND cd_reemplazo.usuario_id = COALESCE(
       cd_principal.reemplazo_usuario_id,
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
    Boolean(fila.closer_principal_id) &&
    fila.closer_principal_disponible !== false;

  const reemplazoDisponible =
    Boolean(fila.closer_reemplazo_id) &&
    fila.closer_reemplazo_disponible !== false;

  let closerId = null;
  let closerNombre = null;
  let usandoReemplazo = false;

  if (principalDisponible) {
    closerId = fila.closer_principal_id;
    closerNombre = fila.closer_principal_nombre;
  } else if (reemplazoDisponible) {
    closerId = fila.closer_reemplazo_id;
    closerNombre = fila.closer_reemplazo_nombre;
    usandoReemplazo = true;
  }

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

    closerReemplazoId:
      fila.closer_reemplazo_id || null,

    closerReemplazoNombre:
      fila.closer_reemplazo_nombre || null,

    reemplazoDisponible,

    closerId: closerId || null,
    closerNombre: closerNombre || null,

    usandoReemplazo,
  };
}