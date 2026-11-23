import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utilidades'
import type { Tono } from '@/types/dominio'

export interface Pestana<T extends string = string> {
  id: T
  etiqueta: string
  /** Número entre paréntesis, p. ej. "Activas (39)" */
  contador?: number
  /** Resalta la pestaña con un color (p. ej. "En riesgo" en rojo) */
  tono?: Extract<Tono, 'critico'>
}

interface PropsTabs<T extends string> {
  pestanas: Pestana<T>[]
  activa: T
  onCambiar: (id: T) => void
  etiqueta: string
  className?: string
}

/**
 * Pestañas segmentadas del Prototipo (Todas / Activas / En riesgo…).
 * Teclado: flechas izquierda/derecha, Inicio y Fin (patrón WAI-ARIA Tabs).
 */
export function Tabs<T extends string>({ pestanas, activa, onCambiar, etiqueta, className }: PropsTabs<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function alPresionarTecla(e: KeyboardEvent, indice: number) {
    const ultimo = pestanas.length - 1
    const destino =
      e.key === 'ArrowRight' ? (indice === ultimo ? 0 : indice + 1)
      : e.key === 'ArrowLeft' ? (indice === 0 ? ultimo : indice - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? ultimo
      : null
    if (destino === null) return
    e.preventDefault()
    onCambiar(pestanas[destino].id)
    refs.current[destino]?.focus()
  }

  return (
    <div role="tablist" aria-label={etiqueta} className={cn('inline-flex flex-wrap gap-1 rounded-xl bg-fondo-seccion-alterna p-1', className)}>
      {pestanas.map((p, i) => {
        const seleccionada = p.id === activa
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={seleccionada}
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambiar(p.id)}
            onKeyDown={(e) => alPresionarTecla(e, i)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm transition-colors',
              seleccionada && 'bg-fondo-tarjeta font-semibold shadow-sm',
              p.tono === 'critico'
                ? 'text-alerta-critica'
                : seleccionada
                  ? 'text-texto-principal'
                  : 'text-texto-apoyo hover:text-texto-principal',
            )}
          >
            {p.etiqueta}
            {p.contador !== undefined && ` (${p.contador})`}
          </button>
        )
      })}
    </div>
  )
}
