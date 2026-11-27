import { z } from 'zod'

/**
 * Validación de la selección del Registro de asistencia (RF08, HU03.3).
 * La fecha no puede ser futura ni salirse del periodo de la ficha; la BD además fija la hora real del registro (RF09).
 */
export const crearEsquemaSeleccion = (hoy: string, inicioFicha: string | null, finFicha: string | null) =>
  z
    .object({
      fichaId: z.string().min(1, 'Seleccione la ficha.'),
      competenciaId: z.string().min(1, 'Seleccione la competencia.'),
      resultadoId: z.string(),
      fecha: z.string().min(1, 'Indique la fecha de la sesión.'),
    })
    .refine((v) => !v.fecha || v.fecha <= hoy, { path: ['fecha'], message: 'No se puede registrar asistencia de una fecha futura.' })
    .refine((v) => !v.fecha || !inicioFicha || v.fecha >= inicioFicha, { path: ['fecha'], message: 'La fecha es anterior al inicio de la ficha.' })
    .refine((v) => !v.fecha || !finFicha || v.fecha <= finFicha, { path: ['fecha'], message: 'La fecha es posterior al fin de la ficha.' })

export type SeleccionAsistencia = { fichaId: string; competenciaId: string; resultadoId: string; fecha: string }

/** Máximo de la columna asistencias.observacion */
export const MAXIMO_OBSERVACION = 500
