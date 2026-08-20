import { buscarProducto, buscarProductoPorSlug } from './catalogo.mjs';

function normalizar(texto){return String(texto||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}

export function decidirRespuestaBot({texto,calificacion,memoria={}}){
  const t=normalizar(texto);
  if(!t)return null;
  if(calificacion?.requiereCloser)return null;

  const producto=buscarProducto(texto) || buscarProductoPorSlug(memoria.producto);
  const contexto={...(memoria.contexto||{})};
  const paso=memoria.paso||null;

  if(producto && paso==='uso' && /\b(chacra|campo|agricola|casa|hogar|jardin)\b/.test(t)){contexto.uso=/\b(chacra|campo|agricola)\b/.test(t)?'chacra':'casa';return {tipo:'uso',producto:producto.slug,mensaje:'Perfecto 👍 ¿De que ciudad me escribes?',memoria:{producto:producto.slug,paso:'ciudad',contexto}};}

  if(producto && paso==='ciudad' && t.length<=50){contexto.ciudad=texto.trim();return {tipo:'ciudad',producto:producto.slug,mensaje:'Perfecto 👍 ¿Deseas continuar con tu pedido?',memoria:{producto:producto.slug,paso:'confirmacion',contexto}};}

  if(producto && paso==='confirmacion' && /^(si|sí|dale|ok|okay|claro|confirmo)$/i.test(texto.trim())){return {tipo:'confirmacion_compra',producto:producto.slug,handoff:true,mensaje:null,memoria:{producto:producto.slug,paso:'closer',contexto}};}

  if(producto){
    if(/\b(precio|cuanto|costo|vale)\b/.test(t)){
      return {tipo:'precio_producto',producto:producto.slug,mensaje:`${producto.nombre} está a S/${producto.precio}. Precio anterior S/${producto.precioAntes}. ${producto.beneficios[0]} y ${producto.beneficios[1]}. ¿Lo deseas para casa o para chacra?`,memoria:{producto:producto.slug,paso:'uso',contexto}};
    }

    if(/\b(envio|envios|delivery|entrega|agencia|shalom|olva)\b/.test(t)){
      return {tipo:'envio_producto',producto:producto.slug,mensaje:`Sí, te ayudo con el envío de la ${producto.nombre}. ¿A qué ciudad o distrito sería?`};
    }

    if(/\b(yape|plin|transferencia|deposito|pagar|pago)\b/.test(t)){
      return {tipo:'pago_producto',producto:producto.slug,mensaje:`Perfecto 👍 Ya tenemos identificado el producto: ${producto.nombre}. ¿De qué ciudad me escribes para continuar con el pedido?`};
    }

    if(/\b(quiero|compro|comprar|separar|reservar|pedido)\b/.test(t)){
      return {tipo:'intencion_producto',producto:producto.slug,mensaje:`Perfecto 👍 La ${producto.nombre} está a S/${producto.precio}. ¿De qué ciudad me escribes para continuar con tu pedido?`};
    }

    return {tipo:'producto',producto:producto.slug,mensaje:`Sí, tenemos la ${producto.nombre} a S/${producto.precio}. ${producto.descripcion} ¿Qué información deseas saber?`};
  }

  if(/\b(hola|buenas|buenos dias|buenas tardes|buenas noches)\b/.test(t)){
    return {tipo:'inicio',mensaje:'Hola 👋 Claro, te ayudo. ¿Qué producto te interesa?'};
  }

  if(/\b(precio|cuanto|costo|vale)\b/.test(t)){
    return {tipo:'precio',mensaje:'Claro 👌 Para darte el precio exacto, ¿qué producto te interesa?'};
  }

  if(/\b(envio|envios|delivery|entrega|agencia|shalom|olva)\b/.test(t)){
    return {tipo:'ubicacion',mensaje:'Claro, te ayudo con el envío. ¿Qué producto deseas y a qué ciudad sería?'};
  }

  if(/\b(yape|plin|transferencia|deposito|pagar|pago)\b/.test(t)){
    return {tipo:'pago',mensaje:'Claro. Primero confirmemos tu pedido para indicarte el medio de pago correcto. ¿Qué producto deseas?'};
  }

  if(/\b(quiero|compro|comprar|separar|reservar|pedido)\b/.test(t)){
    return {tipo:'intencion_compra',mensaje:'Perfecto 👍 ¿Qué producto deseas y de qué ciudad me escribes?'};
  }

  return {tipo:'general',mensaje:'Claro, te ayudo. ¿Qué producto te interesa o qué información deseas saber?'};
}
