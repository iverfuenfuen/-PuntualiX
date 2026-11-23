import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PropsEncabezado {
  titulo: string
  descripcion?: string
  icono: LucideIcon
  /** Insignia con punto animado junto al título, p. ej. "54 fichas totales" */
  insignia?: string
  /** Selectores o botones a la derecha (usar Button variante "sobreOscuro") */
  acciones?: ReactNode
}

/** Banner verde de contexto que encabeza cada pantalla (estilo canónico del Prototipo). */
export function PageHeader({ titulo, descripcion, icono: Icono, insignia, acciones }: PropsEncabezado) {
  return (
    <section className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-primario-oscuro p-6 text-white shadow-sm sm:p-7 md:flex-row md:items-center md:justify-between">
      <div className="pointer-events-none absolute -top-12 -right-12 size-64 rounded-full bg-white/5 blur-2xl" aria-hidden />

      <div className="relative flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-[#cbe3c6]" aria-hidden>
          <Icono className="size-6" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-white sm:text-2xl">{titulo}</h1>
            {insignia && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">
                <span className="size-1.5 animate-pulse rounded-full bg-[#9fd49a]" aria-hidden />
                {insignia}
              </span>
            )}
          </div>
          {descripcion && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/85">{descripcion}</p>}
        </div>
      </div>

      {acciones && <div className="relative flex flex-wrap items-center gap-3">{acciones}</div>}
    </section>
  )
}
