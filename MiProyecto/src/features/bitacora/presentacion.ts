import { ETIQUETA_ACCION, type ResultadoBitacora, type Tono } from '@/types/dominio'
import type { DatosRegistro, EventoBitacora } from './servicioBitacora'

/**
 * Traduce los eventos técnicos de la bitácora (tabla + JSON antes/después) a textos legibles.
 * Corrige el problema de VersionAntigua, donde el detalle se escribía a mano y no coincidía con lo ocurrido.
 */

export const TONO_RESULTADO: Record<ResultadoBitacora, Tono> = { exito: 'exito', alerta: 'advertencia', error: 'critico' }

export const ETIQUETA_TABLA: Record<string, string> = {
  perfiles: 'Usuario',
  instructores: 'Datos de instructor',
  fichas: 'Ficha',
  ficha_instructores: 'Asignación de instructor',
  matriculas: 'Matrícula',
  sesiones: 'Sesión de formación',
  asistencias: 'Asistencia',
  justificaciones: 'Justificación',
  umbrales_alerta: 'Umbral de alerta',
  alertas: 'Alerta',
  reportes: 'Reporte',
  materiales: 'Material de apoyo',
}

/** Campos técnicos que no aportan al lector (se omiten en la lista de cambios) */
const CAMPOS_OCULTOS = new Set(['updated_at', 'created_at'])

const texto = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null)

/** Nombre reconocible del registro afectado: "Ficha 301002", "Juan Pérez"… */
export function identificarRegistro(e: Pick<EventoBitacora, 'tabla' | 'registroId' | 'datosNuevos' | 'datosAnteriores'>): string | null {
  const d: DatosRegistro = e.datosNuevos ?? e.datosAnteriores ?? {}
  switch (e.tabla) {
    case 'fichas':
      return d.numero ? `Ficha ${texto(d.numero)}` : null
    case 'perfiles':
      return d.nombres ? `${texto(d.nombres)} ${texto(d.apellidos) ?? ''}`.trim() : null
    case 'umbrales_alerta':
      return d.prioridad ? `Prioridad ${texto(d.prioridad)} · ${texto(d.porcentaje_inasistencia)} %` : null
    case 'materiales':
      return texto(d.titulo)
    case 'sesiones':
      return d.fecha ? `Sesión del ${texto(d.fecha)}` : null
    case 'alertas':
      return texto(d.descripcion)
    default:
      return e.registroId ? `Registro #${e.registroId}` : null
  }
}

export interface CambioCampo {
  campo: string
  antes: string
  despues: string
}

export const etiquetaCampo = (clave: string) => {
  const t = clave.replace(/_id$/, '').replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function valorLegible(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Campos modificados (en un registro o eliminación se listan todos los datos) */
export function cambiosDelEvento(e: Pick<EventoBitacora, 'datosAnteriores' | 'datosNuevos'>): CambioCampo[] {
  const antes = e.datosAnteriores ?? {}
  const despues = e.datosNuevos ?? {}
  const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].filter((k) => !CAMPOS_OCULTOS.has(k))
  const soloCambios = e.datosAnteriores && e.datosNuevos
  return claves
    .filter((k) => !soloCambios || JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
    .map((k) => ({ campo: etiquetaCampo(k), antes: e.datosAnteriores ? valorLegible(antes[k]) : '—', despues: e.datosNuevos ? valorLegible(despues[k]) : '—' }))
}

/** Título legible: "Modificación · Ficha" o, en eventos manuales, la acción */
export function tituloEvento(e: Pick<EventoBitacora, 'accion' | 'tabla'>): string {
  return e.tabla ? `${ETIQUETA_ACCION[e.accion]} · ${ETIQUETA_TABLA[e.tabla] ?? e.tabla}` : ETIQUETA_ACCION[e.accion]
}

/** Resumen de una línea para la tabla: registro afectado + campos cambiados, o el detalle del evento manual */
export function resumenEvento(e: EventoBitacora): string {
  if (!e.tabla) return e.detalle ?? '—'
  const registro = identificarRegistro(e)
  if (e.accion === 'modificacion') {
    const campos = cambiosDelEvento(e).map((c) => c.campo.toLowerCase())
    const lista = campos.length > 3 ? `${campos.slice(0, 3).join(', ')} y ${campos.length - 3} más` : campos.join(', ')
    return [registro, lista && `cambió: ${lista}`].filter(Boolean).join(' — ')
  }
  return registro ?? e.detalle ?? '—'
}

const formatoCompleto = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'America/Bogota' })
const formatoDia = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
const formatoHora = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Bogota' })

export const fechaCompleta = (iso: string) => formatoCompleto.format(new Date(iso))
export const diaEvento = (iso: string) => formatoDia.format(new Date(iso))
export const horaEvento = (iso: string) => formatoHora.format(new Date(iso))

/** Fecha YYYY-MM-DD en Colombia, desplazada `dias` hacia atrás (vistas rápidas: hoy, 7 días…) */
export function fechaColombia(dias = 0): string {
  const d = new Date(Date.now() - dias * 86400000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d)
}
