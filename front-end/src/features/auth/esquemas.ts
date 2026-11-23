import { z } from 'zod'
import { MENSAJES } from './mensajes'

/** Política de contraseña (RNF2): mínimo 8 caracteres, al menos una letra y un número */
const contrasenaSegura = z
  .string()
  .min(8, MENSAJES.requisitosSeguridad)
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, MENSAJES.requisitosSeguridad)
  .regex(/\d/, MENSAJES.requisitosSeguridad)

const correo = z.string().trim().min(1, MENSAJES.correoRequerido).email(MENSAJES.correoInvalido)

// HU01.1 / HU01.4 — Inicio de sesión. FA01.1.3: un campo vacío muestra el mensaje de VersionAntigua
export const esquemaLogin = z.object({
  correo: z.string().trim().min(1, MENSAJES.camposVacios).email(MENSAJES.correoInvalido),
  contrasena: z.string().min(1, MENSAJES.camposVacios),
})
export type DatosLogin = z.infer<typeof esquemaLogin>

// HU01.3 — Solicitar recuperación
export const esquemaRecuperar = z.object({ correo })
export type DatosRecuperar = z.infer<typeof esquemaRecuperar>

// HU01.3 — Establecer nueva contraseña desde el enlace del correo
export const esquemaNuevaContrasena = z
  .object({
    contrasena: contrasenaSegura,
    confirmacion: z.string().min(1, MENSAJES.noCoincide),
  })
  .refine((d) => d.contrasena === d.confirmacion, { message: MENSAJES.noCoincide, path: ['confirmacion'] })
export type DatosNuevaContrasena = z.infer<typeof esquemaNuevaContrasena>

// HU01.2 / RF03 — Cambiar contraseña con sesión iniciada
export const esquemaCambiarContrasena = z
  .object({
    actual: z.string().min(1, 'Ingrese su contraseña actual'),
    contrasena: contrasenaSegura,
    confirmacion: z.string().min(1, MENSAJES.noCoincide),
  })
  .refine((d) => d.contrasena === d.confirmacion, { message: MENSAJES.noCoincide, path: ['confirmacion'] })
  .refine((d) => d.contrasena !== d.actual, { message: MENSAJES.igualALaAnterior, path: ['contrasena'] })
export type DatosCambiarContrasena = z.infer<typeof esquemaCambiarContrasena>
