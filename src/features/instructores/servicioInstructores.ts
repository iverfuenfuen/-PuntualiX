import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { EstadoFicha, TipoDocumento } from '@/types/dominio'

/**
 * Servicio del módulo Instructores (HU12.2 panel de instructores, HU12.4 filtrar los que no cumplen).
 * Todas las cifras salen de la BD (vistas v_cumplimiento_instructor y v_fichas_resumen):
 * nada se copia ni se escribe a mano, así cada dato es el mismo en todas las pantallas.
 */

export interface FichaACargo {
  id: number
  numero: string
  programa: string
  estado: EstadoFicha
  esLider: boolean
  competencias: number
  /** % de sesiones ejecutadas sobre las programadas hasta hoy, en esta ficha */
  cumplimiento: number | null
  sesionesPlanificadas: number
  sesionesEjecutadas: number
  /** % de asistencia de los aprendices de la ficha */
  asistenciaAprendices: number | null
}

export interface InstructorResumen {
  id: string
  nombres: string
  apellidos: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  correo: string
  telefono: string | null
  activo: boolean
  sedeId: number | null
  sede: string | null
  areaId: number | null
  area: string | null
  especialidad: string | null
  fechaIngreso: string | null
  fichas: FichaACargo[]
  sesionesPlanificadas: number
  sesionesEjecutadas: number
  /** Promedio del cumplimiento de sus fichas (null si aún no tiene sesiones vencidas) */
  cumplimiento: number | null
  /** Promedio de asistencia de los aprendices de sus fichas */
  asistenciaAprendices: number | null
}

export type EstadoSesion = 'programada' | 'ejecutada' | 'cancelada'

export interface SesionInstructor {
  id: number
  fecha: string
  horaInicio: string | null
  horaFin: string | null
  estado: EstadoSesion
  fichaId: number
  fichaNumero: string
  competencia: string
}

export interface PerfilInstructor {
  instructor: InstructorResumen
  sesiones: SesionInstructor[]
}

const promedio = (valores: Array<number | null>): number | null => {
  const v = valores.filter((x): x is number => x != null)
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}
const num = (v: unknown): number | null => (v == null ? null : Number(v))

interface FilaInstructor {
  id: string
  especialidad: string | null
  fecha_ingreso: string | null
  area_id: number | null
  areas: { nombre: string } | null
  perfiles: {
    nombres: string
    apellidos: string
    tipo_documento: TipoDocumento
    numero_documento: string
    correo: string
    telefono: string | null
    estado: 'activo' | 'inactivo'
    sede_id: number | null
    sedes: { nombre: string } | null
  }
}

/** Construye los resúmenes de todos los instructores, o de uno solo si se indica su id */
async function resumenes(soloId?: string): Promise<Resultado<InstructorResumen[]>> {
  let qInstructores = supabase
    .from('instructores')
    .select('id, especialidad, fecha_ingreso, area_id, areas(nombre), perfiles!inner(nombres, apellidos, tipo_documento, numero_documento, correo, telefono, estado, sede_id, sedes(nombre))')
  let qCumplimiento = supabase.from('v_cumplimiento_instructor').select('instructor_id, ficha_id, sesiones_planificadas, sesiones_ejecutadas, porcentaje_cumplimiento')
  let qAsignaciones = supabase.from('ficha_instructores').select('ficha_id, instructor_id, competencia_id')
  if (soloId) {
    qInstructores = qInstructores.eq('id', soloId)
    qCumplimiento = qCumplimiento.eq('instructor_id', soloId)
    qAsignaciones = qAsignaciones.eq('instructor_id', soloId)
  }

  const [instructores, cumplimiento, asignaciones, fichas] = await Promise.all([
    qInstructores,
    qCumplimiento,
    qAsignaciones,
    supabase.from('v_fichas_resumen').select('id, numero, programa, estado, instructor_lider_id, porcentaje_asistencia'),
  ])
  const error = instructores.error ?? cumplimiento.error ?? asignaciones.error ?? fichas.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }

  type FilaCumplimiento = { instructor_id: string; ficha_id: number | null; sesiones_planificadas: number; sesiones_ejecutadas: number; porcentaje_cumplimiento: number | null }
  type FilaAsignacion = { ficha_id: number; instructor_id: string; competencia_id: number | null }
  type FilaFicha = { id: number; numero: string; programa: string; estado: EstadoFicha; instructor_lider_id: string | null; porcentaje_asistencia: number | null }
  const listaCumplimiento = cumplimiento.data as FilaCumplimiento[]
  const listaAsignaciones = asignaciones.data as FilaAsignacion[]
  const fichasPorId = new Map((fichas.data as FilaFicha[]).map((f) => [f.id, f]))

  const datos = (instructores.data as unknown as FilaInstructor[]).map((i): InstructorResumen => {
    // Fichas a cargo: donde está asignado o es líder (sin contar las desactivadas)
    const ids = new Set([
      ...listaAsignaciones.filter((a) => a.instructor_id === i.id).map((a) => a.ficha_id),
      ...[...fichasPorId.values()].filter((f) => f.instructor_lider_id === i.id).map((f) => f.id),
    ])
    const fichasACargo = [...ids]
      .map((id) => fichasPorId.get(id))
      .filter((f): f is FilaFicha => !!f && f.estado !== 'inactiva')
      .map((f): FichaACargo => {
        const c = listaCumplimiento.find((x) => x.instructor_id === i.id && x.ficha_id === f.id)
        return {
          id: f.id,
          numero: f.numero,
          programa: f.programa,
          estado: f.estado,
          esLider: f.instructor_lider_id === i.id,
          competencias: listaAsignaciones.filter((a) => a.instructor_id === i.id && a.ficha_id === f.id && a.competencia_id != null).length,
          cumplimiento: num(c?.porcentaje_cumplimiento),
          sesionesPlanificadas: Number(c?.sesiones_planificadas ?? 0),
          sesionesEjecutadas: Number(c?.sesiones_ejecutadas ?? 0),
          asistenciaAprendices: num(f.porcentaje_asistencia),
        }
      })
      .sort((a, b) => a.numero.localeCompare(b.numero))
    const propias = listaCumplimiento.filter((c) => c.instructor_id === i.id && c.ficha_id != null)

    return {
      id: i.id,
      nombres: i.perfiles.nombres,
      apellidos: i.perfiles.apellidos,
      tipoDocumento: i.perfiles.tipo_documento,
      numeroDocumento: i.perfiles.numero_documento,
      correo: i.perfiles.correo,
      telefono: i.perfiles.telefono,
      activo: i.perfiles.estado === 'activo',
      sedeId: i.perfiles.sede_id,
      sede: i.perfiles.sedes?.nombre ?? null,
      areaId: i.area_id,
      area: i.areas?.nombre ?? null,
      especialidad: i.especialidad,
      fechaIngreso: i.fecha_ingreso,
      fichas: fichasACargo,
      sesionesPlanificadas: propias.reduce((t, c) => t + Number(c.sesiones_planificadas), 0),
      sesionesEjecutadas: propias.reduce((t, c) => t + Number(c.sesiones_ejecutadas), 0),
      cumplimiento: promedio(propias.map((c) => num(c.porcentaje_cumplimiento))),
      asistenciaAprendices: promedio(fichasACargo.map((f) => f.asistenciaAprendices)),
    }
  })

  datos.sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es'))
  return { ok: true, datos }
}

/** HU12.2 — Panel de instructores con su cumplimiento */
export const listarInstructores = () => resumenes()

/** Perfil del instructor: su resumen y el historial de sesiones (base del cumplimiento mes a mes) */
export async function obtenerPerfilInstructor(id: string): Promise<Resultado<PerfilInstructor | null>> {
  const [r, sesiones] = await Promise.all([
    resumenes(id),
    supabase
      .from('sesiones')
      .select('id, fecha, hora_inicio, hora_fin, estado, ficha_id, fichas(numero), competencias(codigo, nombre)')
      .eq('instructor_id', id)
      .order('fecha', { ascending: false })
      .limit(1000),
  ])
  if (!r.ok) return r
  if (sesiones.error) return { ok: false, mensaje: traducirErrorBD(sesiones.error) }
  const instructor = r.datos[0]
  if (!instructor) return { ok: true, datos: null }

  type FilaSesion = {
    id: number
    fecha: string
    hora_inicio: string | null
    hora_fin: string | null
    estado: EstadoSesion
    ficha_id: number
    fichas: { numero: string } | null
    competencias: { codigo: string; nombre: string } | null
  }
  return {
    ok: true,
    datos: {
      instructor,
      sesiones: (sesiones.data as unknown as FilaSesion[]).map((s) => ({
        id: s.id,
        fecha: s.fecha,
        horaInicio: s.hora_inicio,
        horaFin: s.hora_fin,
        estado: s.estado,
        fichaId: s.ficha_id,
        fichaNumero: s.fichas?.numero ?? '',
        competencia: s.competencias ? `${s.competencias.codigo} · ${s.competencias.nombre}` : '—',
      })),
    },
  }
}

export interface DatosInstructor {
  areaId: number | null
  especialidad: string | null
  fechaIngreso: string | null
}

/** Datos propios del rol instructor (área, especialidad, fecha de ingreso) */
export async function actualizarDatosInstructor(id: string, d: DatosInstructor): Promise<Resultado> {
  const { error } = await supabase
    .from('instructores')
    .update({ area_id: d.areaId, especialidad: d.especialidad?.trim() || null, fecha_ingreso: d.fechaIngreso || null })
    .eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: undefined }
}
