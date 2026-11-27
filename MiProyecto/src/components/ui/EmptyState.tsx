import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utilidades'

interface PropsVacio {
  titulo: string
  descripcion?: string
  icono?: LucideIcon
  accion?: ReactNode
  compacto?: boolean
}

/** Estado vacío: tablas sin resultados, listas sin datos, módulos sin registros. */
export function EmptyState({ titulo, descripcion, icono: Icono = Inbox, accion, compacto }: PropsVacio) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compacto ? 'py-6' : 'py-12')}>
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-fondo-tarjeta-suave text-texto-secundario" aria-hidden>
        <Icono className="size-6" />
      </span>
      <p className="font-titulos font-semibold text-texto-principal">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-sm text-sm text-texto-secundario">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}
