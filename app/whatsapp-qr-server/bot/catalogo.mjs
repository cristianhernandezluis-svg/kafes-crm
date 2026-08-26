export const PRODUCTOS = [
  {
    slug: 'sierra-bomvink-8',
    nombre: 'Sierra Inalambrica BOMVINK 8 pulgadas',
    aliases: ['sierra','sierra bomvink','bomvink','sierra 8','sierra de 8 pulgadas'],
    precio: 249,
    precioAntes: 299,
    descripcion: 'Sierra inalambrica profesional ideal para poda, madera, trabajos de campo y uso continuo.',
    beneficios: ['21V de potencia','Incluye 2 baterias','Espada de 8 pulgadas','Corte rapido y preciso','Ideal para poda y madera','Diseno ergonomico'],
    multimedia: { fotos: ["app/whatsapp-qr-server/media-catalogo/sierra-bomvink-8/fotos/WhatsApp Image 2026-08-25 at 11.36.55 AM.jpeg"], videos: ["app/whatsapp-qr-server/media-catalogo/sierra-bomvink-8/videos/VIDEO 3.mp4"], audios: [] }
  },
  {
    slug: 'soporte-telescopico-xtd',
    nombre: 'Soporte Telescopico XTD para Amoladora',
    aliases: ['soporte','soporte telescopico','xtd','soporte para amoladora'],
    precio: 209,
    precioAntes: 249,
    descripcion: 'Soporte telescopico para amoladora, ideal para cortes mas precisos, seguros y profesionales.',
    beneficios: ['Base de hierro resistente','Soportes con ajuste variable','Mayor seguridad al cortar','Proteccion contra chispas integrada','Compatible con discos de 115 y 125 mm','No incluye amoladora'],
    multimedia: { fotos: [], videos: [], audios: [] }
  }
];

function normalizar(t){return String(t||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();}

export function buscarProductoPorSlug(slug){
  return PRODUCTOS.find(p=>p.slug===slug) || null;
}

export function buscarProducto(texto){
  const t=normalizar(texto);
  return PRODUCTOS.find(p=>p.aliases.some(a=>t.includes(normalizar(a)))) || null;
}

export function obtenerMultimediaProducto(slug, tipo){
  const producto=buscarProductoPorSlug(slug);
  if(!producto?.multimedia)return [];
  const mapa={foto:"fotos",video:"videos",audio:"audios"};
  const clave=mapa[tipo];
  return clave && Array.isArray(producto.multimedia[clave]) ? producto.multimedia[clave] : [];
}
