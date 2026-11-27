import { Link } from 'react-router'
import { BellRing } from 'lucide-react'
import { AlertCard, type PropsAlertCard } from './AlertCard'
import { Badge } from './Badge'
import { Card } from './Card'
import { EmptyState } from './EmptyState'

export interface AlertaPanel extends PropsAlertCard {
  id: string | number
}

interface PropsPanelAlertas {
  titulo?: string
  alertas: AlertaPanel[]
  /** Cantidad de alertas nuevas (sin atender) para la insignia del encabezado */
  nuevas?: number
  /** Enlace "Ver todas las alertas" */
  rutaVerTodas?: string
}

/** Panel lateral con la lista de alertas recientes (dashboard Admin/Instructor). */
export function PanelAlertas({ titulo = 'Incidentes recientes', alertas, nuevas, rutaVerTodas }: PropsPanelAlertas) {
  return (
    <Card className="p-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold sm:text-lg">{titulo}</h2>
          {nuevas ? <Badge tono="critico" conBorde>{nuevas} {nuevas === 1 ? 'nueva' : 'nuevas'}</Badge> : null}
        </div>
        <span className="flex size-8 items-center justify-center rounded-lg bg-alerta-critica/10 text-alerta-critica" aria-hidden>
          <BellRing className="size-4" />
        </span>
      </header>

      {alertas.length === 0 ? (
        <EmptyState titulo="Sin alertas" descripcion="No hay incidentes pendientes por revisar." compacto />
      ) : (
        <ul className="space-y-3">
          {alertas.map(({ id, ...alerta }) => (
            <li key={id}>
              <AlertCard {...alerta} />
            </li>
          ))}
        </ul>
      )}

      {rutaVerTodas && (
        <Link to={rutaVerTodas} className="mt-4 block text-center text-sm font-semibold text-primario hover:underline">
          Ver todas las alertas
        </Link>
      )}
    </Card>
  )
}
