import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Eye, FileDown, FolderOpen, RotateCcw, Search, SlidersHorizontal, TriangleAlert, CircleAlert, Info } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import {
  Badge,
  Card,
  CardHeader,
  clasesBoton,
  DataTable,
  EstadoError,
  Input,
  KpiCard,
  Pagination,
  Select,
  Spinner,
  Tabs,
  Button,
  type Columna,
  type Pestana,
} from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje, tiempoRelativo } from '@/lib/utilidades'
import { ETIQUETA_ESTADO_ALERTA, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO_ALERTA, opcionesDe, type PrioridadAlerta } from '@/types/dominio'
import { ModalDetalleAlerta } from './ModalDetalleAlerta'
import { fechaHora, TONO_ESTADO_ALERTA, TONO_PRIORIDAD, tituloAlerta } from './presentacion'
import { estaAbierta, listarAlertas, listarUmbrales, marcarNotificacionesLeidas, type Alerta } from './servicioAlertas'

type Vista = 'abiertas' | 'atendida' | 'descartada' | 'todas'
const POR_PAGINA = 10
const FILTROS = ['q', 'prioridad', 'tipo', 'sede'] as const
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * CU09 — Centro de alertas del administrador (RF16, RF17, HU09.3). Diseño de VersionAntigua (alertas.html).
 * Un solo lugar por dato: los KPI cuentan las alertas ABIERTAS por prioridad; las pestañas, por estado.
 */
export function PaginaAlertas() {
  const { usuario, refrescarNotificaciones } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const [seleccionada, setSeleccionada] = useState<Alerta | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const alertas = useCarga(() => listarAlertas(), [])
  const umbrales = useCarga(listarUmbrales, [])
  const catalogos = useCarga(obtenerCatalogos, [])

  // Al entrar al centro de alertas, la campana deja de marcar avisos pendientes
  useEffect(() => {
    void marcarNotificacionesLeidas().then(refrescarNotificaciones)
  }, [refrescarNotificaciones])

  const vista = (parametros.get('vista') as Vista | null) ?? 'abiertas'
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
  const filtradas = useMemo(() => {
    const texto = normalizar(filtro.q.trim())
    return todas.filter((a) => {
      if (filtro.prioridad && a.prioridad !== filtro.prioridad) return false
      if (filtro.tipo && a.tipo !== filtro.tipo) return false
      if (filtro.sede && String(a.ficha.sedeId) !== filtro.sede) return false
      return !texto || [a.ficha.numero, a.ficha.programa, a.aprendiz?.nombre ?? '', a.ficha.instructorLider ?? ''].some((c) => normalizar(c).includes(texto))
    })
  }, [todas, filtro.q, filtro.prioridad, filtro.tipo, filtro.sede])

  const enVista = vista === 'todas' ? filtradas : vista === 'abiertas' ? filtradas.filter(estaAbierta) : filtradas.filter((a) => a.estado === vista)
  const totalPaginas = Math.max(1, Math.ceil(enVista.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = enVista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const pestanas: Pestana<Vista>[] = [
    { id: 'abiertas', etiqueta: 'Abiertas', contador: filtradas.filter(estaAbierta).length },
    { id: 'atendida', etiqueta: 'Atendidas', contador: filtradas.filter((a) => a.estado === 'atendida').length },
    { id: 'descartada', etiqueta: 'Descartadas', contador: filtradas.filter((a) => a.estado === 'descartada').length },
    { id: 'todas', etiqueta: 'Todas', contador: filtradas.length },
  ]

  const abiertas = todas.filter(estaAbierta)
  const porPrioridad = (p: PrioridadAlerta) => abiertas.filter((a) => a.prioridad === p).length
  const fichasAfectadas = new Set(abiertas.map((a) => a.ficha.id)).size

  function exportar() {
    descargarCSV(
      `alertas-puntualix-${new Date().toISOString().slice(0, 10)}`,
      ['Alerta', 'Tipo', 'Prioridad', 'Estado', 'Ficha', 'Programa', 'Sede', 'Instructor líder', 'Aprendiz', '% inasistencia', 'Descripción', 'Generada', 'Cerrada', 'Cerrada por'],
      enVista.map((a) => [
        a.id, ETIQUETA_TIPO_ALERTA[a.tipo], ETIQUETA_PRIORIDAD[a.prioridad], ETIQUETA_ESTADO_ALERTA[a.estado], a.ficha.numero, a.ficha.programa, a.ficha.sede,
        a.ficha.instructorLider ?? 'Sin asignar', a.aprendiz?.nombre, a.porcentaje?.toLocaleString('es-CO'), a.descripcion, fechaHora(a.creadaEn),
        a.atendidaEn ? fechaHora(a.atendidaEn) : '', a.atendidaPor,
      ]),
    )
  }

  function terminar(mensaje: string) {
    setSeleccionada(null)
    setAviso(mensaje)
    alertas.recargar()
  }

  const columnas: Columna<Alerta>[] = [
    {
      clave: 'prioridad',
      encabezado: 'Prioridad',
      celda: (a) => (
        <Badge tono={a.tipo === 'ficha_sin_lider' ? 'informacion' : TONO_PRIORIDAD[a.prioridad]} conBorde>
          {ETIQUETA_PRIORIDAD[a.prioridad]}
        </Badge>
      ),
    },
    {
      clave: 'alerta',
      encabezado: 'Alerta',
      celda: (a) => (
        <div className="min-w-0 max-w-md">
          <p className="font-semibold text-texto-principal">{tituloAlerta(a)}</p>
          <p className="text-xs text-texto-secundario">
            {ETIQUETA_TIPO_ALERTA[a.tipo]}
            {a.porcentaje != null && <> · {porcentaje(a.porcentaje, 2)} de inasistencia</>}
          </p>
        </div>
      ),
    },
    {
      clave: 'lider',
      encabezado: 'Instructor líder',
      ocultarEnMovil: true,
      celda: (a) => a.ficha.instructorLider ?? <span className="font-semibold text-alerta-critica">Sin asignar</span>,
    },
    {
      clave: 'fecha',
      encabezado: 'Generada',
      ocultarEnMovil: true,
      celda: (a) => (
        <time dateTime={a.creadaEn} title={fechaHora(a.creadaEn)} className="whitespace-nowrap">
          {tiempoRelativo(a.creadaEn)}
        </time>
      ),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      celda: (a) => (
        <Badge tono={TONO_ESTADO_ALERTA[a.estado]} punto>
          {ETIQUETA_ESTADO_ALERTA[a.estado]}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      alineacion: 'derecha',
      celda: (a) => (
        <Button variante="secundario" tamano="sm" icono={<Eye className="size-3.5" aria-hidden />} onClick={() => setSeleccionada(a)} disabled={!umbrales.datos} aria-label={`Ver detalle de la alerta ${tituloAlerta(a)}`}>
          {estaAbierta(a) ? 'Gestionar' : 'Detalle'}
        </Button>
      ),
    },
  ]

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Alertas' }]} />
      <header className="flex flex-col gap-3 border-b border-borde pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Alertas y notificaciones</h1>
          <p className="mt-1 text-sm text-texto-secundario">Alertas de inasistencia y de gestión de las fichas que requieren seguimiento.</p>
        </div>
        <Link to="/admin/alertas/umbrales" className={clasesBoton('secundario')}>
          <SlidersHorizontal className="size-4" aria-hidden /> Configurar umbrales
        </Link>
      </header>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

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
            <KpiCard titulo="Prioridad alta" valor={porPrioridad('alta')} unidad="abiertas" icono={TriangleAlert} tono="critico" destacada={porPrioridad('alta') > 0} pie="Superan el límite crítico" />
            <KpiCard titulo="Prioridad media" valor={porPrioridad('media')} unidad="abiertas" icono={CircleAlert} tono="advertencia" pie="Cerca del límite establecido" />
            <KpiCard titulo="Prioridad baja" valor={porPrioridad('baja')} unidad="abiertas" icono={Info} tono="oliva" pie="Seguimiento preventivo" />
            <KpiCard titulo="Fichas con alertas" valor={fichasAfectadas} icono={FolderOpen} tono="informacion" pie="Fichas con al menos una alerta abierta" />
          </div>

          <Card>
            <CardHeader
              titulo="Listado de alertas"
              acciones={
                <>
                  <Tabs etiqueta="Filtrar por estado" pestanas={pestanas} activa={vista} onCambiar={(v) => cambiarParametro('vista', v === 'abiertas' ? '' : v)} />
                  <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={exportar} disabled={enVista.length === 0}>
                    Exportar
                  </Button>
                </>
              }
            />
            <div className="grid gap-3 border-b border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_auto]">
              <Input
                etiqueta="Buscar alerta"
                etiquetaOculta
                type="search"
                placeholder="Buscar por ficha, programa, aprendiz o instructor…"
                iconoIzquierda={<Search className="size-4" />}
                value={filtro.q}
                onChange={(e) => cambiarParametro('q', e.target.value)}
              />
              <Select etiqueta="Prioridad" etiquetaOculta placeholder="Prioridad: todas" opciones={opcionesDe(ETIQUETA_PRIORIDAD)} value={filtro.prioridad} onChange={(e) => cambiarParametro('prioridad', e.target.value)} />
              <Select etiqueta="Tipo de alerta" etiquetaOculta placeholder="Tipo: todos" opciones={opcionesDe(ETIQUETA_TIPO_ALERTA)} value={filtro.tipo} onChange={(e) => cambiarParametro('tipo', e.target.value)} />
              <Select
                etiqueta="Sede"
                etiquetaOculta
                placeholder="Sede: todas"
                opciones={(catalogos.datos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))}
                value={filtro.sede}
                onChange={(e) => cambiarParametro('sede', e.target.value)}
              />
              <Button
                variante="secundario"
                className={cn(!hayFiltros && 'invisible')}
                icono={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => setParametros(vista === 'abiertas' ? {} : { vista }, { replace: true })}
                aria-hidden={!hayFiltros}
                tabIndex={hayFiltros ? 0 : -1}
              >
                Limpiar
              </Button>
            </div>
            <DataTable
              titulo="Listado de alertas"
              columnas={columnas}
              filas={visibles}
              claveFila={(a) => a.id}
              claseFila={(a) => (a.estado === 'nueva' && a.prioridad === 'alta' ? 'bg-alerta-critica/5' : !estaAbierta(a) ? 'opacity-75' : undefined)}
              mensajeVacio={vista === 'abiertas' && !hayFiltros ? 'No hay alertas abiertas. Todas las fichas están dentro de los umbrales configurados.' : 'Ninguna alerta coincide con los filtros aplicados.'}
            />
            {enVista.length > 0 && (
              <div className="border-t border-borde">
                <Pagination pagina={paginaActual} totalRegistros={enVista.length} porPagina={POR_PAGINA} onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')} nombreRegistros="alertas" />
              </div>
            )}
          </Card>

          <p className="rounded-xl border border-informacion/20 bg-informacion/5 px-4 py-3 text-xs text-texto-apoyo">
            <strong className="text-texto-principal">¿Cómo se generan?</strong> El sistema crea una alerta cuando el porcentaje de inasistencias no justificadas de un
            aprendiz o de una ficha alcanza un <Link to="/admin/alertas/umbrales" className="font-semibold text-primario hover:underline">umbral configurado</Link>, o
            cuando una ficha activa queda sin instructor líder. Se notifica al instructor líder, al aprendiz y, en las alertas de ficha, a los administradores.
          </p>
        </>
      )}

      {seleccionada && umbrales.datos && usuario && (
        <ModalDetalleAlerta alerta={seleccionada} umbrales={umbrales.datos} usuarioId={usuario.id} onCerrar={() => setSeleccionada(null)} onGuardado={terminar} />
      )}
    </>
  )
}
