import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CalendarCheck, CalendarDays, Check, ChevronDown, FileText, House, PieChart, ShieldAlert, TriangleAlert, UserRoundCheck, X } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, DataTable, EmptyState, EstadoError, KpiCard, PanelAlertas, ProgressBar, Spinner, type AlertaPanel, type Columna } from '@/components/ui'
import { nivelVisual, tituloAlerta } from '@/features/alertas/presentacion'
import { resumenEvento, tituloEvento } from '@/features/bitacora/presentacion'
import { ETIQUETA_RIESGO, fichaEnRiesgo, hoyISO } from '@/features/fichas/presentacion'
import type { FichaResumen } from '@/features/fichas/servicioFichas'
import { META_CUMPLIMIENTO } from '@/features/instructores/presentacion'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje, tiempoRelativo } from '@/lib/utilidades'
import type { PrioridadAlerta } from '@/types/dominio'
import { cargaSesiones, distribucion, evolucionSemanal, mesAnterior, mesDeClave, mesesDisponibles, periodoAcademico, rangoMes, type Mes } from './presentacion'
import { obtenerDatosPeriodo, obtenerResumenActual, type DatosPeriodo, type ResumenActual } from './servicioDashboard'

const GraficaRiesgoFichas = lazy(async () => ({ default: (await import('./GraficasDashboard')).GraficaRiesgoFichas }))
const GraficaTendenciaSemanal = lazy(async () => ({ default: (await import('./GraficasDashboard')).GraficaTendenciaSemanal }))

const MESES = mesesDisponibles()

/**
 * RF21 — Dashboard administrativo. Refactorización de VersionAntigua/Admin/dashboard.html, en el mismo orden:
 *  1. Saludo con selector de mes (en el banner verde del Prototipo) y 5 indicadores.
 *  2. Desempeño de las fichas · Alertas recientes · Riesgo de deserción por ficha.
 *  3. Fichas asignadas activas · Actividad reciente.
 *  4. Estadísticas generales del mes con la tendencia de asistencia (diseño "Evolución semanal" del Prototipo).
 * El administrador solo ve fichas y sus porcentajes (casos de uso): no hay datos por aprendiz.
 */
export function PaginaDashboard() {
  const { usuario } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const mes = mesDeClave(MESES.some((m) => m.clave === parametros.get('mes')) ? parametros.get('mes')! : MESES[0].clave)

  const actual = useCarga(obtenerResumenActual, [])
  const periodo = useCarga(() => obtenerDatosPeriodo(rangoMes(mesAnterior(mes.clave).clave).desde, rangoMes(mes.clave).hasta), [mes.clave])
  const error = actual.error ?? periodo.error

  return (
    <>
      <PageHeader
        titulo={`¡Hola, ${usuario?.nombres ?? ''}!`}
        icono={House}
        insignia={`${periodoAcademico(mes.clave)}${mes.clave === MESES[0].clave ? ' activo' : ''}`}
        descripcion="Este es el resumen general de la actividad académica."
        acciones={<SelectorMes mes={mes} onCambiar={(clave) => setParametros(clave === MESES[0].clave ? {} : { mes: clave }, { replace: true })} />}
      />
      {error ? (
        <Card>
          <EstadoError
            mensaje={error}
            onReintentar={() => {
              actual.recargar()
              periodo.recargar()
            }}
          />
        </Card>
      ) : !actual.datos || !periodo.datos ? (
        <Card>
          <Spinner texto="Cargando el resumen…" />
        </Card>
      ) : (
        <div className={cn('space-y-6', periodo.refrescando && 'opacity-60 transition-opacity')} aria-busy={periodo.refrescando}>
          <Contenido actual={actual.datos} periodo={periodo.datos} mes={mes} />
        </div>
      )}
    </>
  )
}

/** Selector de mes (VersionAntigua "Agosto 2026 ▾"; Prototipo: botón con calendario sobre el banner verde) */
function SelectorMes({ mes, onCambiar }: { mes: Mes; onCambiar: (clave: string) => void }) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">Mes del resumen</span>
      <CalendarDays className="pointer-events-none absolute left-3 size-4 text-white" aria-hidden />
      <select
        value={mes.clave}
        onChange={(e) => onCambiar(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-white/20 bg-white/10 pr-9 pl-9 font-titulos text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {MESES.map((m) => (
          <option key={m.clave} value={m.clave} className="text-texto-principal">
            {m.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-white" aria-hidden />
    </label>
  )
}

/** "+12 % respecto al mes anterior" (texto de VersionAntigua) */
function respectoMesAnterior(v: number | null): string | undefined {
  if (v == null || !Number.isFinite(v)) return undefined
  const r = Math.round(v)
  return `${r > 0 ? '+' : ''}${r} % respecto al mes anterior`
}

const finDeMes = (clave: string) => `${rangoMes(clave).hasta}T23:59:59`

function Contenido({ actual, periodo, mes }: { actual: ResumenActual; periodo: DatosPeriodo; mes: Mes }) {
  const hoy = hoyISO()
  const previo = mesAnterior(mes.clave)
  const activas = actual.fichas.filter((f) => f.estado === 'activa')

  const calculo = useMemo(() => {
    // Fichas registradas al cierre del mes elegido y del anterior
    const registradasHasta = (clave: string) => actual.registroFichas.filter((f) => f <= finDeMes(clave)).length
    const fichasMes = registradasHasta(mes.clave)
    const fichasPrevio = registradasHasta(previo.clave)
    const cumplimiento = cargaSesiones(periodo.sesiones, mes.clave, hoy)
    const cumplimientoPrevio = cargaSesiones(periodo.sesiones, previo.clave, hoy).cumplimiento
    return {
      fichasMes,
      varFichas: fichasPrevio ? ((fichasMes - fichasPrevio) * 100) / fichasPrevio : null,
      cumplimiento,
      varCumplimiento: cumplimiento.cumplimiento != null && cumplimientoPrevio != null ? cumplimiento.cumplimiento - cumplimientoPrevio : null,
      dist: distribucion(periodo.asistencias, mes.clave),
      semanas: evolucionSemanal(periodo.asistencias, mes.clave, hoy),
    }
  }, [actual.registroFichas, periodo, mes.clave, previo.clave, hoy])

  const conRegistros = activas.filter((f) => f.porcentajeAsistencia != null)
  const asistenciaFichas = conRegistros.length ? conRegistros.reduce((t, f) => t + (f.porcentajeAsistencia ?? 0), 0) / conRegistros.length : null
  const alertasDe = (p: PrioridadAlerta) => actual.alertas.filter((a) => a.tipo === 'riesgo_ficha' && a.prioridad === p).length

  const recientes: AlertaPanel[] = actual.alertas.slice(0, 3).map((a) => ({
    id: a.id,
    nivel: nivelVisual(a),
    titulo: tituloAlerta(a),
    descripcion: a.descripcion,
    fecha: a.creadaEn,
  }))

  const riesgo = activas
    .filter(fichaEnRiesgo)
    .sort((a, b) => (b.porcentajeInasistencia ?? 0) - (a.porcentajeInasistencia ?? 0))
    .slice(0, 8)
    .map((f) => ({ ficha: f.numero, inasistencia: f.porcentajeInasistencia ?? 0, riesgo: f.nivelRiesgo as 'media' | 'alta' }))

  const columnas: Columna<FichaResumen>[] = [
    {
      clave: 'ficha',
      encabezado: 'Ficha',
      celda: (f) => (
        <Link to={`/admin/fichas/${f.id}`} className="font-semibold text-primario hover:underline">
          {f.numero}
        </Link>
      ),
    },
    { clave: 'programa', encabezado: 'Programa', ocultarEnMovil: true, celda: (f) => <span className="line-clamp-2 max-w-xs">{f.programa}</span> },
    { clave: 'aprendices', encabezado: 'Aprendices', alineacion: 'centro', celda: (f) => f.aprendicesActivos },
    {
      clave: 'asistencia',
      encabezado: 'Asistencia promedio',
      celda: (f) =>
        f.porcentajeAsistencia == null ? (
          <span className="text-xs text-texto-secundario">Sin registros</span>
        ) : (
          <ProgressBar className="min-w-32" valor={f.porcentajeAsistencia} etiqueta={`Asistencia promedio de la ficha ${f.numero}`} />
        ),
    },
    {
      clave: 'riesgo',
      encabezado: 'Tipo de riesgo',
      celda: (f) =>
        f.nivelRiesgo ? (
          <Badge tono={ETIQUETA_RIESGO[f.nivelRiesgo].tono} conBorde>
            {ETIQUETA_RIESGO[f.nivelRiesgo].texto}
          </Badge>
        ) : (
          <Badge tono={f.totalRegistros ? 'exito' : 'neutro'} conBorde>
            {f.totalRegistros ? 'Óptimo' : 'Sin registros'}
          </Badge>
        ),
    },
  ]

  const inasistenciasMes = calculo.dist.justificadas + calculo.dist.sinJustificar

  return (
    <>
      {/* Fila 1 — Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <KpiCard titulo="Fichas registradas" valor={calculo.fichasMes} icono={FileText} tono="informacion" ruta="/admin/fichas" pie={respectoMesAnterior(calculo.varFichas) ?? 'Sin registros el mes anterior'} />
        <KpiCard
          titulo="Cumplimiento de instructores"
          valor={porcentaje(calculo.cumplimiento.cumplimiento)}
          icono={UserRoundCheck}
          tono="primario"
          ruta="/admin/instructores"
          pie={respectoMesAnterior(calculo.varCumplimiento) ?? `Meta institucional: ${META_CUMPLIMIENTO} %`}
        />
        <KpiCard titulo="Asistencias por fichas" valor={porcentaje(asistenciaFichas)} icono={PieChart} tono="exito" ruta="/admin/estadisticas" pie="Promedio general" />
        <KpiCard titulo="Alertas prioridad media" valor={alertasDe('media')} icono={TriangleAlert} tono="advertencia" ruta="/admin/alertas?prioridad=media" pie="Fichas cerca del límite" />
        <KpiCard
          titulo="Alertas prioridad alta"
          valor={alertasDe('alta')}
          icono={ShieldAlert}
          tono="critico"
          destacada={alertasDe('alta') > 0}
          ruta="/admin/alertas?prioridad=alta"
          pie="Fichas sobre el límite crítico"
        />
      </div>

      {/* Fila 2 — Desempeño de las fichas / Alertas recientes / Riesgo de deserción por ficha */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col p-5">
          <h2 className="mb-4 text-base font-semibold sm:text-lg">Desempeño de las fichas</h2>
          <DonaDesempeno totales={actual.totales} />
          <EnlacePanel ruta="/admin/estadisticas">Ver estadísticas</EnlacePanel>
        </Card>
        <PanelAlertas titulo="Alertas recientes" alertas={recientes} rutaVerTodas="/admin/alertas" />
        <Card className="flex flex-col p-5">
          <h2 className="mb-4 text-base font-semibold sm:text-lg">Riesgo de deserción por ficha</h2>
          {riesgo.length === 0 ? (
            <EmptyState titulo="Sin fichas en riesgo" descripcion="Ninguna ficha activa alcanza el riesgo moderado o crítico." compacto />
          ) : (
            <>
              <Suspense fallback={<Spinner />}>
                <GraficaRiesgoFichas datos={riesgo} />
              </Suspense>
              <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-texto-apoyo">
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-advertencia" aria-hidden /> {ETIQUETA_RIESGO.media.texto}
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-alerta-critica" aria-hidden /> {ETIQUETA_RIESGO.alta.texto}
                </li>
              </ul>
            </>
          )}
          <EnlacePanel ruta="/admin/estadisticas">Ver estadísticas</EnlacePanel>
        </Card>
      </div>

      {/* Fila 3 — Fichas asignadas activas / Actividad reciente */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="flex flex-col">
          <h2 className="px-5 pt-5 pb-4 text-base font-semibold sm:px-6 sm:text-lg">Fichas asignadas activas</h2>
          <DataTable titulo="Fichas asignadas activas" columnas={columnas} filas={activas.slice(0, 7)} claveFila={(f) => f.id} mensajeVacio="No hay fichas activas." />
          <div className="px-5 pb-5 sm:px-6">
            <EnlacePanel ruta="/admin/fichas">Ver todas las fichas</EnlacePanel>
          </div>
        </Card>
        <Card className="flex flex-col p-5">
          <h2 className="mb-4 text-base font-semibold sm:text-lg">Actividad reciente</h2>
          {actual.actividad.length === 0 ? (
            <EmptyState titulo="Sin actividad" descripcion="Aún no hay eventos registrados en la bitácora." compacto />
          ) : (
            <ol className="space-y-4">
              {actual.actividad.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primario/10 text-primario" aria-hidden>
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-texto-principal">{tituloEvento(e)}</p>
                    <p className="truncate text-sm text-texto-apoyo">{resumenEvento(e)}</p>
                  </div>
                  <time dateTime={e.fecha} className="shrink-0 text-xs text-texto-secundario">
                    {tiempoRelativo(e.fecha)}
                  </time>
                </li>
              ))}
            </ol>
          )}
          <EnlacePanel ruta="/admin/bitacora">Ver historial completo</EnlacePanel>
        </Card>
      </div>

      {/* Fila 4 — Estadísticas generales del mes */}
      <Card className="p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold sm:text-lg">Estadísticas generales</h2>
          <span className="rounded-lg bg-fondo-seccion-alterna px-3 py-1 text-sm font-semibold text-texto-apoyo">{mes.etiqueta}</span>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <ul className="space-y-2 text-sm">
            <ItemEstadistica icono={<CalendarCheck className="size-4" />} tono="text-primario bg-primario/10" etiqueta="Sesiones programadas" valor={calculo.cumplimiento.planificadas} />
            <ItemEstadistica icono={<Check className="size-4" />} tono="text-confirmacion bg-confirmacion/10" etiqueta="Asistencias" valor={calculo.dist.presentes} />
            <ItemEstadistica icono={<X className="size-4" />} tono="text-alerta-critica bg-alerta-critica/10" etiqueta="Inasistencias" valor={inasistenciasMes} />
            <ItemEstadistica icono={<Check className="size-4" />} tono="text-texto-principal bg-advertencia/20" etiqueta="Justificadas" valor={calculo.dist.justificadas} />
            <ItemEstadistica icono={<X className="size-4" />} tono="text-alerta-critica bg-alerta-critica/10" etiqueta="Sin justificar" valor={calculo.dist.sinJustificar} />
          </ul>
          <div>
            <h3 className="text-sm font-semibold text-texto-principal">Tendencia de asistencia</h3>
            {calculo.semanas.every((s) => s.registros === 0) ? (
              <EmptyState titulo="Sin registros" descripcion={`No hay asistencias registradas en ${mes.corto}.`} compacto />
            ) : (
              <>
                <Suspense fallback={<Spinner />}>
                  <GraficaTendenciaSemanal datos={calculo.semanas} meta={META_CUMPLIMIENTO} />
                </Suspense>
                <p className="mt-2 flex items-center gap-2 text-xs text-texto-secundario">
                  <span className="h-0 w-4 border-t-2 border-dashed border-texto-secundario" aria-hidden /> Meta SENA: {META_CUMPLIMIENTO} %
                </p>
              </>
            )}
          </div>
        </div>
        <EnlacePanel ruta="/admin/estadisticas">Ver estadísticas completas</EnlacePanel>
      </Card>
    </>
  )
}

function EnlacePanel({ ruta, children }: { ruta: string; children: ReactNode }) {
  return (
    <Link to={ruta} className="mt-auto block pt-4 text-center text-sm font-semibold text-primario hover:underline">
      {children}
    </Link>
  )
}

function ItemEstadistica({ icono, tono, etiqueta, valor }: { icono: ReactNode; tono: string; etiqueta: string; valor: number }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-borde px-3 py-2.5">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tono)} aria-hidden>
        {icono}
      </span>
      <span className="flex-1 text-texto-apoyo">{etiqueta}</span>
      <span className="font-titulos text-base font-bold text-texto-principal">{valor.toLocaleString('es-CO')}</span>
    </li>
  )
}

/** VersionAntigua "Desempeño de las fichas": dona con el promedio general, justificado, inasistencia y total de registros */
function DonaDesempeno({ totales }: { totales: ResumenActual['totales'] }) {
  const total = totales.presente + totales.justificada + totales.ausente
  if (total === 0) return <EmptyState titulo="Sin registros" descripcion="Aún no hay asistencias registradas." compacto />
  const pct = (n: number) => (n * 100) / total
  const p1 = pct(totales.presente)
  const p2 = p1 + pct(totales.justificada)
  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div
        className="relative size-40 rounded-full"
        style={{ background: `conic-gradient(var(--color-confirmacion) 0% ${p1}%, var(--color-advertencia) ${p1}% ${p2}%, var(--color-alerta-critica) ${p2}% 100%)` }}
        role="img"
        aria-label={`Desempeño de las fichas: cumplimiento ${porcentaje(p1)}, justificado ${porcentaje(pct(totales.justificada))}, inasistencia ${porcentaje(pct(totales.ausente))}`}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-fondo-tarjeta">
          <span className="font-titulos text-3xl font-bold text-texto-principal">{porcentaje(p1)}</span>
          <span className="text-xs text-texto-secundario">Promedio general</span>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-texto-apoyo">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-advertencia" aria-hidden /> Justificado {porcentaje(pct(totales.justificada))}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-alerta-critica" aria-hidden /> Inasistencia {porcentaje(pct(totales.ausente))}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-confirmacion" aria-hidden /> Cumplimiento
        </li>
      </ul>
      <p className="text-sm text-texto-secundario">
        Total registros: <strong className="text-texto-principal">{total.toLocaleString('es-CO')}</strong>
      </p>
    </div>
  )
}
