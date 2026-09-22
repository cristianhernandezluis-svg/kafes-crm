import { z } from "zod/v4";

export const AnalisisVenta = z.object({
  producto: z.string().nullable(),

  intencion: z.enum([
    "consulta",
    "interes",
    "compra",
    "objecion",
    "otro",
  ]),

  objecion: z.enum([
    "precio",
    "competencia_precio",
    "confianza_pago",
    "postergacion",
    "ninguna",
    "otra",
  ]),

  ciudad: z.string().nullable(),
  dni: z.string().nullable(),
  nombre: z.string().nullable(),
  uso: z.string().nullable(),

  nivel_interes: z.enum([
    "bajo",
    "medio",
    "alto",
  ]),

  accion: z.enum([
    "responder",
    "preguntar",
    "manejar_objecion",
    "handoff_closer",
  ]),

  multimedia: z.enum([
    "ninguno",
    "foto",
    "video",
    "audio",
    "presentacion",
  ]),

  etapa_sugerida: z.enum([
    "mantener",
    "Nuevo",
    "Interesado",
    "Calificado",
    "Seguimiento",
    "Pago por validar",
    "Descartado",
  ]),

  motivo_etapa: z.string().nullable(),

  requiere_closer: z.boolean(),

  motivo_closer: z.enum([
    "ninguno",
    "validar_pago",
    "pide_humano",
    "bot_no_puede",
    "reclamo_postventa",
    "otro",
  ]),

  seguimiento: z.boolean(),

  seguimiento_para: z.string().nullable(),
  seguimiento_fecha: z.string().nullable(),
  precio_acordado: z.number().nullable(),

  apertura: z.string().nullable(),

  fase_venta: z.enum([
    "descubrimiento",
    "presentacion",
    "demostracion",
    "valor",
    "objecion",
    "cierre",
    "seguimiento",
    "postventa",
  ]),

  llamar_ahora: z.boolean(),
  motivo_llamada: z.string().nullable(),

  respuesta: z.string(),
});