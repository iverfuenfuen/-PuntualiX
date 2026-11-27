import { Badge } from '@/components/ui'
import { ETIQUETA_JORNADA, ETIQUETA_MODALIDAD, ETIQUETA_NIVEL } from '@/types/dominio'
import { estadoVisualFicha, fechaISOaTexto } from './presentacion'
import type { DetalleFicha } from './servicioFichas'

/**
 * Banner de la ficha: SOLO su identidad (estado, sede, número, programa) y los 4 datos de contexto.
 * Cada dato tiene un único lugar: los indicadores van en las tarjetas KPI y los datos administrativos
 * en la pestaña Información general (evita la repetición que tenía VersionAntigua).
 */
export function EncabezadoFicha({ detalle }: { detalle: DetalleFicha }) {
  const { ficha } = detalle
  const estado = estadoVisualFicha(ficha)
  const chips: Array<[string, string]> = [
    ['Jornada', ETIQUETA_JORNADA[ficha.jornada]],
    ['Modalidad', `${ETIQUETA_NIVEL[ficha.nivel]} ${ETIQUETA_MODALIDAD[ficha.modalidad].toLowerCase()}`],
    ['Ciclo lectivo', `${fechaISOaTexto(ficha.fechaInicio)} – ${fechaISOaTexto(ficha.fechaFin)}`],
    ['Instructor líder', ficha.instructorLider ?? 'Sin asignar'],
  ]

  return (
    <section className="relative space-y-3 overflow-hidden rounded-2xl bg-primario-oscuro p-6 text-white shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -top-16 -right-16 size-72 rounded-full bg-white/5 blur-2xl" aria-hidden />
      <div className="relative flex flex-wrap items-center gap-2 text-xs">
        <Badge tono={estado.tono} punto className="bg-white/90">
          {estado.texto}
        </Badge>
        <span className="rounded-md bg-black/20 px-2 py-0.5 font-semibold">Sede {ficha.sede}</span>
      </div>
      <h1 className="relative text-2xl font-bold text-white sm:text-3xl">
        Ficha {ficha.numero} · {ficha.programa}
      </h1>
      <dl className="relative grid gap-2 pt-1 sm:grid-cols-2 xl:grid-cols-4">
        {chips.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2">
            <dt className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">{etiqueta}</dt>
            <dd className="text-sm font-semibold text-white">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
