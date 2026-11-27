import { createContext, useContext } from 'react'
import type { UsuarioSesion } from '@/types/dominio'

/**
 * Contrato de sesión que consume toda la interfaz (Navbar, AppLayout, rutas, pantallas).
 * Lo entrega SesionSupabaseProvider (Supabase Auth + tabla perfiles).
 */
export interface ValorSesion {
  /** true mientras se verifica si hay una sesión guardada */
  cargando: boolean
  usuario: UsuarioSesion | null
  /** true si la sesión actual viene de un enlace de recuperación de contraseña */
  enRecuperacion: boolean
  notificacionesSinLeer: number
  refrescarNotificaciones: () => Promise<void>
  /** Vuelve a leer el perfil (p. ej. tras editar nombre o teléfono en "Mi perfil") */
  recargarPerfil: () => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const SesionContext = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(SesionContext)
  if (!valor) throw new Error('useSesion debe usarse dentro de SesionSupabaseProvider')
  return valor
}
