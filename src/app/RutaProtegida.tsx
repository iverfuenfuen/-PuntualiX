import { Navigate, Outlet, useLocation } from 'react-router'
import { Spinner } from '@/components/ui'
import { RUTA_INICIO_ROL, type Rol } from '@/types/dominio'
import { useSesion } from './sesionContexto'

/**
 * Control de acceso por rol en la interfaz (HU01.1: "acceder únicamente a las funcionalidades autorizadas").
 * La protección real de los datos la hace RLS en la base; esto evita mostrar pantallas no permitidas.
 * - Sin sesión → al login, recordando a dónde quería ir.
 * - Rol no autorizado → a la pantalla de inicio de su propio rol.
 */
export function RutaProtegida({ roles }: { roles?: Rol[] }) {
  const { cargando, usuario, enRecuperacion } = useSesion()
  const ubicacion = useLocation()

  if (cargando) return <PantallaCargando />
  if (enRecuperacion) return <Navigate to="/restablecer" replace />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={RUTA_INICIO_ROL[usuario.rol]} replace />
  return <Outlet />
}

/** "/" → inicio del rol si hay sesión, o login si no la hay */
export function RedireccionInicio() {
  const { cargando, usuario } = useSesion()
  if (cargando) return <PantallaCargando />
  return <Navigate to={usuario ? RUTA_INICIO_ROL[usuario.rol] : '/login'} replace />
}

export function PantallaCargando() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner texto="Verificando sesión…" />
    </div>
  )
}
