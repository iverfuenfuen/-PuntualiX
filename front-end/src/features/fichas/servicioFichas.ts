import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'

// Los catálogos son compartidos por varios módulos: se reexportan aquí por compatibilidad
export { obtenerCatalogos, type Catalogos } from '@/features/catalogos/servicioCatalogos'
import type {
  EstadoAsistencia,
  EstadoFicha,
  EstadoMatricula,
  Jornada,
  Modalidad,
  NivelFormacion,
  PrioridadAlerta,
  TipoDocumento,
  TipoVocero,
} from '@/types/dominio'

/**
 * Servicio del módulo Fichas (CU10, RF04–RF07, HU10.1–HU10.5, HU02.2).
 * Único punto del módulo que habla con Supabase. Las reglas de negocio las garantiza la BD
 * (restricciones, triggers y RLS); aquí solo se traducen sus errores a mensajes claros.
 */

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------


/** Fila de la vista v_fichas_resumen (RF04, RF05, RF14, RF21) */
export interface FichaResumen {
  id: number
  numero: string
  estado: EstadoFicha
  jornada: Jornada
  modalidad: Modalidad
  fechaInicio: string
  fechaFin: string
  programaId: number
  programa: string
  nivel: NivelFormacion
  areaId: number
  area: string
  sedeId: number
  sede: string
  ambienteId: number | null
  ambiente: string | null
  instructorLiderId: string | null
  instructorLider: string | null
  aprendicesActivos: number
  totalRegistros: number
  porcentajeAsistencia: number | null
  porcentajeInasistencia: number | null
  nivelRiesgo: PrioridadAlerta | null
}

export interface DatosFicha {
  numero: string
  programaId: number
  sedeId: number
  ambienteId: number | null
  jornada: Jornada
  modalidad: Modalidad
  fechaInicio: string
  fechaFin: string
  estado: EstadoFicha
  instructorLiderId?: string | null
}

export interface InstructorDisponible {
  id: string
  nombres: string
  apellidos: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  correo: string
  especialidad: string | null
  area: string | null
}

export interface AsignacionInstructor {
  id: number
  instructorId: string
  nombres: string
  apellidos: string
  correo: string
  especialidad: string | null
  competenciaId: number | null
  competenciaCodigo: string | null
  competencia: string | null
  fechaInicio: string | null
  fechaFin: string | null
}

export interface AprendizFicha {
  matriculaId: number
  aprendizId: string
  nombres: string
  apellidos: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  correo: string
  telefono: string | null
  /** HU02.4 — Acceso a la plataforma (perfiles.estado) */
  cuentaActiva: boolean
  estado: EstadoMatricula
  vocero: TipoVocero
  fechaMatricula: string
  totalRegistros: number
  porcentajeAsistencia: number | null
  porcentajeInasistencia: number | null
}

export interface CompetenciaFicha {
  id: number
  codigo: string
  nombre: string
  horas: number | null
  sesiones: number
  porcentajeAsistencia: number | null
  instructores: string[]
}

export interface Umbral {
  prioridad: PrioridadAlerta
  porcentaje: number
}

export interface DetalleFicha {
  ficha: FichaResumen
  codigoPrograma: string
  capacidadAmbiente: number | null
  creadaEn: string
  actualizadaEn: string
  instructores: AsignacionInstructor[]
  aprendices: AprendizFicha[]
  competencias: CompetenciaFicha[]
  umbrales: Umbral[]
}

// ---------------------------------------------------------------------
// Filas tal como llegan de PostgREST
// ---------------------------------------------------------------------

interface FilaResumen {
  id: number
  numero: string
  estado: EstadoFicha
  jornada: Jornada
  modalidad: Modalidad
  fecha_inicio: string
  fecha_fin: string
  programa_id: number
  programa: string
  nivel: NivelFormacion
  area_id: number
  area: string
  sede_id: number
  sede: string
  ambiente_id: number | null
  ambiente: string | null
  instructor_lider_id: string | null
  instructor_lider: string | null
  aprendices_activos: number
  total_registros: number
  porcentaje_asistencia: number | null
  porcentaje_inasistencia: number | null
  nivel_riesgo: PrioridadAlerta | null
}

interface FilaPerfilBasico {
  nombres: string
  apellidos: string
  correo: string
  tipo_documento: TipoDocumento
  numero_documento: string
  telefono?: string | null
  estado?: 'activo' | 'inactivo'
}

const numero = (v: unknown): number | null => (v == null ? null : Number(v))

function aResumen(f: FilaResumen): FichaResumen {
  return {
    id: f.id,
    numero: f.numero,
    estado: f.estado,
    jornada: f.jornada,
    modalidad: f.modalidad,
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    programaId: f.programa_id,
    programa: f.programa,
    nivel: f.nivel,
    areaId: f.area_id,
    area: f.area,
    sedeId: f.sede_id,
    sede: f.sede,
    ambienteId: f.ambiente_id,
    ambiente: f.ambiente,
    instructorLiderId: f.instructor_lider_id,
    instructorLider: f.instructor_lider,
    aprendicesActivos: Number(f.aprendices_activos ?? 0),
    totalRegistros: Number(f.total_registros ?? 0),
    porcentajeAsistencia: numero(f.porcentaje_asistencia),
    porcentajeInasistencia: numero(f.porcentaje_inasistencia),
    nivelRiesgo: f.nivel_riesgo,
  }
}

/** Mensajes por restricción de la BD (ver supabase/migrations/01_tipos_y_tablas.sql) */
const ERRORES_FICHA = {
  fichas_numero_key: 'Ya existe una ficha registrada con ese número. El número de ficha debe ser único.',
  fichas_numero_formato: 'El número de ficha solo puede contener dígitos.',
  fichas_fechas_validas: 'La fecha de finalización debe ser posterior a la fecha de inicio.',
}

const ERRORES_MATRICULA = {
  matriculas_un_activo_por_aprendiz: 'El aprendiz ya tiene una matrícula activa en otra ficha. Primero debe retirarse o aplazarse de esa ficha.',
  matriculas_un_vocero_por_tipo: 'La ficha ya tiene un vocero de ese tipo. Quite primero la vocería al aprendiz actual.',
  matriculas_ficha_id_aprendiz_id_key: 'El aprendiz ya está registrado en esta ficha.',
}

// ---------------------------------------------------------------------
// Fichas: consulta, registro, actualización y desactivación
// ---------------------------------------------------------------------

/** HU10.5 / RF04 — Listado de fichas con sus indicadores. El filtrado (RF05) se hace en la interfaz. */
export async function listarFichas(): Promise<Resultado<FichaResumen[]>> {
  const { data, error } = await supabase.from('v_fichas_resumen').select('*').order('numero')
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: (data as FilaResumen[]).map(aResumen) }
}

/** RF06 — Detalle completo de una ficha: datos, instructores, aprendices (RF07) y competencias. */
export async function obtenerDetalleFicha(id: number): Promise<Resultado<DetalleFicha | null>> {
  const [resumen, base] = await Promise.all([
    supabase.from('v_fichas_resumen').select('*').eq('id', id).maybeSingle(),
    supabase.from('fichas').select('created_at, updated_at, programas(codigo), ambientes(capacidad)').eq('id', id).maybeSingle(),
  ])
  if (resumen.error || base.error) return { ok: false, mensaje: traducirErrorBD(resumen.error ?? base.error) }
  if (!resumen.data || !base.data) return { ok: true, datos: null }

  const ficha = aResumen(resumen.data as FilaResumen)
  const filaBase = base.data as unknown as { created_at: string; updated_at: string; programas: { codigo: string } | null; ambientes: { capacidad: number | null } | null }

  const [asignaciones, matriculas, asistenciaAprendiz, competencias, asistenciaCompetencia, umbrales] = await Promise.all([
    supabase
      .from('ficha_instructores')
      .select('id, instructor_id, competencia_id, fecha_inicio, fecha_fin, competencias(codigo, nombre), instructores(especialidad, perfiles(nombres, apellidos, correo))')
      .eq('ficha_id', id)
      .order('created_at'),
    supabase
      .from('matriculas')
      .select('id, aprendiz_id, estado, vocero, fecha_matricula, perfiles(nombres, apellidos, correo, tipo_documento, numero_documento, telefono, estado)')
      .eq('ficha_id', id),
    supabase.from('v_asistencia_aprendiz').select('aprendiz_id, total_registros, porcentaje_asistencia, porcentaje_inasistencia').eq('ficha_id', id),
    supabase.from('competencias').select('id, codigo, nombre, horas').eq('programa_id', ficha.programaId).order('codigo'),
    supabase.from('v_asistencia_competencia').select('competencia_id, sesiones, porcentaje_asistencia').eq('ficha_id', id),
    supabase.from('umbrales_alerta').select('prioridad, porcentaje_inasistencia').eq('activo', true).order('porcentaje_inasistencia'),
  ])
  const error = asignaciones.error ?? matriculas.error ?? asistenciaAprendiz.error ?? competencias.error ?? asistenciaCompetencia.error ?? umbrales.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }

  type FilaAsignacion = {
    id: number
    instructor_id: string
    competencia_id: number | null
    fecha_inicio: string | null
    fecha_fin: string | null
    competencias: { codigo: string; nombre: string } | null
    instructores: { especialidad: string | null; perfiles: { nombres: string; apellidos: string; correo: string } | null } | null
  }
  const instructores: AsignacionInstructor[] = (asignaciones.data as unknown as FilaAsignacion[]).map((a) => ({
    id: a.id,
    instructorId: a.instructor_id,
    nombres: a.instructores?.perfiles?.nombres ?? '',
    apellidos: a.instructores?.perfiles?.apellidos ?? '',
    correo: a.instructores?.perfiles?.correo ?? '',
    especialidad: a.instructores?.especialidad ?? null,
    competenciaId: a.competencia_id,
    competenciaCodigo: a.competencias?.codigo ?? null,
    competencia: a.competencias?.nombre ?? null,
    fechaInicio: a.fecha_inicio,
    fechaFin: a.fecha_fin,
  }))

  type FilaAsistencia = { aprendiz_id: string; total_registros: number; porcentaje_asistencia: number | null; porcentaje_inasistencia: number | null }
  const asistenciaPorAprendiz = new Map((asistenciaAprendiz.data as FilaAsistencia[]).map((a) => [a.aprendiz_id, a]))

  type FilaMatricula = {
    id: number
    aprendiz_id: string
    estado: EstadoMatricula
    vocero: TipoVocero
    fecha_matricula: string
    perfiles: (FilaPerfilBasico & { estado: 'activo' | 'inactivo' }) | null
  }
  const aprendices: AprendizFicha[] = (matriculas.data as unknown as FilaMatricula[])
    .map((m) => {
      const a = asistenciaPorAprendiz.get(m.aprendiz_id)
      return {
        matriculaId: m.id,
        aprendizId: m.aprendiz_id,
        nombres: m.perfiles?.nombres ?? '',
        apellidos: m.perfiles?.apellidos ?? '',
        tipoDocumento: m.perfiles?.tipo_documento ?? 'CC',
        numeroDocumento: m.perfiles?.numero_documento ?? '',
        correo: m.perfiles?.correo ?? '',
        telefono: m.perfiles?.telefono ?? null,
        cuentaActiva: m.perfiles?.estado !== 'inactivo',
        estado: m.estado,
        vocero: m.vocero,
        fechaMatricula: m.fecha_matricula,
        totalRegistros: Number(a?.total_registros ?? 0),
        porcentajeAsistencia: numero(a?.porcentaje_asistencia),
        porcentajeInasistencia: numero(a?.porcentaje_inasistencia),
      }
    })
    .sort((x, y) => `${x.apellidos} ${x.nombres}`.localeCompare(`${y.apellidos} ${y.nombres}`, 'es'))

  type FilaAsistCompetencia = { competencia_id: number; sesiones: number; porcentaje_asistencia: number | null }
  const asistenciaPorCompetencia = new Map((asistenciaCompetencia.data as FilaAsistCompetencia[]).map((c) => [c.competencia_id, c]))
  const listaCompetencias: CompetenciaFicha[] = (competencias.data as Array<{ id: number; codigo: string; nombre: string; horas: number | null }>).map((c) => ({
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    horas: c.horas,
    sesiones: Number(asistenciaPorCompetencia.get(c.id)?.sesiones ?? 0),
    porcentajeAsistencia: numero(asistenciaPorCompetencia.get(c.id)?.porcentaje_asistencia),
    instructores: [...new Set(instructores.filter((i) => i.competenciaId === c.id).map((i) => `${i.nombres} ${i.apellidos}`))],
  }))

  return {
    ok: true,
    datos: {
      ficha,
      codigoPrograma: filaBase.programas?.codigo ?? '',
      capacidadAmbiente: filaBase.ambientes?.capacidad ?? null,
      creadaEn: filaBase.created_at,
      actualizadaEn: filaBase.updated_at,
      instructores,
      aprendices,
      competencias: listaCompetencias,
      umbrales: (umbrales.data as Array<{ prioridad: PrioridadAlerta; porcentaje_inasistencia: number }>).map((u) => ({
        prioridad: u.prioridad,
        porcentaje: Number(u.porcentaje_inasistencia),
      })),
    },
  }
}

/** Columnas editables de la ficha (todas menos el número, que no cambia tras el registro) */
function aFilaFicha(d: Omit<DatosFicha, 'numero'>) {
  return {
    programa_id: d.programaId,
    sede_id: d.sedeId,
    ambiente_id: d.ambienteId,
    jornada: d.jornada,
    modalidad: d.modalidad,
    fecha_inicio: d.fechaInicio,
    fecha_fin: d.fechaFin,
    estado: d.estado,
    ...(d.instructorLiderId !== undefined && { instructor_lider_id: d.instructorLiderId }),
  }
}

/** HU10.1 — Registrar una ficha. Devuelve el id creado. La bitácora la registra un trigger (RF19). */
export async function registrarFicha(datos: DatosFicha): Promise<Resultado<number>> {
  const { data, error } = await supabase
    .from('fichas')
    .insert({ numero: datos.numero.trim(), ...aFilaFicha(datos) })
    .select('id')
    .single()
  if (error) return { ok: false, mensaje: traducirErrorBD(error, ERRORES_FICHA) }
  return { ok: true, datos: (data as { id: number }).id }
}

/** HU10.2 — Actualizar una ficha. El número no se modifica para preservar la integridad del historial. */
export async function actualizarFicha(id: number, datos: Omit<DatosFicha, 'numero'>): Promise<Resultado> {
  const { error } = await supabase.from('fichas').update(aFilaFicha(datos)).eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error, ERRORES_FICHA) }
  return { ok: true, datos: undefined }
}

/** HU10.3 — Desactivar (o reactivar) una ficha. Nunca se borra: conserva su historial. */
export async function cambiarEstadoFicha(id: number, estado: EstadoFicha): Promise<Resultado> {
  const { error } = await supabase.from('fichas').update({ estado }).eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error, ERRORES_FICHA) }
  return { ok: true, datos: undefined }
}

/** Vocero titular/suplente (HU10.2). Primero libera la vocería anterior del mismo tipo para respetar el índice único. */
export async function asignarVocero(fichaId: number, tipo: Exclude<TipoVocero, 'ninguno'>, matriculaId: number | null): Promise<Resultado> {
  const liberar = supabase.from('matriculas').update({ vocero: 'ninguno' }).eq('ficha_id', fichaId).eq('vocero', tipo)
  const { error: errorLiberar } = matriculaId ? await liberar.neq('id', matriculaId) : await liberar
  if (errorLiberar) return { ok: false, mensaje: traducirErrorBD(errorLiberar, ERRORES_MATRICULA) }
  if (!matriculaId) return { ok: true, datos: undefined }
  const { error } = await supabase.from('matriculas').update({ vocero: tipo }).eq('id', matriculaId)
  if (error) return { ok: false, mensaje: traducirErrorBD(error, ERRORES_MATRICULA) }
  return { ok: true, datos: undefined }
}

// ---------------------------------------------------------------------
// Instructores de la ficha (HU10.4)
// ---------------------------------------------------------------------

/** Instructores activos que se pueden asignar a una ficha */
export async function listarInstructoresDisponibles(): Promise<Resultado<InstructorDisponible[]>> {
  const { data, error } = await supabase
    .from('instructores')
    .select('id, especialidad, areas(nombre), perfiles!inner(nombres, apellidos, correo, tipo_documento, numero_documento, estado)')
    .eq('perfiles.estado', 'activo')
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  type Fila = { id: string; especialidad: string | null; areas: { nombre: string } | null; perfiles: FilaPerfilBasico }
  return {
    ok: true,
    datos: (data as unknown as Fila[])
      .map((i) => ({
        id: i.id,
        nombres: i.perfiles.nombres,
        apellidos: i.perfiles.apellidos,
        tipoDocumento: i.perfiles.tipo_documento,
        numeroDocumento: i.perfiles.numero_documento,
        correo: i.perfiles.correo,
        especialidad: i.especialidad,
        area: i.areas?.nombre ?? null,
      }))
      .sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es')),
  }
}

export interface DatosAsignacion {
  fichaId: number
  instructorId: string
  /** Vacío = asignación general a la ficha, sin competencia específica */
  competenciaIds: number[]
  fechaInicio: string | null
  fechaFin: string | null
  esLider: boolean
}

/** HU10.4 — Asigna un instructor a la ficha (una fila por competencia) y, si se indica, lo deja como líder. */
export async function asignarInstructor(d: DatosAsignacion, asignacionesActuales: AsignacionInstructor[]): Promise<Resultado> {
  const competencias: Array<number | null> = d.competenciaIds.length > 0 ? d.competenciaIds : [null]
  // La restricción única de la BD no detecta duplicados cuando la competencia es nula: se valida aquí
  const nuevas = competencias.filter(
    (c) => !asignacionesActuales.some((a) => a.instructorId === d.instructorId && a.competenciaId === c),
  )
  if (nuevas.length === 0 && !d.esLider) {
    return { ok: false, mensaje: 'El instructor ya tiene asignadas esas competencias en la ficha.' }
  }

  if (nuevas.length > 0) {
    const { error } = await supabase.from('ficha_instructores').insert(
      nuevas.map((c) => ({
        ficha_id: d.fichaId,
        instructor_id: d.instructorId,
        competencia_id: c,
        fecha_inicio: d.fechaInicio,
        fecha_fin: d.fechaFin,
      })),
    )
    if (error) {
      return {
        ok: false,
        mensaje: traducirErrorBD(error, {
          ficha_instructores_fechas: 'La fecha de fin de la asignación debe ser igual o posterior a la de inicio.',
          ficha_instructores_ficha_id_instructor_id_competencia_id_key: 'El instructor ya tiene asignada una de esas competencias en la ficha.',
        }),
      }
    }
  }

  if (d.esLider) {
    const { error } = await supabase.from('fichas').update({ instructor_lider_id: d.instructorId }).eq('id', d.fichaId)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  }
  return { ok: true, datos: undefined }
}

/** Quita una asignación de instructor. Si era el líder y no le quedan asignaciones, la ficha queda sin líder. */
export async function quitarAsignacion(asignacion: AsignacionInstructor, ficha: FichaResumen, asignacionesActuales: AsignacionInstructor[]): Promise<Resultado> {
  const { error } = await supabase.from('ficha_instructores').delete().eq('id', asignacion.id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  const leQuedan = asignacionesActuales.some((a) => a.id !== asignacion.id && a.instructorId === asignacion.instructorId)
  if (ficha.instructorLiderId === asignacion.instructorId && !leQuedan) {
    const { error: errorLider } = await supabase.from('fichas').update({ instructor_lider_id: null }).eq('id', ficha.id)
    if (errorLider) return { ok: false, mensaje: traducirErrorBD(errorLider) }
  }
  return { ok: true, datos: undefined }
}

// ---------------------------------------------------------------------
// Aprendices de la ficha (HU02.2, RF07)
// ---------------------------------------------------------------------

export interface AprendizEncontrado {
  id: string
  nombres: string
  apellidos: string
  correo: string
  activo: boolean
  /** Ficha donde ya tiene matrícula activa (si la tiene) */
  fichaActiva: { id: number; numero: string } | null
  /** Matrícula previa en ESTA ficha (retirado, aplazado…) que se puede reactivar */
  matriculaPrevia: { id: number; estado: EstadoMatricula } | null
}

/** Busca un aprendiz registrado por su documento. Crear la cuenta del aprendiz corresponde al módulo de Usuarios. */
export async function buscarAprendiz(tipo: TipoDocumento, documento: string, fichaId: number): Promise<Resultado<AprendizEncontrado | null>> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, correo, estado, rol')
    .eq('tipo_documento', tipo)
    .eq('numero_documento', documento.trim())
    .maybeSingle<{ id: string; nombres: string; apellidos: string; correo: string; estado: 'activo' | 'inactivo'; rol: string }>()
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  if (!data) return { ok: true, datos: null }
  if (data.rol !== 'aprendiz') return { ok: false, mensaje: 'El documento pertenece a un usuario que no tiene el rol de aprendiz.' }

  const { data: matriculas, error: errorM } = await supabase
    .from('matriculas')
    .select('id, ficha_id, estado, fichas(numero)')
    .eq('aprendiz_id', data.id)
  if (errorM) return { ok: false, mensaje: traducirErrorBD(errorM) }
  type FilaM = { id: number; ficha_id: number; estado: EstadoMatricula; fichas: { numero: string } | null }
  const lista = matriculas as unknown as FilaM[]
  const activa = lista.find((m) => m.estado === 'matriculado')
  const previa = lista.find((m) => m.ficha_id === fichaId)

  return {
    ok: true,
    datos: {
      id: data.id,
      nombres: data.nombres,
      apellidos: data.apellidos,
      correo: data.correo,
      activo: data.estado === 'activo',
      fichaActiva: activa ? { id: activa.ficha_id, numero: activa.fichas?.numero ?? '' } : null,
      matriculaPrevia: previa ? { id: previa.id, estado: previa.estado } : null,
    },
  }
}

export interface DatosMatricula {
  fichaId: number
  aprendiz: AprendizEncontrado
  fechaMatricula: string
  vocero: TipoVocero
}

/** HU02.2 — Matricula al aprendiz (o reactiva su matrícula previa en la ficha). */
export async function matricularAprendiz(d: DatosMatricula): Promise<Resultado> {
  const fila = { estado: 'matriculado' as const, fecha_matricula: d.fechaMatricula, vocero: d.vocero }
  const { error } = d.aprendiz.matriculaPrevia
    ? await supabase.from('matriculas').update(fila).eq('id', d.aprendiz.matriculaPrevia.id)
    : await supabase.from('matriculas').insert({ ...fila, ficha_id: d.fichaId, aprendiz_id: d.aprendiz.id })
  if (error) return { ok: false, mensaje: traducirErrorBD(error, ERRORES_MATRICULA) }
  return { ok: true, datos: undefined }
}

/** Cambia el estado de una matrícula (aplazado, retirado, desertor, certificado). Quien deja de estar matriculado pierde la vocería. */
export async function cambiarEstadoMatricula(matriculaId: number, estado: EstadoMatricula): Promise<Resultado> {
  const cambios = estado === 'matriculado' ? { estado } : { estado, vocero: 'ninguno' as const }
  const { error } = await supabase.from('matriculas').update(cambios).eq('id', matriculaId)
  if (error) return { ok: false, mensaje: traducirErrorBD(error, ERRORES_MATRICULA) }
  return { ok: true, datos: undefined }
}

// ---------------------------------------------------------------------
// HU03.5 · HU03.6 · HU04.2 · HU04.3 — Historial del aprendiz en la ficha (instructor)
// ---------------------------------------------------------------------

export interface AsistenciaCompetenciaAprendiz {
  competenciaId: number
  competencia: string
  totalRegistros: number
  presentes: number
  ausencias: number
  justificadas: number
  porcentajeAsistencia: number | null
}

export interface RegistroAsistenciaAprendiz {
  id: number
  fecha: string
  competencia: string
  estado: EstadoAsistencia
  observacion: string | null
}

export interface HistorialAprendiz {
  competencias: AsistenciaCompetenciaAprendiz[]
  registros: RegistroAsistenciaAprendiz[]
}

/** Asistencia del aprendiz por competencia (v_asistencia_aprendiz_competencia) y sus registros, del más reciente al más antiguo. */
export async function obtenerHistorialAprendiz(fichaId: number, aprendizId: string): Promise<Resultado<HistorialAprendiz>> {
  const [porCompetencia, registros] = await Promise.all([
    supabase
      .from('v_asistencia_aprendiz_competencia')
      .select('competencia_id, competencia, total_registros, presentes, ausencias, justificadas, porcentaje_asistencia')
      .eq('ficha_id', fichaId)
      .eq('aprendiz_id', aprendizId)
      .order('competencia'),
    supabase
      .from('asistencias')
      .select('id, estado, observacion, sesiones!inner(fecha, ficha_id, competencias(nombre))')
      .eq('aprendiz_id', aprendizId)
      .eq('sesiones.ficha_id', fichaId)
      .order('fecha', { referencedTable: 'sesiones', ascending: false })
      .limit(1000),
  ])
  const error = porCompetencia.error ?? registros.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }

  type FilaCompetencia = {
    competencia_id: number
    competencia: string
    total_registros: number
    presentes: number
    ausencias: number
    justificadas: number
    porcentaje_asistencia: number | null
  }
  type FilaRegistro = { id: number; estado: EstadoAsistencia; observacion: string | null; sesiones: { fecha: string; competencias: { nombre: string } | null } }

  return {
    ok: true,
    datos: {
      competencias: (porCompetencia.data as FilaCompetencia[]).map((c) => ({
        competenciaId: c.competencia_id,
        competencia: c.competencia,
        totalRegistros: Number(c.total_registros),
        presentes: Number(c.presentes),
        ausencias: Number(c.ausencias),
        justificadas: Number(c.justificadas),
        porcentajeAsistencia: numero(c.porcentaje_asistencia),
      })),
      registros: (registros.data as unknown as FilaRegistro[])
        .map((r) => ({ id: r.id, fecha: r.sesiones.fecha, competencia: r.sesiones.competencias?.nombre ?? '—', estado: r.estado, observacion: r.observacion }))
        // El orden por tabla relacionada no ordena las filas principales en PostgREST: se ordena aquí
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    },
  }
}
