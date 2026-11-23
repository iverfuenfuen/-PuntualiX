import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, CalendarCheck, ClipboardCheck, LayoutGrid, List, RotateCcw, Search, Siren, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AvatarIniciales,
  Badge,
  Button,
  Card,
  CardHeader,
  clasesBoton,
  DataTable,
  EmptyState,
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
import { Aviso } from '@/features/auth/Aviso'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { ETIQUETA_DOCUMENTO } from '@/features/perfil/servicioPerfil'
import { ModalRegistrarUsuario } from '@/features/usuarios/ModalRegistrarUsuario'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { META_CUMPLIMIENTO, NIVEL_CUMPLIMIENTO, nivelCumplimiento, tonoCumplimiento, type NivelCumplimiento } from './presentacion'
import { listarInstructores, type InstructorResumen } from './servicioInstructores'

type Vista = 'todos' | NivelCumplimiento
type Modo = 'tabla' | 'tarjetas'
const POR_PAGINA = 9
const FILTROS = ['q', 'sede', 'area', 'ficha', 'estado'] as const

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const promedio = (v: Array<number | null>) => {
  const n = v.filter((x): x is number => x != null)
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null
}

/**
 * HU12.2 Panel de instructores · HU12.4 Filtrar los que no cumplen.
 * Prototipo: "Gestión y monitoreo" (tabla) + "Cumplimiento y desempeño" (tarjetas) eran 2 páginas con los
 * mismos datos; aquí son 2 vistas de UNA página. Las cifras se calculan una vez y no se repiten.
 */
export function PaginaInstructores() {
  const [parametros, setParametros] = useSearchParams()
  const [registrando, setRegistrando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const instructores = useCarga(listarInstructores, [])
  const catalogos = useCarga(obtenerCatalogos, [])

  const vista = (parametros.get('vista') as Vista | null) ?? 'todos'
  const modo = (parametros.get('modo') as Modo | null) ?? 'tabla'
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const filtro = Object.fromEntries(FILTROS.map((f) => [f, parametros.get(f) ?? ''])) as Record<(typeof FILTROS)[number], string>
  const estado = filtro.estado || 'activos'
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

  const todos = useMemo(() => instructores.datos ?? [], [instructores.datos])
  const fichasConInstructor = useMemo(() => {
    const m = new Map<number, string>()
    for (const i of todos) for (const f of i.fichas) m.set(f.id, f.numero)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [todos])

  const filtrados = useMemo(() => {
    const texto = normalizar(filtro.q.trim())
    return todos.filter((i) => {
      if (estado === 'activos' && !i.activo) return false
      if (estado === 'inactivos' && i.activo) return false
      if (filtro.sede && String(i.sedeId) !== filtro.sede) return false
      if (filtro.area && String(i.areaId) !== filtro.area) return false
      if (filtro.ficha && !i.fichas.some((f) => String(f.id) === filtro.ficha)) return false
      return (
        !texto ||
        [`${i.nombres} ${i.apellidos}`, i.numeroDocumento, i.especialidad ?? '', ...i.fichas.map((f) => f.numero)].some((c) => normalizar(c).includes(texto))
      )
    })
  }, [todos, estado, filtro.q, filtro.sede, filtro.area, filtro.ficha])

  const enVista = vista === 'todos' ? filtrados : filtrados.filter((i) => nivelCumplimiento(i.cumplimiento) === vista)
  const totalPaginas = Math.max(1, Math.ceil(enVista.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = enVista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  // Las pestañas son la ÚNICA distribución por nivel (el Prototipo la repetía en una dona y en chips)
  const pestanas: Pestana<Vista>[] = [
    { id: 'todos', etiqueta: 'Todos', contador: filtrados.length },
    ...(['al_dia', 'seguimiento', 'critico', 'sin_sesiones'] as const).map((n) => ({
      id: n,
      etiqueta: NIVEL_CUMPLIMIENTO[n].etiqueta,
      contador: filtrados.filter((i) => nivelCumplimiento(i.cumplimiento) === n).length,
      ...(n === 'critico' && { tono: 'critico' as const }),
    })),
  ]

  const activos = todos.filter((i) => i.activo)
  const cumplimientoGeneral = promedio(activos.map((i) => i.cumplimiento))
  const asistenciaGeneral = promedio(activos.map((i) => i.asistenciaAprendices))
  const planificadas = activos.reduce((t, i) => t + i.sesionesPlanificadas, 0)
  const ejecutadas = activos.reduce((t, i) => t + i.sesionesEjecutadas, 0)
  const requierenAtencion = activos.filter((i) => ['critico', 'seguimiento'].includes(nivelCumplimiento(i.cumplimiento))).length

  return (
    <>
      <PageHeader
        titulo="Gestión y monitoreo de instructores"
        icono={Users}
        descripcion="Cumplimiento en el registro de asistencia, fichas a cargo y asistencia de sus aprendices."
        acciones={
          <Button variante="sobreOscuro" icono={<UserPlus className="size-4" aria-hidden />} onClick={() => setRegistrando(true)}>
            Registrar instructor
          </Button>
        }
      />
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      {instructores.error ? (
        <Card>
          <EstadoError mensaje={instructores.error} onReintentar={instructores.recargar} />
        </Card>
      ) : instructores.cargando ? (
        <Card>
          <Spinner texto="Cargando instructores…" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              titulo="Cumplimiento docente general"
              valor={porcentaje(cumplimientoGeneral)}
              icono={ClipboardCheck}
              tono={cumplimientoGeneral == null ? 'neutro' : tonoCumplimiento(cumplimientoGeneral)}
              insignia={cumplimientoGeneral != null ? { texto: `Meta ${META_CUMPLIMIENTO} %`, tono: cumplimientoGeneral >= META_CUMPLIMIENTO ? 'exito' : 'advertencia' } : undefined}
              pie={`${ejecutadas} de ${planificadas} sesiones con asistencia registrada`}
            />
            <KpiCard titulo="Instructores activos" valor={activos.length} icono={Users} tono="primario" pie={todos.length > activos.length ? `${todos.length - activos.length} inactivos` : 'Toda la planta está activa'} />
            <KpiCard titulo="Asistencia de aprendices" valor={porcentaje(asistenciaGeneral)} icono={CalendarCheck} tono="informacion" pie="Promedio de las fichas a cargo" />
            <KpiCard titulo="Requieren atención" valor={requierenAtencion} unidad="instructores" icono={Siren} tono="critico" destacada={requierenAtencion > 0} pie="Cumplimiento inferior al 80 %" />
          </div>

          <Card>
            <CardHeader
              titulo="Plantilla docente y cumplimiento"
              descripcion="Registro de asistencia, fichas a cargo y nivel de cumplimiento de cada instructor."
              acciones={
                <>
                  <Tabs etiqueta="Filtrar por nivel de cumplimiento" pestanas={pestanas} activa={vista} onCambiar={(v) => cambiarParametro('vista', v === 'todos' ? '' : v)} />
                  <div className="inline-flex rounded-lg border border-borde p-0.5" role="group" aria-label="Tipo de vista">
                    {([
                      ['tabla', List, 'Vista de tabla'],
                      ['tarjetas', LayoutGrid, 'Vista de tarjetas'],
                    ] as const).map(([m, Icono, etiqueta]) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={modo === m}
                        aria-label={etiqueta}
                        title={etiqueta}
                        onClick={() => cambiarParametro('modo', m === 'tabla' ? '' : m)}
                        className={cn('rounded-md p-2', modo === m ? 'bg-primario text-white' : 'text-texto-apoyo hover:bg-fondo-seccion-alterna')}
                      >
                        <Icono className="size-4" aria-hidden />
                      </button>
                    ))}
                  </div>
                </>
              }
            />

            <div className="grid gap-3 border-b border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(220px,2fr)_repeat(4,minmax(0,1fr))_auto]">
              <div className="sm:col-span-2 lg:col-span-1">
                <Input
                  etiqueta="Buscar instructor"
                  etiquetaOculta
                  type="search"
                  placeholder="Buscar por nombre, documento, especialidad o ficha…"
                  iconoIzquierda={<Search className="size-4" />}
                  value={filtro.q}
                  onChange={(e) => cambiarParametro('q', e.target.value)}
                />
              </div>
              <Select etiqueta="Sede" etiquetaOculta placeholder="Sede: todas" opciones={(catalogos.datos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))} value={filtro.sede} onChange={(e) => cambiarParametro('sede', e.target.value)} />
              <Select etiqueta="Área" etiquetaOculta placeholder="Área: todas" opciones={(catalogos.datos?.areas ?? []).map((a) => ({ valor: String(a.id), etiqueta: a.nombre }))} value={filtro.area} onChange={(e) => cambiarParametro('area', e.target.value)} />
              <Select etiqueta="Ficha" etiquetaOculta placeholder="Ficha: todas" opciones={fichasConInstructor.map(([id, numero]) => ({ valor: String(id), etiqueta: `Ficha ${numero}` }))} value={filtro.ficha} onChange={(e) => cambiarParametro('ficha', e.target.value)} />
              <Select
                etiqueta="Estado"
                etiquetaOculta
                opciones={[
                  { valor: '', etiqueta: 'Solo activos' },
                  { valor: 'inactivos', etiqueta: 'Solo inactivos' },
                  { valor: 'todos', etiqueta: 'Activos e inactivos' },
                ]}
                value={filtro.estado}
                onChange={(e) => cambiarParametro('estado', e.target.value)}
              />
              <Button
                variante="secundario"
                className={cn(!hayFiltros && 'invisible')}
                icono={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => setParametros(modo === 'tabla' ? {} : { modo }, { replace: true })}
                aria-hidden={!hayFiltros}
                tabIndex={hayFiltros ? 0 : -1}
              >
                Limpiar
              </Button>
            </div>

            {modo === 'tabla' ? (
              <DataTable
                titulo="Plantilla docente y cumplimiento"
                columnas={COLUMNAS}
                filas={visibles}
                claveFila={(i) => i.id}
                claseFila={(i) => (!i.activo ? 'opacity-70' : nivelCumplimiento(i.cumplimiento) === 'critico' ? 'bg-alerta-critica/[0.03]' : undefined)}
                mensajeVacio={todos.length ? 'Ningún instructor coincide con los filtros aplicados.' : 'Aún no hay instructores registrados.'}
              />
            ) : visibles.length === 0 ? (
              <EmptyState titulo="Sin resultados" descripcion={todos.length ? 'Ningún instructor coincide con los filtros aplicados.' : 'Aún no hay instructores registrados.'} />
            ) : (
              <ul className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                {visibles.map((i) => (
                  <TarjetaInstructor key={i.id} instructor={i} />
                ))}
              </ul>
            )}
            {enVista.length > 0 && (
              <div className="border-t border-borde">
                <Pagination pagina={paginaActual} totalRegistros={enVista.length} porPagina={POR_PAGINA} onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')} nombreRegistros="instructores" />
              </div>
            )}
          </Card>
        </>
      )}

      {registrando && (
        <ModalRegistrarUsuario
          rolInicial="instructor"
          rolFijo
          onCerrar={() => setRegistrando(false)}
          onRegistrado={(u) => {
            setRegistrando(false)
            setAviso(`Se envió la invitación a ${u.correo}. Ya puede asignar a ${u.nombres} a una ficha; podrá ingresar cuando cree su contraseña.`)
            instructores.recargar()
          }}
        />
      )}
    </>
  )
}

function ListaFichas({ instructor }: { instructor: InstructorResumen }) {
  if (instructor.fichas.length === 0) return <span className="text-xs text-texto-secundario">Sin fichas asignadas</span>
  const [primera, ...resto] = instructor.fichas
  return (
    <div className="min-w-0">
      <p className="truncate text-texto-principal">
        {primera.numero} · {primera.programa}
      </p>
      {resto.length > 0 && <p className="text-xs text-texto-secundario">y {resto.length} {resto.length === 1 ? 'ficha más' : 'fichas más'}</p>}
    </div>
  )
}

function BadgeNivel({ instructor }: { instructor: InstructorResumen }) {
  if (!instructor.activo) return <Badge tono="neutro" conBorde>Inactivo</Badge>
  const n = NIVEL_CUMPLIMIENTO[nivelCumplimiento(instructor.cumplimiento)]
  return (
    <Badge tono={n.tono} punto conBorde>
      {n.etiqueta}
    </Badge>
  )
}

const COLUMNAS: Columna<InstructorResumen>[] = [
  {
    clave: 'instructor',
    encabezado: 'Instructor',
    celda: (i) => (
      <div className="flex items-center gap-3">
        <AvatarIniciales nombres={i.nombres} apellidos={i.apellidos} tono={i.activo ? NIVEL_CUMPLIMIENTO[nivelCumplimiento(i.cumplimiento)].tono : 'neutro'} />
        <div className="min-w-0">
          <p className="font-semibold text-texto-principal">
            {i.nombres} {i.apellidos}
          </p>
          <p className="text-xs text-texto-secundario">
            {ETIQUETA_DOCUMENTO[i.tipoDocumento]} {i.numeroDocumento}
          </p>
        </div>
      </div>
    ),
  },
  { clave: 'fichas', encabezado: 'Fichas a cargo', ocultarEnMovil: true, className: 'max-w-64', celda: (i) => <ListaFichas instructor={i} /> },
  {
    clave: 'cumplimiento',
    encabezado: 'Cumplimiento docente',
    className: 'min-w-40',
    celda: (i) =>
      i.cumplimiento == null ? (
        <span className="text-xs text-texto-secundario">Sin sesiones vencidas</span>
      ) : (
        <ProgressBar valor={i.cumplimiento} tono={tonoCumplimiento(i.cumplimiento)} etiqueta={`Cumplimiento de ${i.nombres} ${i.apellidos}`} />
      ),
  },
  { clave: 'asistencia', encabezado: 'Asistencia aprendices', alineacion: 'centro', ocultarEnMovil: true, celda: (i) => porcentaje(i.asistenciaAprendices) },
  { clave: 'estado', encabezado: 'Estado', celda: (i) => <BadgeNivel instructor={i} /> },
  {
    clave: 'accion',
    encabezado: 'Acción',
    alineacion: 'derecha',
    celda: (i) => (
      <Link to={`/admin/instructores/${i.id}`} className={clasesBoton('secundario', 'sm', 'whitespace-nowrap')} aria-label={`Ver perfil de ${i.nombres} ${i.apellidos}`}>
        Ver perfil
      </Link>
    ),
  },
]

function TarjetaInstructor({ instructor: i }: { instructor: InstructorResumen }) {
  const nivel = nivelCumplimiento(i.cumplimiento)
  return (
    <li className={cn('flex flex-col rounded-2xl border bg-fondo-tarjeta p-5 shadow-sm', nivel === 'critico' && i.activo ? 'border-alerta-critica/30' : 'border-borde', !i.activo && 'opacity-75')}>
      <div className="flex items-start gap-3">
        <AvatarIniciales nombres={i.nombres} apellidos={i.apellidos} tono={i.activo ? NIVEL_CUMPLIMIENTO[nivel].tono : 'neutro'} />
        <div className="min-w-0 flex-1">
          <p className="font-titulos font-semibold text-texto-principal">
            {i.nombres} {i.apellidos}
          </p>
          <p className="truncate text-xs text-texto-secundario">{[i.especialidad, i.area].filter(Boolean).join(' · ') || 'Sin especialidad registrada'}</p>
        </div>
        <BadgeNivel instructor={i} />
      </div>

      <div className="mt-4 text-sm">
        <ListaFichas instructor={i} />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1 text-xs text-texto-secundario">Cumplimiento docente</p>
          {i.cumplimiento == null ? (
            <p className="text-xs text-texto-secundario">Sin sesiones vencidas</p>
          ) : (
            <ProgressBar valor={i.cumplimiento} tono={tonoCumplimiento(i.cumplimiento)} etiqueta={`Cumplimiento de ${i.nombres}`} />
          )}
        </div>
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-fondo-seccion-alterna p-3 text-xs">
          <div>
            <dt className="text-texto-secundario">Asistencia aprendices</dt>
            <dd className="font-semibold text-texto-principal">{porcentaje(i.asistenciaAprendices)}</dd>
          </div>
          <div>
            <dt className="text-texto-secundario">Sesiones registradas</dt>
            <dd className="font-semibold text-texto-principal">
              {i.sesionesEjecutadas} / {i.sesionesPlanificadas}
            </dd>
          </div>
        </dl>
      </div>

      <Link to={`/admin/instructores/${i.id}`} className="mt-4 flex items-center justify-between border-t border-borde pt-3 text-sm font-semibold text-primario hover:underline">
        Ver perfil del instructor <ArrowRight className="size-4" aria-hidden />
      </Link>
    </li>
  )
}
