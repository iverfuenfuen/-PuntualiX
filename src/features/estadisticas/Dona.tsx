import { cn, porcentaje } from '@/lib/utilidades'

export interface ParteDona {
  etiqueta: string
  valor: number
  /** Color CSS con token: var(--color-…) */
  color: string
}

/** Dona del Prototipo (donut SVG) hecha con conic-gradient y tokens del Manual. El centro muestra el valor principal. */
export function Dona({ partes, centro, etiquetaCentro, tamano = 'md', tonoCentro }: { partes: ParteDona[]; centro: string; etiquetaCentro: string; tamano?: 'sm' | 'md'; tonoCentro?: string }) {
  const fin = (i: number) => partes.slice(0, i + 1).reduce((t, p) => t + p.valor, 0)
  const tramos = partes.map((p, i) => `${p.color} ${fin(i) - p.valor}% ${fin(i)}%`)
  const acumulado = fin(partes.length - 1)
  return (
    <div
      className={cn('relative shrink-0 rounded-full', tamano === 'md' ? 'size-40' : 'size-32')}
      style={{ background: acumulado > 0 ? `conic-gradient(${tramos.join(', ')})` : 'var(--color-borde)' }}
      role="img"
      aria-label={`${etiquetaCentro} ${centro}. ${partes.map((p) => `${p.etiqueta}: ${porcentaje(p.valor, 1)}`).join(', ')}`}
    >
      <div className={cn('absolute flex flex-col items-center justify-center rounded-full bg-fondo-tarjeta', tamano === 'md' ? 'inset-4' : 'inset-3')}>
        <span className={cn('font-titulos font-bold', tamano === 'md' ? 'text-3xl' : 'text-2xl', tonoCentro ?? 'text-texto-principal')}>{centro}</span>
        <span className="text-[11px] font-semibold tracking-wide text-texto-secundario uppercase">{etiquetaCentro}</span>
      </div>
    </div>
  )
}
