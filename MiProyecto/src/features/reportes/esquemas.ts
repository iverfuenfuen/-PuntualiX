import { z } from 'zod'

/** Periodo del reporte (restricción reportes_periodo de la BD: hasta ≥ desde) */
export const esquemaPeriodo = z
  .object({
    desde: z.string().min(1, 'Indique la fecha inicial.'),
    hasta: z.string().min(1, 'Indique la fecha final.'),
  })
  .refine((p) => !p.desde || !p.hasta || p.hasta >= p.desde, { path: ['hasta'], message: 'La fecha "Hasta" debe ser igual o posterior a "Desde".' })

export type Periodo = z.infer<typeof esquemaPeriodo>
