import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CircleAlert, CircleCheck, CircleX, ClipboardList, Eye, FileDown, RefreshCw, RotateCcw, Search } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { AvatarIniciales, Badge, Button, Card, DataTable, EstadoError, Input, KpiCard, Pagination, Select, Spinner, type Columna } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { registrarEvento } from '@/features/auth/servicioAuth'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_ACCION, ETIQUETA_MODULO, ETIQUETA_RESULTADO, ETIQUETA_ROL, opcionesDe } from '@/types/dominio'
import { ModalDetalleEvento } from './ModalDetalleEvento'
import { diaEvento, fechaColombia, fechaCompleta, horaEvento, resumenEvento, TONO_RESULTADO, tituloEvento } from './presentacion'
import { contarAsistencias, contarResultados, eventosParaExportar, listarEventos, type EventoBitacora, type FiltrosBitacora } from './servicioBitacora'

const POR_PAGINA = 8
const CLAVES = ['q', 'sede', 'modulo', 'resultado', 'accion', 'rol', 'desde', 'hasta'] as const

/**
 * CU11 — Bitácora de actividades y auditoría (RF19, HU11.1–HU11.5). Fiel al Prototipo: encabezado con "Exportar CSV" y
 * "Actualizar registro", 4 indicadores, búsqueda con filtros de sede, módulo y estado, vistas rápidas (Todas, Solo
 * asistencias, Incidentes, Hoy), tabla de eventos y detalle. De HU11.4 y VersionAntigua: filtros por tipo de operación,
 * rol y rango de fechas. Un solo lugar por dato: "Incidentes" no repite el conteo, que ya está en "Errores / incidentes".
 */
export function PaginaBitacora() {
  const [parametros, setParametros] = useSearchParams()
  const [seleccionado, setSeleccionado] = useState<EventoBitacora | null>(null)
  const [exportando, setExportando] = useState(false)
  const [errorExportar, setErrorExportar] = useState<string | null>(null)
  const catalogos = useCarga(obtenerCatalogos, [])

  const filtros = Object.fromEntries(CLAVES.map((c) => [c, parametros.get(c) ?? ''])) as unknown as FiltrosBitacora
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const hayFiltros = CLAVES.some((c) => filtros[c])
  const clave = (excluir: string[] = []) => CLAVES.filter((c) => !excluir.includes(c)).map((c) => filtros[c]).join('|')

  // La búsqueda se aplica 400 ms después de dejar de escribir (cada consulta va al servidor)
  const [busqueda, setBusqueda] = useState(filtros.q)
  useEffect(() => {
    if (busqueda === filtros.q) return
    const t = setTimeout(() => cambiarParametro('q', busqueda), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a lo escrito
  }, [busqueda])

  const eventos = useCarga(() => listarEventos(filtros, pagina, POR_PAGINA), [clave(), pagina])
  const conteo = useCarga(() => contarResultados(filtros), [clave(['resultado'])])
  const asistencias = useCarga(() => contarAsistencias(filtros), [clave(['modulo'])])

  function cambiarParametros(cambios: Record<string, string>) {
    setParametros(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [k, v] of Object.entries(cambios)) {
          if (v) n.set(k, v)
          else n.delete(k)
        }
        if (!('pagina' in cambios)) n.delete('pagina')
        return n
      },
      { replace: true },
    )
  }
  const cambiarParametro = (k: string, v: string) => cambiarParametros({ [k]: v })

  function limpiar() {
    setBusqueda('')
    setParametros({}, { replace: true })
  }

  function actualizar() {
    eventos.recargar()
    conteo.recargar()
    asistencias.recargar()
  }

  async function exportar() {
    setExportando(true)
    setErrorExportar(null)
    const r = await eventosParaExportar(filtros)
    setExportando(false)
    if (!r.ok) return setErrorExportar(r.mensaje)
    descargarCSV(
      `bitacora-puntualix-${fechaColombia()}`,
      ['Evento', 'Fecha y hora', 'Responsable', 'Rol', 'Módulo', 'Acción', 'Detalle', 'Resultado'],
      r.datos.map((e) => [`EVT-${e.id}`, fechaCompleta(e.fecha), e.usuario ?? 'Sistema', e.rol ? ETIQUETA_ROL[e.rol] : '', ETIQUETA_MODULO[e.modulo], tituloEvento(e), resumenEvento(e), ETIQUETA_RESULTADO[e.resultado]]),
    )
    // RF19: la descarga también queda en la bitácora
    void registrarEvento('reportes', 'descarga', `Exportó la bitácora de auditoría (${r.datos.length} eventos)`)
  }

  const c = conteo.datos
  const total = c ? c.exito + c.alerta + c.error : 0
  const hoy = fechaColombia()

  // Vistas rápidas del Prototipo
  const vistas: Array<{ etiqueta: string; activa: boolean; aplicar: Record<string, string> }> = [
    { etiqueta: 'Todas', activa: !filtros.modulo && !filtros.resultado && !filtros.desde && !filtros.hasta, aplicar: { modulo: '', resultado: '', desde: '', hasta: '' } },
    {
      etiqueta: `Solo asistencias${asistencias.datos != null ? ` (${asistencias.datos.toLocaleString('es-CO')})` : ''}`,
      activa: filtros.modulo === 'asistencias',
      aplicar: { modulo: 'asistencias' },
    },
    { etiqueta: 'Incidentes', activa: filtros.resultado === 'error', aplicar: { resultado: 'error' } },
    { etiqueta: 'Hoy', activa: filtros.desde === hoy && filtros.hasta === hoy, aplicar: { desde: hoy, hasta: hoy } },
  ]
  const rango = filtros.desde || filtros.hasta ? [filtros.desde, filtros.hasta].filter(Boolean).map((d) => diaEvento(`${d}T12:00:00-05:00`)).join(' – ') : 'Todo el registro'

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
            <AvatarIniciales nombres={nombres} apellidos={resto.join(' ')} tono={e.resultado === 'error' ? 'critico' : 'neutro'} />
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
          <Badge tono="informacion" conBorde>
            {ETIQUETA_MODULO[e.modulo]}
          </Badge>
          <p className="mt-1 text-texto-principal">{tituloEvento(e)}</p>
        </div>
      ),
    },
    {
      clave: 'detalle',
      encabezado: 'Detalle operacional',
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
      alineacion: 'centro',
      celda: (e) => (
        <Button variante="fantasma" tamano="sm" onClick={() => setSeleccionado(e)} aria-label={`Ver detalle del evento EVT-${e.id}`}>
          {e.resultado === 'error' ? <CircleAlert className="size-4 text-alerta-critica" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </Button>
      ),
    },
  ]

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Bitácora y auditoría institucional' }]} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Bitácora de actividades y auditoría</h1>
          <p className="mt-1 max-w-2xl text-sm text-texto-secundario">Trazabilidad centralizada de eventos, modificaciones de datos y operaciones del sistema SENA.</p>
        </div>
        <div className="flex gap-2">
          <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={exportar} cargando={exportando} disabled={!eventos.datos?.total}>
            Exportar CSV / Excel
          </Button>
          <Button icono={<RefreshCw className="size-4" aria-hidden />} onClick={actualizar} cargando={eventos.refrescando}>
            Actualizar registro
          </Button>
        </div>
      </header>

      {errorExportar && <Aviso tipo="error">{errorExportar}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Total eventos" valor={c ? total.toLocaleString('es-CO') : '—'} icono={ClipboardList} tono="neutro" pie="Registrados en el sistema" />
        <KpiCard
          titulo="Operaciones exitosas"
          valor={c ? c.exito.toLocaleString('es-CO') : '—'}
          icono={CircleCheck}
          tono="exito"
          insignia={total ? { texto: `${porcentaje((c!.exito / total) * 100, 1)} de efectividad`, tono: 'exito' } : undefined}
        />
        <KpiCard
          titulo="Alertas preventivas"
          valor={c ? c.alerta.toLocaleString('es-CO') : '—'}
          icono={CircleAlert}
          tono="advertencia"
          insignia={{ texto: 'Requieren seguimiento', tono: 'advertencia' }}
        />
        <KpiCard
          titulo="Errores / incidentes"
          valor={c ? c.error.toLocaleString('es-CO') : '—'}
          icono={CircleX}
          tono="critico"
          destacada={!!c?.error}
          insignia={total ? { texto: `${porcentaje((c!.error / total) * 100, 1)} tasa de fallas`, tono: 'critico' } : undefined}
        />
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr_auto]">
          <Input
            etiqueta="Buscar evento"
            etiquetaOculta
            type="search"
            placeholder="Buscar por responsable, ficha, acción o detalle…"
            iconoIzquierda={<Search className="size-4" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Select
            etiqueta="Sede"
            etiquetaOculta
            placeholder="Sede: Todas"
            opciones={(catalogos.datos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))}
            value={filtros.sede}
            onChange={(e) => cambiarParametro('sede', e.target.value)}
          />
          <Select etiqueta="Módulo" etiquetaOculta placeholder="Módulo: Todos" opciones={opcionesDe(ETIQUETA_MODULO)} value={filtros.modulo} onChange={(e) => cambiarParametro('modulo', e.target.value)} />
          <Select etiqueta="Estado" etiquetaOculta placeholder="Estado: Todos" opciones={opcionesDe(ETIQUETA_RESULTADO)} value={filtros.resultado} onChange={(e) => cambiarParametro('resultado', e.target.value)} />
          <Button variante="secundario" icono={<RotateCcw className="size-4" aria-hidden />} onClick={limpiar} disabled={!hayFiltros && !busqueda}>
            Limpiar
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select etiqueta="Tipo de operación" opciones={opcionesDe(ETIQUETA_ACCION)} placeholder="Todas" value={filtros.accion} onChange={(e) => cambiarParametro('accion', e.target.value)} />
          <Select etiqueta="Rol" opciones={opcionesDe(ETIQUETA_ROL)} placeholder="Todos" value={filtros.rol} onChange={(e) => cambiarParametro('rol', e.target.value)} />
          <Input etiqueta="Desde" type="date" max={filtros.hasta || undefined} value={filtros.desde} onChange={(e) => cambiarParametro('desde', e.target.value)} />
          <Input etiqueta="Hasta" type="date" min={filtros.desde || undefined} value={filtros.hasta} onChange={(e) => cambiarParametro('hasta', e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-texto-secundario">Vistas rápidas:</span>
            {vistas.map((v) => (
              <button
                key={v.etiqueta}
                type="button"
                onClick={() => cambiarParametros(v.aplicar)}
                aria-pressed={v.activa}
                className={cn(
                  'rounded-full px-3 py-1 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario',
                  v.activa ? 'bg-primario text-white' : 'bg-fondo-tarjeta-suave text-texto-apoyo hover:bg-primario/10',
                )}
              >
                {v.etiqueta}
              </button>
            ))}
          </div>
          <p className="text-texto-secundario">
            Rango activo: <strong className="text-texto-principal">{rango}</strong>
          </p>
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
                <Pagination pagina={pagina} totalRegistros={eventos.datos.total} porPagina={POR_PAGINA} onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')} nombreRegistros="registros" />
              </div>
            )}
          </>
        )}
      </Card>

      {seleccionado && <ModalDetalleEvento evento={seleccionado} onCerrar={() => setSeleccionado(null)} />}
    </>
  )
}
