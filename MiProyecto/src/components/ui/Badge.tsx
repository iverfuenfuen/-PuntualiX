import type { ReactNode } from 'react'
import { cn } from '@/lib/utilidades'
import type { Tono } from '@/types/dominio'
import { TONO_BORDE, TONO_SOLIDO, TONO_SUAVE } from './tonos'

interface PropsBadge {
  tono?: Tono
  /** Punto de color a la izquierda (estado "en vivo") */
  punto?: boolean
  /** Borde del mismo tono, como los chips de estado del Prototipo */
  conBorde?: boolean
  icono?: ReactNode
  className?: string
  children: ReactNode
}

/** Insignia/chip de estado. El texto siempre acompaña al color (accesibilidad, RNF7). */
export function Badge({ tono = 'neutro', punto, conBorde, icono, className, children }: PropsBadge) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TONO_SUAVE[tono],
        conBorde && ['border', TONO_BORDE[tono]].join(' '),
        className,
      )}
    >
      {punto && <span className={cn('size-1.5 rounded-full', TONO_SOLIDO[tono])} aria-hidden />}
      {icono}
      {children}
    </span>
  )
}
