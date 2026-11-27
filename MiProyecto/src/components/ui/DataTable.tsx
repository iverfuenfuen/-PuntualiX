import type { ReactNode } from 'react'
import { cn } from '@/lib/utilidades'
import { EmptyState } from './EmptyState'
import { Spinner } from './Spinner'

export interface Columna<T> {
  clave: string
  encabezado: string
  /** Cómo pintar la celda; si no se indica se usa fila[clave] */
  celda?: (fila: T) => ReactNode
  alineacion?: 'izquierda' | 'centro' | 'derecha'
  /** Oculta la columna en pantallas pequeñas (RNF6 responsivo) */
  ocultarEnMovil?: boolean
  className?: string
}

interface PropsTabla<T> {
  columnas: Columna<T>[]
  filas: T[]
  claveFila: (fila: T) => string | number
  /** Título accesible de la tabla (lectores de pantalla) */
  titulo: string
  cargando?: boolean
  mensajeVacio?: string
  /** Resalta una fila (p. ej. ficha en riesgo crítico) */
  claseFila?: (fila: T) => string | undefined
}

const ALINEACION = { izquierda: 'text-left', centro: 'text-center', derecha: 'text-right' }

/** Tabla densa del Prototipo: encabezados en mayúsculas, filas con separador y hover suave. */
export function DataTable<T>({ columnas, filas, claveFila, titulo, cargando, mensajeVacio = 'No hay registros para mostrar.', claseFila }: PropsTabla<T>) {
  if (cargando) return <Spinner />
  if (filas.length === 0) return <EmptyState titulo="Sin resultados" descripcion={mensajeVacio} />

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr className="border-b border-borde bg-fondo-seccion-alterna">
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={cn(
                  'px-5 py-3 font-titulos text-xs font-semibold tracking-wider whitespace-nowrap text-texto-secundario uppercase',
                  ALINEACION[c.alineacion ?? 'izquierda'],
                  c.ocultarEnMovil && 'hidden md:table-cell',
                  c.className,
                )}
              >
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={claveFila(fila)} className={cn('border-b border-borde last:border-0 hover:bg-fondo-seccion-alterna/60', claseFila?.(fila))}>
              {columnas.map((c) => (
                <td
                  key={c.clave}
                  className={cn('px-5 py-3.5 text-texto-cuerpo', ALINEACION[c.alineacion ?? 'izquierda'], c.ocultarEnMovil && 'hidden md:table-cell', c.className)}
                >
                  {c.celda ? c.celda(fila) : String((fila as Record<string, unknown>)[c.clave] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
