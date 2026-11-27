import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utilidades'

/** Indicador de carga con texto accesible. */
export function Spinner({ texto = 'Cargando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-8 text-sm text-texto-secundario', className)}>
      <LoaderCircle className="size-5 animate-spin text-primario" aria-hidden />
      <span>{texto}</span>
    </div>
  )
}
