/**
 * Tipos de dominio compartidos por la interfaz.
 * Los valores coinciden con los enum de la base de datos (supabase/migrations/01_tipos_y_tablas.sql).
 */

export type Rol = 'administrador' | 'instructor' | 'aprendiz'

export const ETIQUETA_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  instructor: 'Instructor',
  aprendiz: 'Aprendiz',
}

/** Ruta de inicio de cada rol (prefijo de todas sus pantallas). */
export const RUTA_INICIO_ROL: Record<Rol, string> = {
  administrador: '/admin',
  instructor: '/instructor',
  aprendiz: '/aprendiz',
}

/** Datos mínimos del usuario con sesión iniciada que necesita la interfaz. */
export interface UsuarioSesion {
  id: string
  nombres: string
  apellidos: string
  correo: string
  rol: Rol
  avatarUrl?: string | null
}

export type PrioridadAlerta = 'baja' | 'media' | 'alta'

/** Variante visual de las alertas: las 3 prioridades de la BD + "info" (p. ej. ficha sin líder). */
export type NivelAlerta = 'critica' | 'advertencia' | 'informativa' | 'leve'

/** Traducción prioridad de BD → nivel visual. */
export const NIVEL_POR_PRIORIDAD: Record<PrioridadAlerta, NivelAlerta> = {
  alta: 'critica',
  media: 'advertencia',
  baja: 'leve',
}

/** Tonos semánticos del Manual de Identidad para badges, KPIs e íconos. */
export type Tono = 'primario' | 'exito' | 'advertencia' | 'critico' | 'informacion' | 'oliva' | 'neutro'

// ---------------------------------------------------------------------
// Catálogos académicos (mismos valores que los enum de la BD)
// ---------------------------------------------------------------------

export type EstadoFicha = 'activa' | 'en_pausa' | 'etapa_productiva' | 'finalizada' | 'inactiva'
export type Jornada = 'manana' | 'tarde' | 'noche' | 'mixta'
export type Modalidad = 'presencial' | 'virtual' | 'hibrida'
export type NivelFormacion = 'tecnico' | 'tecnologo' | 'auxiliar' | 'operario' | 'especializacion'
export type EstadoMatricula = 'matriculado' | 'aplazado' | 'retirado' | 'desertor' | 'certificado'
export type TipoVocero = 'ninguno' | 'titular' | 'suplente'
export type TipoDocumento = 'CC' | 'TI' | 'CE' | 'PPT'

export const ETIQUETA_ESTADO_FICHA: Record<EstadoFicha, string> = {
  activa: 'Activa',
  en_pausa: 'En pausa',
  etapa_productiva: 'Etapa productiva',
  finalizada: 'Finalizada',
  inactiva: 'Inactiva',
}

export const ETIQUETA_JORNADA: Record<Jornada, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
  mixta: 'Mixta',
}

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  hibrida: 'Híbrida',
}

export const ETIQUETA_NIVEL: Record<NivelFormacion, string> = {
  tecnico: 'Técnico',
  tecnologo: 'Tecnólogo',
  auxiliar: 'Auxiliar',
  operario: 'Operario',
  especializacion: 'Especialización',
}

export const ETIQUETA_ESTADO_MATRICULA: Record<EstadoMatricula, string> = {
  matriculado: 'Matriculado',
  aplazado: 'Aplazado',
  retirado: 'Retirado',
  desertor: 'Desertor',
  certificado: 'Certificado',
}

export const ETIQUETA_VOCERO: Record<TipoVocero, string> = {
  ninguno: 'Sin vocería',
  titular: 'Vocero titular',
  suplente: 'Vocero suplente',
}

export const ETIQUETA_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  CC: 'C.C. — Cédula de ciudadanía',
  TI: 'T.I. — Tarjeta de identidad',
  CE: 'C.E. — Cédula de extranjería',
  PPT: 'P.P.T. — Permiso por protección temporal',
}

/** Convierte un Record de etiquetas en opciones para <Select> */
export function opcionesDe<T extends string>(etiquetas: Record<T, string>): Array<{ valor: T; etiqueta: string }> {
  return (Object.entries(etiquetas) as Array<[T, string]>).map(([valor, etiqueta]) => ({ valor, etiqueta }))
}
