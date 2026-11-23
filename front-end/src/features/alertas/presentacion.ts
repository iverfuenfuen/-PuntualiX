import { NIVEL_POR_PRIORIDAD, type EstadoAlerta, type NivelAlerta, type PrioridadAlerta, type Tono } from '@/types/dominio'
import type { Alerta } from './servicioAlertas'

export const TONO_PRIORIDAD: Record<PrioridadAlerta, Tono> = { alta: 'critico', media: 'advertencia', baja: 'oliva' }

export const TONO_ESTADO_ALERTA: Record<EstadoAlerta, Tono> = {
  nueva: 'critico',
  en_seguimiento: 'informacion',
  atendida: 'exito',
  descartada: 'neutro',
}

/** "Ficha sin líder" es un aviso de gestión, no de inasistencia: se pinta como informativo */
export const nivelVisual = (a: Pick<Alerta, 'tipo' | 'prioridad'>): NivelAlerta =>
  a.tipo === 'ficha_sin_lider' ? 'informativa' : NIVEL_POR_PRIORIDAD[a.prioridad]

/** Título corto de la alerta (VersionAntigua: "Límite crítico superado", "Cerca del límite"…) */
export function tituloAlerta(a: Pick<Alerta, 'tipo' | 'prioridad' | 'ficha' | 'aprendiz'>): string {
  switch (a.tipo) {
    case 'ficha_sin_lider':
      return `Ficha ${a.ficha.numero} sin instructor líder`
    case 'sesion_sin_registro':
      return `Sesión sin registro · Ficha ${a.ficha.numero}`
    case 'inasistencia_aprendiz':
      return `${a.aprendiz?.nombre ?? 'Aprendiz'} · Ficha ${a.ficha.numero}`
    default:
      return a.prioridad === 'alta' ? `Límite crítico superado · Ficha ${a.ficha.numero}` : `Inasistencia en aumento · Ficha ${a.ficha.numero}`
  }
}

const formatoFechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
export const fechaHora = (iso: string) => formatoFechaHora.format(new Date(iso))
