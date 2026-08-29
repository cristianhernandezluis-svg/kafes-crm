import pg from "pg";
import path from "node:path";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const STORAGE_DIR =
  process.env.CATALOGO_STORAGE_DIR ||
  path.join(process.cwd(), "storage", "catalogo");

const LEGACY_EMPRESA_ID = Number(
  process.env.CATALOGO_LEGACY_EMPRESA_ID || 1
);

export const PRODUCTOS = [
  {
    slug: "sierra-bomvink-8",
    nombre: "Sierra Inalambrica BOMVINK 8 pulgadas",
    aliases: [
      "sierra",
      "sierra bomvink",
      "bomvink",
      "sierra 8",
      "sierra de 8 pulgadas",
    ],
    precio: 249,
    precioAntes: 299,
    descripcion:
      "Sierra inalambrica profesional ideal para poda, madera, trabajos de campo y uso continuo.",
    beneficios: [
      "21V de potencia",
      "Incluye 2 baterias",
      "Espada de 8 pulgadas",
      "Corte rapido y preciso",
      "Ideal para poda y madera",
      "Diseno ergonomico",
    ],
    caracteristicas: [],
    usos: [],
    incluye: [],
    garantia: null,
    stock: null,
    promociones: [],
    multimedia: {
      fotos: [
        "app/whatsapp-qr-server/media-catalogo/sierra-bomvink-8/fotos/WhatsApp Image 2026-08-25 at 11.36.55 AM.jpeg",
      ],
      videos: [
        "app/whatsapp-qr-server/media-catalogo/sierra-bomvink-8/videos/VIDEO 3.mp4",
      ],
      audios: [],
      gifs: [],
    },
    origen: "legacy",
  },
  {
    slug: "soporte-telescopico-xtd",
    nombre: "Soporte Telescopico XTD para Amoladora",
    aliases: [
      "soporte",
      "soporte telescopico",
      "xtd",
      "soporte para amoladora",
    ],
    precio: 209,
    precioAntes: 249,
    descripcion:
      "Soporte telescopico para amoladora, ideal para cortes mas precisos, seguros y profesionales.",
    beneficios: [
      "Base de hierro resistente",
      "Soportes con ajuste variable",
      "Mayor seguridad al cortar",
      "Proteccion contra chispas integrada",
      "Compatible con discos de 115 y 125 mm",
      "No incluye amoladora",
    ],
    caracteristicas: [],
    usos: [],
    incluye: [],
    garantia: null,
    stock: null,
    promociones: [],
    multimedia: { fotos: [], videos: [], audios: [], gifs: [] },
    origen: "legacy",
  },
];

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

const PALABRAS_IGNORADAS = new Set([
  "para",
  "con",
  "sin",
  "del",
  "las",
  "los",
  "una",
  "uno",
  "unos",
  "unas",
  "por",
  "desde",
  "hasta",
  "producto",
]);

function construirAliases(producto) {
  const candidatos = [
    producto.nombre,
    producto.slug,
    producto.sku,
  ];

  const palabras = normalizar(producto.nombre)
    .split(/[^a-z0-9]+/)
    .filter(
      (p) =>
        p.length >= 4 &&
        !PALABRAS_IGNORADAS.has(p) &&
        !/^\d+$/.test(p)
    );

  candidatos.push(...palabras);

  return [
    ...new Set(
      candidatos
        .map((x) => normalizar(x))
        .filter(Boolean)
    ),
  ];
}

function rutaMultimedia(url) {
  const valor = String(url || "").trim();
  if (!valor) return null;
  if (path.isAbsolute(valor)) return valor;
  return path.join(STORAGE_DIR, valor);
}

function productoDesdeFila(row) {
  const promociones = Array.isArray(row.promociones)
    ? row.promociones.map((p) => ({
        cantidad: Number(p.cantidad),
        precio: Number(p.precio),
        texto: p.texto || null,
      }))
    : [];

  const media = Array.isArray(row.multimedia)
    ? row.multimedia
    : [];

  const multimedia = {
    fotos: media
      .filter((m) => m.tipo === "foto")
      .map((m) => rutaMultimedia(m.url))
      .filter(Boolean),
    videos: media
      .filter((m) => m.tipo === "video")
      .map((m) => rutaMultimedia(m.url))
      .filter(Boolean),
    audios: media
      .filter((m) => m.tipo === "audio")
      .map((m) => rutaMultimedia(m.url))
      .filter(Boolean),
    gifs: media
      .filter((m) => m.tipo === "gif")
      .map((m) => rutaMultimedia(m.url))
      .filter(Boolean),
  };

  const producto = {
    id: row.id,
    empresaId: row.empresa_id,
    slug: row.slug,
    nombre: row.nombre,
    sku: row.sku || null,
    precio: Number(row.precio),
    precioAntes: numero(row.precio_anterior),
    descripcion: row.descripcion || null,
    caracteristicas: Array.isArray(row.caracteristicas)
      ? row.caracteristicas
      : [],
    usos: Array.isArray(row.usos) ? row.usos : [],
    incluye: Array.isArray(row.incluye) ? row.incluye : [],
    garantia: row.garantia || null,
    stock: numero(row.stock),
    promociones,
    multimedia,
    origen: "db",
  };

  producto.beneficios = [
    ...producto.caracteristicas,
    ...producto.usos,
  ];

  producto.aliases = construirAliases(producto);

  return producto;
}

async function obtenerProductosDB(empresaId) {
  const id = Number(empresaId);
  if (!id) return [];

  const result = await pool.query(
    `
    SELECT
      p.id,
      p.empresa_id,
      p.nombre,
      p.slug,
      p.sku,
      p.precio,
      p.precio_anterior,
      p.descripcion,
      p.caracteristicas,
      p.usos,
      p.incluye,
      p.garantia,
      p.stock,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'cantidad', pp.cantidad,
              'precio', pp.precio,
              'texto', pp.texto
            )
            ORDER BY pp.orden ASC, pp.cantidad ASC
          )
          FROM producto_promociones pp
          WHERE pp.producto_id = p.id
            AND pp.empresa_id = p.empresa_id
            AND pp.activo = true
        ),
        '[]'::json
      ) AS promociones,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'tipo', pm.tipo,
              'url', pm.url,
              'orden', pm.orden
            )
            ORDER BY pm.orden ASC, pm.id ASC
          )
          FROM producto_multimedia pm
          WHERE pm.producto_id = p.id
            AND pm.empresa_id = p.empresa_id
            AND pm.activo = true
        ),
        '[]'::json
      ) AS multimedia
    FROM productos p
    WHERE p.empresa_id = $1
      AND p.activo = true
      AND p.ia_activo = true
    ORDER BY p.updated_at DESC, p.id DESC
    `,
    [id]
  );

  return result.rows.map(productoDesdeFila);
}

export async function obtenerCatalogoEmpresa(empresaId) {
  const id = Number(empresaId);

  try {
    const dinamicos = id ? await obtenerProductosDB(id) : [];

    // Compatibilidad temporal: los productos antiguos de Kafes siguen
    // disponibles solo para la empresa legacy mientras se migran al panel.
    if (id === LEGACY_EMPRESA_ID || !id) {
      const slugs = new Set(dinamicos.map((p) => p.slug));
      return [
        ...dinamicos,
        ...PRODUCTOS.filter((p) => !slugs.has(p.slug)),
      ];
    }

    return dinamicos;
  } catch (error) {
    console.error(
      "ERROR CARGANDO CATALOGO IA:",
      error?.message || error
    );

    if (id === LEGACY_EMPRESA_ID || !id) {
      return PRODUCTOS;
    }

    return [];
  }
}

export async function buscarProductoPorSlug(slug, empresaId) {
  const valor = String(slug || "").trim();
  if (!valor) return null;

  const catalogo = await obtenerCatalogoEmpresa(empresaId);
  return catalogo.find((p) => p.slug === valor) || null;
}

export async function buscarProducto(texto, empresaId) {
  const t = normalizar(texto);
  if (!t) return null;

  const catalogo = await obtenerCatalogoEmpresa(empresaId);

  const coincidencias = catalogo
    .map((producto) => {
      const aliases = Array.isArray(producto.aliases)
        ? producto.aliases
        : construirAliases(producto);

      const mejor = aliases
        .filter((alias) => alias && t.includes(normalizar(alias)))
        .sort((a, b) => b.length - a.length)[0];

      return mejor
        ? { producto, largo: normalizar(mejor).length }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.largo - a.largo);

  return coincidencias[0]?.producto || null;
}

export async function obtenerMultimediaProducto(
  slug,
  tipo,
  empresaId
) {
  const producto = await buscarProductoPorSlug(slug, empresaId);
  if (!producto?.multimedia) return [];

  const mapa = {
    foto: "fotos",
    video: "videos",
    audio: "audios",
    gif: "gifs",
  };

  const clave = mapa[tipo];

  return clave && Array.isArray(producto.multimedia[clave])
    ? producto.multimedia[clave]
    : [];
}
