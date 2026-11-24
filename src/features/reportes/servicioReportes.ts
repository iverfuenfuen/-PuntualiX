import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { EstadoReporte, FormatoReporte, TipoReporte } from '@/types/dominio'

/**
 * Servicio de Reportes del administrador (RF18, RF20; CU05/CU06 del Prototipo y VersionAntigua).
 * Decisión del usuario: se guardan los PARÁMETROS del reporte en la tabla `reportes` (sin archivo en Storage);
 * ver o descargar vuelve a armar el reporte para el mismo periodo. RLS: el admin ve todos los reportes y solo puede
 * insertar a su nombre (generado_por = auth.uid()); nadie puede borrarlos.
 */

/** Tipo de estadística de un reporte de estadísticas (VersionAntigua: "Asistencia por dimensión" e "Indicadores generales") */
export type EstadisticaReporte = 'sede' | 'area' | 'programa' | 'jornada' | 'desercion' | 'cumplimiento'

export interface ParametrosReporte {
  /** Segunda línea del historial: "Sede Central · Jornada Mañana" */
  subtitulo?: string
  estadistica?: EstadisticaReporte
}

export interface Reporte {
  id: number
  tipo: TipoReporte
  titulo: string
  fichaId: number | null
  instructorId: string | null
  desde: string
  hasta: string
  parametros: ParametrosReporte
  formato: FormatoReporte
  estado: EstadoReporte
  generadoPor: string | null
  generadoPorRol: string | null
  creadoEn: string
}

type FilaReporte = {
  id: number
  tipo: TipoReporte
  titulo: string
  ficha_id: number | null
  instructor_id: string | null
  fecha_desde: string | null
  fecha_hasta: string | null
  parametros: ParametrosReporte | null
  formato: FormatoReporte
  estado: EstadoReporte
  created_at: string
  perfiles: { nombres: string; apellidos: string; rol: string } | null
}

const COLUMNAS = 'id, tipo, titulo, ficha_id, instructor_id, fecha_desde, fecha_hasta, parametros, formato, estado, created_at, perfiles:perfiles!reportes_generado_por_fkey(nombres, apellidos, rol)'

const aReporte = (r: FilaReporte): Reporte => ({
  id: r.id,
  tipo: r.tipo,
  titulo: r.titulo,
  fichaId: r.ficha_id,
  instructorId: r.instructor_id,
  desde: r.fecha_desde ?? '',
  hasta: r.fecha_hasta ?? '',
  parametros: r.parametros ?? {},
  formato: r.formato,
  estado: r.estado,
  generadoPor: r.perfiles ? `${r.perfiles.nombres} ${r.perfiles.apellidos}` : null,
  generadoPorRol: r.perfiles?.rol ?? null,
  creadoEn: r.created_at,
})

/** Historial de reportes (los más recientes primero). Con fichaId o instructorId: el historial de esa ficha o instructor. */
export async function listarReportes(filtro: { fichaId?: number; instructorId?: string } = {}): Promise<Resultado<Reporte[]>> {
  let q = supabase.from('reportes').select(COLUMNAS)
  if (filtro.fichaId) q = q.eq('ficha_id', filtro.fichaId)
  if (filtro.instructorId) q = q.eq('instructor_id', filtro.instructorId)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1000)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: (data as unknown as FilaReporte[]).map(aReporte) }
}

export async function obtenerReporte(id: number): Promise<Resultado<Reporte | null>> {
  const { data, error } = await supabase.from('reportes').select(COLUMNAS).eq('id', id).maybeSingle()
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: data ? aReporte(data as unknown as FilaReporte) : null }
}

export interface NuevoReporte {
  tipo: TipoReporte
  titulo: string
  fichaId?: number | null
  instructorId?: string | null
  desde: string
  hasta: string
  parametros: ParametrosReporte
  formato: FormatoReporte
}

/** Registra el reporte en el historial (la bitácora lo anota por trigger) y devuelve su id */
export async function registrarReporte(r: NuevoReporte, usuarioId: string): Promise<Resultado<number>> {
  const { data, error } = await supabase
    .from('reportes')
    .insert({
      tipo: r.tipo,
      titulo: r.titulo,
      ficha_id: r.fichaId ?? null,
      instructor_id: r.instructorId ?? null,
      fecha_desde: r.desde,
      fecha_hasta: r.hasta,
      parametros: r.parametros,
      formato: r.formato,
      estado: 'listo',
      generado_por: usuarioId,
    })
    .select('id')
    .single()
  if (error) return { ok: false, mensaje: traducirErrorBD(error, { reportes_periodo: 'La fecha "Hasta" debe ser igual o posterior a la fecha "Desde".' }) }
  return { ok: true, datos: (data as { id: number }).id }
}
