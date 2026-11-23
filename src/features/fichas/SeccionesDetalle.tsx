import { useState, type ReactNode } from 'react'
import { BookOpen, History, Mail, Phone, Search, ShieldCheck, Star, TriangleAlert, UserCog, UserMinus, UserPlus, UsersRound } from 'lucide-react'
import { AvatarIniciales, Badge, Button, Card, CardHeader, EmptyState, Input, ProgressBar } from '@/components/ui'
import { ETIQUETA_DOCUMENTO } from '@/features/perfil/servicioPerfil'
import { cn, porcentaje, tiempoRelativo } from '@/lib/utilidades'
import {
  ETIQUETA_ESTADO_MATRICULA,
  ETIQUETA_VOCERO,
  type EstadoMatricula,
  type Tono,
} from '@/types/dominio'
import { ETIQUETA_RIESGO, fechaISOaTexto, riesgoAprendiz } from './presentacion'
import type { AprendizFicha, AsignacionInstructor, DetalleFicha } from './servicioFichas'

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const TONO_MATRICULA: Record<EstadoMatricula, Tono> = {
  matriculado: 'exito',
  aplazado: 'advertencia',
  retirado: 'neutro',
  desertor: 'critico',
  certificado: 'informacion',
}

// ---------------------------------------------------------------------
// Información general (RF06)
// ---------------------------------------------------------------------

export function InformacionGeneral({ detalle }: { detalle: DetalleFicha }) {
  // Solo datos que NO aparecen en el encabezado, las tarjetas ni el panel lateral (un único lugar por dato)
  const { ficha, codigoPrograma, capacidadAmbiente } = detalle
  const datos: Array<[string, ReactNode]> = [
    ['Código del programa', codigoPrograma || '—'],
    ['Área', ficha.area],
    ['Ambiente de aprendizaje', ficha.ambiente ?? 'Sin asignar'],
    ['Capacidad del ambiente (cupo)', capacidadAmbiente ? `${capacidadAmbiente} aprendices` : 'Sin definir'],
    ['Duración', `${duracionMeses(ficha.fechaInicio, ficha.fechaFin)} meses`],
    ['Fecha de registro', fechaISOaTexto(detalle.creadaEn)],
  ]
  return (
    <Card>
      <CardHeader titulo="Información general" descripcion="Datos administrativos de la ficha de formación." />
      <dl className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="border-b border-borde pb-3">
            <dt className="text-xs font-semibold tracking-wide text-texto-secundario uppercase">{etiqueta}</dt>
            <dd className="mt-0.5 font-semibold text-texto-principal">{valor}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function duracionMeses(inicio: string, fin: string) {
  const [a1, m1, d1] = inicio.split('-').map(Number)
  const [a2, m2, d2] = fin.split('-').map(Number)
  return Math.max(0, (a2 - a1) * 12 + (m2 - m1) + (d2 >= d1 ? 0 : -1))
}

// ---------------------------------------------------------------------
// Instructores asignados (HU10.4)
// ---------------------------------------------------------------------

interface PropsInstructores {
  detalle: DetalleFicha
  onAsignar: () => void
  onQuitar: (asignacion: AsignacionInstructor) => void
  editable: boolean
}

export function ListaInstructores({ detalle, onAsignar, onQuitar, editable }: PropsInstructores) {
  const grupos = new Map<string, AsignacionInstructor[]>()
  for (const a of detalle.instructores) grupos.set(a.instructorId, [...(grupos.get(a.instructorId) ?? []), a])
  const porInstructor = [...grupos.values()]
  return (
    <Card>
      <CardHeader
        titulo="Instructores asignados"
        descripcion="Equipo docente de la ficha y competencias a cargo."
        acciones={
          editable && (
            <Button icono={<UserPlus className="size-4" aria-hidden />} onClick={onAsignar}>
              Asignar instructor
            </Button>
          )
        }
      />
      {porInstructor.length === 0 ? (
        <EmptyState icono={UsersRound} titulo="Sin instructores asignados" descripcion="Asigne instructores para habilitar el registro de asistencia de la ficha." />
      ) : (
        <ul className="divide-y divide-borde">
          {porInstructor.map((asignaciones) => {
            const i = asignaciones[0]
            const esLider = detalle.ficha.instructorLiderId === i.instructorId
            return (
              <li key={i.instructorId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
                <AvatarIniciales nombres={i.nombres} apellidos={i.apellidos} tono={esLider ? 'oliva' : 'primario'} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-texto-principal">
                    {i.nombres} {i.apellidos}
                    {esLider && (
                      <Badge tono="oliva" icono={<Star className="size-3" aria-hidden />}>
                        Instructor líder
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-texto-secundario">{[i.especialidad, i.correo].filter(Boolean).join(' · ')}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {asignaciones.map((a) => (
                      <li key={a.id} className="inline-flex items-center gap-1 rounded-full border border-borde bg-fondo-seccion-alterna py-0.5 pr-1 pl-2.5 text-xs">
                        <span>
                          {a.competencia ? `${a.competenciaCodigo} · ${a.competencia}` : 'Asignación general'}
                          {a.fechaInicio && <span className="text-texto-secundario"> · {fechaISOaTexto(a.fechaInicio)} – {fechaISOaTexto(a.fechaFin)}</span>}
                        </span>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => onQuitar(a)}
                            className="rounded-full p-1 text-texto-secundario hover:bg-alerta-critica/10 hover:text-alerta-critica"
                            aria-label={`Quitar ${a.competencia ?? 'asignación general'} a ${i.nombres} ${i.apellidos}`}
                          >
                            <UserMinus className="size-3.5" aria-hidden />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <a href={`mailto:${i.correo}`} className="self-start rounded-lg border border-borde p-2 text-texto-apoyo hover:bg-fondo-seccion-alterna" aria-label={`Enviar correo a ${i.nombres}`}>
                  <Mail className="size-4" aria-hidden />
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------
// Aprendices (RF07, HU02.2)
// ---------------------------------------------------------------------

interface PropsAprendices {
  detalle: DetalleFicha
  onMatricular: () => void
  onCambiarEstado: (aprendiz: AprendizFicha) => void
  editable: boolean
}

export function ListaAprendices({ detalle, onMatricular, onCambiarEstado, editable }: PropsAprendices) {
  const [busqueda, setBusqueda] = useState('')
  const texto = normalizar(busqueda.trim())
  const lista = detalle.aprendices
    .filter(
      (a) =>
        !texto ||
        [`${a.nombres} ${a.apellidos}`, a.numeroDocumento, ETIQUETA_ESTADO_MATRICULA[a.estado], a.correo].some((c) => normalizar(c).includes(texto)),
    )
    // Primero los matriculados, luego los demás estados
    .sort((x, y) => Number(x.estado !== 'matriculado') - Number(y.estado !== 'matriculado'))

  return (
    <Card>
      <CardHeader
        titulo="Directorio de aprendices"
        descripcion="Asistencia individual, vocería y estado de permanencia."
        acciones={
          editable && (
            <Button icono={<UserPlus className="size-4" aria-hidden />} onClick={onMatricular}>
              Matricular aprendiz
            </Button>
          )
        }
      />
      {detalle.aprendices.length === 0 ? (
        <EmptyState icono={UsersRound} titulo="Sin aprendices matriculados" descripcion="Matricule aprendices para iniciar el seguimiento de asistencia." />
      ) : (
        <>
          <div className="border-b border-borde px-5 py-3 sm:px-6">
            <Input
              etiqueta="Filtrar aprendices"
              etiquetaOculta
              type="search"
              placeholder="Filtrar por documento, nombre o estado…"
              iconoIzquierda={<Search className="size-4" />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {lista.length === 0 ? (
            <EmptyState titulo="Sin resultados" descripcion="Ningún aprendiz coincide con el filtro." compacto />
          ) : (
            <ul className="space-y-2 p-3 sm:p-4">
              {lista.map((a) => {
                const riesgo = a.estado === 'matriculado' ? riesgoAprendiz(a.porcentajeInasistencia, detalle.umbrales) : null
                const resaltado = riesgo === 'alta' ? 'critico' : riesgo === 'media' ? 'advertencia' : null
                return (
                  <li
                    key={a.matriculaId}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center',
                      resaltado === 'critico' ? 'border-alerta-critica/25 bg-alerta-critica/5' : resaltado === 'advertencia' ? 'border-advertencia/40 bg-advertencia/5' : 'border-transparent bg-fondo-seccion-alterna',
                      a.estado !== 'matriculado' && 'opacity-75',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <AvatarIniciales nombres={a.nombres} apellidos={a.apellidos} tono={resaltado ?? 'primario'} />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-texto-principal">
                          {a.nombres} {a.apellidos}
                          {a.vocero !== 'ninguno' && <Badge tono="informacion">{ETIQUETA_VOCERO[a.vocero]}</Badge>}
                        </p>
                        <p className="text-xs text-texto-secundario">
                          {ETIQUETA_DOCUMENTO[a.tipoDocumento]} {a.numeroDocumento} ·{' '}
                          {a.totalRegistros ? `${porcentaje(a.porcentajeAsistencia)} de asistencia` : 'Sin registros de asistencia'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {a.estado !== 'matriculado' ? (
                        <Badge tono={TONO_MATRICULA[a.estado]} conBorde>
                          {ETIQUETA_ESTADO_MATRICULA[a.estado]}
                        </Badge>
                      ) : riesgo ? (
                        <Badge tono={ETIQUETA_RIESGO[riesgo].tono} conBorde>
                          {ETIQUETA_RIESGO[riesgo].texto} · {porcentaje(a.porcentajeInasistencia)} inasistencia
                        </Badge>
                      ) : (
                        <Badge tono="exito">Al día</Badge>
                      )}
                      <a href={`mailto:${a.correo}`} className="rounded-lg border border-borde bg-fondo-tarjeta p-2 text-texto-apoyo hover:bg-fondo-tarjeta-suave" aria-label={`Enviar correo a ${a.nombres}`}>
                        <Mail className="size-4" aria-hidden />
                      </a>
                      {a.telefono && (
                        <a href={`tel:${a.telefono.replace(/\s/g, '')}`} className="rounded-lg border border-borde bg-fondo-tarjeta p-2 text-texto-apoyo hover:bg-fondo-tarjeta-suave" aria-label={`Llamar a ${a.nombres}`}>
                          <Phone className="size-4" aria-hidden />
                        </a>
                      )}
                      {editable && (
                        <Button variante="secundario" tamano="sm" icono={<UserCog className="size-3.5" aria-hidden />} onClick={() => onCambiarEstado(a)}>
                          Estado
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------
// Competencias del programa (RF15)
// ---------------------------------------------------------------------

export function ListaCompetencias({ detalle }: { detalle: DetalleFicha }) {
  return (
    <Card>
      <CardHeader titulo="Competencias del programa" descripcion="Instructores a cargo y asistencia registrada por competencia." />
      {detalle.competencias.length === 0 ? (
        <EmptyState icono={BookOpen} titulo="Sin competencias" descripcion="El programa de formación de esta ficha no tiene competencias registradas." />
      ) : (
        <ul className="divide-y divide-borde">
          {detalle.competencias.map((c) => (
            <li key={c.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_200px] sm:items-center sm:px-6">
              <div>
                <p className="font-semibold text-texto-principal">
                  <span className="mr-2 text-xs text-texto-secundario">{c.codigo}</span>
                  {c.nombre}
                </p>
                <p className="text-xs text-texto-secundario">
                  {c.instructores.length ? `Instructor: ${c.instructores.join(', ')}` : 'Sin instructor asignado'}
                  {c.horas ? ` · ${c.horas} h` : ''}
                  {` · ${c.sesiones} ${c.sesiones === 1 ? 'sesión' : 'sesiones'}`}
                </p>
              </div>
              {c.porcentajeAsistencia == null ? (
                <span className="text-xs text-texto-secundario sm:text-right">Sin asistencia registrada</span>
              ) : (
                <ProgressBar valor={c.porcentajeAsistencia} etiqueta={`Asistencia en ${c.nombre}`} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------
// Panel lateral: vocería, alertas tempranas y trazabilidad
// ---------------------------------------------------------------------

export function PanelLateral({ detalle, onVerAprendices }: { detalle: DetalleFicha; onVerAprendices: () => void }) {
  const voceros = detalle.aprendices.filter((a) => a.vocero !== 'ninguno').sort((a) => (a.vocero === 'titular' ? -1 : 1))
  const enRiesgo = detalle.aprendices
    .filter((a) => a.estado === 'matriculado')
    .map((a) => ({ a, riesgo: riesgoAprendiz(a.porcentajeInasistencia, detalle.umbrales) }))
    .filter((x) => x.riesgo === 'alta' || x.riesgo === 'media')
    .sort((x, y) => (y.a.porcentajeInasistencia ?? 0) - (x.a.porcentajeInasistencia ?? 0))

  return (
    <aside className="space-y-6" aria-label="Resumen de la ficha">
      <Card className="p-5">
        <h2 className="mb-3 font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">Vocería de la ficha</h2>
        {voceros.length === 0 ? (
          <p className="text-sm text-texto-secundario">Sin voceros designados. Puede asignarlos en "Actualizar ficha".</p>
        ) : (
          <ul className="space-y-2">
            {voceros.map((v) => (
              <li key={v.matriculaId} className="flex items-center gap-3 rounded-xl bg-fondo-seccion-alterna p-3">
                <AvatarIniciales nombres={v.nombres} apellidos={v.apellidos} tono="informacion" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-texto-principal">
                    {v.nombres} {v.apellidos}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {ETIQUETA_VOCERO[v.vocero]} · {v.totalRegistros ? `${porcentaje(v.porcentajeAsistencia)} asistencia` : 'sin registros'}
                  </p>
                </div>
                <a href={`mailto:${v.correo}`} className="rounded-lg border border-borde bg-fondo-tarjeta p-2 text-texto-apoyo" aria-label={`Enviar correo a ${v.nombres}`}>
                  <Mail className="size-4" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">Alertas de deserción temprana</h2>
          {enRiesgo.length > 0 && <Badge tono="critico">{enRiesgo.length} casos</Badge>}
        </div>
        {enRiesgo.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-texto-secundario">
            <ShieldCheck className="size-4 text-confirmacion" aria-hidden /> Ningún aprendiz supera los umbrales de inasistencia.
          </p>
        ) : (
          <ul className="space-y-2">
            {enRiesgo.slice(0, 5).map(({ a, riesgo }) => (
              <li key={a.matriculaId} className={cn('rounded-xl border p-3', riesgo === 'alta' ? 'border-alerta-critica/25 bg-alerta-critica/5' : 'border-advertencia/40 bg-advertencia/5')}>
                <p className="flex items-center justify-between gap-2 font-semibold text-texto-principal">
                  {a.nombres} {a.apellidos}
                  <Badge tono={ETIQUETA_RIESGO[riesgo!].tono}>{riesgo === 'alta' ? 'Crítico' : 'Alerta'}</Badge>
                </p>
                <p className="text-xs text-texto-apoyo">{porcentaje(a.porcentajeInasistencia)} de inasistencias acumuladas</p>
              </li>
            ))}
          </ul>
        )}
        <Button variante="fantasma" tamano="sm" className="mt-3 w-full" onClick={onVerAprendices} icono={<TriangleAlert className="size-3.5" aria-hidden />}>
          Ver listado completo de aprendices
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">Trazabilidad</h2>
        <p className="flex items-start gap-2 text-sm">
          <History className="mt-0.5 size-4 text-texto-secundario" aria-hidden />
          <span>
            <span className="block font-semibold text-texto-principal">Última modificación</span>
            <span className="text-xs text-texto-secundario">
              {tiempoRelativo(detalle.actualizadaEn)} · Los cambios quedan registrados en la bitácora.
            </span>
          </span>
        </p>
      </Card>
    </aside>
  )
}
