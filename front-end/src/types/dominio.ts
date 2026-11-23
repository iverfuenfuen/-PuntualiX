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
