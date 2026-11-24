import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import logoNegativo from '@/assets/img/LogoNegativo/negativo_sin_eslogan_transparente.png'
import { MENU_USUARIO, NAVEGACION, RUTA_ALERTAS } from '@/config/navegacion'
import { cn } from '@/lib/utilidades'
import { RUTA_INICIO_ROL, type UsuarioSesion } from '@/types/dominio'
import { MenuUsuario } from './MenuUsuario'

interface PropsNavbar {
  usuario: UsuarioSesion
  /** Notificaciones sin leer (insignia roja de la campana) */
  notificacionesSinLeer?: number
  onCerrarSesion: () => void
}

/**
 * Barra de navegación institucional.
 * - Verde institucional #384E38 (Prototipo) · estructura y estilo del Prototipo.
 * - Los enlaces dependen del rol (config/navegacion.ts), como los data-roles de VersionAntigua.
 * - En pantallas < 1280 px el menú se pliega en un panel desplegable (RNF6 responsivo).
 */
export function Navbar({ usuario, notificacionesSinLeer = 0, onCerrarSesion }: PropsNavbar) {
  const [menuMovil, setMenuMovil] = useState(false)
  const enlaces = NAVEGACION[usuario.rol]
  const cerrarMenuMovil = () => setMenuMovil(false)

  const etiquetaCampana =
    notificacionesSinLeer > 0 ? `Notificaciones: ${notificacionesSinLeer} sin leer` : 'Notificaciones: no hay nuevas'

  return (
    <header className="sticky top-0 z-40 bg-primario text-white shadow-md">
      <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to={RUTA_INICIO_ROL[usuario.rol]} className="shrink-0" aria-label="PuntualiX — ir al inicio">
            {/* Ancho mínimo del logotipo: 120 px (Manual de Identidad, sección 5) */}
            <img src={logoNegativo} alt="PuntualiX" className="h-auto w-[120px]" />
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-1 xl:flex">
            {enlaces.map(({ etiqueta, ruta, icono: Icono, exacto }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={exacto}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-titulos text-xs transition-colors',
                    isActive ? 'bg-white/20 font-semibold text-white shadow-sm' : 'font-medium text-white/85 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icono className="size-4" aria-hidden />
                {etiqueta}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to={RUTA_ALERTAS[usuario.rol]}
            aria-label={etiquetaCampana}
            className="relative rounded-lg p-1.5 text-white transition-colors hover:bg-white/10"
          >
            <Bell className="size-5" aria-hidden />
            {notificacionesSinLeer > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-alerta-critica px-1 text-[10px] leading-4 font-bold ring-2 ring-primario">
                {notificacionesSinLeer > 9 ? '9+' : notificacionesSinLeer}
              </span>
            )}
          </Link>

          <span className="hidden h-6 w-px bg-white/25 sm:block" aria-hidden />

          <MenuUsuario usuario={usuario} onCerrarSesion={onCerrarSesion} />

          <button
            type="button"
            onClick={() => setMenuMovil((v) => !v)}
            aria-expanded={menuMovil}
            aria-controls="menu-movil"
            aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
            className="rounded-lg p-1.5 hover:bg-white/10 xl:hidden"
          >
            {menuMovil ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </div>

      {menuMovil && (
        <nav id="menu-movil" aria-label="Navegación principal" className="border-t border-white/15 bg-primario px-4 pb-4 xl:hidden">
          <ul className="space-y-1 pt-3">
            {[...enlaces, ...MENU_USUARIO[usuario.rol]].map(({ etiqueta, ruta, icono: Icono, exacto }) => (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  end={exacto}
                  onClick={cerrarMenuMovil}
                  className={({ isActive }) =>
                    cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm', isActive ? 'bg-white/20 font-semibold' : 'text-white/90 hover:bg-white/10')
                  }
                >
                  <Icono className="size-4" aria-hidden />
                  {etiqueta}
                </NavLink>
              </li>
            ))}
            <li className="border-t border-white/15 pt-1">
              <button type="button" onClick={onCerrarSesion} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-white/10">
                <LogOut className="size-4" aria-hidden />
                Cerrar sesión
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
