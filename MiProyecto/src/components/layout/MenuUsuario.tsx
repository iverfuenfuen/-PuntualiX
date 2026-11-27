import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, LogOut } from 'lucide-react'
import { MENU_USUARIO } from '@/config/navegacion'
import { cn, iniciales } from '@/lib/utilidades'
import { ETIQUETA_ROL, type UsuarioSesion } from '@/types/dominio'

interface PropsMenuUsuario {
  usuario: UsuarioSesion
  onCerrarSesion: () => void
}

/** Cápsula blanca del usuario (Prototipo) con menú desplegable por rol (VersionAntigua). */
export function MenuUsuario({ usuario, onCerrarSesion }: PropsMenuUsuario) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const idMenu = useId()
  const nombre = `${usuario.nombres} ${usuario.apellidos}`.trim()

  // Cierra al hacer clic fuera o al presionar Esc (devuelve el foco al botón)
  useEffect(() => {
    if (!abierto) return
    const alClic = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false)
        boton.current?.focus()
      }
    }
    document.addEventListener('mousedown', alClic)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClic)
      document.removeEventListener('keydown', alTecla)
    }
  }, [abierto])

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-3 pl-1.5 text-texto-principal shadow-sm transition-colors hover:bg-fondo-seccion-alterna"
      >
        <Avatar usuario={usuario} />
        <span className="hidden flex-col text-left leading-tight sm:flex">
          <span className="font-titulos text-xs font-semibold">{nombre}</span>
          <span className="text-[11px] text-texto-secundario">{ETIQUETA_ROL[usuario.rol]}</span>
        </span>
        <ChevronDown className={cn('size-3.5 text-texto-secundario transition-transform', abierto && 'rotate-180')} aria-hidden />
      </button>

      {abierto && (
        <div
          id={idMenu}
          role="menu"
          aria-label="Menú de usuario"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-borde bg-fondo-tarjeta py-1 text-texto-cuerpo shadow-lg"
        >
          <div className="border-b border-borde px-4 py-3">
            <p className="font-titulos text-sm font-semibold text-texto-principal">{nombre}</p>
            <p className="truncate text-xs text-texto-secundario">{usuario.correo}</p>
          </div>
          {MENU_USUARIO[usuario.rol].map(({ etiqueta, ruta, icono: Icono }) => (
            <Link
              key={ruta}
              to={ruta}
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-fondo-seccion-alterna"
            >
              <Icono className="size-4 text-texto-secundario" aria-hidden />
              {etiqueta}
            </Link>
          ))}
          <div className="my-1 border-t border-borde" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false)
              onCerrarSesion()
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-alerta-critica hover:bg-alerta-critica/5"
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export function Avatar({ usuario, tamano = 'sm' }: { usuario: UsuarioSesion; tamano?: 'sm' | 'lg' }) {
  const dimension = tamano === 'lg' ? 'size-20 text-2xl' : 'size-7 text-xs'
  return usuario.avatarUrl ? (
    <img src={usuario.avatarUrl} alt="" className={cn('rounded-full object-cover', dimension)} />
  ) : (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-primario/10 font-titulos font-bold text-primario', dimension)} aria-hidden>
      {iniciales(usuario.nombres, usuario.apellidos)}
    </span>
  )
}
