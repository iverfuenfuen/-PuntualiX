import type { AsistenciaPeriodo, SesionPeriodo } from './servicioDashboard'

/** Cálculos del periodo (mes) del dashboard. Mismas fórmulas que las vistas de la BD. */

export interface Mes {
  /** YYYY-MM */
  clave: string
  etiqueta: string
  corto: string
}

const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const dos = (n: number) => String(n).padStart(2, '0')

export function crearMes(anio: number, mes: number): Mes {
  return { clave: `${anio}-${dos(mes)}`, etiqueta: `${capital(NOMBRE_MES[mes - 1])} ${anio}`, corto: NOMBRE_MES[mes - 1] }
}

export function mesDeClave(clave: string): Mes {
  const [a, m] = clave.split('-').map(Number)
  return crearMes(a, m)
}

/** Los últimos `n` meses, del actual hacia atrás (selector del banner) */
export function mesesDisponibles(n = 12): Mes[] {
  const hoy = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    return crearMes(d.getFullYear(), d.getMonth() + 1)
  })
}

export function mesAnterior(clave: string): Mes {
  const [a, m] = clave.split('-').map(Number)
  return m === 1 ? crearMes(a - 1, 12) : crearMes(a, m - 1)
}

/** Primer y último día del mes (YYYY-MM-DD) */
export function rangoMes(clave: string): { desde: string; hasta: string } {
  const [a, m] = clave.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return { desde: `${clave}-01`, hasta: `${clave}-${dos(ultimo)}` }
}

/** "Periodo 2026-II": el año lectivo SENA se divide en dos semestres */
export function periodoAcademico(clave: string): string {
  const [a, m] = clave.split('-').map(Number)
  return `Periodo ${a}-${m <= 6 ? 'I' : 'II'}`
}

const delMes = <T extends { fecha: string }>(lista: T[], clave: string) => lista.filter((x) => x.fecha.startsWith(clave))

export interface DistribucionAsistencia {
  total: number
  presentes: number
  justificadas: number
  sinJustificar: number
}

export function distribucion(asistencias: AsistenciaPeriodo[], clave: string): DistribucionAsistencia {
  const lista = delMes(asistencias, clave)
  return {
    total: lista.length,
    presentes: lista.filter((a) => a.estado === 'presente').length,
    justificadas: lista.filter((a) => a.estado === 'justificada').length,
    sinJustificar: lista.filter((a) => a.estado === 'ausente').length,
  }
}

/** % de asistencia válida (presentes + justificadas), igual que v_fichas_resumen */
export function porcentajeAsistencia(d: DistribucionAsistencia): number | null {
  return d.total ? ((d.presentes + d.justificadas) * 100) / d.total : null
}

export interface CargaSesiones {
  /** No canceladas */
  planificadas: number
  ejecutadas: number
  /** Programadas con fecha pasada o de hoy, sin asistencia registrada */
  pendientes: number
  /** Programadas después de hoy */
  proximas: number
  canceladas: number
  /** Ejecutadas / planificadas hasta hoy (igual que v_cumplimiento_instructor) */
  cumplimiento: number | null
}

export function cargaSesiones(sesiones: SesionPeriodo[], clave: string, hoy: string): CargaSesiones {
  const lista = delMes(sesiones, clave)
  const vigentes = lista.filter((s) => s.estado !== 'cancelada')
  const vencidas = vigentes.filter((s) => s.fecha <= hoy)
  const ejecutadas = vigentes.filter((s) => s.estado === 'ejecutada').length
  return {
    planificadas: vigentes.length,
    ejecutadas,
    pendientes: vencidas.filter((s) => s.estado === 'programada').length,
    proximas: vigentes.filter((s) => s.estado === 'programada' && s.fecha > hoy).length,
    canceladas: lista.length - vigentes.length,
    cumplimiento: vencidas.length ? (ejecutadas * 100) / vencidas.length : null,
  }
}

/** Diferencia en puntos porcentuales frente al mes anterior */
export function variacion(actual: number | null, anterior: number | null): number | null {
  return actual == null || anterior == null ? null : actual - anterior
}

export function textoVariacion(v: number): string {
  const r = Math.round(v)
  return `${r > 0 ? '+' : ''}${r} % vs mes ant.`
}

export interface PuntoSemana {
  semana: string
  porcentaje: number | null
  registros: number
  actual: boolean
}

/** Evolución semanal (Prototipo): Sem 1 = días 1–7, Sem 2 = 8–14… */
export function evolucionSemanal(asistencias: AsistenciaPeriodo[], clave: string, hoy: string): PuntoSemana[] {
  const { hasta } = rangoMes(clave)
  const ultimoDia = Number(hasta.slice(8))
  const lista = delMes(asistencias, clave)
  const semanas: PuntoSemana[] = []
  for (let inicio = 1, n = 1; inicio <= ultimoDia; inicio += 7, n++) {
    const fin = Math.min(inicio + 6, ultimoDia)
    const desdeS = `${clave}-${dos(inicio)}`
    const hastaS = `${clave}-${dos(fin)}`
    if (desdeS > hoy) break // semanas futuras: aún no hay registros
    const enSemana = lista.filter((a) => a.fecha >= desdeS && a.fecha <= hastaS)
    const validas = enSemana.filter((a) => a.estado !== 'ausente').length
    semanas.push({
      semana: `Sem ${n}`,
      porcentaje: enSemana.length ? (validas * 100) / enSemana.length : null,
      registros: enSemana.length,
      actual: hoy >= desdeS && hoy <= hastaS,
    })
  }
  return semanas
}
