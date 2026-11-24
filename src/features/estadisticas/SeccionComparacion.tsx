import { useMemo, type ReactNode } from 'react'
import { ArrowLeftRight, Calculator, CircleAlert, Eye, FileDown, GitCompareArrows, Printer, RotateCcw, Search, SlidersHorizontal, TriangleAlert, Trophy } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, ProgressBar, Select } from '@/components/ui'
import { TONO_BORDE } from '@/components/ui/tonos'
import { registrarEvento } from '@/features/auth/servicioAuth'
import type { Catalogos } from '@/features/catalogos/servicioCatalogos'
import { descargarCSV } from '@/lib/csv'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_JORNADA, opcionesDe } from '@/types/dominio'
import { Dona } from './Dona'
import {
  ENCABEZADOS_CSV,
  ETIQUETA_DIMENSION,
  ETIQUETA_DIMENSION_PLURAL,
  ETIQUETA_ESTADISTICA,
  elementos,
  filasCSV,
  nivelElemento,
  partes,
  valorElemento,
  type Corte,
  type Dimension,
  type Elemento,
  type Estadistica,
  type FiltrosFicha,
} from './presentacion'
import type { DatosEstadisticas } from './servicioEstadisticas'

interface Props {
  datos: DatosEstadisticas
  corte: Corte
  hoy: string
  catalogos: Catalogos | null
  parametros: URLSearchParams
  cambiar: (cambios: Record<string, string>) => void
}

const DIMENSIONES = opcionesDe(ETIQUETA_DIMENSION)
const ESTADISTICAS = opcionesDe(ETIQUETA_ESTADISTICA)
const LETRAS = ['A', 'B', 'C', 'D']

/**
 * HU04.1 / RF14 / RF15 — "Estadísticas y comparación". Prototipo: tarjeta con conmutador "Ver una estadística" /
 * "Comparar fichas", filtros y resultado. VersionAntigua: dimensiones (ficha, sede, área, programa, jornada, competencia),
 * "Más filtros", búsqueda y comparación de hasta 4 elementos con resumen y conclusión.
 */
export function SeccionComparacion({ datos, corte, hoy, catalogos, parametros, cambiar }: Props) {
  const modo = parametros.get('modo') === 'individual' ? 'individual' : 'comparar'
  const est = (parametros.get('est') as Estadistica) === 'registro' ? 'registro' : 'asistencia'
  const dim = (DIMENSIONES.some((d) => d.valor === parametros.get('dim')) ? parametros.get('dim') : 'ficha') as Dimension
  const cantidad = Math.min(4, Math.max(2, Number(parametros.get('cant')) || 3))
  const filtros: FiltrosFicha = { sede: parametros.get('sede') ?? '', area: parametros.get('area') ?? '', programa: parametros.get('programa') ?? '', jornada: parametros.get('jornada') ?? '' }
  const q = parametros.get('q') ?? ''
  const hayFiltros = Object.values(filtros).some(Boolean) || !!q

  const lista = useMemo(() => elementos(datos, corte, dim, filtros, hoy), [datos, corte, dim, filtros.sede, filtros.area, filtros.programa, filtros.jornada, hoy]) // eslint-disable-line react-hooks/exhaustive-deps
  const conDatos = lista.filter((e) => valorElemento(e, est) != null)
  const opciones = lista.filter((e) => !q.trim() || e.nombre.toLowerCase().includes(q.trim().toLowerCase())).map((e) => ({ valor: e.clave, etiqueta: e.nombre }))
  const porClave = new Map(lista.map((e) => [e.clave, e]))

  const individual = porClave.get(parametros.get('el') ?? '') ?? conDatos[0] ?? lista[0]
  const seleccion = Array.from({ length: cantidad }, (_, i) => porClave.get(parametros.get(`e${i}`) ?? '') ?? conDatos[i] ?? lista[i]).filter((e): e is Elemento => !!e)

  function limpiar() {
    cambiar({ sede: '', area: '', programa: '', jornada: '', q: '', el: '', e0: '', e1: '', e2: '', e3: '' })
  }

  function descargar(nombre: string, filas: Elemento[]) {
    descargarCSV(`estadisticas-${nombre}-${corte.clave}`, ENCABEZADOS_CSV, filasCSV(filas))
    void registrarEvento('reportes', 'descarga', `Exportó estadísticas (${nombre}, corte ${corte.clave})`)
  }

  /** Lista detallada del elemento: por competencia si es una ficha; por ficha en las demás dimensiones */
  function listaDetallada(e: Elemento) {
    const sinFiltros = { sede: '', area: '', programa: '', jornada: '' }
    const sub = { ...datos, fichas: e.fichas }
    const detalle = dim === 'ficha' ? elementos(sub, corte, 'competencia', sinFiltros, hoy) : elementos(sub, corte, 'ficha', sinFiltros, hoy)
    descargar(`${ETIQUETA_DIMENSION[dim].toLowerCase()}-${e.nombre.split(' — ')[0].replace(/\s+/g, '-')}`, detalle)
  }

  const etiquetaCentro = est === 'asistencia' ? 'Asistencia' : 'Cumplimiento'

  return (
    <Card className="p-5 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-borde pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Estadísticas y comparación de {ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()}</h2>
          <p className="text-sm text-texto-secundario">Consulta un elemento en detalle o compara varios entre sí (hasta 4 a la vez).</p>
        </div>
        <div className="flex rounded-lg border border-borde bg-fondo-seccion-alterna p-1 print:hidden" role="group" aria-label="Modo de consulta">
          {(
            [
              ['individual', 'Ver una estadística', Eye],
              ['comparar', `Comparar ${ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()} (${seleccion.length} activas)`, GitCompareArrows],
            ] as const
          ).map(([valor, texto, Icono]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={modo === valor}
              onClick={() => cambiar({ modo: valor === 'comparar' ? '' : valor })}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-titulos text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primario',
                modo === valor ? 'bg-primario text-white shadow-sm' : 'text-texto-apoyo hover:bg-white',
              )}
            >
              <Icono className="size-4" aria-hidden /> {texto}
            </button>
          ))}
        </div>
      </header>

      {/* Filtros (Prototipo + "Más filtros" de VersionAntigua) */}
      <div className="space-y-3 border-b border-borde py-4 print:hidden">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <Select etiqueta="¿Qué estadística?" opciones={ESTADISTICAS} value={est} onChange={(e) => cambiar({ est: e.target.value === 'asistencia' ? '' : e.target.value })} />
          <Select
            etiqueta={modo === 'individual' ? '¿Qué quieres consultar?' : '¿Qué comparar?'}
            opciones={DIMENSIONES}
            value={dim}
            onChange={(e) => cambiar({ dim: e.target.value === 'ficha' ? '' : e.target.value, el: '', e0: '', e1: '', e2: '', e3: '', q: '' })}
          />
          {modo === 'comparar' ? (
            <Select
              etiqueta="Cantidad"
              opciones={[2, 3, 4].map((n) => ({ valor: String(n), etiqueta: `${n} elementos` }))}
              value={String(cantidad)}
              onChange={(e) => cambiar({ cant: e.target.value === '3' ? '' : e.target.value })}
            />
          ) : (
            <Input
              etiqueta={`Buscar ${ETIQUETA_DIMENSION[dim].toLowerCase()}`}
              type="search"
              placeholder={dim === 'ficha' ? 'Buscar ficha por número' : 'Buscar por nombre'}
              iconoIzquierda={<Search className="size-4" />}
              value={q}
              onChange={(e) => cambiar({ q: e.target.value })}
            />
          )}
          <details className="group relative self-end">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-borde bg-fondo-seccion-alterna px-3 text-sm font-semibold text-texto-apoyo hover:bg-fondo-tarjeta-suave">
              <SlidersHorizontal className="size-4" aria-hidden /> Más filtros
            </summary>
            <div className="absolute z-10 mt-2 grid w-[min(90vw,640px)] gap-3 rounded-xl border border-borde bg-fondo-tarjeta p-4 shadow-lg sm:grid-cols-2">
              <Select etiqueta="Sede" placeholder="Todas" opciones={(catalogos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))} value={filtros.sede} onChange={(e) => cambiar({ sede: e.target.value })} />
              <Select etiqueta="Área" placeholder="Todas" opciones={(catalogos?.areas ?? []).map((a) => ({ valor: String(a.id), etiqueta: a.nombre }))} value={filtros.area} onChange={(e) => cambiar({ area: e.target.value })} />
              <Select etiqueta="Programa" placeholder="Todos" opciones={(catalogos?.programas ?? []).map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))} value={filtros.programa} onChange={(e) => cambiar({ programa: e.target.value })} />
              <Select etiqueta="Jornada" placeholder="Todas" opciones={opcionesDe(ETIQUETA_JORNADA)} value={filtros.jornada} onChange={(e) => cambiar({ jornada: e.target.value })} />
            </div>
          </details>
          <Button variante="fantasma" className="self-end" icono={<RotateCcw className="size-4" aria-hidden />} onClick={limpiar} disabled={!hayFiltros}>
            Limpiar
          </Button>
        </div>

        {modo === 'individual' ? (
          <Select etiqueta={ETIQUETA_DIMENSION[dim]} opciones={opciones} value={individual?.clave ?? ''} onChange={(e) => cambiar({ el: e.target.value })} disabled={!opciones.length} />
        ) : (
          <div className={cn('grid gap-3 sm:grid-cols-2', cantidad === 3 && 'lg:grid-cols-3', cantidad === 4 && 'lg:grid-cols-4')}>
            {Array.from({ length: cantidad }, (_, i) => (
              <Select
                key={i}
                etiqueta={`Elemento ${LETRAS[i]}${i === 0 ? ' (referencia)' : ''}`}
                opciones={opciones}
                value={seleccion[i]?.clave ?? ''}
                onChange={(e) => cambiar({ [`e${i}`]: e.target.value })}
                disabled={!opciones.length}
              />
            ))}
          </div>
        )}
        {modo === 'comparar' && (
          <p className="flex items-center gap-2 text-xs text-texto-secundario">
            <CircleAlert className="size-4 text-informacion" aria-hidden /> Comparando {seleccion.length} {ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()} en el corte {corte.etiqueta}. El máximo es 4 elementos a la vez, para mantener la comparación legible.
          </p>
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState titulo="Sin datos" descripcion={`No hay registros de asistencia en el corte ${corte.etiqueta} con los filtros aplicados.`} />
      ) : modo === 'individual' && individual ? (
        <ResultadoIndividual elemento={individual} dim={dim} est={est} corte={corte} etiquetaCentro={etiquetaCentro} onLista={() => listaDetallada(individual)} />
      ) : (
        <ResultadoComparacion elementos={seleccion} dim={dim} est={est} corte={corte} etiquetaCentro={etiquetaCentro} />
      )}
    </Card>
  )
}

function ResultadoIndividual({ elemento: e, dim, est, corte, etiquetaCentro, onLista }: { elemento: Elemento; dim: Dimension; est: Estadistica; corte: Corte; etiquetaCentro: string; onLista: () => void }) {
  const valor = valorElemento(e, est)
  const nivel = nivelElemento(valor)
  const p = partes(e, est)
  const ficha = dim === 'ficha' ? e.fichas[0] : null
  const aprendices = e.fichas.reduce((t, f) => t + f.aprendicesActivos, 0)
  const datosClave: Array<[string, string]> = ficha
    ? [
        ['Aprendices matriculados', `${ficha.aprendicesActivos} aprendices`],
        ['Sesiones registradas', `${e.registro.ejecutadas} sesiones con asistencia`],
        ['Instructor líder y sede', `${ficha.instructorLider ?? 'Sin instructor líder'} — ${ficha.sede}`],
      ]
    : [
        ['Fichas', `${e.fichas.length} fichas`],
        ['Aprendices matriculados', `${aprendices} aprendices`],
        ['Sesiones registradas', `${e.registro.ejecutadas} sesiones con asistencia`],
      ]

  return (
    <section className="space-y-5 pt-5" aria-label={`Consulta detallada: ${e.nombre}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-texto-secundario uppercase">Consulta detallada · {ETIQUETA_DIMENSION[dim]}</p>
          <h3 className="text-lg font-semibold">{e.nombre}</h3>
        </div>
        <div className="flex gap-2">
          <Badge tono={nivel.tono} conBorde>
            {porcentaje(valor)} {nivel.texto}
          </Badge>
          <Badge tono="neutro">Corte {corte.etiqueta}</Badge>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col items-center gap-2">
          <Dona partes={p} centro={porcentaje(valor)} etiquetaCentro={etiquetaCentro} />
          <p className="text-xs text-texto-secundario">Meta institucional mínima: 80 %</p>
        </div>
        <div className="space-y-3 rounded-xl border border-borde p-4">
          <h4 className="text-sm font-semibold">{est === 'asistencia' ? 'Desglose de asistencia' : 'Desglose del registro'}</h4>
          {p.map((x) => (
            <div key={x.etiqueta} className="space-y-1">
              <p className="flex items-center gap-2 text-sm text-texto-apoyo">
                <span className={cn('size-2.5 rounded-full', x.texto)} aria-hidden /> {x.etiqueta}
              </p>
              <ProgressBar valor={x.valor} etiqueta={x.etiqueta} tono={x.texto === 'bg-confirmacion' ? 'exito' : x.texto === 'bg-advertencia' ? 'advertencia' : 'critico'} />
            </div>
          ))}
          <p className="border-t border-borde pt-2 text-xs text-texto-secundario">
            {est === 'asistencia' ? `Total registros: ${e.distribucion.total.toLocaleString('es-CO')}` : `Sesiones vencidas: ${e.registro.vencidas.toLocaleString('es-CO')}`}
          </p>
        </div>
        <dl className="space-y-3 rounded-xl border border-borde p-4">
          <h4 className="text-sm font-semibold">Datos clave</h4>
          {datosClave.map(([etiqueta, valorDato]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-texto-secundario">{etiqueta}</dt>
              <dd className="font-semibold text-texto-principal">{valorDato}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-3 border-t border-borde pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <p className="text-xs text-texto-secundario">Los datos se consolidan a partir de los registros de asistencia del corte {corte.etiqueta}.</p>
        <div className="flex flex-wrap gap-2">
          <Button variante="secundario" icono={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>
            Boletín (PDF)
          </Button>
          <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={onLista}>
            Lista detallada (CSV)
          </Button>
        </div>
      </div>
    </section>
  )
}

function ResultadoComparacion({ elementos: lista, dim, est, corte, etiquetaCentro }: { elementos: Elemento[]; dim: Dimension; est: Estadistica; corte: Corte; etiquetaCentro: string }) {
  const valores = lista.map((e) => ({ e, v: valorElemento(e, est) })).filter((x): x is { e: Elemento; v: number } => x.v != null)
  const mayor = valores.reduce<(typeof valores)[number] | null>((a, b) => (!a || b.v > a.v ? b : a), null)
  const menor = valores.reduce<(typeof valores)[number] | null>((a, b) => (!a || b.v < a.v ? b : a), null)
  const promedio = valores.length ? valores.reduce((t, x) => t + x.v, 0) / valores.length : null
  const brecha = mayor && menor ? mayor.v - menor.v : null
  const nombreCorto = (e: Elemento) => e.nombre.split(' — ')[0]
  const injustificadaMenor = menor && est === 'asistencia' && menor.e.distribucion.total ? (menor.e.distribucion.ausentes * 100) / menor.e.distribucion.total : null

  return (
    <section className="space-y-5 pt-5" aria-label="Resultado de la comparación">
      <div className={cn('grid gap-4 sm:grid-cols-2', lista.length === 3 && 'xl:grid-cols-3', lista.length === 4 && 'xl:grid-cols-4')}>
        {lista.map((e) => {
          const v = valorElemento(e, est)
          const nivel = nivelElemento(v)
          return (
            <article key={e.clave} className={cn('rounded-2xl border border-t-4 bg-fondo-tarjeta p-4', TONO_BORDE[nivel.tono], nivel.tono === 'critico' && 'ring-1 ring-alerta-critica/30')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-texto-secundario uppercase">{ETIQUETA_DIMENSION[dim]}</p>
                  <h3 className="font-semibold">{e.nombre}</h3>
                </div>
                <Badge tono={nivel.tono}>
                  {porcentaje(v)} {nivel.texto}
                </Badge>
              </div>
              <div className="my-4 flex justify-center">
                <Dona partes={partes(e, est)} centro={porcentaje(v)} etiquetaCentro={etiquetaCentro} tamano="sm" tonoCentro={nivel.tono === 'critico' ? 'text-alerta-critica' : undefined} />
              </div>
              <ul className="space-y-1.5 text-sm">
                {partes(e, est).map((x) => (
                  <li key={x.etiqueta} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-texto-apoyo">
                      <span className={cn('size-2.5 rounded-full', x.texto)} aria-hidden /> {x.etiqueta}
                    </span>
                    <span className="font-semibold">{porcentaje(x.valor)}</span>
                  </li>
                ))}
              </ul>
              <p className={cn('mt-4 flex justify-between border-t border-borde pt-3 text-xs', nivel.tono === 'critico' ? 'text-alerta-critica' : 'text-texto-secundario')}>
                <span>{e.fichas.reduce((t, f) => t + f.aprendicesActivos, 0)} aprendices matriculados</span>
                <span className="font-semibold">{nivel.estado}</span>
              </p>
            </article>
          )
        })}
      </div>

      {mayor && menor && promedio != null && (
        <div className="space-y-3 border-t border-borde pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-texto-secundario uppercase">Resumen de la comparación</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumenDato icono={<Calculator className="size-4" />} tono="bg-fondo-seccion-alterna text-texto-apoyo" etiqueta={`Promedio entre los ${valores.length} elementos`} valor={porcentaje(promedio, 1)} />
            <ResumenDato icono={<Trophy className="size-4" />} tono="bg-confirmacion/10 text-confirmacion" etiqueta="Mayor" valor={`${nombreCorto(mayor.e)} (${porcentaje(mayor.v)})`} />
            <ResumenDato icono={<TriangleAlert className="size-4" />} tono="bg-alerta-critica/10 text-alerta-critica" etiqueta="Menor" valor={`${nombreCorto(menor.e)} (${porcentaje(menor.v)})`} />
            <ResumenDato icono={<ArrowLeftRight className="size-4" />} tono="bg-advertencia/15 text-texto-principal" etiqueta="Brecha entre el mayor y el menor" valor={`${Math.round(brecha ?? 0)} pts`} />
          </div>
          <p className="rounded-xl border border-borde bg-fondo-seccion-alterna p-4 text-sm text-texto-apoyo">
            <strong className="text-texto-principal">Diagnóstico automático:</strong> de los {valores.length} {ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()} comparados en el corte {corte.etiqueta},{' '}
            <strong className="text-texto-principal">{mayor.e.nombre}</strong> lidera con {porcentaje(mayor.v)} de {est === 'asistencia' ? 'asistencia' : 'cumplimiento en el registro'}, mientras que{' '}
            <strong className="text-texto-principal">{menor.e.nombre}</strong> presenta {porcentaje(menor.v)}
            {injustificadaMenor != null && <> y {porcentaje(injustificadaMenor)} de inasistencias sin justificar</>}: una brecha de {Math.round(brecha ?? 0)} puntos frente al mejor.
            {menor.v < 80 && <> Se recomienda dar seguimiento cercano a {nombreCorto(menor.e)} antes de que supere el límite institucional.</>}
          </p>
        </div>
      )}
    </section>
  )
}

function ResumenDato({ icono, tono, etiqueta, valor }: { icono: ReactNode; tono: string; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-borde p-3">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tono)} aria-hidden>
        {icono}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-texto-secundario">{etiqueta}</p>
        <p className="truncate font-titulos font-bold text-texto-principal">{valor}</p>
      </div>
    </div>
  )
}
