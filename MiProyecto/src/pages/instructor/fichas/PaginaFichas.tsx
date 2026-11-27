import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Archive, CalendarCheck, CircleCheck, FileText, FolderOpen, RotateCcw, Search, UserPlus, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardHeader, clasesBoton, DataTable, EstadoError, Input, KpiCard, Pagination, Select, Spinner, type Columna } from '@/components/ui'
import { estadoVisualFicha } from '@/features/fichas/presentacion'
import { listarFichas, type FichaResumen } from '@/features/fichas/servicioFichas'
import { useCarga } from '@/lib/useCarga'
import { cn } from '@/lib/utilidades'

const POR_PAGINA = 10
const ESTADOS = [
  { valor: 'activa', etiqueta: 'Activa' },
  { valor: 'inactiva', etiqueta: 'Inactiva' },
]
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * HU10.5 — Fichas asignadas al instructor (VersionAntigua: Instructor/fichas/fichas.html).
 * Resumen (asignadas, activas, inactivas, total aprendices), filtros programa / estado / búsqueda y la tabla
 * Número · Programa · Estado · Aprendices · Acciones. RLS solo devuelve las fichas donde es líder o está asignado.
 */
export function PaginaFichas() {
  const fichas = useCarga(listarFichas, [])
  const [filtro, setFiltro] = useState({ programa: '', estado: '', q: '' })
  const [pagina, setPagina] = useState(1)
  const hayFiltros = Object.values(filtro).some(Boolean)

  const todas = useMemo(() => fichas.datos ?? [], [fichas.datos])
  const programas = useMemo(
    () =>
      [...new Map(todas.map((f) => [f.programaId, f.programa])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1], 'es'))
        .map(([id, nombre]) => ({ valor: String(id), etiqueta: nombre })),
    [todas],
  )

  const filtradas = useMemo(() => {
    const texto = normalizar(filtro.q.trim())
    return todas.filter((f) => {
      if (filtro.programa && String(f.programaId) !== filtro.programa) return false
      if (filtro.estado === 'activa' && f.estado !== 'activa') return false
      if (filtro.estado === 'inactiva' && f.estado === 'activa') return false
      return !texto || [f.numero, f.programa].some((c) => normalizar(c).includes(texto))
    })
  }, [todas, filtro])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const actual = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA)
  const activas = todas.filter((f) => f.estado === 'activa').length

  function cambiar(clave: keyof typeof filtro, valor: string) {
    setFiltro((f) => ({ ...f, [clave]: valor }))
    setPagina(1)
  }

  return (
    <>
      <PageHeader
        titulo="Fichas asignadas"
        icono={FileText}
        descripcion="Fichas de formación a su cargo: aprendices, estado y acceso rápido al registro de asistencia."
        acciones={
          <Link to="/instructor/fichas/registrar" className={clasesBoton('sobreOscuro')}>
            <UserPlus className="size-4" aria-hidden /> Registrar aprendiz
          </Link>
        }
      />

      {fichas.error ? (
        <Card>
          <EstadoError mensaje={fichas.error} onReintentar={fichas.recargar} />
        </Card>
      ) : fichas.cargando || !fichas.datos ? (
        <Card>
          <Spinner texto="Cargando fichas…" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard titulo="Fichas asignadas" valor={todas.length} icono={FolderOpen} tono="informacion" />
            <KpiCard titulo="Activas" valor={activas} icono={CircleCheck} tono="exito" />
            <KpiCard titulo="Inactivas" valor={todas.length - activas} icono={Archive} tono="advertencia" />
            <KpiCard titulo="Total aprendices" valor={todas.reduce((s, f) => s + f.aprendicesActivos, 0)} icono={UsersRound} tono="primario" />
          </div>

          <Card>
            <CardHeader titulo="Fichas asignadas" descripcion="Consulte sus fichas y registre la asistencia de cada una." />
            <div className="grid gap-3 border-y border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1fr_1fr_minmax(220px,2fr)_auto]">
              <Select etiqueta="Programa" etiquetaOculta placeholder="Programa: todos" opciones={programas} value={filtro.programa} onChange={(e) => cambiar('programa', e.target.value)} />
              <Select etiqueta="Estado" etiquetaOculta placeholder="Estado: todos" opciones={ESTADOS} value={filtro.estado} onChange={(e) => cambiar('estado', e.target.value)} />
              <Input
                etiqueta="Buscar ficha"
                etiquetaOculta
                type="search"
                placeholder="Buscar ficha por número o programa…"
                iconoIzquierda={<Search className="size-4" />}
                value={filtro.q}
                onChange={(e) => cambiar('q', e.target.value)}
              />
              <Button
                variante="secundario"
                className={cn(!hayFiltros && 'invisible')}
                icono={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => {
                  setFiltro({ programa: '', estado: '', q: '' })
                  setPagina(1)
                }}
                aria-hidden={!hayFiltros}
                tabIndex={hayFiltros ? 0 : -1}
              >
                Limpiar
              </Button>
            </div>
            <DataTable
              titulo="Fichas asignadas"
              columnas={COLUMNAS}
              filas={visibles}
              claveFila={(f) => f.id}
              mensajeVacio={todas.length === 0 ? 'Aún no tiene fichas asignadas.' : 'Ninguna ficha coincide con los filtros aplicados.'}
            />
            {filtradas.length > 0 && (
              <div className="border-t border-borde">
                <Pagination pagina={actual} totalRegistros={filtradas.length} porPagina={POR_PAGINA} onCambiar={setPagina} nombreRegistros="fichas" />
              </div>
            )}
          </Card>
        </>
      )}
    </>
  )
}

const COLUMNAS: Columna<FichaResumen>[] = [
  { clave: 'numero', encabezado: 'Número', celda: (f) => <span className="font-titulos font-bold text-texto-principal">{f.numero}</span> },
  { clave: 'programa', encabezado: 'Programa', celda: (f) => <span className="text-texto-principal">{f.programa}</span> },
  {
    clave: 'estado',
    encabezado: 'Estado',
    celda: (f) => {
      const { texto, tono } = estadoVisualFicha(f)
      return (
        <Badge tono={tono} punto conBorde>
          {texto}
        </Badge>
      )
    },
  },
  { clave: 'aprendices', encabezado: 'Aprendices', alineacion: 'centro', celda: (f) => <span className="font-semibold">{f.aprendicesActivos}</span> },
  {
    clave: 'acciones',
    encabezado: 'Acciones',
    alineacion: 'derecha',
    celda: (f) => (
      <div className="flex justify-end gap-2">
        {f.estado === 'activa' && (
          <Link to={`/instructor/asistencia?ficha=${f.id}`} className={clasesBoton('primario', 'sm', 'whitespace-nowrap')} aria-label={`Registrar asistencia de la ficha ${f.numero}`}>
            <CalendarCheck className="size-3.5" aria-hidden /> Asistencia
          </Link>
        )}
        <Link to={`/instructor/fichas/${f.id}`} className={clasesBoton('secundario', 'sm', 'whitespace-nowrap')} aria-label={`Ver ficha ${f.numero}`}>
          Ver ficha
        </Link>
      </div>
    ),
  },
]
