import type { Tono } from '@/types/dominio'
import type { EstadoSesion, SesionInstructor } from './servicioInstructores'

/** Niveles de cumplimiento docente del Prototipo: alto ≥ 80 %, medio 60–79 %, bajo < 60 % */
export type NivelCumplimiento = 'al_dia' | 'seguimiento' | 'critico' | 'sin_sesiones'

export function nivelCumplimiento(porcentaje: number | null): NivelCumplimiento {
  if (porcentaje == null) return 'sin_sesiones'
  if (porcentaje >= 80) return 'al_dia'
  if (porcentaje >= 60) return 'seguimiento'
  return 'critico'
}

export const NIVEL_CUMPLIMIENTO: Record<NivelCumplimiento, { etiqueta: string; tono: Tono }> = {
  al_dia: { etiqueta: 'Al día', tono: 'exito' },
  seguimiento: { etiqueta: 'En seguimiento', tono: 'advertencia' },
  critico: { etiqueta: 'Crítico', tono: 'critico' },
  sin_sesiones: { etiqueta: 'Sin sesiones', tono: 'neutro' },
}

/** Tono de la barra de cumplimiento con los mismos cortes (distintos a los de asistencia: 80 / 70) */
export const tonoCumplimiento = (p: number): Tono => NIVEL_CUMPLIMIENTO[nivelCumplimiento(p)].tono

export const META_CUMPLIMIENTO = 80

const hoy = () => new Date().toISOString().slice(0, 10)

/** Estado visible de una sesión: una sesión programada cuya fecha ya pasó no tiene asistencia registrada */
export function estadoVisualSesion(s: Pick<SesionInstructor, 'estado' | 'fecha'>): { texto: string; tono: Tono } {
  const ESTADOS: Record<EstadoSesion, { texto: string; tono: Tono }> = {
    ejecutada: { texto: 'Asistencia registrada', tono: 'exito' },
    cancelada: { texto: 'Cancelada', tono: 'neutro' },
    programada: { texto: 'Programada', tono: 'informacion' },
  }
  if (s.estado === 'programada' && s.fecha < hoy()) return { texto: 'Sin registro de asistencia', tono: 'critico' }
  return ESTADOS[s.estado]
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export interface PuntoMensual {
  mes: string
  /** Sesiones cuya fecha ya pasó (no canceladas) */
  vencidas: number
  ejecutadas: number
  cumplimiento: number | null
}

/** Cumplimiento mes a mes: ejecutadas / programadas hasta hoy, por mes (misma regla que la vista de la BD) */
export function cumplimientoMensual(sesiones: SesionInstructor[]): PuntoMensual[] {
  const limite = hoy()
  const porMes = new Map<string, { vencidas: number; ejecutadas: number }>()
  for (const s of sesiones) {
    if (s.estado === 'cancelada' || s.fecha > limite) continue
    const clave = s.fecha.slice(0, 7)
    const m = porMes.get(clave) ?? { vencidas: 0, ejecutadas: 0 }
    m.vencidas += 1
    if (s.estado === 'ejecutada') m.ejecutadas += 1
    porMes.set(clave, m)
  }
  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([clave, m]) => ({
      mes: `${MESES[Number(clave.slice(5, 7)) - 1]} ${clave.slice(2, 4)}`,
      vencidas: m.vencidas,
      ejecutadas: m.ejecutadas,
      cumplimiento: m.vencidas ? Math.round((m.ejecutadas / m.vencidas) * 1000) / 10 : null,
    }))
}

/** Antigüedad legible: "Desde 2022 (4 años)" */
export function antiguedad(fechaIngreso: string | null): string {
  if (!fechaIngreso) return 'Sin registrar'
  const anios = Math.floor((Date.now() - new Date(`${fechaIngreso}T00:00:00`).getTime()) / (365.25 * 24 * 3600 * 1000))
  const desde = fechaIngreso.slice(0, 4)
  return anios >= 1 ? `Desde ${desde} (${anios} ${anios === 1 ? 'año' : 'años'})` : `Desde ${desde} (menos de un año)`
}
