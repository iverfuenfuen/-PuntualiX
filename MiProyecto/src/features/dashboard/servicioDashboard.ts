import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import { listarAlertasFicha, type AlertaFicha } from '@/features/alertas/servicioAlertas'
import { eventosRecientes, type EventoBitacora } from '@/features/bitacora/servicioBitacora'
import { listarFichas, type FichaResumen } from '@/features/fichas/servicioFichas'

/**
 * RF21 — Dashboard del administrador (estructura de VersionAntigua/Admin/dashboard.html). El administrador solo trabaja
 * con FICHAS y sus porcentajes: no se consulta nada por aprendiz. Lo que ya existe en otro módulo se reutiliza de su
 * servicio (fichas, alertas de ficha, bitácora) para que cada cifra se calcule igual en todas partes.
 */

export type EstadoAsistencia = 'presente' | 'ausente' | 'justificada'
export type EstadoSesion = 'programada' | 'ejecutada' | 'cancelada'

export interface SesionPeriodo {
  fecha: string
  estado: EstadoSesion
}

export interface AsistenciaPeriodo {
  fecha: string
  estado: EstadoAsistencia
}

/** Estado actual de la plataforma (no depende del mes elegido) */
export interface ResumenActual {
  fichas: FichaResumen[]
  /** Fecha de registro de cada ficha (para "respecto al mes anterior") */
  registroFichas: string[]
  alertas: AlertaFicha[]
  actividad: EventoBitacora[]
  /** Todos los registros de asistencia de las fichas, por estado ("Desempeño de las fichas") */
  totales: Record<EstadoAsistencia, number>
}

/** Sesiones y asistencias del mes elegido y del anterior (para la variación) */
export interface DatosPeriodo {
  sesiones: SesionPeriodo[]
  asistencias: AsistenciaPeriodo[]
}

const contarAsistencias = (estado: EstadoAsistencia) => supabase.from('asistencias').select('id', { count: 'exact', head: true }).eq('estado', estado)

export async function obtenerResumenActual(): Promise<Resultado<ResumenActual>> {
  const [fichas, alertas, actividad, registro, presentes, justificadas, ausentes] = await Promise.all([
    listarFichas(),
    listarAlertasFicha(),
    eventosRecientes(3),
    supabase.from('fichas').select('created_at'),
    contarAsistencias('presente'),
    contarAsistencias('justificada'),
    contarAsistencias('ausente'),
  ])
  if (!fichas.ok) return fichas
  if (!alertas.ok) return alertas
  if (!actividad.ok) return actividad
  const error = registro.error ?? presentes.error ?? justificadas.error ?? ausentes.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return {
    ok: true,
    datos: {
      fichas: fichas.datos,
      registroFichas: (registro.data as Array<{ created_at: string }>).map((f) => f.created_at),
      alertas: alertas.datos,
      actividad: actividad.datos,
      totales: { presente: presentes.count ?? 0, justificada: justificadas.count ?? 0, ausente: ausentes.count ?? 0 },
    },
  }
}

const BLOQUE = 1000 // límite de filas por respuesta de Supabase

/** `desde` y `hasta` en formato YYYY-MM-DD (ambos incluidos) */
export async function obtenerDatosPeriodo(desde: string, hasta: string): Promise<Resultado<DatosPeriodo>> {
  const sesiones: SesionPeriodo[] = []
  for (let inicio = 0; ; inicio += BLOQUE) {
    const { data, error } = await supabase
      .from('sesiones')
      .select('id, fecha, estado')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('id')
      .range(inicio, inicio + BLOQUE - 1)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    sesiones.push(...(data as SesionPeriodo[]))
    if (data.length < BLOQUE) break
  }

  type FilaAsistencia = { id: number; estado: EstadoAsistencia; sesiones: { fecha: string } }
  const asistencias: AsistenciaPeriodo[] = []
  for (let inicio = 0; ; inicio += BLOQUE) {
    const { data, error } = await supabase
      .from('asistencias')
      .select('id, estado, sesiones!inner(fecha)')
      .gte('sesiones.fecha', desde)
      .lte('sesiones.fecha', hasta)
      .order('id')
      .range(inicio, inicio + BLOQUE - 1)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    asistencias.push(...(data as unknown as FilaAsistencia[]).map((a) => ({ fecha: a.sesiones.fecha, estado: a.estado })))
    if (data.length < BLOQUE) break
  }

  return { ok: true, datos: { sesiones, asistencias } }
}
