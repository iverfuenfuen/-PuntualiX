import { useState } from 'react'
import { FileCheck2, FileDown, Play, Printer, Search, SlidersHorizontal } from 'lucide-react'
import { Badge, Button, Card, Input, Select, Tabs, type Pestana } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import type { Catalogos } from '@/features/catalogos/servicioCatalogos'
import { fechaISOaTexto, hoyISO } from '@/features/fichas/presentacion'
import type { FichaResumen } from '@/features/fichas/servicioFichas'
import { NIVEL_CUMPLIMIENTO, nivelCumplimiento } from '@/features/instructores/presentacion'
import type { InstructorResumen } from '@/features/instructores/servicioInstructores'
import { ETIQUETA_JORNADA, opcionesDe } from '@/types/dominio'
import { generarReporte, type EntregaReporte } from './acciones'
import { ETIQUETA_ESTADISTICA_REPORTE } from './armadoReportes'
import { esquemaPeriodo } from './esquemas'
import type { EstadisticaReporte, NuevoReporte } from './servicioReportes'

export type PestanaReporte = 'ficha' | 'instructor' | 'estadisticas'

interface Props {
  fichas: FichaResumen[]
  instructores: InstructorResumen[]
  catalogos: Catalogos | null
  usuarioId: string
  pestanaInicial: PestanaReporte
  onGenerado: (mensaje: string, id: number) => void
}

const primeroDelMes = () => `${hoyISO().slice(0, 8)}01`

const DESCRIPCION: Record<PestanaReporte, string> = {
  ficha: 'Genera el reporte de desempeño general de la ficha seleccionada: asistencia, permanencia del grupo, aprendices activos y en riesgo de deserción, y asistencia por competencia.',
  instructor: 'Genera el reporte de desempeño del instructor seleccionado: cumplimiento en el registro de asistencia, fichas asignadas y asistencia de sus aprendices.',
  estadisticas: 'Genera un reporte con los indicadores generales del módulo de Estadísticas para el tipo y periodo seleccionado.',
}

/**
 * "Generar nuevo reporte" — pestañas de VersionAntigua (Ficha, Instructor, Estadísticas) con el diseño del Prototipo
 * (fechas, "Más filtros", búsqueda, selección y tarjeta de resultado con Generar / Descargar PDF / CSV).
 * Sin "Alertas & Deserción" del Prototipo: lista aprendices (decisión del usuario: solo totales por ficha).
 */
export function PanelGenerar({ fichas, instructores, catalogos, usuarioId, pestanaInicial, onGenerado }: Props) {
  const [pestana, setPestana] = useState<PestanaReporte>(pestanaInicial)
  const [periodo, setPeriodo] = useState({ desde: primeroDelMes(), hasta: hoyISO() })
  const [filtros, setFiltros] = useState({ sede: '', area: '', programa: '', jornada: '', nivel: '' })
  const [q, setQ] = useState('')
  const [fichaId, setFichaId] = useState('')
  const [instructorId, setInstructorId] = useState('')
  const [estadistica, setEstadistica] = useState<EstadisticaReporte>('sede')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<EntregaReporte | null>(null)

  const texto = q.trim().toLowerCase()
  const fichasFiltradas = fichas
    .filter((f) => f.estado !== 'inactiva')
    .filter((f) => (!filtros.sede || String(f.sedeId) === filtros.sede) && (!filtros.area || String(f.areaId) === filtros.area))
    .filter((f) => (!filtros.programa || String(f.programaId) === filtros.programa) && (!filtros.jornada || f.jornada === filtros.jornada))
    .filter((f) => !texto || f.numero.includes(texto) || f.sede.toLowerCase().includes(texto))
  const instructoresFiltrados = instructores
    .filter((i) => i.activo)
    .filter((i) => (!filtros.sede || String(i.sedeId) === filtros.sede) && (!filtros.area || String(i.areaId) === filtros.area))
    .filter((i) => !filtros.nivel || nivelCumplimiento(i.cumplimiento) === filtros.nivel)
    .filter((i) => !texto || `${i.nombres} ${i.apellidos}`.toLowerCase().includes(texto))

  const ficha = fichasFiltradas.find((f) => String(f.id) === fichaId) ?? fichasFiltradas[0]
  const instructor = instructoresFiltrados.find((i) => i.id === instructorId) ?? instructoresFiltrados[0]

  function cambiarPestana(p: PestanaReporte) {
    setPestana(p)
    setQ('')
    setFiltros({ sede: '', area: '', programa: '', jornada: '', nivel: '' })
    setError(null)
  }

  /** Datos del reporte según la pestaña; null si falta elegir la ficha o el instructor */
  function nuevo(): Omit<NuevoReporte, 'formato'> | null {
    if (pestana === 'ficha') {
      if (!ficha) return null
      return { tipo: 'ficha', titulo: `${ficha.numero} — ${ficha.programa}`, fichaId: ficha.id, ...periodo, parametros: { subtitulo: `${ficha.sede} · Jornada ${ETIQUETA_JORNADA[ficha.jornada].toLowerCase()}` } }
    }
    if (pestana === 'instructor') {
      if (!instructor) return null
      return {
        tipo: 'instructor',
        titulo: `${instructor.nombres} ${instructor.apellidos}`,
        instructorId: instructor.id,
        ...periodo,
        parametros: { subtitulo: `${instructor.area ?? 'Sin área'} · ${instructor.fichas.map((f) => `Ficha ${f.numero}`).join(', ') || 'Sin fichas'}` },
      }
    }
    return {
      tipo: estadistica === 'desercion' ? 'desercion' : estadistica === 'cumplimiento' ? 'cumplimiento_instructores' : 'estadisticas',
      titulo: ETIQUETA_ESTADISTICA_REPORTE[estadistica],
      ...periodo,
      parametros: { estadistica, subtitulo: 'Todas las sedes' },
    }
  }

  async function ejecutar(entrega: EntregaReporte) {
    setError(null)
    const p = esquemaPeriodo.safeParse(periodo)
    if (!p.success) return setErrores(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])))
    setErrores({})
    const datos = nuevo()
    if (!datos) return setError(pestana === 'ficha' ? 'Seleccione una ficha.' : 'Seleccione un instructor.')
    setOcupado(entrega)
    const r = await generarReporte({ ...datos, formato: 'pdf' }, usuarioId, entrega)
    setOcupado(null)
    if (!r.ok) return setError(r.mensaje)
    onGenerado(`El reporte "${datos.titulo}" quedó registrado en el historial (REP-${r.datos}).`, r.datos)
  }

  const pestanas: Pestana<PestanaReporte>[] = [
    { id: 'ficha', etiqueta: 'Ficha de formación' },
    { id: 'instructor', etiqueta: 'Instructor' },
    { id: 'estadisticas', etiqueta: 'Estadísticas globales' },
  ]
  const titulo = pestana === 'ficha' ? (ficha ? `Reporte de la ficha ${ficha.numero}` : 'Reporte de ficha') : pestana === 'instructor' ? (instructor ? `Reporte de ${instructor.nombres} ${instructor.apellidos}` : 'Reporte de instructor') : `Reporte de estadísticas — ${ETIQUETA_ESTADISTICA_REPORTE[estadistica]}`

  return (
    <Card className="space-y-5 p-5 sm:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Generar nuevo reporte</h2>
          <p className="text-sm text-texto-secundario">Elige qué tipo de reporte quieres generar, define el periodo de consolidación y los filtros requeridos.</p>
        </div>
        <Badge tono="primario" conBorde>
          RF18 — Reportes de ficha e instructor
        </Badge>
      </header>

      <Tabs etiqueta="Tipo de reporte" pestanas={pestanas} activa={pestana} onCambiar={cambiarPestana} />

      <div className="grid gap-3 border-t border-borde pt-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_minmax(200px,1.5fr)]">
        <Input etiqueta="Desde" type="date" requerido max={periodo.hasta || undefined} value={periodo.desde} onChange={(e) => setPeriodo((p) => ({ ...p, desde: e.target.value }))} error={errores.desde} />
        <Input etiqueta="Hasta" type="date" requerido min={periodo.desde || undefined} value={periodo.hasta} onChange={(e) => setPeriodo((p) => ({ ...p, hasta: e.target.value }))} error={errores.hasta} />
        {pestana !== 'estadisticas' && (
          <>
            <details className="relative self-end">
              <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-borde bg-fondo-seccion-alterna px-3 text-sm font-semibold text-texto-apoyo hover:bg-fondo-tarjeta-suave">
                <SlidersHorizontal className="size-4" aria-hidden /> Más filtros
              </summary>
              <div className="absolute z-10 mt-2 grid w-[min(90vw,560px)] gap-3 rounded-xl border border-borde bg-fondo-tarjeta p-4 shadow-lg sm:grid-cols-2">
                <Select etiqueta="Sede" placeholder="Todas" opciones={(catalogos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))} value={filtros.sede} onChange={(e) => setFiltros((f) => ({ ...f, sede: e.target.value }))} />
                <Select etiqueta="Área" placeholder="Todas" opciones={(catalogos?.areas ?? []).map((a) => ({ valor: String(a.id), etiqueta: a.nombre }))} value={filtros.area} onChange={(e) => setFiltros((f) => ({ ...f, area: e.target.value }))} />
                {pestana === 'ficha' ? (
                  <>
                    <Select etiqueta="Programa" placeholder="Todos" opciones={(catalogos?.programas ?? []).map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))} value={filtros.programa} onChange={(e) => setFiltros((f) => ({ ...f, programa: e.target.value }))} />
                    <Select etiqueta="Jornada" placeholder="Todas" opciones={opcionesDe(ETIQUETA_JORNADA)} value={filtros.jornada} onChange={(e) => setFiltros((f) => ({ ...f, jornada: e.target.value }))} />
                  </>
                ) : (
                  <Select
                    etiqueta="Nivel de cumplimiento"
                    placeholder="Todos"
                    opciones={(['al_dia', 'seguimiento', 'critico'] as const).map((n) => ({ valor: n, etiqueta: NIVEL_CUMPLIMIENTO[n].etiqueta }))}
                    value={filtros.nivel}
                    onChange={(e) => setFiltros((f) => ({ ...f, nivel: e.target.value }))}
                  />
                )}
              </div>
            </details>
            <Input
              etiqueta={pestana === 'ficha' ? 'Buscar ficha' : 'Buscar instructor'}
              type="search"
              placeholder={pestana === 'ficha' ? 'Buscar ficha por número o sede…' : 'Buscar instructor por nombre…'}
              iconoIzquierda={<Search className="size-4" />}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </>
        )}
      </div>

      {pestana === 'ficha' && (
        <Select
          etiqueta="Ficha de formación"
          requerido
          opciones={fichasFiltradas.map((f) => ({ valor: String(f.id), etiqueta: `${f.numero} — ${f.programa} - Jornada ${ETIQUETA_JORNADA[f.jornada]}` }))}
          value={ficha ? String(ficha.id) : ''}
          onChange={(e) => setFichaId(e.target.value)}
          disabled={!fichasFiltradas.length}
          ayuda={!fichasFiltradas.length ? 'Ninguna ficha coincide con la búsqueda o los filtros.' : undefined}
        />
      )}
      {pestana === 'instructor' && (
        <Select
          etiqueta="Instructor"
          requerido
          opciones={instructoresFiltrados.map((i) => ({ valor: i.id, etiqueta: `${i.nombres} ${i.apellidos}` }))}
          value={instructor?.id ?? ''}
          onChange={(e) => setInstructorId(e.target.value)}
          disabled={!instructoresFiltrados.length}
          ayuda={!instructoresFiltrados.length ? 'Ningún instructor coincide con la búsqueda o los filtros.' : undefined}
        />
      )}
      {pestana === 'estadisticas' && (
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-texto-principal">Tipo de estadística</span>
          <select
            value={estadistica}
            onChange={(e) => setEstadistica(e.target.value as EstadisticaReporte)}
            className="h-10 w-full rounded-lg border border-borde bg-fondo-tarjeta px-3 text-sm text-texto-principal focus-visible:outline-2 focus-visible:outline-primario"
          >
            <optgroup label="Asistencia por dimensión">
              {(['sede', 'area', 'programa', 'jornada'] as const).map((x) => (
                <option key={x} value={x}>
                  {ETIQUETA_ESTADISTICA_REPORTE[x]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Indicadores generales">
              <option value="desercion">{ETIQUETA_ESTADISTICA_REPORTE.desercion}</option>
              <option value="cumplimiento">{ETIQUETA_ESTADISTICA_REPORTE.cumplimiento}</option>
            </optgroup>
          </select>
        </label>
      )}

      {/* Tarjeta de resultado (Prototipo: banner verde claro con las acciones) */}
      <div className="flex flex-col gap-4 rounded-xl border border-confirmacion/25 bg-confirmacion/5 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primario text-white" aria-hidden>
            <FileCheck2 className="size-5" />
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-2 font-semibold text-texto-principal">
              {titulo}
              <Badge tono="exito">
                Período: {fechaISOaTexto(periodo.desde)} — {fechaISOaTexto(periodo.hasta)}
              </Badge>
            </p>
            <p className="mt-1 text-sm text-texto-apoyo">{DESCRIPCION[pestana]}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button icono={<Play className="size-4" aria-hidden />} onClick={() => ejecutar('registrar')} cargando={ocupado === 'registrar'} disabled={!!ocupado}>
            Generar reporte
          </Button>
          <Button variante="secundario" icono={<Printer className="size-4" aria-hidden />} onClick={() => ejecutar('pdf')} cargando={ocupado === 'pdf'} disabled={!!ocupado}>
            Descargar PDF
          </Button>
          <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={() => ejecutar('csv')} cargando={ocupado === 'csv'} disabled={!!ocupado}>
            CSV
          </Button>
        </div>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </Card>
  )
}
