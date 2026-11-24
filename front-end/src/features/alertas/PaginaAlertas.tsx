import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BellRing, CircleAlert, Eye, Info, RotateCcw, Search, TriangleAlert } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardHeader, DataTable, EstadoError, Input, KpiCard, Pagination, Select, Spinner, type Columna } from '@/components/ui'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { useCarga } from '@/lib/useCarga'
import { cn } from '@/lib/utilidades'
import { ETIQUETA_PRIORIDAD, opcionesDe, type PrioridadAlerta } from '@/types/dominio'
import { ModalDetalleAlerta } from './ModalDetalleAlerta'
import { fechaHora, TONO_PRIORIDAD } from './presentacion'
import { listarAlertasFicha, listarUmbrales, marcarNotificacionesLeidas, type AlertaFicha } from './servicioAlertas'

const POR_PAGINA = 10
const FILTROS = ['q', 'sede', 'prioridad', 'ficha', 'desde', 'hasta'] as const

/**
 * RF16 / HU09.3 — Alertas del administrador. Refactorización de VersionAntigua (Admin/alertas/alertas.html):
 * indicadores (activas y por prioridad), filtros por sede, prioridad, ficha y rango de fechas, búsqueda por ficha,
 * tabla (prioridad, descripción, ficha, instructor líder, fecha de generación) y detalle de solo lectura.
 * El administrador solo ve alertas de FICHA; las de cada aprendiz son del instructor (HU12.1).
 */
export function PaginaAlertas() {
  const { refrescarNotificaciones } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const [seleccionada, setSeleccionada] = useState<AlertaFicha | null>(null)
  const alertas = useCarga(listarAlertasFicha, [])
  const umbrales = useCarga(listarUmbrales, [])
  const catalogos = useCarga(obtenerCatalogos, [])

  // Al entrar a las alertas, la campana deja de marcar avisos pendientes
  useEffect(() => {
    void marcarNotificacionesLeidas().then(refrescarNotificaciones)
  }, [refrescarNotificaciones])

  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const filtro = Object.fromEntries(FILTROS.map((f) => [f, parametros.get(f) ?? ''])) as Record<(typeof FILTROS)[number], string>
  const hayFiltros = FILTROS.some((f) => filtro[f])

  function cambiarParametro(clave: string, valor: string) {
    setParametros(
      (p) => {
        const n = new URLSearchParams(p)
        if (valor) n.set(clave, valor)
        else n.delete(clave)
        if (clave !== 'pagina') n.delete('pagina')
        return n
      },
      { replace: true },
    )
  }

  const todas = useMemo(() => alertas.datos ?? [], [alertas.datos])
  const filtradas = useMemo(
    () =>
      todas.filter((a) => {
        if (filtro.sede && String(a.ficha.sedeId) !== filtro.sede) return false
        if (filtro.prioridad && a.prioridad !== filtro.prioridad) return false
        if (filtro.ficha && String(a.ficha.id) !== filtro.ficha) return false
        const dia = a.creadaEn.slice(0, 10)
        if (filtro.desde && dia < filtro.desde) return false
        if (filtro.hasta && dia > filtro.hasta) return false
        return !filtro.q.trim() || a.ficha.numero.includes(filtro.q.trim())
      }),
    [todas, filtro.sede, filtro.prioridad, filtro.ficha, filtro.desde, filtro.hasta, filtro.q],
  )

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)
  const porPrioridad = (p: PrioridadAlerta) => todas.filter((a) => a.prioridad === p).length
  const fichasConAlerta = [...new Map(todas.map((a) => [a.ficha.id, a.ficha.numero])).entries()].sort((a, b) => a[1].localeCompare(b[1]))

  const columnas: Columna<AlertaFicha>[] = [
    {
      clave: 'prioridad',
      encabezado: 'Prioridad',
      celda: (a) => (
        <Badge tono={TONO_PRIORIDAD[a.prioridad]} conBorde>
          {ETIQUETA_PRIORIDAD[a.prioridad]}
        </Badge>
      ),
    },
    { clave: 'descripcion', encabezado: 'Descripción', celda: (a) => <p className="max-w-md text-texto-apoyo">{a.descripcion}</p> },
    {
      clave: 'ficha',
      encabezado: 'Ficha',
      celda: (a) => (
        <Link to={`/admin/fichas/${a.ficha.id}`} className="font-semibold text-primario hover:underline">
          {a.ficha.numero}
        </Link>
      ),
    },
    {
      clave: 'lider',
      encabezado: 'Instructor líder',
      ocultarEnMovil: true,
      celda: (a) => a.ficha.instructorLider ?? <span className="font-semibold text-alerta-critica">Sin instructor líder asignado</span>,
    },
    { clave: 'fecha', encabezado: 'Fecha de generación', ocultarEnMovil: true, celda: (a) => <span className="whitespace-nowrap">{fechaHora(a.creadaEn)}</span> },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      alineacion: 'centro',
      celda: (a) => (
        <Button variante="fantasma" tamano="sm" onClick={() => setSeleccionada(a)} disabled={!umbrales.datos} aria-label={`Ver detalle de la alerta de la ficha ${a.ficha.numero}`}>
          <Eye className="size-4" aria-hidden />
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader titulo="Alertas" icono={BellRing} descripcion="Alertas de inasistencias por ficha que requieren seguimiento." />

      {alertas.error ? (
        <Card>
          <EstadoError mensaje={alertas.error} onReintentar={alertas.recargar} />
        </Card>
      ) : alertas.cargando ? (
        <Card>
          <Spinner texto="Cargando alertas…" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard titulo="Alertas activas" valor={todas.length} icono={BellRing} tono="informacion" />
            <KpiCard titulo="Prioridad alta" valor={porPrioridad('alta')} icono={TriangleAlert} tono="critico" destacada={porPrioridad('alta') > 0} />
            <KpiCard titulo="Prioridad media" valor={porPrioridad('media')} icono={CircleAlert} tono="advertencia" />
            <KpiCard titulo="Prioridad baja" valor={porPrioridad('baja')} icono={Info} tono="oliva" />
          </div>

          <Card>
            <CardHeader titulo="Listado de alertas" descripcion="Alertas de inasistencias por ficha que requieren seguimiento" />
            <div className="grid gap-3 border-b border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 2xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
              <Select
                etiqueta="Sede"
                placeholder="Todas"
                opciones={(catalogos.datos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))}
                value={filtro.sede}
                onChange={(e) => cambiarParametro('sede', e.target.value)}
              />
              <Select etiqueta="Prioridad" placeholder="Todas" opciones={opcionesDe(ETIQUETA_PRIORIDAD)} value={filtro.prioridad} onChange={(e) => cambiarParametro('prioridad', e.target.value)} />
              <Select
                etiqueta="Ficha"
                placeholder="Todas"
                opciones={fichasConAlerta.map(([id, numero]) => ({ valor: String(id), etiqueta: numero }))}
                value={filtro.ficha}
                onChange={(e) => cambiarParametro('ficha', e.target.value)}
              />
              <Input etiqueta="Desde" type="date" max={filtro.hasta || undefined} value={filtro.desde} onChange={(e) => cambiarParametro('desde', e.target.value)} />
              <Input etiqueta="Hasta" type="date" min={filtro.desde || undefined} value={filtro.hasta} onChange={(e) => cambiarParametro('hasta', e.target.value)} />
              <Input
                etiqueta="Buscar por ficha"
                type="search"
                inputMode="numeric"
                placeholder="Número de ficha"
                iconoIzquierda={<Search className="size-4" />}
                value={filtro.q}
                onChange={(e) => cambiarParametro('q', e.target.value)}
              />
              <Button
                variante="secundario"
                className={cn('self-end', !hayFiltros && 'invisible')}
                icono={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => setParametros({}, { replace: true })}
                aria-hidden={!hayFiltros}
                tabIndex={hayFiltros ? 0 : -1}
              >
                Limpiar filtros
              </Button>
            </div>
            <DataTable
              titulo="Listado de alertas"
              columnas={columnas}
              filas={visibles}
              claveFila={(a) => a.id}
              claseFila={(a) => (a.prioridad === 'alta' ? 'bg-alerta-critica/5' : undefined)}
              mensajeVacio={hayFiltros ? 'Ninguna alerta coincide con los filtros aplicados.' : 'No hay alertas activas: todas las fichas están dentro de los umbrales configurados.'}
            />
            {filtradas.length > 0 && (
              <div className="border-t border-borde">
                <Pagination pagina={paginaActual} totalRegistros={filtradas.length} porPagina={POR_PAGINA} onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')} nombreRegistros="alertas" />
              </div>
            )}
          </Card>
        </>
      )}

      {seleccionada && umbrales.datos && <ModalDetalleAlerta alerta={seleccionada} umbrales={umbrales.datos} onCerrar={() => setSeleccionada(null)} />}
    </>
  )
}
