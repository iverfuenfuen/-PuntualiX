import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Archive, CircleCheck, FileDown, FilePlus2, FileText, FolderOpen, RotateCcw, Search, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  clasesBoton,
  DataTable,
  EstadoError,
  Input,
  KpiCard,
  Pagination,
  ProgressBar,
  Select,
  Spinner,
  Tabs,
  type Columna,
  type Pestana,
} from '@/components/ui'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_ESTADO_FICHA, ETIQUETA_JORNADA, ETIQUETA_MODALIDAD, ETIQUETA_NIVEL, opcionesDe } from '@/types/dominio'
import { ModalFormularioFicha } from './ModalFormularioFicha'
import { estadoVisualFicha, fichaEnRiesgo } from './presentacion'
import { listarFichas, obtenerCatalogos, type Catalogos, type FichaResumen } from './servicioFichas'

type Vista = 'todas' | 'activas' | 'riesgo' | 'inactivas'
const POR_PAGINA = 10
/** Filtros que viven en la URL: se conservan al volver desde el detalle de una ficha */
const FILTROS = ['q', 'sede', 'ambiente', 'area', 'programa', 'jornada'] as const

const COINCIDE_VISTA: Record<Vista, (f: FichaResumen) => boolean> = {
  todas: () => true,
  activas: (f) => f.estado === 'activa',
  riesgo: fichaEnRiesgo,
  inactivas: (f) => f.estado !== 'activa',
}

/** Quita tildes y pasa a minúsculas para buscar sin importar la escritura */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** HU10.5 / RF04 / RF05 — Gestión y monitoreo de fichas (Administrador). Diseño del Prototipo. */
export function PaginaFichas() {
  const navegar = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const [registrando, setRegistrando] = useState(false)

  const fichas = useCarga(listarFichas, [])
  const catalogos = useCarga(obtenerCatalogos, [])

  const vista = (parametros.get('vista') as Vista | null) ?? 'todas'
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const filtro = Object.fromEntries(FILTROS.map((f) => [f, parametros.get(f) ?? ''])) as Record<(typeof FILTROS)[number], string>
  const hayFiltros = FILTROS.some((f) => filtro[f])

  function cambiarParametro(clave: string, valor: string) {
    setParametros(
      (p) => {
        const nuevos = new URLSearchParams(p)
        if (valor) nuevos.set(clave, valor)
        else nuevos.delete(clave)
        if (clave !== 'pagina') nuevos.delete('pagina')
        // El ambiente depende de la sede
        if (clave === 'sede') nuevos.delete('ambiente')
        return nuevos
      },
      { replace: true },
    )
  }

  function limpiarFiltros() {
    setParametros((p) => {
      const nuevos = new URLSearchParams()
      if (p.get('vista')) nuevos.set('vista', p.get('vista')!)
      return nuevos
    }, { replace: true })
  }

  const programasPorId = useMemo(() => new Map((catalogos.datos?.programas ?? []).map((p) => [p.id, p])), [catalogos.datos])

  // RF04 (búsqueda por número, programa o código) + RF05 (sede, ambiente, área, programa, jornada)
  const filtradas = useMemo(() => {
    const texto = normalizar(filtro.q.trim())
    return (fichas.datos ?? []).filter((f) => {
      if (filtro.sede && String(f.sedeId) !== filtro.sede) return false
      if (filtro.ambiente && String(f.ambienteId) !== filtro.ambiente) return false
      if (filtro.area && String(f.areaId) !== filtro.area) return false
      if (filtro.programa && String(f.programaId) !== filtro.programa) return false
      if (filtro.jornada && f.jornada !== filtro.jornada) return false
      if (!texto) return true
      const codigo = programasPorId.get(f.programaId)?.codigo ?? ''
      return [f.numero, f.programa, codigo, f.area].some((campo) => normalizar(campo).includes(texto))
    })
  }, [fichas.datos, filtro.q, filtro.sede, filtro.ambiente, filtro.area, filtro.programa, filtro.jornada, programasPorId])

  const enVista = filtradas.filter(COINCIDE_VISTA[vista])
  const totalPaginas = Math.max(1, Math.ceil(enVista.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = enVista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const pestanas: Pestana<Vista>[] = [
    { id: 'todas', etiqueta: 'Todas', contador: filtradas.length },
    { id: 'activas', etiqueta: 'Activas', contador: filtradas.filter(COINCIDE_VISTA.activas).length },
    { id: 'riesgo', etiqueta: 'En riesgo', contador: filtradas.filter(COINCIDE_VISTA.riesgo).length, tono: 'critico' },
    { id: 'inactivas', etiqueta: 'Inactivas y cierre', contador: filtradas.filter(COINCIDE_VISTA.inactivas).length },
  ]

  function exportar() {
    descargarCSV(
      `fichas-puntualix-${new Date().toISOString().slice(0, 10)}`,
      ['Ficha', 'Programa', 'Código programa', 'Nivel', 'Área', 'Sede', 'Ambiente', 'Jornada', 'Modalidad', 'Estado', 'Aprendices', 'Asistencia %', 'Instructor líder', 'Inicio', 'Fin'],
      enVista.map((f) => [
        f.numero,
        f.programa,
        programasPorId.get(f.programaId)?.codigo,
        ETIQUETA_NIVEL[f.nivel],
        f.area,
        f.sede,
        f.ambiente,
        ETIQUETA_JORNADA[f.jornada],
        ETIQUETA_MODALIDAD[f.modalidad],
        estadoVisualFicha(f).texto,
        f.aprendicesActivos,
        f.porcentajeAsistencia?.toLocaleString('es-CO'),
        f.instructorLider,
        f.fechaInicio,
        f.fechaFin,
      ]),
    )
  }

  const todas = fichas.datos ?? []
  const activas = todas.filter((f) => f.estado === 'activa').length
  const criticas = todas.filter((f) => f.estado === 'activa' && f.nivelRiesgo === 'alta').length
  const moderadas = todas.filter((f) => f.estado === 'activa' && f.nivelRiesgo === 'media').length

  return (
    <>
      <PageHeader
        titulo="Gestión y monitoreo de fichas"
        icono={FileText}
        insignia={fichas.datos ? `${todas.length} fichas totales` : undefined}
        descripcion="Administración de las fichas de formación: seguimiento de permanencia, estados y asignaciones."
        acciones={
          <Button variante="sobreOscuro" icono={<FilePlus2 className="size-4" aria-hidden />} onClick={() => setRegistrando(true)} disabled={!catalogos.datos}>
            Registrar nueva ficha
          </Button>
        }
      />

      {fichas.error ? (
        <Card>
          <EstadoError mensaje={fichas.error} onReintentar={fichas.recargar} />
        </Card>
      ) : fichas.cargando ? (
        <Card>
          <Spinner texto="Cargando fichas…" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard titulo="Fichas registradas" valor={todas.length} icono={FolderOpen} tono="informacion" pie="Fichas activas y cerradas en el sistema" />
            <KpiCard
              titulo="Fichas activas"
              valor={activas}
              icono={CircleCheck}
              tono="exito"
              insignia={{ texto: `${porcentaje(todas.length ? (activas / todas.length) * 100 : 0)} del total`, tono: 'neutro' }}
              progreso={{ valor: todas.length ? (activas / todas.length) * 100 : 0, etiqueta: 'Porcentaje de fichas activas' }}
              pie="En etapa lectiva regular"
            />
            <KpiCard
              titulo="Inactivas y cierre"
              valor={todas.length - activas}
              icono={Archive}
              tono="advertencia"
              pie="En pausa, etapa productiva, finalizadas o inactivas"
            />
            <KpiCard
              titulo="Alertas de deserción"
              valor={criticas + moderadas}
              unidad="fichas en riesgo"
              icono={TriangleAlert}
              tono="critico"
              destacada={criticas + moderadas > 0}
              chips={[
                { etiqueta: `Críticas: ${criticas}`, tono: 'critico' },
                { etiqueta: `Moderadas: ${moderadas}`, tono: 'advertencia' },
              ]}
            />
          </div>

          <Card>
            <CardHeader
              titulo="Directorio de fichas de formación"
              descripcion="Consulte, filtre y gestione el estado y las asignaciones de cada ficha."
              acciones={
                <>
                  <Tabs etiqueta="Filtrar por estado" pestanas={pestanas} activa={vista} onCambiar={(v) => cambiarParametro('vista', v === 'todas' ? '' : v)} />
                  <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={exportar} disabled={enVista.length === 0}>
                    Exportar listado
                  </Button>
                </>
              }
            />

            <BarraFiltros filtro={filtro} catalogos={catalogos.datos} onCambiar={cambiarParametro} onLimpiar={limpiarFiltros} hayFiltros={hayFiltros} />

            <DataTable
              titulo="Directorio de fichas de formación"
              columnas={COLUMNAS}
              filas={visibles}
              claveFila={(f) => f.id}
              claseFila={(f) => (f.estado === 'activa' && f.nivelRiesgo === 'alta' ? 'bg-alerta-critica/[0.03]' : undefined)}
              mensajeVacio={
                todas.length === 0
                  ? 'Aún no hay fichas registradas. Use "Registrar nueva ficha" para crear la primera.'
                  : 'Ninguna ficha coincide con la búsqueda o los filtros aplicados.'
              }
            />
            {enVista.length > 0 && (
              <div className="border-t border-borde">
                <Pagination
                  pagina={paginaActual}
                  totalRegistros={enVista.length}
                  porPagina={POR_PAGINA}
                  onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')}
                  nombreRegistros="fichas"
                />
              </div>
            )}
          </Card>
        </>
      )}

      {registrando && catalogos.datos && (
        <ModalFormularioFicha
          modo="registrar"
          onCerrar={() => setRegistrando(false)}
          catalogos={catalogos.datos}
          onGuardado={(id) => {
            setRegistrando(false)
            navegar(`/admin/fichas/${id}`, { state: { aviso: 'La ficha se registró correctamente. Ahora puede asignar instructores y matricular aprendices.' } })
          }}
        />
      )}
    </>
  )
}

const COLUMNAS: Columna<FichaResumen>[] = [
  {
    clave: 'ficha',
    encabezado: 'Ficha y nivel',
    celda: (f) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-titulos font-bold text-texto-principal">{f.numero}</span>
        <Badge tono={f.nivel === 'tecnologo' ? 'exito' : 'neutro'}>{ETIQUETA_NIVEL[f.nivel]}</Badge>
      </div>
    ),
  },
  {
    clave: 'programa',
    encabezado: 'Programa de formación',
    celda: (f) => (
      <div>
        <p className="text-texto-principal">{f.programa}</p>
        <p className="text-xs text-texto-secundario">{f.area}</p>
      </div>
    ),
  },
  {
    clave: 'jornada',
    encabezado: 'Jornada y sede',
    ocultarEnMovil: true,
    celda: (f) => (
      <div className="whitespace-nowrap">
        <p>
          {ETIQUETA_JORNADA[f.jornada]} · {f.sede}
        </p>
        {f.ambiente && <p className="text-xs text-texto-secundario">{f.ambiente}</p>}
      </div>
    ),
  },
  { clave: 'aprendices', encabezado: 'Aprendices', alineacion: 'centro', ocultarEnMovil: true, celda: (f) => <span className="font-semibold">{f.aprendicesActivos}</span> },
  {
    clave: 'asistencia',
    encabezado: 'Asistencia promedio',
    ocultarEnMovil: true,
    className: 'min-w-40',
    celda: (f) =>
      f.porcentajeAsistencia == null ? (
        <span className="text-xs text-texto-secundario">{f.estado === 'activa' ? 'Sin registros' : ETIQUETA_ESTADO_FICHA[f.estado]}</span>
      ) : (
        <ProgressBar valor={f.porcentajeAsistencia} etiqueta={`Asistencia promedio de la ficha ${f.numero}`} />
      ),
  },
  {
    clave: 'estado',
    encabezado: 'Estado / riesgo',
    celda: (f) => {
      const { texto, tono } = estadoVisualFicha(f)
      return (
        <Badge tono={tono} punto conBorde>
          {texto}
        </Badge>
      )
    },
  },
  {
    clave: 'accion',
    encabezado: 'Acción',
    alineacion: 'derecha',
    celda: (f) => (
      <Link
        to={`/admin/fichas/${f.id}`}
        className={clasesBoton(f.estado === 'activa' && f.nivelRiesgo === 'alta' ? 'peligro' : f.estado === 'activa' ? 'primario' : 'secundario', 'sm', 'whitespace-nowrap')}
        aria-label={`Ver ficha ${f.numero}`}
      >
        Ver ficha
      </Link>
    ),
  },
]

interface PropsFiltros {
  filtro: Record<(typeof FILTROS)[number], string>
  catalogos: Catalogos | null
  onCambiar: (clave: string, valor: string) => void
  onLimpiar: () => void
  hayFiltros: boolean
}

function BarraFiltros({ filtro, catalogos, onCambiar, onLimpiar, hayFiltros }: PropsFiltros) {
  const ambientes = (catalogos?.ambientes ?? []).filter((a) => !filtro.sede || String(a.sedeId) === filtro.sede)
  const programas = (catalogos?.programas ?? []).filter((p) => !filtro.area || String(p.areaId) === filtro.area)
  const opciones = <T extends { id: number; nombre: string }>(lista: T[]) => lista.map((x) => ({ valor: String(x.id), etiqueta: x.nombre }))

  return (
    <div className="grid gap-3 border-b border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(220px,2fr)_repeat(5,minmax(0,1fr))_auto]">
      <div className="sm:col-span-2 lg:col-span-1">
        <Input
          etiqueta="Buscar ficha"
          etiquetaOculta
          type="search"
          placeholder="Buscar por número, programa o código…"
          iconoIzquierda={<Search className="size-4" />}
          value={filtro.q}
          onChange={(e) => onCambiar('q', e.target.value)}
        />
      </div>
      <Select etiqueta="Sede" etiquetaOculta placeholder="Sede: todas" opciones={opciones(catalogos?.sedes ?? [])} value={filtro.sede} onChange={(e) => onCambiar('sede', e.target.value)} />
      <Select etiqueta="Ambiente" etiquetaOculta placeholder="Ambiente: todos" opciones={opciones(ambientes)} value={filtro.ambiente} onChange={(e) => onCambiar('ambiente', e.target.value)} />
      <Select etiqueta="Área" etiquetaOculta placeholder="Área: todas" opciones={opciones(catalogos?.areas ?? [])} value={filtro.area} onChange={(e) => onCambiar('area', e.target.value)} />
      <Select etiqueta="Programa" etiquetaOculta placeholder="Programa: todos" opciones={opciones(programas)} value={filtro.programa} onChange={(e) => onCambiar('programa', e.target.value)} />
      <Select etiqueta="Jornada" etiquetaOculta placeholder="Jornada: todas" opciones={opcionesDe(ETIQUETA_JORNADA)} value={filtro.jornada} onChange={(e) => onCambiar('jornada', e.target.value)} />
      <Button
        variante="secundario"
        className={cn('w-full lg:w-auto', !hayFiltros && 'invisible')}
        icono={<RotateCcw className="size-4" aria-hidden />}
        onClick={onLimpiar}
        aria-hidden={!hayFiltros}
        tabIndex={hayFiltros ? 0 : -1}
      >
        Limpiar
      </Button>
    </div>
  )
}
