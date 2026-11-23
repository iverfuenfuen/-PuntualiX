import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utilidades'

/** Contenedor base: fondo blanco, borde sutil y esquinas redondeadas (Prototipo + Manual). */
export function Card({ className, ...resto }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-2xl border border-borde bg-fondo-tarjeta shadow-sm', className)} {...resto} />
}

interface PropsCabecera {
  titulo: ReactNode
  descripcion?: ReactNode
  /** Botones, filtros o pestañas alineados a la derecha */
  acciones?: ReactNode
  className?: string
}

export function CardHeader({ titulo, descripcion, acciones, className }: PropsCabecera) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-borde px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold sm:text-lg">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-texto-secundario">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  )
}

export function CardBody({ className, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 sm:px-6', className)} {...resto} />
}
