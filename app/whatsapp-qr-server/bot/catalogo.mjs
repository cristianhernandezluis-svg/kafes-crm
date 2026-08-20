export const PRODUCTOS = [
  {
    slug: 'sierra-bomvink-8',
    nombre: 'Sierra Inalambrica BOMVINK 8 pulgadas',
    aliases: ['sierra','sierra bomvink','bomvink','sierra 8','sierra de 8 pulgadas'],
    precio: 249,
    precioAntes: 299,
    descripcion: 'Sierra inalambrica profesional ideal para poda, madera, trabajos de campo y uso continuo.',
    beneficios: ['21V de potencia','Incluye 2 baterias','Espada de 8 pulgadas','Corte rapido y preciso','Ideal para poda y madera','Diseno ergonomico']
  },
  {
    slug: 'soporte-telescopico-xtd',
    nombre: 'Soporte Telescopico XTD para Amoladora',
    aliases: ['soporte','soporte telescopico','xtd','soporte para amoladora'],
    precio: 209,
    precioAntes: 249,
    descripcion: 'Soporte telescopico para amoladora, ideal para cortes mas precisos, seguros y profesionales.',
    beneficios: ['Base de hierro resistente','Soportes con ajuste variable','Mayor seguridad al cortar','Proteccion contra chispas integrada','Compatible con discos de 115 y 125 mm','No incluye amoladora']
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
