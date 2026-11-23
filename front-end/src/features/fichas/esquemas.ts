import { z } from 'zod'

/**
 * Validaciones de los formularios del módulo Fichas.
 * Los <select> entregan texto: los esquemas trabajan con strings y el servicio convierte los ids.
 * La BD repite las reglas críticas (número único, formato, fechas), así que nada se salta la validación.
 */

const fechasCoherentes = (d: { fechaInicio: string; fechaFin: string }) => !d.fechaInicio || !d.fechaFin || d.fechaFin > d.fechaInicio
const errorFechas = { path: ['fechaFin'], message: 'La fecha de finalización debe ser posterior a la fecha de inicio' }

const camposFicha = {
  sedeId: z.string().min(1, 'Seleccione la sede de formación'),
  ambienteId: z.string(),
  programaId: z.string().min(1, 'Seleccione el programa de formación'),
  modalidad: z.string().min(1, 'Seleccione la modalidad'),
  jornada: z.string().min(1, 'Seleccione la jornada'),
  fechaInicio: z.string().min(1, 'Seleccione la fecha de inicio'),
  fechaFin: z.string().min(1, 'Seleccione la fecha de finalización'),
  estado: z.string().min(1, 'Seleccione el estado de la ficha'),
  instructorLiderId: z.string(),
}

/** HU10.1 — Registro: el número de ficha SENA tiene de 6 a 8 dígitos (Prototipo) */
export const esquemaRegistrarFicha = z
  .object({
    numero: z
      .string()
      .trim()
      .min(1, 'Ingrese el número de ficha')
      .regex(/^\d+$/, 'El número de ficha solo puede contener dígitos')
      .regex(/^\d{6,8}$/, 'El número de ficha debe tener entre 6 y 8 dígitos'),
    ...camposFicha,
  })
  .refine(fechasCoherentes, errorFechas)

/** HU10.2 — Actualización: el número queda bloqueado (no se valida porque no se envía) */
export const esquemaActualizarFicha = z.object({ numero: z.string(), ...camposFicha }).refine(fechasCoherentes, errorFechas)

export type FormularioFicha = z.infer<typeof esquemaRegistrarFicha>

/** HU10.4 — Asignar instructor */
export const esquemaAsignacion = z
  .object({
    instructorId: z.string().min(1, 'Seleccione el instructor que desea asignar'),
    competenciaIds: z.array(z.string()),
    esLider: z.boolean(),
    fechaInicio: z.string(),
    fechaFin: z.string(),
  })
  .refine((d) => !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    path: ['fechaFin'],
    message: 'La fecha de fin debe ser igual o posterior a la de inicio',
  })

export type FormularioAsignacion = z.infer<typeof esquemaAsignacion>

/** HU02.2 — Búsqueda del aprendiz por documento */
export const esquemaBusquedaAprendiz = z.object({
  tipoDocumento: z.string().min(1, 'Seleccione el tipo de documento'),
  numeroDocumento: z
    .string()
    .trim()
    .min(1, 'Ingrese el número de documento')
    .regex(/^\d{5,20}$/, 'Ingrese solo números (5 a 20 dígitos)'),
})

export type FormularioBusquedaAprendiz = z.infer<typeof esquemaBusquedaAprendiz>
