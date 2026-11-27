import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { cerrarSesion as cerrarSesionAuth, contarNotificacionesSinLeer, obtenerPerfil } from '@/features/auth/servicioAuth'
import { enlaceInicial, supabase } from '@/lib/supabase'
import type { UsuarioSesion } from '@/types/dominio'
import { SesionContext, type ValorSesion } from './sesionContexto'

/**
 * Sesión real con Supabase Auth (HU01.1).
 * - Escucha los cambios de sesión (inicio, cierre, renovación, recuperación de contraseña).
 * - Carga el perfil (nombre y rol) desde la tabla "perfiles".
 * - Si la cuenta está inactiva, cierra la sesión (FA01.1.4, HU02.4).
 */
export function SesionSupabaseProvider({ children }: { children: ReactNode }) {
  const navegar = useNavigate()
  const [cargando, setCargando] = useState(true)
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [enRecuperacion, setEnRecuperacion] = useState(enlaceInicial.esRecuperacion)
  const [notificacionesSinLeer, setNotificacionesSinLeer] = useState(0)
  /** id del usuario ya cargado: Supabase repite SIGNED_IN al volver a la pestaña y no queremos recargar */
  const idCargado = useRef<string | null>(null)

  const refrescarNotificaciones = useCallback(async () => {
    setNotificacionesSinLeer(await contarNotificacionesSinLeer())
  }, [])

  useEffect(() => {
    let vigente = true

    async function cargarSesion(sesion: Session | null) {
      if (!sesion) {
        idCargado.current = null
        if (vigente) {
          setUsuario(null)
          setNotificacionesSinLeer(0)
          setCargando(false)
        }
        return
      }
      if (sesion.user.id === idCargado.current) return // mismo usuario: nada que recargar
      const perfil = await obtenerPerfil(sesion.user.id)
      if (!vigente) return
      if (!perfil || !perfil.activo) {
        await supabase.auth.signOut() // dispara SIGNED_OUT → usuario null
        return
      }
      idCargado.current = sesion.user.id
      setUsuario(perfil.usuario)
      setCargando(false)
      setNotificacionesSinLeer(await contarNotificacionesSinLeer())
    }

    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY') setEnRecuperacion(true)
      if (evento === 'SIGNED_OUT') setEnRecuperacion(false)
      if (evento === 'TOKEN_REFRESHED' || evento === 'USER_UPDATED') return // el perfil no cambió
      if (evento === 'SIGNED_IN' && sesion?.user.id !== idCargado.current) setCargando(true)
      // Supabase recomienda no esperar otras llamadas dentro de este callback: se difiere
      setTimeout(() => void cargarSesion(sesion), 0)
    })

    return () => {
      vigente = false
      data.subscription.unsubscribe()
    }
  }, [])

  const recargarPerfil = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return
    const perfil = await obtenerPerfil(data.user.id)
    if (perfil) setUsuario(perfil.usuario)
  }, [])

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionAuth()
    navegar('/login', { replace: true })
  }, [navegar])

  const valor = useMemo<ValorSesion>(
    () => ({ cargando, usuario, enRecuperacion, notificacionesSinLeer, refrescarNotificaciones, recargarPerfil, cerrarSesion }),
    [cargando, usuario, enRecuperacion, notificacionesSinLeer, refrescarNotificaciones, recargarPerfil, cerrarSesion],
  )

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
