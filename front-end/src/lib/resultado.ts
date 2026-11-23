/** Resultado uniforme de las operaciones de los servicios: ok con datos, o un mensaje listo para mostrar. */
export type Resultado<T = void> = { ok: true; datos: T } | { ok: false; mensaje: string; codigo?: string }

/** Error de PostgREST / PostgreSQL tal como lo devuelve supabase-js */
export interface ErrorBD {
  code?: string
  message?: string
  details?: string | null
}

export const MENSAJE_ERROR_GENERICO = 'No fue posible completar la operación. Intente nuevamente.'

/**
 * Traduce un error de la base de datos a un mensaje en español.
 * `porRestriccion` asocia el nombre de una restricción (índice único, check, llave foránea) con su mensaje;
 * así cada servicio explica la regla de negocio que se incumplió en lugar de mostrar el error técnico.
 */
export function traducirErrorBD(error: ErrorBD | null | undefined, porRestriccion: Record<string, string> = {}): string {
  if (!error) return MENSAJE_ERROR_GENERICO
  const texto = `${error.message ?? ''} ${error.details ?? ''}`
  for (const [restriccion, mensaje] of Object.entries(porRestriccion)) {
    if (texto.includes(restriccion)) return mensaje
  }
  switch (error.code) {
    case '42501': // RLS: sin permiso
      return 'No tiene permisos para realizar esta acción.'
    case '23505':
      return 'Ya existe un registro con esos datos.'
    case '23503':
      return 'El registro está relacionado con otra información y no se puede modificar así.'
    case '23514':
      return 'Algún dato no cumple las reglas de validación.'
    case 'P0001': // RAISE EXCEPTION de los triggers: su mensaje ya está en español
      return error.message ?? MENSAJE_ERROR_GENERICO
    default:
      return error.message?.includes('Failed to fetch') ? 'No fue posible conectar con el servidor. Revise su conexión a Internet.' : MENSAJE_ERROR_GENERICO
  }
}
