import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowDown, ArrowUp, Building2, CalendarDays, ChevronDown, Clock, FileDown, FileText, GraduationCap, Layers, LineChart, PieChart, Printer, UserRoundCheck, UserX } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, EmptyState, EstadoError, KpiCard, ProgressBar, Spinner, clasesBoton } from '@/components/ui'
import type { Tono } from '@/types/dominio'
import { registrarEvento } from '@/features/auth/servicioAuth'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { hoyISO } from '@/features/fichas/presentacion'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { Dona } from './Dona'
import {
  comparativa,
  corteAnterior,
  corteDeClave,
  cortesDisponibles,
  desercionPorPrograma,
  distribucionInstructores,
  resumenCorte,
  variacionTexto,
  type Corte,
} from './presentacion'
import { SeccionComparacion } from './SeccionComparacion'
import { obtenerDatosEstadisticas, type DatosEstadisticas } from './servicioEstadisticas'

const CORTES = cortesDisponibles()

/**
 * HU04.1 / RF14 / RF15 / RF20 — Estadísticas del administrador. Refactorización del Prototipo
 * (m_dulo_de_estad_sticas_y_comparaci_n…) y de VersionAntigua/Admin/estadisticas/estadisticas.html, en el mismo orden:
 * indicadores, estadísticas y comparación, acciones de gestión, comparativa global, deserción y cumplimiento.
 * Todo se calcula para el corte académico elegido en el banner y se compara con el corte anterior.
 */
export function PaginaEstadisticas() {
  const [parametros, setParametros] = useSearchParams()
  const corte = corteDeClave(parametros.get('corte') ?? '') ?? CORTES[0]
  const previo = corteAnterior(corte)
  const datos = useCarga(() => obtenerDatosEstadisticas(previo.desde, corte.hasta), [corte.clave])
  const catalogos = useCarga(obtenerCatalogos, [])

  function cambiar(cambios: Record<string, string>) {
    setParametros(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [k, v] of Object.entries(cambios)) {
          if (v) n.set(k, v)
          else n.delete(k)
        }
        return n
      },
      { replace: true },
    )
  }

  return (
    <>
      <PageHeader
        titulo="Estadísticas y comparación institucional"
        icono={LineChart}
        insignia={`Corte ${corte.etiqueta}${corte.clave === CORTES[0].clave ? ' activo' : ''}`}
        descripcion="Monitoreo de asistencia, comparativa multivariable de fichas y métricas de retención académica."
        acciones={<SelectorCorte corte={corte} onCambiar={(clave) => cambiar({ corte: clave === CORTES[0].clave ? '' : clave })} />}
      />
      {datos.error ? (
        <Card>
          <EstadoError mensaje={datos.error} onReintentar={datos.recargar} />
        </Card>
      ) : !datos.datos ? (
        <Card>
          <Spinner texto="Calculando las estadísticas del corte…" />
        </Card>
      ) : (
        <div className={cn('space-y-6', datos.refrescando && 'opacity-60 transition-opacity')} aria-busy={datos.refrescando}>
          <Contenido datos={datos.datos} corte={corte} catalogos={catalogos.datos} parametros={parametros} cambiar={cambiar} />
        </div>
      )}
    </>
  )
}

function SelectorCorte({ corte, onCambiar }: { corte: Corte; onCambiar: (clave: string) => void }) {
  return (
    <label className="relative flex items-center print:hidden">
      <span className="sr-only">Corte académico</span>
      <CalendarDays className="pointer-events-none absolute left-3 size-4 text-white" aria-hidden />
      <select
        value={corte.clave}
        onChange={(e) => onCambiar(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-white/20 bg-white/10 pr-9 pl-9 font-titulos text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {CORTES.map((c) => (
          <option key={c.clave} value={c.clave} className="text-texto-principal">
            Corte {c.etiqueta}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-white" aria-hidden />
    </label>
  )
}

const fechaGeneracion = () => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

/** Variación: subir es bueno en asistencia y cumplimiento; en deserción es bueno bajar */
function tonoVariacion(v: number | null, menorEsMejor = false): Tono {
  if (v == null || Math.round(v * 10) === 0) return 'neutro'
  return v > 0 !== menorEsMejor ? 'exito' : 'critico'
}

interface PropsContenido {
  datos: DatosEstadisticas
  corte: Corte
  catalogos: Parameters<typeof SeccionComparacion>[0]['catalogos']
  parametros: URLSearchParams
  cambiar: (cambios: Record<string, string>) => void
}

function Contenido({ datos, corte, catalogos, parametros, cambiar }: PropsContenido) {
  const hoy = hoyISO()
  const calculo = useMemo(() => {
    const actual = resumenCorte(datos, corte, hoy)
    const anterior = resumenCorte(datos, corteAnterior(corte), hoy)
    return {
      actual,
      varAsistencia: actual.asistencia != null && anterior.asistencia != null ? actual.asistencia - anterior.asistencia : null,
      varDesercion: actual.desercion != null && anterior.desercion != null ? actual.desercion - anterior.desercion : null,
      varCumplimiento: actual.cumplimiento != null && anterior.cumplimiento != null ? actual.cumplimiento - anterior.cumplimiento : null,
      comparativas: {
        sede: comparativa(datos, corte, 'sede', hoy),
        area: comparativa(datos, corte, 'area', hoy),
        programa: comparativa(datos, corte, 'programa', hoy),
        jornada: comparativa(datos, corte, 'jornada', hoy),
      },
      desercion: desercionPorPrograma(datos, corte).slice(0, 5),
      instructores: distribucionInstructores(datos, corte, hoy),
    }
  }, [datos, corte, hoy])

  const { actual } = calculo
  const activas = datos.fichas.filter((f) => f.estado === 'activa').length
  const [generadoEn] = useState(fechaGeneracion)

  function exportarComparativa() {
    const filas = (Object.entries(calculo.comparativas) as Array<[string, typeof calculo.comparativas.sede]>).flatMap(([dim, lista]) =>
      lista.map((x) => [{ sede: 'Sede', area: 'Área', programa: 'Programa', jornada: 'Jornada' }[dim], x.nombre, x.valor?.toLocaleString('es-CO', { maximumFractionDigits: 1 }), x.tendencia?.toLocaleString('es-CO', { maximumFractionDigits: 1 })]),
    )
    descargarCSV(`estadisticas-comparativa-${corte.clave}`, ['Dimensión', 'Elemento', '% asistencia', 'Tendencia vs corte anterior (pts)'], filas)
    void registrarEvento('reportes', 'descarga', `Exportó la comparativa de asistencia (corte ${corte.clave})`)
  }

  const inst = calculo.instructores
  const pctInst = (n: number) => (inst.total ? (n * 100) / inst.total : 0)

  return (
    <>
      {/* 1 — Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Asistencia promedio general"
          valor={porcentaje(actual.asistencia)}
          icono={PieChart}
          tono="exito"
          insignia={variacionTexto(calculo.varAsistencia, '') ? { texto: variacionTexto(calculo.varAsistencia, '')!, tono: tonoVariacion(calculo.varAsistencia) } : undefined}
          pie="Meta institucional SENA: 80 %"
        />
        <KpiCard
          titulo="Tasa de deserción"
          valor={porcentaje(actual.desercion, 1)}
          icono={UserX}
          tono="critico"
          insignia={variacionTexto(calculo.varDesercion, '') ? { texto: variacionTexto(calculo.varDesercion, '')!, tono: tonoVariacion(calculo.varDesercion, true) } : undefined}
          pie="Matrículas retiradas o desertoras en el corte"
        />
        <KpiCard
          titulo="Cumplimiento instructores"
          valor={porcentaje(actual.cumplimiento)}
          icono={UserRoundCheck}
          tono="primario"
          ruta="/admin/instructores"
          insignia={variacionTexto(calculo.varCumplimiento, '') ? { texto: variacionTexto(calculo.varCumplimiento, '')!, tono: tonoVariacion(calculo.varCumplimiento) } : undefined}
          pie="Registro oportuno de asistencia"
        />
        <KpiCard
          titulo="Fichas monitoreadas"
          valor={actual.fichasConDatos}
          unidad={`de ${activas}`}
          icono={FileText}
          tono="informacion"
          insignia={activas ? { texto: porcentaje((actual.fichasConDatos * 100) / activas, 1), tono: 'neutro' } : undefined}
          pie="Fichas con asistencia cargada"
        />
      </div>

      {/* 2 — Estadísticas y comparación */}
      <SeccionComparacion datos={datos} corte={corte} hoy={hoy} catalogos={catalogos} parametros={parametros} cambiar={cambiar} />

      {/* 3 — Acciones de gestión (Prototipo) */}
      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-primario/10 px-2.5 py-0.5 text-xs font-bold tracking-wide text-primario uppercase">Acciones de gestión</span>
            <span className="text-texto-apoyo">Exportación oficial de las estadísticas del corte</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-texto-secundario">
            <Clock className="size-3.5" aria-hidden /> Corte generado: <strong className="text-texto-principal">{generadoEn}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={clasesBoton('secundario')} onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden /> Descargar como PDF
          </button>
          <button type="button" className={clasesBoton('secundario')} onClick={exportarComparativa}>
            <FileDown className="size-4" aria-hidden /> Exportar datos (CSV)
          </button>
          <Link to="/admin/reportes?tipo=estadisticas" className={clasesBoton('primario')}>
            <FileText className="size-4" aria-hidden /> Generar reporte detallado
          </Link>
        </div>
      </Card>

      {/* 4 — Comparativa global */}
      <section className="space-y-3" aria-labelledby="titulo-comparativa">
        <div>
          <h2 id="titulo-comparativa" className="text-lg font-semibold">
            Comparativa global por sedes, áreas, programas y jornadas
          </h2>
          <p className="text-sm text-texto-secundario">Porcentaje de asistencia del corte {corte.etiqueta} y tendencia frente al corte anterior.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaComparativa titulo="Por sede" icono={Building2} unidad="sedes" filas={calculo.comparativas.sede} />
          <TarjetaComparativa titulo="Por área" icono={Layers} unidad="áreas" filas={calculo.comparativas.area} />
          <TarjetaComparativa titulo="Por programa" icono={GraduationCap} unidad="programas" filas={calculo.comparativas.programa} />
          <TarjetaComparativa titulo="Por jornada" icono={Clock} unidad="jornadas" filas={calculo.comparativas.jornada} />
        </div>
      </section>

      {/* 5 — Deserción y cumplimiento */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-base font-semibold sm:text-lg">Tasa de deserción de aprendices</h2>
          <p className="mb-4 text-xs text-texto-secundario">Matrículas retiradas o desertoras sobre el total matriculado, por programa (meta institucional &lt; 5 %).</p>
          {calculo.desercion.length === 0 ? (
            <EmptyState titulo="Sin matrículas" descripcion="No hay matrículas vigentes en el corte." compacto />
          ) : (
            <ul className="space-y-3">
              {calculo.desercion.map((d) => (
                <li key={d.programa} className="space-y-1">
                  <p className="flex justify-between gap-2 text-sm">
                    <span className="text-texto-apoyo">{d.programa}</span>
                    <span className="font-semibold">{porcentaje(d.tasa, 1)}</span>
                  </p>
                  <ProgressBar valor={Math.min(100, (d.tasa ?? 0) * 5)} etiqueta={`Deserción en ${d.programa}: ${porcentaje(d.tasa, 1)}`} tono={(d.tasa ?? 0) >= 5 ? 'critico' : (d.tasa ?? 0) >= 3 ? 'advertencia' : 'exito'} mostrarValor={false} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex flex-col p-5">
          <h2 className="text-base font-semibold sm:text-lg">Cumplimiento de instructores</h2>
          <p className="mb-4 text-xs text-texto-secundario">Distribución de los instructores según su registro de asistencia en el corte.</p>
          {inst.total === 0 ? (
            <EmptyState titulo="Sin sesiones" descripcion="No hay sesiones vencidas en el corte." compacto />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <Dona
                partes={[
                  { etiqueta: 'Alto desempeño', valor: pctInst(inst.al_dia), color: 'var(--color-confirmacion)' },
                  { etiqueta: 'Rendimiento medio', valor: pctInst(inst.seguimiento), color: 'var(--color-advertencia)' },
                  { etiqueta: 'Rendimiento bajo', valor: pctInst(inst.critico), color: 'var(--color-alerta-critica)' },
                ]}
                centro={String(inst.total)}
                etiquetaCentro="Instructores"
              />
              <ul className="w-full space-y-2 text-sm">
                {(
                  [
                    ['Alto desempeño (≥ 80 %)', inst.al_dia, 'bg-confirmacion'],
                    ['Rendimiento medio (60–79 %)', inst.seguimiento, 'bg-advertencia'],
                    ['Rendimiento bajo (< 60 %)', inst.critico, 'bg-alerta-critica'],
                  ] as const
                ).map(([etiqueta, n, color]) => (
                  <li key={etiqueta} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-texto-apoyo">
                      <span className={cn('size-2.5 rounded-full', color)} aria-hidden /> {etiqueta}
                    </span>
                    <span className="font-semibold">
                      ({n}) {porcentaje(pctInst(n))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link to="/admin/instructores" className="mt-auto pt-4 text-sm font-semibold text-primario hover:underline print:hidden">
            Ver panel completo de instructores →
          </Link>
        </Card>
      </div>
    </>
  )
}

function TarjetaComparativa({ titulo, icono: Icono, unidad, filas }: { titulo: string; icono: typeof Building2; unidad: string; filas: ReturnType<typeof comparativa> }) {
  return (
    <Card className="p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-titulos text-xs font-bold tracking-wide text-texto-principal uppercase">
          <Icono className="size-4 text-primario" aria-hidden /> {titulo}
        </h3>
        <span className="text-xs text-texto-secundario">
          {filas.length} {unidad}
        </span>
      </header>
      {filas.length === 0 ? (
        <p className="text-sm text-texto-secundario">Sin registros en el corte.</p>
      ) : (
        <ul className="space-y-3">
          {filas.slice(0, 4).map((f) => (
            <li key={f.clave} className="space-y-1">
              <p className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-texto-apoyo" title={f.nombre}>
                  {f.nombre}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 font-semibold">
                  {porcentaje(f.valor)}
                  {f.tendencia != null && Math.round(f.tendencia) !== 0 && (
                    <span className={cn('flex items-center text-xs', f.tendencia > 0 ? 'text-confirmacion' : 'text-alerta-critica')}>
                      {f.tendencia > 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />}
                      {Math.abs(Math.round(f.tendencia))} %<span className="sr-only">{f.tendencia > 0 ? ' más' : ' menos'} que el corte anterior</span>
                    </span>
                  )}
                </span>
              </p>
              <ProgressBar valor={f.valor ?? 0} etiqueta={`Asistencia de ${f.nombre}`} mostrarValor={false} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
