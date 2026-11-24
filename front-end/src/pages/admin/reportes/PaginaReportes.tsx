import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { BarChart3, Clock, FileText, FolderOpen, RotateCcw, Search, UsersRound } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, EstadoError, Input, KpiCard, Select, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { corteDeFecha } from '@/features/estadisticas/presentacion'
import { listarFichas } from '@/features/fichas/servicioFichas'
import { listarInstructores } from '@/features/instructores/servicioInstructores'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje, tiempoRelativo } from '@/lib/utilidades'
import { PanelGenerar, type PestanaReporte } from '@/features/reportes/PanelGenerar'
import { listarReportes, type Reporte } from '@/features/reportes/servicioReportes'
import { TablaReportes } from '@/features/reportes/TablaReportes'

const TIPOS_FILTRO = [
  { valor: 'ficha', etiqueta: 'Ficha de formación' },
  { valor: 'instructor', etiqueta: 'Instructor' },
  { valor: 'estadisticas', etiqueta: 'Estadísticas' },
]
const esEstadistica = (r: Reporte) => r.tipo === 'estadisticas' || r.tipo === 'desercion' || r.tipo === 'cumplimiento_instructores'
const mesBogota = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(new Date(iso))

/** Mes actual y anterior (YYYY-MM), calculados una sola vez al montar */
function mesesReferencia() {
  const ahora = new Date()
  const anterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 15)
  return { actual: mesBogota(ahora.toISOString()), anterior: mesBogota(anterior.toISOString()), corte: corteDeFecha(ahora) }
}

/**
 * RF18 / RF20 — Módulo de reportes institucionales. Prototipo (m_dulo_de_reportes_institucionales_puntualix):
 * banner, 4 indicadores, "Generar nuevo reporte" e "Historial de reportes generados". VersionAntigua (reportes.html):
 * pestañas Ficha / Instructor / Estadísticas, filtros y el historial con ver y descargar.
 */
export function PaginaReportes() {
  const { usuario } = useSesion()
  const [parametros] = useSearchParams()
  const [aviso, setAviso] = useState<string | null>(null)
  const [ref] = useState(mesesReferencia)
  const reportes = useCarga(() => listarReportes(), [])
  const fichas = useCarga(listarFichas, [])
  const instructores = useCarga(listarInstructores, [])
  const catalogos = useCarga(obtenerCatalogos, [])
  const [filtro, setFiltro] = useState({ tipo: '', desde: '', hasta: '', q: '' })

  const pestanaInicial = (['ficha', 'instructor', 'estadisticas'].includes(parametros.get('tipo') ?? '') ? parametros.get('tipo') : 'ficha') as PestanaReporte
  const todos = useMemo(() => reportes.datos ?? [], [reportes.datos])
  const hayFiltros = Object.values(filtro).some(Boolean)

  const filtrados = useMemo(() => {
    const texto = filtro.q.trim().toLowerCase()
    return todos.filter((r) => {
      if (filtro.tipo === 'estadisticas' ? !esEstadistica(r) : filtro.tipo && r.tipo !== filtro.tipo) return false
      const dia = r.creadoEn.slice(0, 10)
      if (filtro.desde && dia < filtro.desde) return false
      if (filtro.hasta && dia > filtro.hasta) return false
      return !texto || [r.titulo, r.parametros.subtitulo ?? '', r.generadoPor ?? '', `rep-${r.id}`].some((c) => c.toLowerCase().includes(texto))
    })
  }, [todos, filtro])

  // Indicadores (Prototipo / VersionAntigua)
  const delMes = todos.filter((r) => mesBogota(r.creadoEn) === ref.actual).length
  const delMesAnterior = todos.filter((r) => mesBogota(r.creadoEn) === ref.anterior).length
  const enCorte = todos.filter((r) => r.creadoEn.slice(0, 10) >= ref.corte.desde && r.creadoEn.slice(0, 10) <= ref.corte.hasta)
  const fichasActivas = (fichas.datos ?? []).filter((f) => f.estado === 'activa').length
  const fichasConReporte = new Set(enCorte.filter((r) => r.tipo === 'ficha' && r.fichaId).map((r) => r.fichaId)).size
  const instructoresActivos = (instructores.datos ?? []).filter((i) => i.activo).length
  const instructoresConReporte = new Set(enCorte.filter((r) => r.tipo === 'instructor' && r.instructorId).map((r) => r.instructorId)).size
  const ultimo = todos[0]

  const cargandoDatos = reportes.cargando || fichas.cargando || instructores.cargando
  const error = reportes.error ?? fichas.error ?? instructores.error

  return (
    <>
      <PageHeader
        titulo="Módulo de reportes institucionales"
        icono={BarChart3}
        insignia={`Corte lectivo ${ref.corte.etiqueta}`}
        descripcion="Generación de informes de desempeño académico, control de permanencia y exportación en formatos oficiales SENA."
      />
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      {error ? (
        <Card>
          <EstadoError
            mensaje={error}
            onReintentar={() => {
              reportes.recargar()
              fichas.recargar()
              instructores.recargar()
            }}
          />
        </Card>
      ) : cargandoDatos || !reportes.datos || !fichas.datos || !instructores.datos ? (
        <Card>
          <Spinner texto="Cargando reportes…" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Reportes generados este mes"
              valor={delMes}
              icono={FileText}
              tono="primario"
              insignia={delMesAnterior ? { texto: `${delMes >= delMesAnterior ? '+' : ''}${Math.round(((delMes - delMesAnterior) * 100) / delMesAnterior)} % vs mes anterior`, tono: delMes >= delMesAnterior ? 'exito' : 'critico' } : undefined}
            />
            <KpiCard
              titulo="Fichas con reporte generado"
              valor={fichasConReporte}
              unidad={`/ ${fichasActivas}`}
              icono={FolderOpen}
              tono="exito"
              progreso={fichasActivas ? { valor: (fichasConReporte * 100) / fichasActivas, etiqueta: 'Fichas activas con reporte en el corte' } : undefined}
              pie={`En el corte ${ref.corte.etiqueta}`}
            />
            <KpiCard
              titulo="Instructores con reporte"
              valor={instructoresConReporte}
              unidad={`/ ${instructoresActivos}`}
              icono={UsersRound}
              tono="informacion"
              pie={instructoresActivos ? `${porcentaje((instructoresConReporte * 100) / instructoresActivos)} de cumplimiento` : undefined}
            />
            <KpiCard
              titulo="Último reporte generado"
              valor={ultimo ? <span className="text-2xl">{tiempoRelativo(ultimo.creadoEn)}</span> : '—'}
              icono={Clock}
              tono="neutro"
              pie={ultimo ? `${ultimo.titulo} · ${ultimo.generadoPor ?? ''}` : 'Aún no se han generado reportes'}
            />
          </div>

          {usuario && (
            <PanelGenerar
              fichas={fichas.datos}
              instructores={instructores.datos}
              catalogos={catalogos.datos}
              usuarioId={usuario.id}
              pestanaInicial={pestanaInicial}
              onGenerado={(mensaje) => {
                setAviso(mensaje)
                reportes.recargar()
              }}
            />
          )}

          <Card>
            <header className="flex flex-col gap-2 px-5 pt-5 sm:px-6">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                Historial de reportes generados
                <Badge tono="neutro">{todos.length} reportes en total</Badge>
              </h2>
              <p className="text-sm text-texto-secundario">Consulta, audita y descarga nuevamente los reportes consolidados previamente.</p>
            </header>
            <div className="mt-4 grid gap-3 border-y border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_1fr_minmax(220px,2fr)_auto]">
              <Select etiqueta="Tipo de reporte" etiquetaOculta placeholder="Todos los tipos de reporte" opciones={TIPOS_FILTRO} value={filtro.tipo} onChange={(e) => setFiltro((f) => ({ ...f, tipo: e.target.value }))} />
              <Input etiqueta="Generado desde" etiquetaOculta type="date" max={filtro.hasta || undefined} value={filtro.desde} onChange={(e) => setFiltro((f) => ({ ...f, desde: e.target.value }))} />
              <Input etiqueta="Generado hasta" etiquetaOculta type="date" min={filtro.desde || undefined} value={filtro.hasta} onChange={(e) => setFiltro((f) => ({ ...f, hasta: e.target.value }))} />
              <Input
                etiqueta="Buscar reporte"
                etiquetaOculta
                type="search"
                placeholder="Buscar por referencia, programa o usuario…"
                iconoIzquierda={<Search className="size-4" />}
                value={filtro.q}
                onChange={(e) => setFiltro((f) => ({ ...f, q: e.target.value }))}
              />
              <Button
                variante="secundario"
                className={cn(!hayFiltros && 'invisible')}
                icono={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => setFiltro({ tipo: '', desde: '', hasta: '', q: '' })}
                aria-hidden={!hayFiltros}
                tabIndex={hayFiltros ? 0 : -1}
              >
                Limpiar
              </Button>
            </div>
            <TablaReportes
              key={JSON.stringify(filtro)}
              reportes={filtrados}
              titulo="Historial de reportes generados"
              mensajeVacio={hayFiltros ? 'Ningún reporte coincide con los filtros aplicados.' : 'Aún no se han generado reportes.'}
            />
          </Card>
        </>
      )}
    </>
  )
}
