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
  precio_acordado: z.number().nullable(),

  respuesta: z.string(),
});