/**
 * Mensajes del módulo de autenticación (CU01).
 * Los textos vienen de VersionAntigua (main.js, InicioSesion.html, olvidoContraseña.html).
 * Ajustes de seguridad (RNF2):
 *  - FA01.1.1 y FA01.1.2 se unifican: decir "el usuario no existe" permitiría averiguar qué correos
 *    están registrados. Supabase Auth tampoco distingue ambos casos.
 *  - Recuperación: siempre se muestra el mismo mensaje exista o no el correo.
 */
export const MENSAJES = {
  camposVacios: 'Debe completar todos los campos para iniciar sesión', // FA01.1.3
  credencialesInvalidas: 'Correo o contraseña incorrectos, intente nuevamente', // FA01.1.1 + FA01.1.2
  cuentaDesactivada: 'Su cuenta se encuentra desactivada, contacte al administrador', // FA01.1.4
  correoInvalido: 'Ingrese un correo electrónico válido',
  correoRequerido: 'Ingrese su correo institucional',
  contrasenaRequerida: 'Ingrese su contraseña',
  noCoincide: 'La contraseña ingresada no coincide',
  requisitosSeguridad: 'La nueva contraseña no cumple con los requisitos mínimos de seguridad',
  enlaceExpirado: 'El enlace de recuperación ha expirado, solicite uno nuevo',
  demasiadosIntentos: 'Demasiados intentos. Espere un momento e intente de nuevo',
  sinConexion: 'No fue posible conectar con el servidor. Revise su conexión a Internet',
  contrasenaActualIncorrecta: 'La contraseña actual no es correcta',
  igualALaAnterior: 'La nueva contraseña debe ser diferente a la actual',
  errorInesperado: 'Ocurrió un error inesperado. Intente nuevamente',
} as const

/** Requisitos de contraseña (RNF2) mostrados al usuario */
export const REQUISITOS_CONTRASENA = ['Mínimo 8 caracteres', 'Al menos una letra', 'Al menos un número']

/** Traduce los errores de Supabase Auth a mensajes en español para el usuario */
export function traducirErrorAuth(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  if (!error) return MENSAJES.errorInesperado
  const texto = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  if (texto.includes('invalid login credentials') || texto.includes('invalid_credentials')) return MENSAJES.credencialesInvalidas
  if (texto.includes('rate limit') || texto.includes('over_') || error.status === 429) return MENSAJES.demasiadosIntentos
  if (texto.includes('same_password') || texto.includes('different from the old')) return MENSAJES.igualALaAnterior
  if (texto.includes('weak_password') || texto.includes('password should')) return MENSAJES.requisitosSeguridad
  if (texto.includes('expired') || texto.includes('otp_expired') || texto.includes('invalid flow state')) return MENSAJES.enlaceExpirado
  if (texto.includes('failed to fetch') || texto.includes('network') || error.status === 0) return MENSAJES.sinConexion
  return MENSAJES.errorInesperado
}
