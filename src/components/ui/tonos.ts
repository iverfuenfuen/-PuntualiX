import type { NivelAlerta, Tono } from '@/types/dominio'

/**
 * Clases de color por tono semántico, construidas SOLO con los tokens del Manual de Identidad.
 * (Tailwind necesita ver los nombres completos de las clases: por eso se escriben literales.)
 */
export const TONO_SUAVE: Record<Tono, string> = {
  primario: 'bg-primario/10 text-primario',
  exito: 'bg-confirmacion/10 text-confirmacion',
  advertencia: 'bg-advertencia/15 text-[#8a5d00]', // texto oscurecido: el amarillo puro no cumple contraste AA
  critico: 'bg-alerta-critica/10 text-alerta-critica',
  informacion: 'bg-informacion/10 text-informacion',
  oliva: 'bg-estado-activo/15 text-[#5c5c00]',
  neutro: 'bg-fondo-tarjeta-suave text-texto-apoyo',
}

export const TONO_BORDE: Record<Tono, string> = {
  primario: 'border-primario/25',
  exito: 'border-confirmacion/25',
  advertencia: 'border-advertencia/40',
  critico: 'border-alerta-critica/25',
  informacion: 'border-informacion/25',
  oliva: 'border-estado-activo/30',
  neutro: 'border-borde',
}

export const TONO_SOLIDO: Record<Tono, string> = {
  primario: 'bg-primario',
  exito: 'bg-confirmacion',
  advertencia: 'bg-advertencia',
  critico: 'bg-alerta-critica',
  informacion: 'bg-informacion',
  oliva: 'bg-estado-activo',
  neutro: 'bg-texto-deshabilitado',
}

/** Cada nivel de alerta usa el color de estado que define el manual */
export const TONO_POR_NIVEL: Record<NivelAlerta, Tono> = {
  critica: 'critico',
  advertencia: 'advertencia',
  informativa: 'informacion',
  leve: 'oliva',
}

/** Tono según % de asistencia, con los niveles de VersionAntigua: ≥80 alto, 70–79 moderado, <70 bajo */
export function tonoPorAsistencia(valor: number): Tono {
  if (valor >= 80) return 'exito'
  if (valor >= 70) return 'advertencia'
  return 'critico'
}
