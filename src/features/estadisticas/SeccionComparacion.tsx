import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Calculator, CircleAlert, Eye, FileDown, GitCompareArrows, Printer, RotateCcw, Search, SlidersHorizontal, TriangleAlert, Trophy, X } from 'lucide-react'
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
  menorEsMejor,
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
/** Máximo de elementos en la comparación (decisión del usuario 2026-11-24) */
export const MAXIMO_COMPARACION = 5

const CENTRO: Record<Estadistica, string> = { asistencia: 'Asistencia', registro: 'Cumplimiento', desercion: 'Deserción' }
const META: Record<Estadistica, string> = {
  asistencia: 'Meta institucional mínima: 80 %',
  registro: 'Meta institucional mínima: 80 %',
  desercion: 'Meta institucional: menos del 5 %',
}

/**
 * HU04.1 / RF14 / RF15 — "Estadísticas y comparación". Prototipo: tarjeta con conmutador "Ver una estadística" /
 * "Comparar fichas", filtros y resultado. VersionAntigua: dimensiones (ficha, sede, área, programa, jornada, competencia),
 * "Más filtros", búsqueda y comparación con resumen y conclusión. Se eligen varios elementos a la vez (hasta 5) y la
 * estadística puede ser asistencia, registro (cumplimiento) o deserción.
 */
export function SeccionComparacion({ datos, corte, hoy, catalogos, parametros, cambiar }: Props) {
  const modo = parametros.get('modo') === 'individual' ? 'individual' : 'comparar'
  const estParam = parametros.get('est')
  const est: Estadistica = estParam === 'registro' || estParam === 'desercion' ? estParam : 'asistencia'
  // La deserción se mide sobre matrículas de la ficha: no aplica por competencia
  const dimensiones = est === 'desercion' ? DIMENSIONES.filter((d) => d.valor !== 'competencia') : DIMENSIONES
  const dim = (dimensiones.some((d) => d.valor === parametros.get('dim')) ? parametros.get('dim') : 'ficha') as Dimension
  const filtros: FiltrosFicha = { sede: parametros.get('sede') ?? '', area: parametros.get('area') ?? '', programa: parametros.get('programa') ?? '', jornada: parametros.get('jornada') ?? '' }
  const q = parametros.get('q') ?? ''
  const hayFiltros = Object.values(filtros).some(Boolean) || !!q

  const lista = useMemo(() => elementos(datos, corte, dim, filtros, hoy), [datos, corte, dim, filtros.sede, filtros.area, filtros.programa, filtros.jornada, hoy]) // eslint-disable-line react-hooks/exhaustive-deps
  const conDatos = lista.filter((e) => valorElemento(e, est) != null)
  const porClave = new Map(lista.map((e) => [e.clave, e]))
  const coincide = (e: Elemento) => !q.trim() || e.nombre.toLowerCase().includes(q.trim().toLowerCase())

  const individual = porClave.get(parametros.get('el') ?? '') ?? conDatos[0] ?? lista[0]
  // Selección múltiple en la URL (?sel=a,b,c); sin selección se toman los 3 primeros con datos
  const selParam = parametros.get('sel')
  const seleccion = (selParam != null ? selParam.split(',').map((c) => porClave.get(c)) : conDatos.slice(0, 3))
    .filter((e): e is Elemento => !!e)
    .slice(0, MAXIMO_COMPARACION)

  function alternar(clave: string) {
    const actuales = seleccion.map((e) => e.clave)
    const nuevas = actuales.includes(clave) ? actuales.filter((c) => c !== clave) : [...actuales, clave].slice(0, MAXIMO_COMPARACION)
    cambiar({ sel: nuevas.join(',') || ',' })
  }

  function limpiar() {
    cambiar({ sede: '', area: '', programa: '', jornada: '', q: '', el: '', sel: '' })
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

  return (
    <Card className="p-5 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-borde pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Estadísticas y comparación de {ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()}</h2>
          <p className="text-sm text-texto-secundario">Consulta un elemento en detalle o compara varios entre sí (hasta {MAXIMO_COMPARACION} a la vez).</p>
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
          <Select
            etiqueta="¿Qué estadística?"
            opciones={ESTADISTICAS}
            value={est}
            onChange={(e) => cambiar({ est: e.target.value === 'asistencia' ? '' : e.target.value, ...(e.target.value === 'desercion' && dim === 'competencia' ? { dim: '', el: '', sel: '' } : {}) })}
          />
          <Select
            etiqueta={modo === 'individual' ? '¿Qué quieres consultar?' : '¿Qué comparar?'}
            opciones={dimensiones}
            value={dim}
            onChange={(e) => cambiar({ dim: e.target.value === 'ficha' ? '' : e.target.value, el: '', sel: '', q: '' })}
          />
          <Input
            etiqueta={`Buscar ${ETIQUETA_DIMENSION[dim].toLowerCase()}`}
            type="search"
            placeholder={dim === 'ficha' ? 'Buscar ficha por número' : 'Buscar por nombre'}
            iconoIzquierda={<Search className="size-4" />}
            value={q}
            onChange={(e) => cambiar({ q: e.target.value })}
          />
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
          <Button variante="fantasma" className="self-end" icono={<RotateCcw className="size-4" aria-hidden />} onClick={limpiar} disabled={!hayFiltros && selParam == null}>
            Limpiar
          </Button>
        </div>

        {modo === 'individual' ? (
          <Select
            etiqueta={ETIQUETA_DIMENSION[dim]}
            opciones={lista.filter(coincide).map((e) => ({ valor: e.clave, etiqueta: e.nombre }))}
            value={individual?.clave ?? ''}
            onChange={(e) => cambiar({ el: e.target.value })}
            disabled={!lista.length}
          />
        ) : (
          <SelectorMultiple dim={dim} est={est} opciones={lista.filter(coincide)} seleccion={seleccion} onAlternar={alternar} onQuitarTodos={() => cambiar({ sel: ',' })} />
        )}
      </div>

      {lista.length === 0 ? (
        <EmptyState titulo="Sin datos" descripcion={`No hay registros en el corte ${corte.etiqueta} con los filtros aplicados.`} />
      ) : modo === 'individual' && individual ? (
        <ResultadoIndividual elemento={individual} dim={dim} est={est} corte={corte} onLista={() => listaDetallada(individual)} />
      ) : seleccion.length < 2 ? (
        <EmptyState icono={GitCompareArrows} titulo="Elija al menos 2 elementos" descripcion={`Marque entre 2 y ${MAXIMO_COMPARACION} ${ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()} para compararlos.`} />
      ) : (
        <ResultadoComparacion elementos={seleccion} dim={dim} est={est} corte={corte} />
      )}
    </Card>
  )
}

/** Selección de varios elementos a la vez (casillas con buscador), con un máximo de MAXIMO_COMPARACION */
function SelectorMultiple({
  dim,
  est,
  opciones,
  seleccion,
  onAlternar,
  onQuitarTodos,
}: {
  dim: Dimension
  est: Estadistica
  opciones: Elemento[]
  seleccion: Elemento[]
  onAlternar: (clave: string) => void
  onQuitarTodos: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const elegidas = new Set(seleccion.map((e) => e.clave))
  const lleno = seleccion.length >= MAXIMO_COMPARACION

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-semibold text-texto-principal">
        {ETIQUETA_DIMENSION_PLURAL[dim]} a comparar{' '}
        <span className="font-normal text-texto-secundario">
          ({seleccion.length} de {MAXIMO_COMPARACION} como máximo)
        </span>
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        {seleccion.map((e) => (
          <span key={e.clave} className="inline-flex items-center gap-1.5 rounded-full border border-primario/25 bg-primario/10 py-1 pr-1 pl-3 text-sm font-semibold text-primario">
            {e.nombre.split(' — ')[0]}
            <button
              type="button"
              onClick={() => onAlternar(e.clave)}
              className="rounded-full p-0.5 hover:bg-primario/15 focus-visible:outline-2 focus-visible:outline-primario"
              aria-label={`Quitar ${e.nombre} de la comparación`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <Button variante="secundario" tamano="sm" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Cerrar lista' : `Elegir ${ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()}`}
        </Button>
        {seleccion.length > 0 && (
          <Button variante="fantasma" tamano="sm" onClick={onQuitarTodos}>
            Quitar todas
          </Button>
        )}
      </div>
      {abierto && (
        <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-borde p-2 sm:grid-cols-2 lg:grid-cols-3">
          {opciones.length === 0 && <li className="p-2 text-sm text-texto-secundario">Ningún elemento coincide con la búsqueda.</li>}
          {opciones.map((e) => {
            const marcada = elegidas.has(e.clave)
            const v = valorElemento(e, est)
            return (
              <li key={e.clave}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-fondo-seccion-alterna',
                    !marcada && lleno && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input type="checkbox" className="size-4 accent-primario" checked={marcada} disabled={!marcada && lleno} onChange={() => onAlternar(e.clave)} />
                  <span className="min-w-0 flex-1 truncate" title={e.nombre}>
                    {e.nombre}
                  </span>
                  <span className="shrink-0 text-xs text-texto-secundario">{porcentaje(v)}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <p className="flex items-center gap-2 text-xs text-texto-secundario">
        <CircleAlert className="size-4 text-informacion" aria-hidden /> Puede comparar hasta {MAXIMO_COMPARACION} {ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()} a la vez para mantener la comparación legible.
      </p>
    </fieldset>
  )
}

function ResultadoIndividual({ elemento: e, dim, est, corte, onLista }: { elemento: Elemento; dim: Dimension; est: Estadistica; corte: Corte; onLista: () => void }) {
  const valor = valorElemento(e, est)
  const nivel = nivelElemento(valor, est)
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
  const pie =
    est === 'asistencia'
      ? `Total registros: ${e.distribucion.total.toLocaleString('es-CO')}`
      : est === 'registro'
        ? `Sesiones vencidas: ${e.registro.vencidas.toLocaleString('es-CO')}`
        : `Matrículas vigentes en el corte: ${(e.desercion?.base ?? 0).toLocaleString('es-CO')}`

  return (
    <section className="space-y-5 pt-5" aria-label={`Consulta detallada: ${e.nombre}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-texto-secundario uppercase">Consulta detallada · {ETIQUETA_DIMENSION[dim]}</p>
          <h3 className="text-lg font-semibold">{e.nombre}</h3>
        </div>
        <div className="flex gap-2">
          <Badge tono={nivel.tono} conBorde>
            {porcentaje(valor, est === 'desercion' ? 1 : 0)} {nivel.texto}
          </Badge>
          <Badge tono="neutro">Corte {corte.etiqueta}</Badge>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col items-center gap-2">
          <Dona partes={p} centro={porcentaje(valor, est === 'desercion' ? 1 : 0)} etiquetaCentro={CENTRO[est]} />
          <p className="text-xs text-texto-secundario">{META[est]}</p>
        </div>
        <div className="space-y-3 rounded-xl border border-borde p-4">
          <h4 className="text-sm font-semibold">{est === 'asistencia' ? 'Desglose de asistencia' : est === 'registro' ? 'Desglose del registro' : 'Desglose de la permanencia'}</h4>
          {p.map((x) => (
            <div key={x.etiqueta} className="space-y-1">
              <p className="flex items-center gap-2 text-sm text-texto-apoyo">
                <span className={cn('size-2.5 rounded-full', x.texto)} aria-hidden /> {x.etiqueta}
              </p>
              <ProgressBar valor={x.valor} etiqueta={x.etiqueta} tono={x.texto === 'bg-confirmacion' ? 'exito' : x.texto === 'bg-advertencia' ? 'advertencia' : 'critico'} />
            </div>
          ))}
          <p className="border-t border-borde pt-2 text-xs text-texto-secundario">{pie}</p>
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
        <p className="text-xs text-texto-secundario">Los datos se consolidan a partir de los registros del corte {corte.etiqueta}.</p>
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

function ResultadoComparacion({ elementos: lista, dim, est, corte }: { elementos: Elemento[]; dim: Dimension; est: Estadistica; corte: Corte }) {
  const decimales = est === 'desercion' ? 1 : 0
  const inverso = menorEsMejor(est)
  const valores = lista.map((e) => ({ e, v: valorElemento(e, est) })).filter((x): x is { e: Elemento; v: number } => x.v != null)
  const mayor = valores.reduce<(typeof valores)[number] | null>((a, b) => (!a || b.v > a.v ? b : a), null)
  const menor = valores.reduce<(typeof valores)[number] | null>((a, b) => (!a || b.v < a.v ? b : a), null)
  // En deserción el mejor es el de menor tasa
  const mejor = inverso ? menor : mayor
  const peor = inverso ? mayor : menor
  const promedio = valores.length ? valores.reduce((t, x) => t + x.v, 0) / valores.length : null
  const brecha = mayor && menor ? mayor.v - menor.v : null
  const nombreCorto = (e: Elemento) => e.nombre.split(' — ')[0]
  const injustificadaPeor = peor && est === 'asistencia' && peor.e.distribucion.total ? (peor.e.distribucion.ausentes * 100) / peor.e.distribucion.total : null
  const nombreIndicador = est === 'asistencia' ? 'asistencia' : est === 'registro' ? 'cumplimiento en el registro' : 'deserción'

  return (
    <section className="space-y-5 pt-5" aria-label="Resultado de la comparación">
      <div className={cn('grid gap-4 sm:grid-cols-2', lista.length === 3 && 'xl:grid-cols-3', lista.length === 4 && 'xl:grid-cols-4', lista.length === 5 && 'lg:grid-cols-3 xl:grid-cols-5')}>
        {lista.map((e) => {
          const v = valorElemento(e, est)
          const nivel = nivelElemento(v, est)
          return (
            <article key={e.clave} className={cn('rounded-2xl border border-t-4 bg-fondo-tarjeta p-4', TONO_BORDE[nivel.tono], nivel.tono === 'critico' && 'ring-1 ring-alerta-critica/30')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-texto-secundario uppercase">{ETIQUETA_DIMENSION[dim]}</p>
                  <h3 className="font-semibold">{e.nombre}</h3>
                </div>
                <Badge tono={nivel.tono}>
                  {porcentaje(v, decimales)} {nivel.texto}
                </Badge>
              </div>
              <div className="my-4 flex justify-center">
                <Dona partes={partes(e, est)} centro={porcentaje(v, decimales)} etiquetaCentro={CENTRO[est]} tamano="sm" tonoCentro={nivel.tono === 'critico' ? 'text-alerta-critica' : undefined} />
              </div>
              <ul className="space-y-1.5 text-sm">
                {partes(e, est).map((x) => (
                  <li key={x.etiqueta} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-texto-apoyo">
                      <span className={cn('size-2.5 rounded-full', x.texto)} aria-hidden /> {x.etiqueta}
                    </span>
                    <span className="font-semibold">{porcentaje(x.valor, decimales)}</span>
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

      {mejor && peor && promedio != null && (
        <div className="space-y-3 border-t border-borde pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-texto-secundario uppercase">Resumen de la comparación</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResumenDato icono={<Calculator className="size-4" />} tono="bg-fondo-seccion-alterna text-texto-apoyo" etiqueta={`Promedio entre los ${valores.length} elementos`} valor={porcentaje(promedio, 1)} />
            <ResumenDato icono={<Trophy className="size-4" />} tono="bg-confirmacion/10 text-confirmacion" etiqueta={inverso ? 'Menor deserción' : 'Mayor'} valor={`${nombreCorto(mejor.e)} (${porcentaje(mejor.v, decimales)})`} />
            <ResumenDato icono={<TriangleAlert className="size-4" />} tono="bg-alerta-critica/10 text-alerta-critica" etiqueta={inverso ? 'Mayor deserción' : 'Menor'} valor={`${nombreCorto(peor.e)} (${porcentaje(peor.v, decimales)})`} />
            <ResumenDato icono={<ArrowLeftRight className="size-4" />} tono="bg-advertencia/15 text-texto-principal" etiqueta="Brecha entre el mayor y el menor" valor={`${(Math.round((brecha ?? 0) * 10) / 10).toLocaleString('es-CO')} pts`} />
          </div>
          <p className="rounded-xl border border-borde bg-fondo-seccion-alterna p-4 text-sm text-texto-apoyo">
            <strong className="text-texto-principal">Diagnóstico automático:</strong> de los {valores.length} {ETIQUETA_DIMENSION_PLURAL[dim].toLowerCase()} comparados en el corte {corte.etiqueta},{' '}
            <strong className="text-texto-principal">{mejor.e.nombre}</strong> tiene el mejor resultado con {porcentaje(mejor.v, decimales)} de {nombreIndicador}, mientras que{' '}
            <strong className="text-texto-principal">{peor.e.nombre}</strong> presenta {porcentaje(peor.v, decimales)}
            {injustificadaPeor != null && <> y {porcentaje(injustificadaPeor)} de inasistencias sin justificar</>}: una brecha de{' '}
            {(Math.round((brecha ?? 0) * 10) / 10).toLocaleString('es-CO')} puntos frente al mejor.
            {(inverso ? peor.v >= 5 : peor.v < 80) && <> Se recomienda dar seguimiento cercano a {nombreCorto(peor.e)}.</>}
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
