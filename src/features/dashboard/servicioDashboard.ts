import type { Resultado } from '@/lib/resultado'
import { listarAlertas, type Alerta } from '@/features/alertas/servicioAlertas'
import { eventosRecientes, type EventoBitacora } from '@/features/bitacora/servicioBitacora'
import { fichaEnRiesgo } from '@/features/fichas/presentacion'
import { listarFichas, type FichaResumen } from '@/features/fichas/servicioFichas'
import { listarInstructores } from '@/features/instructores/servicioInstructores'
import { META_CUMPLIMIENTO } from '@/features/instructores/presentacion'

/**
 * Dashboard del administrador (RF14, RF16, RF21). No consulta tablas propias: reutiliza los servicios de cada módulo
 * para que cada cifra se calcule igual que en su pantalla de detalle (una sola fuente de verdad).
 */

export interface ResumenAdmin {
  fichasActivas: number
  fichasEnRiesgo: number
  /** Promedio de asistencia de las fichas activas con registros */
  asistenciaGeneral: number | null
  /** Promedio del cumplimiento de los instructores activos (mismo cálculo que /admin/instructores) */
  cumplimientoInstructores: number | null
  instructoresBajoMeta: number
  alertasAbiertas: Alerta[]
  /** Fichas activas que alcanzan algún umbral, de mayor a menor inasistencia */
  fichasAtencion: FichaResumen[]
  actividad: EventoBitacora[]
}

const promedio = (valores: Array<number | null>) => {
  const v = valores.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export async function obtenerResumenAdmin(): Promise<Resultado<ResumenAdmin>> {
  const [fichas, instructores, alertas, actividad] = await Promise.all([listarFichas(), listarInstructores(), listarAlertas({ soloAbiertas: true }), eventosRecientes(6)])
  if (!fichas.ok) return fichas
  if (!instructores.ok) return instructores
  if (!alertas.ok) return alertas
  if (!actividad.ok) return actividad

  const activas = fichas.datos.filter((f) => f.estado === 'activa')
  const instructoresActivos = instructores.datos.filter((i) => i.activo)

  return {
    ok: true,
    datos: {
      fichasActivas: activas.length,
      fichasEnRiesgo: activas.filter(fichaEnRiesgo).length,
      asistenciaGeneral: promedio(activas.map((f) => f.porcentajeAsistencia)),
      cumplimientoInstructores: promedio(instructoresActivos.map((i) => i.cumplimiento)),
      instructoresBajoMeta: instructoresActivos.filter((i) => i.cumplimiento != null && i.cumplimiento < META_CUMPLIMIENTO).length,
      alertasAbiertas: alertas.datos,
      fichasAtencion: activas
        .filter((f) => f.nivelRiesgo != null)
        .sort((a, b) => (b.porcentajeInasistencia ?? 0) - (a.porcentajeInasistencia ?? 0))
        .slice(0, 6),
      actividad: actividad.datos,
    },
  }
}
