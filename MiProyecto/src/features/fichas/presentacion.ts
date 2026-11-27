import { ETIQUETA_ESTADO_FICHA, type EstadoFicha, type PrioridadAlerta, type Tono } from '@/types/dominio'
import type { FichaResumen, Umbral } from './servicioFichas'

/** Etiqueta y color del estado de una ficha combinando su estado y su nivel de riesgo (umbrales RF17). */
export function estadoVisualFicha(f: Pick<FichaResumen, 'estado' | 'nivelRiesgo' | 'totalRegistros'>): { texto: string; tono: Tono } {
  if (f.estado !== 'activa') return { texto: ETIQUETA_ESTADO_FICHA[f.estado], tono: TONO_ESTADO_FICHA[f.estado] }
  if (f.totalRegistros === 0) return { texto: 'Activa · Sin registros', tono: 'neutro' }
  switch (f.nivelRiesgo) {
    case 'alta':
      return { texto: 'Riesgo crítico', tono: 'critico' }
    case 'media':
      return { texto: 'Activa · Riesgo moderado', tono: 'advertencia' }
    case 'baja':
      return { texto: 'Activa · Riesgo leve', tono: 'oliva' }
    default:
      return { texto: 'Activa · Óptimo', tono: 'exito' }
  }
}

export const TONO_ESTADO_FICHA: Record<EstadoFicha, Tono> = {
  activa: 'exito',
  en_pausa: 'advertencia',
  etapa_productiva: 'informacion',
  finalizada: 'neutro',
  inactiva: 'neutro',
}

/** Una ficha está "en riesgo" si su inasistencia alcanza el umbral medio o alto */
export const fichaEnRiesgo = (f: Pick<FichaResumen, 'estado' | 'nivelRiesgo'>) =>
  f.estado === 'activa' && (f.nivelRiesgo === 'media' || f.nivelRiesgo === 'alta')

/** Nivel de riesgo de un aprendiz: el umbral más alto que alcanza su % de inasistencia */
export function riesgoAprendiz(porcentajeInasistencia: number | null, umbrales: Umbral[]): PrioridadAlerta | null {
  if (porcentajeInasistencia == null) return null
  const alcanzados = umbrales.filter((u) => porcentajeInasistencia >= u.porcentaje)
  return alcanzados.length ? alcanzados.reduce((a, b) => (b.porcentaje > a.porcentaje ? b : a)).prioridad : null
}

export const ETIQUETA_RIESGO: Record<PrioridadAlerta, { texto: string; tono: Tono }> = {
  alta: { texto: 'Riesgo crítico', tono: 'critico' },
  media: { texto: 'Riesgo moderado', tono: 'advertencia' },
  baja: { texto: 'Riesgo leve', tono: 'oliva' },
}

/** "2026-07-26" → "26/07/2026" sin desfases de zona horaria */
export function fechaISOaTexto(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  const [a, m, d] = fecha.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local) */
export function hoyISO(): string {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}
