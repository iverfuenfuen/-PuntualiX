import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { EstadoAsistencia, TipoDocumento } from '@/types/dominio'

/**
 * Servicio del Registro de asistencia del instructor (CU03: HU03.1–HU03.4, RF08, RF09).
 * La BD garantiza las reglas: solo instructores de la ficha crean sesiones (RLS sesiones_gestionar), solo se registra
 * a matriculados (trigger fn_validar_asistencia), la fecha/hora del registro la pone el servidor (RF09), la sesión
 * pasa a "ejecutada", se evalúan las alertas y todo queda en la bitácora.
 */

export interface OpcionCatalogo {
  id: number
  codigo: string
  nombre: string
}

export interface AprendizAsistencia {
  aprendizId: string
  nombres: string
  apellidos: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
}

export interface RegistroAsistencia {
  aprendizId: string
  estado: EstadoAsistencia
  observacion: string
}

export interface SesionDelDia {
  id: number
  resultadoId: number | null
  /** Registros ya guardados (vacío si la sesión está programada y aún no se toma asistencia) */
  registros: Map<string, RegistroAsistencia & { id: number }>
}

const MENSAJES_ASISTENCIA = {
  asistencias_sesion_id_aprendiz_id_key: 'Uno de los aprendices ya tiene asistencia en esta sesión. Recargue la página.',
}

/**
 * Competencias que el instructor puede registrar en la ficha: las asignadas en ficha_instructores. Si es el líder o
 * tiene una asignación general (sin competencia), todas las del programa.
 */
export async function competenciasDelInstructor(fichaId: number, instructorId: string, esLider: boolean, programaId: number): Promise<Resultado<OpcionCatalogo[]>> {
  const asignaciones = await supabase.from('ficha_instructores').select('competencia_id').eq('ficha_id', fichaId).eq('instructor_id', instructorId)
  if (asignaciones.error) return { ok: false, mensaje: traducirErrorBD(asignaciones.error) }
  const ids = (asignaciones.data as Array<{ competencia_id: number | null }>).map((a) => a.competencia_id)
  const todas = esLider || ids.some((id) => id == null)

  let consulta = supabase.from('competencias').select('id, codigo, nombre').eq('programa_id', programaId).order('codigo')
  if (!todas) {
    if (ids.length === 0) return { ok: true, datos: [] }
    consulta = consulta.in('id', ids as number[])
  }
  const { data, error } = await consulta
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: data as OpcionCatalogo[] }
}

export async function resultadosDeCompetencia(competenciaId: number): Promise<Resultado<OpcionCatalogo[]>> {
  const { data, error } = await supabase.from('resultados_aprendizaje').select('id, codigo, descripcion').eq('competencia_id', competenciaId).order('codigo')
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: (data as Array<{ id: number; codigo: string; descripcion: string }>).map((r) => ({ id: r.id, codigo: r.codigo, nombre: r.descripcion })) }
}

/** HU03.1 — Lista completa de aprendices matriculados en la ficha, por apellido */
export async function aprendicesDeFicha(fichaId: number): Promise<Resultado<AprendizAsistencia[]>> {
  const { data, error } = await supabase
    .from('matriculas')
    .select('aprendiz_id, perfiles(nombres, apellidos, tipo_documento, numero_documento)')
    .eq('ficha_id', fichaId)
    .eq('estado', 'matriculado')
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  type Fila = { aprendiz_id: string; perfiles: { nombres: string; apellidos: string; tipo_documento: TipoDocumento; numero_documento: string } | null }
  return {
    ok: true,
    datos: (data as unknown as Fila[])
      .map((m) => ({
        aprendizId: m.aprendiz_id,
        nombres: m.perfiles?.nombres ?? '',
        apellidos: m.perfiles?.apellidos ?? '',
        tipoDocumento: m.perfiles?.tipo_documento ?? 'CC',
        numeroDocumento: m.perfiles?.numero_documento ?? '',
      }))
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es')),
  }
}

/** Sesión (no cancelada) de ese día, competencia e instructor, con la asistencia ya registrada (HU03.4) */
export async function obtenerSesion(fichaId: number, competenciaId: number, fecha: string, instructorId: string): Promise<Resultado<SesionDelDia | null>> {
  const { data, error } = await supabase
    .from('sesiones')
    .select('id, resultado_id, asistencias(id, aprendiz_id, estado, observacion)')
    .eq('ficha_id', fichaId)
    .eq('competencia_id', competenciaId)
    .eq('fecha', fecha)
    .eq('instructor_id', instructorId)
    .neq('estado', 'cancelada')
    .order('id')
    .limit(1)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  type Fila = { id: number; resultado_id: number | null; asistencias: Array<{ id: number; aprendiz_id: string; estado: EstadoAsistencia; observacion: string | null }> }
  const fila = (data as unknown as Fila[])[0]
  if (!fila) return { ok: true, datos: null }
  return {
    ok: true,
    datos: {
      id: fila.id,
      resultadoId: fila.resultado_id,
      registros: new Map(fila.asistencias.map((a) => [a.aprendiz_id, { id: a.id, aprendizId: a.aprendiz_id, estado: a.estado, observacion: a.observacion ?? '' }])),
    },
  }
}

export interface DatosRegistro {
  fichaId: number
  competenciaId: number
  resultadoId: number | null
  fecha: string
  instructorId: string
  registros: RegistroAsistencia[]
  /** Sesión encontrada al abrir la selección (null si aún no existe) */
  sesion: SesionDelDia | null
}

/**
 * RF08 — Registra o corrige la asistencia de la sesión. Reutiliza la sesión programada del día o la crea; inserta los
 * registros nuevos en un solo envío y actualiza solo los que cambiaron (cada cambio queda en la bitácora, RF19).
 */
export async function registrarAsistencia(d: DatosRegistro): Promise<Resultado<{ nuevos: number; corregidos: number }>> {
  let sesionId = d.sesion?.id
  if (sesionId == null) {
    const { data, error } = await supabase
      .from('sesiones')
      .insert({ ficha_id: d.fichaId, competencia_id: d.competenciaId, resultado_id: d.resultadoId, instructor_id: d.instructorId, fecha: d.fecha })
      .select('id')
      .single()
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    sesionId = (data as { id: number }).id
  } else if (d.sesion && d.sesion.resultadoId !== d.resultadoId) {
    const { error } = await supabase.from('sesiones').update({ resultado_id: d.resultadoId }).eq('id', sesionId)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  }

  const previos = d.sesion?.registros ?? new Map()
  const limpiar = (t: string) => t.trim() || null
  const nuevos = d.registros.filter((r) => !previos.has(r.aprendizId))
  const cambiados = d.registros.filter((r) => {
    const p = previos.get(r.aprendizId)
    return p && (p.estado !== r.estado || (p.observacion.trim() || null) !== limpiar(r.observacion))
  })

  if (nuevos.length) {
    const { error } = await supabase
      .from('asistencias')
      .insert(nuevos.map((r) => ({ sesion_id: sesionId, aprendiz_id: r.aprendizId, estado: r.estado, observacion: limpiar(r.observacion) })))
    if (error) return { ok: false, mensaje: traducirErrorBD(error, MENSAJES_ASISTENCIA) }
  }
  for (const r of cambiados) {
    const { error } = await supabase.from('asistencias').update({ estado: r.estado, observacion: limpiar(r.observacion) }).eq('id', previos.get(r.aprendizId)!.id)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  }
  return { ok: true, datos: { nuevos: nuevos.length, corregidos: cambiados.length } }
}
