import { lazy, Suspense, useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BriefcaseBusiness, CalendarCheck, ClipboardCheck, FileDown, FileSearch, FolderOpen, IdCard, Mail, MapPin, PencilLine, Phone, Save, Star, UserRound } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
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
  Modal,
  Pagination,
  ProgressBar,
  Select,
  Spinner,
  type Columna,
} from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { obtenerCatalogos, type Catalogos } from '@/features/catalogos/servicioCatalogos'
import { fechaISOaTexto } from '@/features/fichas/presentacion'
import { ETIQUETA_DOCUMENTO } from '@/features/perfil/servicioPerfil'
import { actualizarUsuario } from '@/features/usuarios/servicioUsuarios'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { porcentaje } from '@/lib/utilidades'
import { antiguedad, cumplimientoMensual, estadoVisualSesion, META_CUMPLIMIENTO, NIVEL_CUMPLIMIENTO, nivelCumplimiento, tonoCumplimiento } from './presentacion'
import { actualizarDatosInstructor, obtenerPerfilInstructor, type InstructorResumen, type SesionInstructor } from './servicioInstructores'

const POR_PAGINA = 10
/** La librería de gráficas (~400 kB) se descarga solo cuando se muestra la gráfica (RNF1) */
const GraficaCumplimiento = lazy(async () => ({ default: (await import('./GraficaCumplimiento')).GraficaCumplimiento }))

/**
 * Perfil del instructor (HU12.2). Un solo lugar por dato:
 * datos personales en la tarjeta lateral · cifras en las 4 tarjetas KPI · detalle por ficha en "Fichas a cargo".
 * Se eliminó la distribución "alto/medio/bajo desempeño" que el Prototipo copiaba de toda la planta dentro
 * del perfil de una persona, y el % repetido en anillo y tarjeta.
 */
export function PaginaPerfilInstructor() {
  const { id = '' } = useParams()
  const perfil = useCarga(() => obtenerPerfilInstructor(id), [id])
  const catalogos = useCarga(obtenerCatalogos, [])
  const [editando, setEditando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [filtroFicha, setFiltroFicha] = useState('')
  const [pagina, setPagina] = useState(1)

  const migas = [
    { etiqueta: 'Inicio', ruta: '/admin' },
    { etiqueta: 'Instructores', ruta: '/admin/instructores' },
    { etiqueta: perfil.datos ? `${perfil.datos.instructor.nombres} ${perfil.datos.instructor.apellidos}` : 'Perfil' },
  ]

  if (perfil.error) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>
          <EstadoError mensaje={perfil.error} onReintentar={perfil.recargar} />
        </Card>
      </>
    )
  }
  if (perfil.cargando) {
    return (
      <Card>
        <Spinner texto="Cargando perfil del instructor…" />
      </Card>
    )
  }
  if (!perfil.datos) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>
          <EmptyState
            icono={FileSearch}
            titulo="Instructor no encontrado"
            descripcion="El instructor no existe o el usuario ya no tiene el rol de instructor."
            accion={
              <Link to="/admin/instructores" className={clasesBoton('primario')}>
                Volver a instructores
              </Link>
            }
          />
        </Card>
      </>
    )
  }

  const { instructor: i, sesiones } = perfil.datos
  const nivel = NIVEL_CUMPLIMIENTO[nivelCumplimiento(i.cumplimiento)]
  const mensual = cumplimientoMensual(sesiones)
  const sesionesFiltradas = filtroFicha ? sesiones.filter((s) => String(s.fichaId) === filtroFicha) : sesiones
  const paginaActual = Math.min(pagina, Math.max(1, Math.ceil(sesionesFiltradas.length / POR_PAGINA)))
  const visibles = sesionesFiltradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  function exportar() {
    descargarCSV(
      `sesiones-${i.nombres}-${i.apellidos}`.toLowerCase().replace(/\s+/g, '-'),
      ['Fecha', 'Ficha', 'Competencia', 'Hora inicio', 'Hora fin', 'Estado'],
      sesionesFiltradas.map((s) => [s.fecha, s.fichaNumero, s.competencia, s.horaInicio?.slice(0, 5), s.horaFin?.slice(0, 5), estadoVisualSesion(s).texto]),
    )
  }

  return (
    <>
      <Breadcrumbs migas={migas} />
      <header className="flex flex-col gap-3 border-b border-borde pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {i.nombres} {i.apellidos}
            </h1>
            {i.activo ? (
              <Badge tono={nivel.tono} punto conBorde>
                {nivel.etiqueta}
              </Badge>
            ) : (
              <Badge tono="neutro" conBorde>
                Cuenta inactiva
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-texto-secundario">Fichas a cargo, cumplimiento en el registro de asistencia e historial de sesiones.</p>
        </div>
        <Button variante="secundario" icono={<PencilLine className="size-4" aria-hidden />} onClick={() => setEditando(true)} disabled={!catalogos.datos}>
          Editar datos
        </Button>
      </header>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* Datos personales: su único lugar */}
        <Card className="h-fit p-6">
          <div className="flex items-center gap-3">
            <AvatarIniciales nombres={i.nombres} apellidos={i.apellidos} className="size-14 text-lg" />
            <div>
              <p className="font-titulos text-lg font-semibold text-texto-principal">Instructor</p>
              <p className="text-sm text-texto-secundario">{i.area ? `Área de ${i.area}` : 'Sin área asignada'}</p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            {(
              [
                [IdCard, 'Documento', `${ETIQUETA_DOCUMENTO[i.tipoDocumento]} ${i.numeroDocumento}`],
                [Mail, 'Correo', <a key="c" href={`mailto:${i.correo}`} className="break-all text-primario hover:underline">{i.correo}</a>],
                [Phone, 'Teléfono', i.telefono ?? 'Sin registrar'],
                [BriefcaseBusiness, 'Especialidad', i.especialidad ?? 'Sin registrar'],
                [MapPin, 'Sede', i.sede ?? 'Sin asignar'],
                [UserRound, 'Antigüedad', antiguedad(i.fechaIngreso)],
              ] as const
            ).map(([Icono, etiqueta, valor]) => (
              <div key={etiqueta} className="flex gap-3">
                <Icono className="mt-0.5 size-4 shrink-0 text-texto-secundario" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs text-texto-secundario">{etiqueta}</dt>
                  <dd className="font-semibold text-texto-principal">{valor}</dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-borde pt-4 text-xs text-texto-secundario">
            El rol y el acceso se gestionan en{' '}
            <Link to="/admin/usuarios" className="font-semibold text-primario hover:underline">
              Gestión de usuarios
            </Link>
            .
          </p>
        </Card>

        <div className="min-w-0 space-y-6">
          {/* Cifras: su único lugar */}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <KpiCard
              titulo="Cumplimiento docente"
              valor={porcentaje(i.cumplimiento)}
              icono={ClipboardCheck}
              tono={i.cumplimiento == null ? 'neutro' : tonoCumplimiento(i.cumplimiento)}
              insignia={i.cumplimiento != null ? { texto: `Meta ${META_CUMPLIMIENTO} %`, tono: i.cumplimiento >= META_CUMPLIMIENTO ? 'exito' : 'advertencia' } : undefined}
            />
            <KpiCard titulo="Sesiones registradas" valor={`${i.sesionesEjecutadas} / ${i.sesionesPlanificadas}`} icono={CalendarCheck} tono="primario" pie="Con asistencia / programadas" />
            <KpiCard titulo="Asistencia de aprendices" valor={porcentaje(i.asistenciaAprendices)} icono={UserRound} tono="informacion" pie="Promedio de sus fichas" />
            <KpiCard titulo="Fichas a cargo" valor={i.fichas.length} icono={FolderOpen} tono="oliva" pie={i.fichas.some((f) => f.esLider) ? `Líder en ${i.fichas.filter((f) => f.esLider).length}` : 'No es líder de ninguna'} />
          </div>

          <Card>
            <CardHeader titulo="Fichas a cargo" descripcion="Cumplimiento del instructor y asistencia de los aprendices en cada ficha." />
            {i.fichas.length === 0 ? (
              <EmptyState icono={FolderOpen} titulo="Sin fichas asignadas" descripcion="Asígnelo desde el detalle de una ficha, en la pestaña Instructores." compacto />
            ) : (
              <ul className="divide-y divide-borde">
                {i.fichas.map((f) => (
                  <li key={f.id} className="space-y-3 px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/fichas/${f.id}`} className="font-titulos font-semibold text-texto-principal hover:text-primario hover:underline">
                        Ficha {f.numero} · {f.programa}
                      </Link>
                      {f.esLider && (
                        <Badge tono="oliva" icono={<Star className="size-3" aria-hidden />}>
                          Líder
                        </Badge>
                      )}
                      <span className="text-xs text-texto-secundario">
                        {f.competencias ? `${f.competencias} ${f.competencias === 1 ? 'competencia' : 'competencias'}` : 'Asignación general'}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-texto-secundario">Cumplimiento ({f.sesionesEjecutadas} de {f.sesionesPlanificadas} sesiones)</p>
                        {f.cumplimiento == null ? (
                          <p className="text-xs text-texto-secundario">Sin sesiones vencidas</p>
                        ) : (
                          <ProgressBar valor={f.cumplimiento} tono={tonoCumplimiento(f.cumplimiento)} etiqueta={`Cumplimiento en la ficha ${f.numero}`} />
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-texto-secundario">Asistencia de aprendices</p>
                        {f.asistenciaAprendices == null ? (
                          <p className="text-xs text-texto-secundario">Sin registros</p>
                        ) : (
                          <ProgressBar valor={f.asistenciaAprendices} etiqueta={`Asistencia de aprendices en la ficha ${f.numero}`} />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader titulo="Cumplimiento mes a mes" descripcion="Sesiones con asistencia registrada sobre las programadas hasta hoy, por mes." />
        <div className="px-3 py-4 sm:px-6">
          {mensual.length === 0 ? (
            <EmptyState titulo="Sin datos todavía" descripcion="La gráfica aparece cuando el instructor tenga sesiones programadas con fecha vencida." compacto />
          ) : (
            <Suspense fallback={<Spinner texto="Cargando gráfica…" />}>
              <GraficaCumplimiento datos={mensual} />
            </Suspense>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          titulo="Historial de sesiones"
          descripcion="Sesiones programadas y su registro de asistencia."
          acciones={
            <>
              <Select
                etiqueta="Ficha"
                etiquetaOculta
                placeholder="Ficha: todas"
                opciones={i.fichas.map((f) => ({ valor: String(f.id), etiqueta: `Ficha ${f.numero}` }))}
                value={filtroFicha}
                onChange={(e) => {
                  setFiltroFicha(e.target.value)
                  setPagina(1)
                }}
              />
              <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={exportar} disabled={sesionesFiltradas.length === 0}>
                Exportar CSV
              </Button>
            </>
          }
        />
        <DataTable titulo="Historial de sesiones" columnas={COLUMNAS_SESIONES} filas={visibles} claveFila={(s) => s.id} mensajeVacio="El instructor aún no tiene sesiones programadas." />
        {sesionesFiltradas.length > 0 && (
          <div className="border-t border-borde">
            <Pagination pagina={paginaActual} totalRegistros={sesionesFiltradas.length} porPagina={POR_PAGINA} onCambiar={setPagina} nombreRegistros="sesiones" />
          </div>
        )}
      </Card>

      {editando && catalogos.datos && (
        <ModalEditarInstructor
          instructor={i}
          catalogos={catalogos.datos}
          onCerrar={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false)
            setAviso('Los datos del instructor se guardaron correctamente.')
            perfil.recargar()
          }}
        />
      )}
    </>
  )
}

const COLUMNAS_SESIONES: Columna<SesionInstructor>[] = [
  { clave: 'fecha', encabezado: 'Fecha', celda: (s) => <span className="whitespace-nowrap">{fechaISOaTexto(s.fecha)}</span> },
  { clave: 'ficha', encabezado: 'Ficha', celda: (s) => <Link to={`/admin/fichas/${s.fichaId}`} className="text-primario hover:underline">{s.fichaNumero}</Link> },
  { clave: 'competencia', encabezado: 'Competencia', ocultarEnMovil: true, celda: (s) => s.competencia },
  {
    clave: 'horario',
    encabezado: 'Horario',
    ocultarEnMovil: true,
    celda: (s) => (s.horaInicio ? `${s.horaInicio.slice(0, 5)} – ${s.horaFin?.slice(0, 5) ?? ''}` : '—'),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    celda: (s) => {
      const e = estadoVisualSesion(s)
      return (
        <Badge tono={e.tono} conBorde>
          {e.texto}
        </Badge>
      )
    },
  },
]

const esquemaEdicion = z.object({
  telefono: z
    .string()
    .trim()
    .max(20, 'Máximo 20 caracteres')
    .refine((v) => v === '' || /^\+?[0-9\s]{7,20}$/.test(v), 'Ingrese solo números (7 a 20 dígitos), puede iniciar con +'),
  sedeId: z.string(),
  areaId: z.string(),
  especialidad: z.string().trim().max(150, 'Máximo 150 caracteres'),
  fechaIngreso: z
    .string()
    .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), 'La fecha de ingreso no puede ser posterior a hoy'),
})
type FormularioEdicion = z.infer<typeof esquemaEdicion>

/** Edición de los datos del instructor: contacto, sede, área, especialidad e ingreso */
function ModalEditarInstructor({ instructor: i, catalogos, onCerrar, onGuardado }: { instructor: InstructorResumen; catalogos: Catalogos; onCerrar: () => void; onGuardado: () => void }) {
  const idFormulario = useId()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormularioEdicion>({
    resolver: zodResolver(esquemaEdicion),
    defaultValues: {
      telefono: i.telefono ?? '',
      sedeId: i.sedeId ? String(i.sedeId) : '',
      areaId: i.areaId ? String(i.areaId) : '',
      especialidad: i.especialidad ?? '',
      fechaIngreso: i.fechaIngreso ?? '',
    },
  })

  async function guardar(v: FormularioEdicion) {
    setError(null)
    const r1 = await actualizarUsuario(i.id, { nombres: i.nombres, apellidos: i.apellidos, telefono: v.telefono || null, sedeId: v.sedeId ? Number(v.sedeId) : null })
    if (!r1.ok) return setError(r1.mensaje)
    const r2 = await actualizarDatosInstructor(i.id, { areaId: v.areaId ? Number(v.areaId) : null, especialidad: v.especialidad || null, fechaIngreso: v.fechaIngreso || null })
    if (!r2.ok) return setError(r2.mensaje)
    onGuardado()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={`Editar datos de ${i.nombres} ${i.apellidos}`}
      descripcion="El nombre, el correo y el documento se gestionan en Gestión de usuarios."
      tamano="lg"
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} cargando={isSubmitting} icono={<Save className="size-4" aria-hidden />}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id={idFormulario} noValidate onSubmit={handleSubmit(guardar)} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        )}
        <Input etiqueta="Teléfono" type="tel" error={errors.telefono?.message} {...register('telefono')} />
        <Select etiqueta="Sede" placeholder="Sin sede asignada" opciones={catalogos.sedes.map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))} {...register('sedeId')} />
        <Select etiqueta="Área" placeholder="Sin área asignada" opciones={catalogos.areas.map((a) => ({ valor: String(a.id), etiqueta: a.nombre }))} {...register('areaId')} />
        <Input etiqueta="Especialidad" error={errors.especialidad?.message} {...register('especialidad')} />
        <Input etiqueta="Fecha de ingreso" type="date" error={errors.fechaIngreso?.message} {...register('fechaIngreso')} />
      </form>
    </Modal>
  )
}
