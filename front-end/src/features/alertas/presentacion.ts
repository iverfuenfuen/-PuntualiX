import { NIVEL_POR_PRIORIDAD, type NivelAlerta, type PrioridadAlerta, type Tono } from '@/types/dominio'
import type { AlertaFicha } from './servicioAlertas'

export const TONO_PRIORIDAD: Record<PrioridadAlerta, Tono> = { alta: 'critico', media: 'advertencia', baja: 'oliva' }

/** "Ficha sin líder" es un aviso de gestión, no de inasistencia: se pinta como informativo (VersionAntigua) */
export const nivelVisual = (a: Pick<AlertaFicha, 'tipo' | 'prioridad'>): NivelAlerta =>
  a.tipo === 'ficha_sin_lider' ? 'informativa' : NIVEL_POR_PRIORIDAD[a.prioridad]

/** Títulos de VersionAntigua: "Límite crítico superado", "Cerca del límite establecido", "Sin instructor líder asignado" */
export function tituloAlerta(a: Pick<AlertaFicha, 'tipo' | 'prioridad'>): string {
  if (a.tipo === 'ficha_sin_lider') return 'Sin instructor líder asignado'
  if (a.tipo === 'sesion_sin_registro') return 'Sesión sin registro de asistencia'
  return a.prioridad === 'alta' ? 'Límite crítico superado' : a.prioridad === 'media' ? 'Cerca del límite establecido' : 'Tendencia al alza'
}

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
/** "22/08/2026 07:45" (formato de VersionAntigua) */
export const fechaHora = (iso: string) => formatoFechaHora.format(new Date(iso)).replace(',', '')
