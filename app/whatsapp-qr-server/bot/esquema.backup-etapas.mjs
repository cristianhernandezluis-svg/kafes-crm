import { z } from 'zod/v4';

export const AnalisisVenta=z.object({
 producto:z.string().nullable(),
 intencion:z.enum(['consulta','interes','compra','objecion','otro']),
 objecion:z.enum(['precio','competencia_precio','confianza_pago','postergacion','ninguna','otra']),
 ciudad:z.string().nullable(),
 uso:z.string().nullable(),
 nivel_interes:z.enum(['bajo','medio','alto']),
 accion:z.enum(['responder','preguntar','manejar_objecion','handoff_closer']),
 multimedia:z.enum(['ninguno','foto','video','audio']),
 respuesta:z.string()
});
