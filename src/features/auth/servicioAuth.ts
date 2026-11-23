import { supabase } from '@/lib/supabase'
import type { Rol, UsuarioSesion } from '@/types/dominio'
import { MENSAJES, traducirErrorAuth } from './mensajes'

/** Resultado uniforme de las operaciones: ok o un mensaje listo para mostrar */
export type Resultado<T = void> = { ok: true; datos: T } | { ok: false; mensaje: string; codigo?: 'cuenta_desactivada' }

interface FilaPerfil {
  id: string
  nombres: string
  apellidos: string
  correo: string
  rol: Rol
  estado: 'activo' | 'inactivo'
  avatar_url: string | null
}

/** Lee el perfil del usuario autenticado (RLS: cada uno puede ver el suyo, incluso si está inactivo) */
export async function obtenerPerfil(idUsuario: string): Promise<{ usuario: UsuarioSesion; activo: boolean } | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, correo, rol, estado, avatar_url')
    .eq('id', idUsuario)
    .maybeSingle<FilaPerfil>()
  if (error || !data) return null
  return {
    activo: data.estado === 'activo',
    usuario: { id: data.id, nombres: data.nombres, apellidos: data.apellidos, correo: data.correo, rol: data.rol, avatarUrl: data.avatar_url },
  }
}

/** HU01.1 — Inicio de sesión con validación de cuenta activa (FA01.1.4) */
export async function iniciarSesion(correo: string, contrasena: string): Promise<Resultado<UsuarioSesion>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: contrasena })
    if (error || !data.user) return { ok: false, mensaje: traducirErrorAuth(error) }

    const perfil = await obtenerPerfil(data.user.id)
    if (!perfil || !perfil.activo) {
      await supabase.auth.signOut()
      return { ok: false, mensaje: MENSAJES.cuentaDesactivada, codigo: 'cuenta_desactivada' }
    }

    // RF19: el acceso queda en la bitácora (no bloquea el login si falla)
    void registrarEvento('autenticacion', 'acceso', 'Inicio de sesión')
    return { ok: true, datos: perfil.usuario }
  } catch (e) {
    return { ok: false, mensaje: traducirErrorAuth(e as Error) }
  }
}

export async function cerrarSesion(): Promise<void> {
  await supabase.auth.signOut()
}

/** HU01.3 — Envía el enlace de recuperación. Siempre responde igual para no revelar si el correo existe. */
export async function solicitarRecuperacion(correo: string): Promise<Resultado> {
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/restablecer`,
  })
  if (error && (error.status === 429 || /rate limit/i.test(error.message))) return { ok: false, mensaje: MENSAJES.demasiadosIntentos }
  if (error && /fetch|network/i.test(error.message)) return { ok: false, mensaje: MENSAJES.sinConexion }
  return { ok: true, datos: undefined }
}

/** HU01.3 — Guarda la nueva contraseña (requiere la sesión temporal que crea el enlace del correo) */
export async function establecerContrasena(contrasena: string): Promise<Resultado> {
  const { error } = await supabase.auth.updateUser({ password: contrasena })
  if (error) return { ok: false, mensaje: traducirErrorAuth(error) }
  return { ok: true, datos: undefined }
}

/** HU01.2 / RF03 — Cambia la contraseña verificando primero la actual */
export async function cambiarContrasena(correo: string, actual: string, nueva: string): Promise<Resultado> {
  const verificacion = await supabase.auth.signInWithPassword({ email: correo, password: actual })
  if (verificacion.error) {
    const mensaje = traducirErrorAuth(verificacion.error)
    return { ok: false, mensaje: mensaje === MENSAJES.credencialesInvalidas ? MENSAJES.contrasenaActualIncorrecta : mensaje }
  }
  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) return { ok: false, mensaje: traducirErrorAuth(error) }
  void registrarEvento('autenticacion', 'acceso', 'Cambio de contraseña')
  return { ok: true, datos: undefined }
}

/** Notificaciones sin leer del usuario (RLS: solo las propias) */
export async function contarNotificacionesSinLeer(): Promise<number> {
  const { count } = await supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('leida', false)
  return count ?? 0
}

/** Registra accesos, consultas y descargas en la bitácora (función fn_registrar_evento de la BD) */
export async function registrarEvento(
  modulo: string,
  accion: 'acceso' | 'consulta' | 'descarga',
  detalle: string,
  resultado: 'exito' | 'alerta' | 'error' = 'exito',
): Promise<void> {
  await supabase.rpc('fn_registrar_evento', { p_modulo: modulo, p_accion: accion, p_detalle: detalle, p_resultado: resultado })
}
