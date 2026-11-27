import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { clasesBoton, type TamanoBoton, type VarianteBoton } from './estilosBoton'

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  icono?: ReactNode
  /** Muestra un indicador de carga y deshabilita el botón */
  cargando?: boolean
}

export function Button({
  variante = 'primario',
  tamano = 'md',
  icono,
  cargando = false,
  disabled,
  className,
  children,
  type = 'button',
  ...resto
}: PropsBoton) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clasesBoton(variante, tamano, className)}
      {...resto}
    >
      {cargando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icono}
      {children}
    </button>
  )
}
