import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utilidades'
import type { Tono } from '@/types/dominio'
import { Badge } from './Badge'
import { ProgressBar } from './ProgressBar'
import { TONO_SUAVE } from './tonos'

export interface ChipKpi {
  etiqueta: string
  tono: Tono
}

export interface PropsKpiCard {
  titulo: string
  /** Valor principal: "84 %", 54, "6"… */
  valor: ReactNode
  icono: LucideIcon
  tono?: Tono
  /** Insignia junto al valor: variación ("+2 %") o contexto ("72 % del total") */
  insignia?: { texto: string; tono?: Tono }
  /** Texto corto al lado del valor, p. ej. "total activas" */
  unidad?: string
  /** Barra de progreso 0–100 debajo del valor */
  progreso?: { valor: number; etiqueta: string }
  /** Pie de la tarjeta (texto de apoyo) y un dato opcional alineado a la derecha */
  pie?: ReactNode
  pieDerecha?: ReactNode
  /** Chips de desglose, p. ej. Críticas 2 · Moderadas 4 */
  chips?: ChipKpi[]
  /** Resalta la tarjeta con el color del tono (tarjeta de alertas de deserción) */
  destacada?: boolean
  /** Si se indica, la tarjeta completa es un enlace */
  ruta?: string
  className?: string
}

/** Tarjeta de indicador (KPI) del Prototipo. La misma estructura sirve para cualquier métrica. */
export function KpiCard({
  titulo,
  valor,
  icono: Icono,
  tono = 'primario',
  insignia,
  unidad,
  progreso,
  pie,
  pieDerecha,
  chips,
  destacada,
  ruta,
  className,
}: PropsKpiCard) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn('font-contenido text-sm font-semibold', destacada ? 'text-alerta-critica' : 'text-texto-secundario')}>
          {titulo}
        </h3>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONO_SUAVE[tono])} aria-hidden>
          <Icono className="size-[18px]" />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-2">
        <span className={cn('font-titulos text-3xl font-bold', destacada ? 'text-alerta-critica' : 'text-texto-principal')}>
          {valor}
        </span>
        {unidad && <span className="text-xs text-texto-secundario">{unidad}</span>}
        {insignia && <Badge tono={insignia.tono ?? 'exito'}>{insignia.texto}</Badge>}
      </div>

      {progreso && <ProgressBar className="mt-3" valor={progreso.valor} etiqueta={progreso.etiqueta} tono={tono} mostrarValor={false} />}

      {chips && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <Badge key={c.etiqueta} tono={c.tono} conBorde>
              {c.etiqueta}
            </Badge>
          ))}
        </div>
      )}

      {(pie || pieDerecha) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-borde pt-3 text-xs text-texto-secundario">
          <span>{pie}</span>
          {pieDerecha && <span className="font-semibold text-texto-principal">{pieDerecha}</span>}
        </div>
      )}
    </>
  )

  const clases = cn(
    'block rounded-2xl border bg-fondo-tarjeta p-5 shadow-sm',
    destacada ? 'border-alerta-critica/30' : 'border-borde',
    ruta && 'transition-shadow hover:shadow-md',
    className,
  )

  return ruta ? (
    <Link to={ruta} className={clases}>
      {contenido}
    </Link>
  ) : (
    <article className={clases}>{contenido}</article>
  )
}
