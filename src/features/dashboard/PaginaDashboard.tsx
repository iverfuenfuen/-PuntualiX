import { Link } from 'react-router'
import { BellRing, CalendarCheck, FolderOpen, History, UserRoundCheck } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { Badge, Card, CardHeader, DataTable, EmptyState, EstadoError, KpiCard, PanelAlertas, ProgressBar, Spinner, type AlertaPanel, type Columna } from '@/components/ui'
import { nivelVisual, tituloAlerta } from '@/features/alertas/presentacion'
import { resumenEvento, tituloEvento } from '@/features/bitacora/presentacion'
import { ETIQUETA_RIESGO } from '@/features/fichas/presentacion'
import type { FichaResumen } from '@/features/fichas/servicioFichas'
import { META_CUMPLIMIENTO, tonoCumplimiento } from '@/features/instructores/presentacion'
import { useCarga } from '@/lib/useCarga'
import { porcentaje, tiempoRelativo } from '@/lib/utilidades'
import { ETIQUETA_ROL, type PrioridadAlerta } from '@/types/dominio'
import { obtenerResumenAdmin, type ResumenAdmin } from './servicioDashboard'

const fechaHoy = () => new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

/**
 * Dashboard del administrador (VersionAntigua: dashboard.html). Resumen con enlaces a cada módulo.
 * Un solo lugar por dato: los KPI dan las cifras; las listas muestran CUÁLES fichas, alertas y eventos, sin repetir conteos.
 * Las estadísticas generales y la tendencia de asistencia se dejan para el módulo de Estadísticas (Etapa 5).
 */
export function PaginaDashboard() {
  const { usuario } = useSesion()
  const resumen = useCarga(obtenerResumenAdmin, [])

  return (
    <>
      <header className="flex flex-col gap-2 border-b border-borde pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">¡Hola, {usuario?.nombres}!</h1>
          <p className="mt-1 text-sm text-texto-secundario">Este es el resumen general de la actividad académica.</p>
        </div>
        <p className="text-sm font-semibold text-texto-apoyo first-letter:uppercase">{fechaHoy()}</p>
      </header>

      {resumen.error ? (
        <Card>
          <EstadoError mensaje={resumen.error} onReintentar={resumen.recargar} />
        </Card>
      ) : !resumen.datos ? (
        <Card>
          <Spinner texto="Cargando el resumen…" />
        </Card>
      ) : (
        <Contenido resumen={resumen.datos} />
      )}
    </>
  )
}

function Contenido({ resumen: r }: { resumen: ResumenAdmin }) {
  const porPrioridad = (p: PrioridadAlerta) => r.alertasAbiertas.filter((a) => a.prioridad === p).length

  const recientes: AlertaPanel[] = r.alertasAbiertas.slice(0, 4).map((a) => ({
    id: a.id,
    nivel: nivelVisual(a),
    titulo: tituloAlerta(a),
    descripcion: a.descripcion,
    fecha: a.creadaEn,
    acciones: [{ etiqueta: a.tipo === 'ficha_sin_lider' ? 'Asignar líder' : 'Ver ficha', ruta: `/admin/fichas/${a.ficha.id}` }],
  }))

  const columnas: Columna<FichaResumen>[] = [
    {
      clave: 'ficha',
      encabezado: 'Ficha',
      celda: (f) => (
        <div className="min-w-0">
          <Link to={`/admin/fichas/${f.id}`} className="font-semibold text-primario hover:underline">
            {f.numero}
          </Link>
          <p className="max-w-xs truncate text-xs text-texto-secundario">{f.programa}</p>
        </div>
      ),
    },
    { clave: 'aprendices', encabezado: 'Aprendices', alineacion: 'centro', ocultarEnMovil: true, celda: (f) => f.aprendicesActivos },
    {
      clave: 'asistencia',
      encabezado: 'Asistencia',
      celda: (f) => <ProgressBar className="min-w-32" valor={f.porcentajeAsistencia ?? 0} etiqueta={`Asistencia de la ficha ${f.numero}`} />,
    },
    {
      clave: 'riesgo',
      encabezado: 'Riesgo',
      celda: (f) =>
        f.nivelRiesgo && (
          <Badge tono={ETIQUETA_RIESGO[f.nivelRiesgo].tono} conBorde>
            {ETIQUETA_RIESGO[f.nivelRiesgo].texto}
          </Badge>
        ),
    },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Fichas activas"
          valor={r.fichasActivas}
          icono={FolderOpen}
          tono="primario"
          ruta="/admin/fichas"
          pie={r.fichasEnRiesgo ? `${r.fichasEnRiesgo} en riesgo de inasistencia` : 'Ninguna en riesgo de inasistencia'}
        />
        <KpiCard
          titulo="Asistencia general"
          valor={porcentaje(r.asistenciaGeneral)}
          icono={CalendarCheck}
          tono="informacion"
          progreso={r.asistenciaGeneral != null ? { valor: r.asistenciaGeneral, etiqueta: 'Asistencia general de las fichas activas' } : undefined}
          pie="Promedio de las fichas activas"
        />
        <KpiCard
          titulo="Cumplimiento de instructores"
          valor={porcentaje(r.cumplimientoInstructores)}
          icono={UserRoundCheck}
          tono={r.cumplimientoInstructores != null ? tonoCumplimiento(r.cumplimientoInstructores) : 'neutro'}
          ruta="/admin/instructores"
          progreso={r.cumplimientoInstructores != null ? { valor: r.cumplimientoInstructores, etiqueta: 'Cumplimiento promedio de los instructores' } : undefined}
          pie={r.instructoresBajoMeta ? `${r.instructoresBajoMeta} por debajo de la meta del ${META_CUMPLIMIENTO} %` : `Meta institucional: ${META_CUMPLIMIENTO} %`}
        />
        <KpiCard
          titulo="Alertas abiertas"
          valor={r.alertasAbiertas.length}
          icono={BellRing}
          tono="critico"
          destacada={porPrioridad('alta') > 0}
          ruta="/admin/alertas"
          chips={[
            { etiqueta: `Alta ${porPrioridad('alta')}`, tono: 'critico' },
            { etiqueta: `Media ${porPrioridad('media')}`, tono: 'advertencia' },
            { etiqueta: `Baja ${porPrioridad('baja')}`, tono: 'oliva' },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            titulo="Fichas que requieren atención"
            descripcion="Fichas activas que alcanzan un umbral de inasistencia, de mayor a menor riesgo."
            acciones={
              <Link to="/admin/fichas" className="text-sm font-semibold text-primario hover:underline">
                Ver todas las fichas
              </Link>
            }
          />
          {r.fichasAtencion.length === 0 ? (
            <EmptyState titulo="Todo en orden" descripcion="Ninguna ficha activa alcanza los umbrales de inasistencia configurados." />
          ) : (
            <DataTable titulo="Fichas que requieren atención" columnas={columnas} filas={r.fichasAtencion} claveFila={(f) => f.id} />
          )}
        </Card>
        <PanelAlertas titulo="Alertas recientes" alertas={recientes} rutaVerTodas="/admin/alertas" />
      </div>

      <Card>
        <CardHeader
          titulo="Actividad reciente"
          acciones={
            <Link to="/admin/bitacora" className="text-sm font-semibold text-primario hover:underline">
              Ver bitácora completa
            </Link>
          }
        />
        {r.actividad.length === 0 ? (
          <EmptyState titulo="Sin actividad" descripcion="Aún no hay eventos registrados en la bitácora." compacto />
        ) : (
          <ol className="divide-y divide-borde">
            {r.actividad.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3 sm:px-6">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primario/10 text-primario" aria-hidden>
                  <History className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-texto-principal">{tituloEvento(e)}</p>
                  <p className="truncate text-sm text-texto-apoyo">{resumenEvento(e)}</p>
                  <p className="text-xs text-texto-secundario">
                    {e.usuario ?? 'Sistema'}
                    {e.rol && ` · ${ETIQUETA_ROL[e.rol]}`}
                  </p>
                </div>
                <time dateTime={e.fecha} className="shrink-0 text-xs text-texto-secundario">
                  {tiempoRelativo(e.fecha)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  )
}
