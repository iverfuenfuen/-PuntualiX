import { cn } from '@/lib/utilidades'

interface PropsPaginacion {
  pagina: number
  totalRegistros: number
  porPagina: number
  onCambiar: (pagina: number) => void
  /** Nombre de los registros: "fichas formativas registradas" */
  nombreRegistros?: string
}

/** Lista de páginas a mostrar con "…" en los saltos: 1 2 3 … 7 */
function paginasVisibles(actual: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, actual - 1, actual, actual + 1].filter((p) => p >= 1 && p <= total))
  const ordenadas = [...set].sort((a, b) => a - b)
  return ordenadas.flatMap((p, i) => (i > 0 && p - ordenadas[i - 1] > 1 ? (['…', p] as const) : [p]))
}

const base = 'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition-colors'

export function Pagination({ pagina, totalRegistros, porPagina, onCambiar, nombreRegistros = 'registros' }: PropsPaginacion) {
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina))
  const mostrados = Math.min(porPagina, Math.max(0, totalRegistros - (pagina - 1) * porPagina))

  return (
    <nav aria-label="Paginación" className="flex flex-col items-center justify-between gap-3 px-5 py-4 text-sm sm:flex-row sm:px-6">
      <p className="text-texto-secundario">
        Mostrando <strong className="text-texto-principal">{mostrados}</strong> de{' '}
        <strong className="text-texto-principal">{totalRegistros}</strong> {nombreRegistros}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" className={cn(base, 'border-borde bg-fondo-tarjeta disabled:opacity-50')} disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          Anterior
        </button>
        {paginasVisibles(pagina, totalPaginas).map((p, i) =>
          p === '…' ? (
            <span key={`salto-${i}`} className="px-1 text-texto-secundario" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === pagina ? 'page' : undefined}
              aria-label={`Página ${p}`}
              onClick={() => onCambiar(p)}
              className={cn(base, p === pagina ? 'border-primario bg-primario text-white' : 'border-borde bg-fondo-tarjeta hover:bg-fondo-seccion-alterna')}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(base, 'border-borde bg-fondo-tarjeta disabled:opacity-50')}
          disabled={pagina >= totalPaginas}
          onClick={() => onCambiar(pagina + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
