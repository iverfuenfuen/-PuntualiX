import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { cn, tiempoRelativo } from '@/lib/utilidades'
import type { NivelAlerta } from '@/types/dominio'
import { clasesBoton } from './estilosBoton'

export interface AccionAlerta {
  etiqueta: string
  /** Navega a una ruta… */
  ruta?: string
  /** …o ejecuta una acción */
  onClick?: () => void
  /** La acción principal se pinta con el color de la alerta */
  principal?: boolean
}

export interface PropsAlertCard {
  nivel: NivelAlerta
  titulo: string
  /** Texto de la alerta; admite <strong> para resaltar ficha o porcentaje */
  descripcion: ReactNode
  /** Fecha de generación (se muestra como "hace 15 minutos") */
  fecha?: Date | string
  acciones?: AccionAlerta[]
  className?: string
}

const ESTILOS: Record<NivelAlerta, { contenedor: string; titulo: string; principal: string; icono: typeof Info; nombre: string }> = {
  critica: {
    contenedor: 'border-alerta-critica/20 bg-alerta-critica/5',
    titulo: 'text-alerta-critica',
    principal: 'bg-alerta-critica text-white hover:bg-[#9e1a1e]',
    icono: TriangleAlert,
    nombre: 'Alerta crítica',
  },
  advertencia: {
    contenedor: 'border-advertencia/40 bg-advertencia/10',
    titulo: 'text-[#8a5d00]',
    principal: 'bg-advertencia text-texto-principal hover:bg-[#e0961f]',
    icono: TriangleAlert,
    nombre: 'Advertencia',
  },
  informativa: {
    contenedor: 'border-informacion/20 bg-informacion/5',
    titulo: 'text-informacion',
    principal: 'bg-primario text-white hover:bg-primario-oscuro',
    icono: Info,
    nombre: 'Información',
  },
  leve: {
    contenedor: 'border-estado-activo/25 bg-estado-activo/5',
    titulo: 'text-[#5c5c00]',
    principal: 'bg-estado-activo text-white hover:bg-[#6b6b00]',
    icono: CircleAlert,
    nombre: 'Alerta leve',
  },
}

/**
 * Tarjeta de alerta / incidente ("Incidentes Recientes" del Prototipo).
 * Misma estructura para cualquier alerta; cambian nivel, textos y acciones.
 */
export function AlertCard({ nivel, titulo, descripcion, fecha, acciones = [], className }: PropsAlertCard) {
  const e = ESTILOS[nivel]
  const Icono = e.icono
  return (
    <article className={cn('rounded-xl border p-4', e.contenedor, className)} aria-label={`${e.nombre}: ${titulo}`}>
      <header className="flex items-start justify-between gap-3">
        <p className={cn('flex items-center gap-2 font-titulos text-sm font-semibold', e.titulo)}>
          <Icono className="size-4 shrink-0" aria-hidden />
          {titulo}
        </p>
        {fecha && (
          <time dateTime={new Date(fecha).toISOString()} className="shrink-0 text-xs text-texto-secundario">
            {tiempoRelativo(fecha)}
          </time>
        )}
      </header>

      <p className="mt-1.5 text-sm text-texto-apoyo [&_strong]:font-semibold [&_strong]:text-texto-principal">{descripcion}</p>

      {acciones.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {acciones.map((a) => {
            const clases = a.principal
              ? cn('inline-flex h-8 items-center rounded-lg px-3 font-titulos text-xs font-semibold transition-colors', e.principal)
              : clasesBoton('secundario', 'sm')
            return a.ruta ? (
              <Link key={a.etiqueta} to={a.ruta} className={clases}>
                {a.etiqueta}
              </Link>
            ) : (
              <button key={a.etiqueta} type="button" onClick={a.onClick} className={clases}>
                {a.etiqueta}
              </button>
            )
          })}
        </div>
      )}
    </article>
  )
}
