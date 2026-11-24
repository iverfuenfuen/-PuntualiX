import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { BarChart3, FilePlus2, FileText, RotateCcw, Search, ShieldCheck } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Button, Card, EmptyState, EstadoError, Input, Select, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { hoyISO } from '@/features/fichas/presentacion'
import { obtenerDetalleFicha } from '@/features/fichas/servicioFichas'
import { obtenerPerfilInstructor } from '@/features/instructores/servicioInstructores'
import type { Resultado } from '@/lib/resultado'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_JORNADA } from '@/types/dominio'
import { generarReporte } from './acciones'
import { esquemaPeriodo } from './esquemas'
import { listarReportes, type NuevoReporte } from './servicioReportes'
import { TablaReportes } from './TablaReportes'

type Ambito = 'ficha' | 'instructor'

interface Cabecera {
  titulo: string
  chip: string
  migas: Array<{ etiqueta: string; ruta?: string }>
  indicador: { etiqueta: string; valor: string }
  nuevo: Omit<NuevoReporte, 'desde' | 'hasta' | 'formato'>
}

async function cargarCabecera(ambito: Ambito, id: string): Promise<Resultado<Cabecera | null>> {
  if (ambito === 'ficha') {
    const d = await obtenerDetalleFicha(Number(id))
    if (!d.ok) return d
    if (!d.datos) return { ok: true, datos: null }
    const f = d.datos.ficha
    return {
      ok: true,
      datos: {
        titulo: `Historial de reportes — Ficha ${f.numero}`,
        chip: `${f.programa} · Jornada ${ETIQUETA_JORNADA[f.jornada].toLowerCase()}`,
        migas: [{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Fichas', ruta: '/admin/fichas' }, { etiqueta: `Ficha ${f.numero}`, ruta: `/admin/fichas/${f.id}` }, { etiqueta: 'Historial de reportes' }],
        indicador: { etiqueta: 'Estado cohorte', valor: `${porcentaje(f.porcentajeAsistencia)} asistencia` },
        nuevo: { tipo: 'ficha', titulo: `${f.numero} — ${f.programa}`, fichaId: f.id, parametros: { subtitulo: `${f.sede} · Jornada ${ETIQUETA_JORNADA[f.jornada].toLowerCase()}` } },
      },
    }
  }
  const p = await obtenerPerfilInstructor(id)
  if (!p.ok) return p
  if (!p.datos) return { ok: true, datos: null }
  const i = p.datos.instructor
  const nombre = `${i.nombres} ${i.apellidos}`
  return {
    ok: true,
    datos: {
      titulo: `Historial de reportes — ${nombre}`,
      chip: `${i.area ?? 'Sin área'} · ${i.fichas.length} fichas a cargo`,
      migas: [{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Instructores', ruta: '/admin/instructores' }, { etiqueta: nombre, ruta: `/admin/instructores/${i.id}` }, { etiqueta: 'Historial de reportes' }],
      indicador: { etiqueta: 'Cumplimiento', valor: porcentaje(i.cumplimiento) },
      nuevo: { tipo: 'instructor', titulo: nombre, instructorId: i.id, parametros: { subtitulo: `${i.area ?? 'Sin área'} · ${i.fichas.map((f) => `Ficha ${f.numero}`).join(', ') || 'Sin fichas'}` } },
    },
  }
}

/**
 * Historial de reportes de una ficha o de un instructor (VersionAntigua: historialReportesFicha.html e
 * historialReportesInstructor.html; Prototipo: historial_y_generaci_n_de_reportes_hu05.1_hu05.3): cabecera con
 * indicadores rápidos, "Generar nuevo reporte" (desde, hasta, tipo, formato), búsqueda, filtro por formato y tabla.
 */
export function PaginaHistorialReportes({ ambito }: { ambito: Ambito }) {
  const { id = '' } = useParams()
  const { usuario } = useSesion()
  const cabecera = useCarga(() => cargarCabecera(ambito, id), [ambito, id])
  const reportes = useCarga(() => listarReportes(ambito === 'ficha' ? { fichaId: Number(id) } : { instructorId: id }), [ambito, id])
  const [periodo, setPeriodo] = useState({ desde: `${hoyISO().slice(0, 8)}01`, hasta: hoyISO() })
  const [formato, setFormato] = useState<'pdf' | 'csv'>('pdf')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [generando, setGenerando] = useState(false)
  const [q, setQ] = useState('')
  const [filtroFormato, setFiltroFormato] = useState<'' | 'pdf' | 'csv'>('')

  const lista = useMemo(() => {
    const texto = q.trim().toLowerCase()
    return (reportes.datos ?? []).filter((r) => (!filtroFormato || r.formato === filtroFormato) && (!texto || [r.titulo, r.generadoPor ?? '', `rep-${r.id}`].some((c) => c.toLowerCase().includes(texto))))
  }, [reportes.datos, q, filtroFormato])

  async function generar() {
    if (!cabecera.datos || !usuario) return
    const p = esquemaPeriodo.safeParse(periodo)
    if (!p.success) return setErrores(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])))
    setErrores({})
    setGenerando(true)
    const r = await generarReporte({ ...cabecera.datos.nuevo, ...periodo, formato }, usuario.id, formato)
    setGenerando(false)
    if (!r.ok) return setMensaje({ tipo: 'error', texto: r.mensaje })
    setMensaje({ tipo: 'exito', texto: `Solicitud de generación completada con éxito. El informe fue añadido al historial (REP-${r.datos}).` })
    reportes.recargar()
  }

  if (cabecera.error) return <Card><EstadoError mensaje={cabecera.error} onReintentar={cabecera.recargar} /></Card>
  if (cabecera.cargando) return <Card><Spinner texto="Cargando el historial…" /></Card>
  if (!cabecera.datos) return <Card><EmptyState titulo="No encontrado" descripcion={ambito === 'ficha' ? 'La ficha no existe.' : 'El instructor no existe.'} /></Card>
  const c = cabecera.datos
  const hayFiltros = !!q || !!filtroFormato

  return (
    <>
      <Breadcrumbs migas={c.migas} />

      {/* Cabecera (Prototipo pantalla 3: tarjeta blanca con dos indicadores rápidos) */}
      <Card className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{c.titulo}</h1>
            <span className="rounded-full bg-fondo-tarjeta-suave px-3 py-1 text-xs font-semibold tracking-wide text-texto-apoyo uppercase">{c.chip}</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-texto-secundario">Consulta, genera y descarga los reportes de asistencia, permanencia y cumplimiento generados.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-confirmacion/10 px-4 py-3">
            <FileText className="size-5 text-confirmacion" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-texto-secundario uppercase">Total emitidos</p>
              <p className="font-titulos font-bold">{reportes.datos?.length ?? '—'} reportes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-informacion/10 px-4 py-3">
            <ShieldCheck className="size-5 text-informacion" aria-hidden />
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-texto-secundario uppercase">{c.indicador.etiqueta}</p>
              <p className="font-titulos font-bold">{c.indicador.valor}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Generar nuevo reporte */}
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primario text-white" aria-hidden>
            <FilePlus2 className="size-5" />
          </span>
          Generar nuevo reporte {ambito === 'ficha' ? 'de ficha' : 'de instructor'}
        </h2>
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-start"
          onSubmit={(e) => {
            e.preventDefault()
            void generar()
          }}
        >
          <Input etiqueta="Desde" type="date" requerido max={periodo.hasta || undefined} value={periodo.desde} onChange={(e) => setPeriodo((p) => ({ ...p, desde: e.target.value }))} error={errores.desde} />
          <Input etiqueta="Hasta" type="date" requerido min={periodo.desde || undefined} value={periodo.hasta} onChange={(e) => setPeriodo((p) => ({ ...p, hasta: e.target.value }))} error={errores.hasta} />
          <Select etiqueta="Tipo de reporte" opciones={[{ valor: 'consolidado', etiqueta: ambito === 'ficha' ? 'Reporte consolidado de la ficha' : 'Reporte de desempeño del instructor' }]} value="consolidado" disabled ayuda="Incluye datos, resumen y tablas del periodo." />
          <Select
            etiqueta="Formato de salida"
            opciones={[
              { valor: 'pdf', etiqueta: 'PDF institucional (.pdf)' },
              { valor: 'csv', etiqueta: 'Datos planos (.csv)' },
            ]}
            value={formato}
            onChange={(e) => setFormato(e.target.value as 'pdf' | 'csv')}
          />
          <Button type="submit" className="lg:mt-[26px]" icono={<BarChart3 className="size-4" aria-hidden />} cargando={generando}>
            Generar reporte
          </Button>
        </form>
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      </Card>

      {/* Búsqueda, filtro por formato y tabla */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-borde px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <Input etiqueta="Buscar reporte" etiquetaOculta type="search" placeholder="Buscar reporte por nombre o usuario…" iconoIzquierda={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-texto-secundario">Filtrar:</span>
            {(
              [
                ['', 'Todos'],
                ['pdf', 'PDF'],
                ['csv', 'CSV'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={texto}
                type="button"
                aria-pressed={filtroFormato === valor}
                onClick={() => setFiltroFormato(valor)}
                className={cn(
                  'rounded-full px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario',
                  filtroFormato === valor ? 'bg-primario text-white' : 'text-texto-apoyo hover:bg-primario/10',
                )}
              >
                {texto}
              </button>
            ))}
            <Button variante="fantasma" tamano="sm" icono={<RotateCcw className="size-3.5" aria-hidden />} onClick={() => (setQ(''), setFiltroFormato(''))} disabled={!hayFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </div>
        {reportes.error ? (
          <EstadoError mensaje={reportes.error} onReintentar={reportes.recargar} />
        ) : reportes.cargando ? (
          <Spinner texto="Cargando reportes…" />
        ) : (
          <TablaReportes key={`${q}|${filtroFormato}`} reportes={lista} titulo={c.titulo} mensajeVacio={hayFiltros ? 'Ningún reporte coincide con la búsqueda.' : 'Aún no se han generado reportes. Use "Generar reporte" para crear el primero.'} />
        )}
      </Card>
    </>
  )
}
