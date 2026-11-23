import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CircleAlert, CircleCheck, CircleX, ClipboardList, Eye, FileDown, RefreshCw, RotateCcw, Search } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AvatarIniciales, Badge, Button, Card, DataTable, EstadoError, Input, KpiCard, Pagination, Select, Spinner, type Columna } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { registrarEvento } from '@/features/auth/servicioAuth'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_ACCION, ETIQUETA_MODULO, ETIQUETA_RESULTADO, ETIQUETA_ROL, opcionesDe } from '@/types/dominio'
import { ModalDetalleEvento } from './ModalDetalleEvento'
import { diaEvento, fechaColombia, fechaCompleta, horaEvento, resumenEvento, TONO_RESULTADO, tituloEvento } from './presentacion'
import { contarResultados, eventosParaExportar, LIMITE_EXPORTACION, listarEventos, type EventoBitacora, type FiltrosBitacora } from './servicioBitacora'

const POR_PAGINA = 15
const CLAVES = ['q', 'modulo', 'accion', 'resultado', 'rol', 'desde', 'hasta'] as const
const VISTAS_RAPIDAS = [
  { etiqueta: 'Hoy', dias: 0 },
  { etiqueta: 'Últimos 7 días', dias: 6 },
  { etiqueta: 'Últimos 30 días', dias: 29 },
]

/**
 * CU11 — Bitácora de actividades y auditoría (RF19, HU11.1–HU11.5). Diseño del Prototipo.
 * Un solo lugar por dato: los KPI muestran los totales por resultado; las "vistas rápidas" son solo rangos de fecha
 * (el Prototipo repetía los mismos conteos en chips y en el selector de estado).
 */
export function PaginaBitacora() {
  const [parametros, setParametros] = useSearchParams()
  const [seleccionado, setSeleccionado] = useState<EventoBitacora | null>(null)
  const [exportando, setExportando] = useState(false)
  const [errorExportar, setErrorExportar] = useState<string | null>(null)

  const filtros = Object.fromEntries(CLAVES.map((c) => [c, parametros.get(c) ?? ''])) as unknown as FiltrosBitacora
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const hayFiltros = CLAVES.some((c) => filtros[c])
  const claveFiltros = CLAVES.map((c) => filtros[c]).join('|')
  const claveConteo = CLAVES.filter((c) => c !== 'resultado').map((c) => filtros[c]).join('|')

  // La búsqueda libre se aplica 400 ms después de dejar de escribir (cada consulta va al servidor)
  const [busqueda, setBusqueda] = useState(filtros.q)
  useEffect(() => {
    if (busqueda === filtros.q) return
    const t = setTimeout(() => cambiarParametro('q', busqueda), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a lo escrito
  }, [busqueda])

  const eventos = useCarga(() => listarEventos(filtros, pagina, POR_PAGINA), [claveFiltros, pagina])
  const conteo = useCarga(() => contarResultados(filtros), [claveConteo])

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

  function aplicarRango(dias: number) {
    setParametros(
      (p) => {
        const n = new URLSearchParams(p)
        n.set('desde', fechaColombia(dias))
        n.set('hasta', fechaColombia())
        n.delete('pagina')
        return n
      },
      { replace: true },
    )
  }

  function limpiar() {
    setBusqueda('')
    setParametros({}, { replace: true })
  }

  function actualizar() {
    eventos.recargar()
    conteo.recargar()
  }

  async function exportar() {
    setExportando(true)
    setErrorExportar(null)
    const r = await eventosParaExportar(filtros)
    setExportando(false)
    if (!r.ok) return setErrorExportar(r.mensaje)
    descargarCSV(
      `bitacora-puntualix-${fechaColombia()}`,
      ['Evento', 'Fecha y hora', 'Responsable', 'Rol', 'Módulo', 'Acción', 'Detalle', 'Tabla', 'Registro', 'Resultado'],
      r.datos.map((e) => [
        `EVT-${e.id}`, fechaCompleta(e.fecha), e.usuario ?? 'Sistema', e.rol ? ETIQUETA_ROL[e.rol] : '', ETIQUETA_MODULO[e.modulo], tituloEvento(e), resumenEvento(e),
        e.tabla, e.registroId, ETIQUETA_RESULTADO[e.resultado],
      ]),
    )
    // RF19: las descargas también quedan en la bitácora
    void registrarEvento('reportes', 'descarga', `Exportó la bitácora a CSV (${r.datos.length} eventos)`)
  }

  const c = conteo.datos
  const total = c ? c.exito + c.alerta + c.error : 0
  const rangoActivo = VISTAS_RAPIDAS.find((v) => filtros.desde === fechaColombia(v.dias) && filtros.hasta === fechaColombia())

  const columnas: Columna<EventoBitacora>[] = [
    {
      clave: 'fecha',
      encabezado: 'Fecha y hora',
      celda: (e) => (
        <time dateTime={e.fecha} className="block whitespace-nowrap">
          <span className="font-semibold text-texto-principal">{diaEvento(e.fecha)}</span>
          <span className={cn('block text-xs', e.resultado === 'error' ? 'text-alerta-critica' : 'text-texto-secundario')}>{horaEvento(e.fecha)}</span>
        </time>
      ),
    },
    {
      clave: 'responsable',
      encabezado: 'Usuario responsable',
      celda: (e) => {
        const [nombres, ...resto] = (e.usuario ?? 'Sistema').split(' ')
        return (
          <div className="flex items-center gap-3">
            <AvatarIniciales nombres={nombres} apellidos={resto.join(' ')} tono={e.usuario ? 'primario' : 'neutro'} />
            <div className="min-w-0">
              <p className="font-semibold text-texto-principal">{e.usuario ?? 'Sistema'}</p>
              <p className="text-xs text-texto-secundario">{e.rol ? ETIQUETA_ROL[e.rol] : 'Proceso automático'}</p>
            </div>
          </div>
        )
      },
    },
    {
      clave: 'accion',
      encabezado: 'Módulo y acción',
      celda: (e) => (
        <div>
          <Badge tono="informacion">{ETIQUETA_MODULO[e.modulo]}</Badge>
          <p className="mt-1 text-texto-principal">{tituloEvento(e)}</p>
        </div>
      ),
    },
    {
      clave: 'detalle',
      encabezado: 'Detalle',
      ocultarEnMovil: true,
      celda: (e) => <p className={cn('max-w-md', e.resultado === 'error' ? 'font-semibold text-alerta-critica' : 'text-texto-apoyo')}>{resumenEvento(e)}</p>,
    },
    {
      clave: 'resultado',
      encabezado: 'Resultado',
      celda: (e) => (
        <Badge tono={TONO_RESULTADO[e.resultado]} punto conBorde>
          {ETIQUETA_RESULTADO[e.resultado]}
        </Badge>
      ),
    },
    {
      clave: 'ver',
      encabezado: 'Acción',
      alineacion: 'derecha',
      celda: (e) => (
        <Button variante="secundario" tamano="sm" icono={<Eye className="size-3.5" aria-hidden />} onClick={() => setSeleccionado(e)} aria-label={`Ver detalle del evento EVT-${e.id}`}>
          Ver
        </Button>
      ),
    },
  ]

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Bitácora y auditoría' }]} />
      <header className="flex flex-col gap-3 border-b border-borde pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Bitácora de actividades y auditoría</h1>
          <p className="mt-1 text-sm text-texto-secundario">Trazabilidad de los accesos, registros, modificaciones y descargas realizados en PuntualiX.</p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={exportar} cargando={exportando} disabled={!eventos.datos?.total}>
            Exportar CSV
          </Button>
          <Button icono={<RefreshCw className="size-4" aria-hidden />} onClick={actualizar} cargando={eventos.refrescando}>
            Actualizar
          </Button>
        </div>
      </header>

      {errorExportar && <Aviso tipo="error">{errorExportar}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Total de eventos" valor={c ? total.toLocaleString('es-CO') : '—'} icono={ClipboardList} tono="neutro" pie={hayFiltros ? 'Con los filtros aplicados' : 'Desde el inicio del registro'} />
        <KpiCard
          titulo="Operaciones exitosas"
          valor={c ? c.exito.toLocaleString('es-CO') : '—'}
          icono={CircleCheck}
          tono="exito"
          insignia={total ? { texto: `${porcentaje((c!.exito / total) * 100, 1)} de efectividad`, tono: 'exito' } : undefined}
        />
        <KpiCard titulo="Alertas preventivas" valor={c ? c.alerta.toLocaleString('es-CO') : '—'} icono={CircleAlert} tono="advertencia" pie="Requieren seguimiento" />
        <KpiCard
          titulo="Errores / incidentes"
          valor={c ? c.error.toLocaleString('es-CO') : '—'}
          icono={CircleX}
          tono="critico"
          destacada={!!c?.error}
          insignia={total ? { texto: `${porcentaje((c!.error / total) * 100, 1)} de fallas`, tono: 'critico' } : undefined}
        />
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              etiqueta="Buscar evento"
              etiquetaOculta
              type="search"
              placeholder="Buscar por responsable, detalle o id…"
              iconoIzquierda={<Search className="size-4" />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Select etiqueta="Módulo" etiquetaOculta placeholder="Módulo: todos" opciones={opcionesDe(ETIQUETA_MODULO)} value={filtros.modulo} onChange={(e) => cambiarParametro('modulo', e.target.value)} />
          <Select etiqueta="Acción" etiquetaOculta placeholder="Acción: todas" opciones={opcionesDe(ETIQUETA_ACCION)} value={filtros.accion} onChange={(e) => cambiarParametro('accion', e.target.value)} />
          <Select etiqueta="Resultado" etiquetaOculta placeholder="Resultado: todos" opciones={opcionesDe(ETIQUETA_RESULTADO)} value={filtros.resultado} onChange={(e) => cambiarParametro('resultado', e.target.value)} />
          <Select etiqueta="Rol" etiquetaOculta placeholder="Rol: todos" opciones={opcionesDe(ETIQUETA_ROL)} value={filtros.rol} onChange={(e) => cambiarParametro('rol', e.target.value)} />
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-borde pt-4 text-sm">
          <div className="w-40">
            <Input etiqueta="Desde" type="date" max={filtros.hasta || undefined} value={filtros.desde} onChange={(e) => cambiarParametro('desde', e.target.value)} />
          </div>
          <div className="w-40">
            <Input etiqueta="Hasta" type="date" min={filtros.desde || undefined} value={filtros.hasta} onChange={(e) => cambiarParametro('hasta', e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-texto-secundario">Vistas rápidas:</span>
            {VISTAS_RAPIDAS.map((v) => (
              <button
                key={v.etiqueta}
                type="button"
                onClick={() => aplicarRango(v.dias)}
                aria-pressed={rangoActivo === v}
                className={cn(
                  'rounded-full px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario',
                  rangoActivo === v ? 'bg-primario text-white' : 'bg-fondo-tarjeta-suave text-texto-apoyo hover:bg-primario/10',
                )}
              >
                {v.etiqueta}
              </button>
            ))}
          </div>
          {hayFiltros && (
            <Button variante="secundario" tamano="sm" className="ml-auto" icono={<RotateCcw className="size-3.5" aria-hidden />} onClick={limpiar}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {eventos.error ? (
          <EstadoError mensaje={eventos.error} onReintentar={eventos.recargar} />
        ) : eventos.cargando || !eventos.datos ? (
          <Spinner texto="Cargando eventos…" />
        ) : (
          <>
            <div className={cn(eventos.refrescando && 'opacity-60 transition-opacity')} aria-busy={eventos.refrescando}>
              <DataTable
                titulo="Eventos de la bitácora"
                columnas={columnas}
                filas={eventos.datos.eventos}
                claveFila={(e) => e.id}
                claseFila={(e) => (e.resultado === 'error' ? 'bg-alerta-critica/5' : undefined)}
                mensajeVacio={hayFiltros ? 'Ningún evento coincide con los filtros aplicados.' : 'Aún no hay eventos registrados.'}
              />
            </div>
            {eventos.datos.total > 0 && (
              <div className="border-t border-borde">
                <Pagination
                  pagina={pagina}
                  totalRegistros={eventos.datos.total}
                  porPagina={POR_PAGINA}
                  onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')}
                  nombreRegistros="eventos"
                />
              </div>
            )}
          </>
        )}
      </Card>

      <p className="text-xs text-texto-secundario">
        Los cambios de datos los registra automáticamente la base de datos. La exportación incluye hasta {LIMITE_EXPORTACION.toLocaleString('es-CO')} eventos (los más
        recientes) con los filtros aplicados y también queda registrada.
      </p>

      {seleccionado && <ModalDetalleEvento evento={seleccionado} onCerrar={() => setSeleccionado(null)} />}
    </>
  )
}
