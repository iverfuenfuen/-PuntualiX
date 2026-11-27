/** Une clases CSS ignorando valores falsos: cn('a', cond && 'b') → 'a b' */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}

/** Iniciales para el avatar: "Andres Ramirez" → "AR" */
export function iniciales(nombres: string, apellidos = ''): string {
  const a = nombres.trim().charAt(0)
  const b = (apellidos.trim() || nombres.trim().split(/\s+/)[1] || '').charAt(0)
  return (a + b).toUpperCase()
}

const formatoRelativo = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })

/** Tiempo relativo en español: "hace 15 minutos", "ayer"… */
export function tiempoRelativo(fecha: Date | string, ahora: Date = new Date()): string {
  const segundos = Math.round((new Date(fecha).getTime() - ahora.getTime()) / 1000)
  const pasos: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60],
  ]
  for (const [unidad, s] of pasos) {
    if (Math.abs(segundos) >= s) return formatoRelativo.format(Math.round(segundos / s), unidad)
  }
  return 'hace un momento'
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

/** Fecha corta en español: "03 ago 2026" */
export function fechaCorta(fecha: Date | string): string {
  return formatoFecha.format(new Date(fecha))
}

/** Porcentaje con formato local: 84.5 → "84,5 %" */
export function porcentaje(valor: number | null | undefined, decimales = 0): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return `${valor.toLocaleString('es-CO', { maximumFractionDigits: decimales })} %`
}
