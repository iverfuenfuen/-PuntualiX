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

// ---------------------------------------------------------------------
// Alertas y bitácora (Etapa 4) — mismos valores que los enum de la BD
// ---------------------------------------------------------------------
export type EstadoAlerta = 'nueva' | 'en_seguimiento' | 'atendida' | 'descartada'
export type TipoAlerta = 'inasistencia_aprendiz' | 'riesgo_ficha' | 'ficha_sin_lider' | 'sesion_sin_registro'
export type ModuloSistema =
  | 'autenticacion' | 'usuarios' | 'fichas' | 'instructores' | 'asistencias'
  | 'justificaciones' | 'alertas' | 'material' | 'reportes' | 'configuracion'
export type AccionBitacora = 'acceso' | 'registro' | 'modificacion' | 'eliminacion' | 'consulta' | 'descarga'
export type ResultadoBitacora = 'exito' | 'alerta' | 'error'

export const ETIQUETA_PRIORIDAD: Record<PrioridadAlerta, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }

export const ETIQUETA_ESTADO_ALERTA: Record<EstadoAlerta, string> = {
  nueva: 'Nueva',
  en_seguimiento: 'En seguimiento',
  atendida: 'Atendida',
  descartada: 'Descartada',
}

export const ETIQUETA_TIPO_ALERTA: Record<TipoAlerta, string> = {
  inasistencia_aprendiz: 'Inasistencia de aprendiz',
  riesgo_ficha: 'Inasistencia de la ficha',
  ficha_sin_lider: 'Ficha sin instructor líder',
  sesion_sin_registro: 'Sesión sin registro de asistencia',
}

export const ETIQUETA_MODULO: Record<ModuloSistema, string> = {
  autenticacion: 'Acceso y autenticación',
  usuarios: 'Gestión de usuarios',
  fichas: 'Fichas',
  instructores: 'Instructores',
  asistencias: 'Asistencias',
  justificaciones: 'Justificaciones',
  alertas: 'Alertas',
  material: 'Material de apoyo',
  reportes: 'Reportes y descargas',
  configuracion: 'Configuración',
}

export const ETIQUETA_ACCION: Record<AccionBitacora, string> = {
  acceso: 'Acceso',
  registro: 'Registro',
  modificacion: 'Modificación',
  eliminacion: 'Eliminación',
  consulta: 'Consulta',
  descarga: 'Descarga',
}

export const ETIQUETA_RESULTADO: Record<ResultadoBitacora, string> = { exito: 'Éxito', alerta: 'Alerta', error: 'Error' }

// ---------------------------------------------------------------------
// Reportes (Etapa 5) — mismos valores que los enum de la BD
// ---------------------------------------------------------------------
export type TipoReporte = 'ficha' | 'instructor' | 'aprendiz' | 'estadisticas' | 'desercion' | 'cumplimiento_instructores'
export type FormatoReporte = 'pdf' | 'xlsx' | 'csv'
export type EstadoReporte = 'generando' | 'listo' | 'error'

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporte, string> = {
  ficha: 'Ficha',
  instructor: 'Instructor',
  aprendiz: 'Aprendiz',
  estadisticas: 'Estadísticas',
  desercion: 'Deserción',
  cumplimiento_instructores: 'Cumplimiento',
}
export const ETIQUETA_FORMATO_REPORTE: Record<FormatoReporte, string> = { pdf: 'PDF', xlsx: 'Excel', csv: 'CSV' }
export const ETIQUETA_ESTADO_REPORTE: Record<EstadoReporte, string> = { generando: 'Generando', listo: 'Disponible', error: 'Error' }

/** Convierte un Record de etiquetas en opciones para <Select> */
export function opcionesDe<T extends string>(etiquetas: Record<T, string>): Array<{ valor: T; etiqueta: string }> {
  return (Object.entries(etiquetas) as Array<[T, string]>).map(([valor, etiqueta]) => ({ valor, etiqueta }))
}
