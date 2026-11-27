import { cn, porcentaje } from '@/lib/utilidades'
import type { Tono } from '@/types/dominio'
import { TONO_SOLIDO, tonoPorAsistencia } from './tonos'

interface PropsProgreso {
  /** Valor 0–100 */
  valor: number
  /** Si no se indica, el color se calcula con los niveles de asistencia (≥80 / 70–79 / <70) */
  tono?: Tono
  mostrarValor?: boolean
  /** Texto para lectores de pantalla, p. ej. "Asistencia promedio de la ficha" */
  etiqueta: string
  className?: string
}

export function ProgressBar({ valor, tono, mostrarValor = true, etiqueta, className }: PropsProgreso) {
  const acotado = Math.max(0, Math.min(100, valor))
  const color = tono ?? tonoPorAsistencia(acotado)
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuenow={Math.round(acotado)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-fondo-tarjeta-suave"
      >
        <div className={cn('h-full rounded-full transition-[width]', TONO_SOLIDO[color])} style={{ width: `${acotado}%` }} />
      </div>
      {mostrarValor && <span className="w-12 shrink-0 text-right text-xs font-semibold text-texto-principal">{porcentaje(valor)}</span>}
    </div>
  )
}
