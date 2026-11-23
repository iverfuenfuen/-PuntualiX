import { z } from 'zod'

/** Validaciones de Gestión de usuarios. La Edge Function y la BD repiten las reglas críticas. */

const nombre = z.string().trim().min(2, 'Ingrese al menos 2 caracteres').max(100, 'Máximo 100 caracteres')
const telefono = z
  .string()
  .trim()
  .max(20, 'Máximo 20 caracteres')
  .refine((v) => v === '' || /^\+?[0-9\s]{7,20}$/.test(v), 'Ingrese solo números (7 a 20 dígitos), puede iniciar con +')

/** HU02.1 / HU02.2 — Registro con invitación por correo */
export const esquemaRegistroUsuario = z
  .object({
    rol: z.string().min(1, 'Seleccione el rol del usuario'),
    nombres: nombre,
    apellidos: nombre,
    tipoDocumento: z.string().min(1, 'Seleccione el tipo de documento'),
    numeroDocumento: z.string().trim().min(1, 'Ingrese el número de documento').regex(/^\d{5,20}$/, 'Ingrese solo números (5 a 20 dígitos)'),
    correo: z.string().trim().min(1, 'Ingrese el correo electrónico').email('Ingrese un correo electrónico válido').max(150, 'Máximo 150 caracteres'),
    telefono,
    sedeId: z.string(),
    areaId: z.string(),
    especialidad: z.string().trim().max(150, 'Máximo 150 caracteres'),
    fechaIngreso: z.string(),
  })
  .refine((d) => d.rol !== 'instructor' || d.areaId !== '', { path: ['areaId'], message: 'Seleccione el área del instructor' })
  .refine((d) => !d.fechaIngreso || d.fechaIngreso <= new Date().toISOString().slice(0, 10), {
    path: ['fechaIngreso'],
    message: 'La fecha de ingreso no puede ser posterior a hoy',
  })

export type FormularioRegistroUsuario = z.infer<typeof esquemaRegistroUsuario>

/** Edición de datos por el administrador (correo y documento identifican la cuenta: no se editan aquí) */
export const esquemaEdicionUsuario = z.object({
  nombres: nombre,
  apellidos: nombre,
  telefono,
  sedeId: z.string(),
})

export type FormularioEdicionUsuario = z.infer<typeof esquemaEdicionUsuario>
