import { z } from 'zod'
import { ETIQUETA_PRIORIDAD } from '@/types/dominio'

/**
 * RF17 — Umbrales de alerta. La BD exige 0 < % ≤ 100. Además, entre los umbrales activos debe cumplirse
 * baja < media < alta: la BD asigna a cada ficha el umbral más alto que alcanza, así que con el orden invertido
 * una inasistencia mayor quedaría con una prioridad menor.
 */
export const esquemaUmbrales = z
  .array(
    z.object({
      id: z.number(),
      prioridad: z.enum(['baja', 'media', 'alta']),
      porcentaje: z
        .number({ error: 'Ingrese un porcentaje.' })
        .gt(0, 'Debe ser mayor que 0 %.')
        .max(100, 'No puede superar el 100 %.')
        .transform((n) => Math.round(n * 100) / 100),
      descripcion: z.string().max(200, 'Máximo 200 caracteres.'),
      activo: z.boolean(),
    }),
  )
  .superRefine((lista, ctx) => {
    const activos = lista.map((u, indice) => ({ u, indice })).filter((x) => x.u.activo)
    if (activos.length === 0) ctx.addIssue({ code: 'custom', path: [], message: 'Debe quedar al menos un umbral activo.' })
    for (let k = 1; k < activos.length; k++) {
      const anterior = activos[k - 1].u
      if (activos[k].u.porcentaje <= anterior.porcentaje) {
        ctx.addIssue({
          code: 'custom',
          path: [activos[k].indice, 'porcentaje'],
          message: `Debe ser mayor que el de prioridad ${ETIQUETA_PRIORIDAD[anterior.prioridad].toLowerCase()} (${anterior.porcentaje} %).`,
        })
      }
    }
  })

export type FormularioUmbral = z.input<typeof esquemaUmbrales>[number]
