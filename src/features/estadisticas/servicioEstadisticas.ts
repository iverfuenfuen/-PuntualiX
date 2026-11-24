import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import { listarFichas, type FichaResumen } from '@/features/fichas/servicioFichas'

/**
 * Servicio de Estadísticas del administrador (HU04.1, RF14, RF15, RF20, RF21).
 * Las vistas de la BD suman todo el histórico; para filtrar por corte académico (RF20) se consultan sesiones y
 * asistencias por rango de fechas, en bloques de 1.000 (límite de Supabase). Solo datos agregados por ficha:
 * de las matrículas se leen el estado y las fechas, nunca datos personales del aprendiz.
 */

export interface SesionCorte {
  fecha: string
  estado: 'programada' | 'ejecutada' | 'cancelada'
  fichaId: number
  instructorId: string
  competenciaId: number
}

export interface AsistenciaCorte {
  fecha: string
  estado: 'presente' | 'ausente' | 'justificada'
  fichaId: number
  competenciaId: number
  /** Instructor que dictó la sesión */
  instructorId: string
}

export interface MatriculaCorte {
  fichaId: number
  estado: 'matriculado' | 'aplazado' | 'retirado' | 'desertor' | 'certificado'
  fechaMatricula: string
  /** Fecha (YYYY-MM-DD) del último cambio de estado */
  actualizada: string
}

export interface DatosEstadisticas {
  fichas: FichaResumen[]
  sesiones: SesionCorte[]
  asistencias: AsistenciaCorte[]
  matriculas: MatriculaCorte[]
  /** Nombre de cada competencia */
  competencias: Map<number, string>
  /** Nombre de cada instructor que dictó sesiones (dimensión "Instructor") */
  instructores: Map<string, string>
}

const BLOQUE = 1000

/** Para los reportes: solo una ficha o solo las sesiones de un instructor */
export interface FiltroDatos {
  fichaId?: number
  instructorId?: string
}

/** `desde` y `hasta` en formato YYYY-MM-DD (ambos incluidos): normalmente el corte elegido y el anterior */
export async function obtenerDatosEstadisticas(desde: string, hasta: string, filtro: FiltroDatos = {}): Promise<Resultado<DatosEstadisticas>> {
  const fichas = await listarFichas()
  if (!fichas.ok) return fichas

  type FilaSesion = { id: number; fecha: string; estado: SesionCorte['estado']; ficha_id: number; instructor_id: string; competencia_id: number }
  const sesiones: SesionCorte[] = []
  for (let inicio = 0; ; inicio += BLOQUE) {
    let consulta = supabase.from('sesiones').select('id, fecha, estado, ficha_id, instructor_id, competencia_id').gte('fecha', desde).lte('fecha', hasta)
    if (filtro.fichaId) consulta = consulta.eq('ficha_id', filtro.fichaId)
    if (filtro.instructorId) consulta = consulta.eq('instructor_id', filtro.instructorId)
    const { data, error } = await consulta.order('id').range(inicio, inicio + BLOQUE - 1)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    sesiones.push(...(data as FilaSesion[]).map((s) => ({ fecha: s.fecha, estado: s.estado, fichaId: s.ficha_id, instructorId: s.instructor_id, competenciaId: s.competencia_id })))
    if (data.length < BLOQUE) break
  }

  type FilaAsistencia = { id: number; estado: AsistenciaCorte['estado']; sesiones: { fecha: string; ficha_id: number; competencia_id: number; instructor_id: string } }
  const asistencias: AsistenciaCorte[] = []
  for (let inicio = 0; ; inicio += BLOQUE) {
    let consulta = supabase
      .from('asistencias')
      .select('id, estado, sesiones!inner(fecha, ficha_id, competencia_id, instructor_id)')
      .gte('sesiones.fecha', desde)
      .lte('sesiones.fecha', hasta)
    if (filtro.fichaId) consulta = consulta.eq('sesiones.ficha_id', filtro.fichaId)
    if (filtro.instructorId) consulta = consulta.eq('sesiones.instructor_id', filtro.instructorId)
    const { data, error } = await consulta.order('id').range(inicio, inicio + BLOQUE - 1)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    asistencias.push(
      ...(data as unknown as FilaAsistencia[]).map((a) => ({
        fecha: a.sesiones.fecha,
        estado: a.estado,
        fichaId: a.sesiones.ficha_id,
        competenciaId: a.sesiones.competencia_id,
        instructorId: a.sesiones.instructor_id,
      })),
    )
    if (data.length < BLOQUE) break
  }

  type FilaMatricula = { id: number; ficha_id: number; estado: MatriculaCorte['estado']; fecha_matricula: string; updated_at: string }
  const matriculas: MatriculaCorte[] = []
  for (let inicio = 0; ; inicio += BLOQUE) {
    let consulta = supabase.from('matriculas').select('id, ficha_id, estado, fecha_matricula, updated_at')
    if (filtro.fichaId) consulta = consulta.eq('ficha_id', filtro.fichaId)
    const { data, error } = await consulta.order('id').range(inicio, inicio + BLOQUE - 1)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    matriculas.push(...(data as FilaMatricula[]).map((m) => ({ fichaId: m.ficha_id, estado: m.estado, fechaMatricula: m.fecha_matricula, actualizada: m.updated_at.slice(0, 10) })))
    if (data.length < BLOQUE) break
  }

  const ids = [...new Set(sesiones.map((s) => s.competenciaId))]
  const competencias = new Map<number, string>()
  if (ids.length) {
    const { data, error } = await supabase.from('competencias').select('id, nombre').in('id', ids)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    for (const c of data as Array<{ id: number; nombre: string }>) competencias.set(c.id, c.nombre)
  }

  const idsInstructor = [...new Set(sesiones.map((s) => s.instructorId))]
  const instructores = new Map<string, string>()
  if (idsInstructor.length) {
    const { data, error } = await supabase.from('perfiles').select('id, nombres, apellidos').in('id', idsInstructor)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    for (const p of data as Array<{ id: string; nombres: string; apellidos: string }>) instructores.set(p.id, `${p.nombres} ${p.apellidos}`.trim())
  }

  return { ok: true, datos: { fichas: fichas.datos, sesiones, asistencias, matriculas, competencias, instructores } }
}
