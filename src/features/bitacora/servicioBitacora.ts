import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { AccionBitacora, ModuloSistema, ResultadoBitacora, Rol } from '@/types/dominio'

/**
 * Servicio de la Bitácora (CU11, RF19, HU11.1–HU11.5).
 * La bitácora es de solo lectura: la escriben los triggers de la BD y fn_registrar_evento. Puede crecer mucho,
 * por eso el filtrado y la paginación se hacen en el servidor.
 */

export interface FiltrosBitacora {
  q: string
  modulo: string
  accion: string
  resultado: string
  rol: string
  /** YYYY-MM-DD (hora de Colombia) */
  desde: string
  hasta: string
}

export type DatosRegistro = Record<string, unknown>

export interface EventoBitacora {
  id: number
  fecha: string
  usuarioId: string | null
  usuario: string | null
  rol: Rol | null
  modulo: ModuloSistema
  accion: AccionBitacora
  tabla: string | null
  registroId: string | null
  detalle: string | null
  datosAnteriores: DatosRegistro | null
  datosNuevos: DatosRegistro | null
  resultado: ResultadoBitacora
}

type FilaEvento = {
  id: number
  fecha: string
  usuario_id: string | null
  rol: Rol | null
  modulo: ModuloSistema
  accion: AccionBitacora
  tabla: string | null
  registro_id: string | null
  detalle: string | null
  datos_anteriores: DatosRegistro | null
  datos_nuevos: DatosRegistro | null
  resultado: ResultadoBitacora
  perfiles: { nombres: string; apellidos: string } | null
}

const COLUMNAS = 'id, fecha, usuario_id, rol, modulo, accion, tabla, registro_id, detalle, datos_anteriores, datos_nuevos, resultado, perfiles(nombres, apellidos)'
const ZONA = '-05:00' // Colombia no tiene horario de verano

const aEvento = (e: FilaEvento): EventoBitacora => ({
  id: e.id,
  fecha: e.fecha,
  usuarioId: e.usuario_id,
  usuario: e.perfiles ? `${e.perfiles.nombres} ${e.perfiles.apellidos}` : null,
  rol: e.rol,
  modulo: e.modulo,
  accion: e.accion,
  tabla: e.tabla,
  registroId: e.registro_id,
  detalle: e.detalle,
  datosAnteriores: e.datos_anteriores,
  datosNuevos: e.datos_nuevos,
  resultado: e.resultado,
})

/** Día siguiente de una fecha YYYY-MM-DD (límite superior exclusivo del rango) */
function diaSiguiente(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Quita los caracteres que tienen significado en los filtros de PostgREST */
const limpiarBusqueda = (q: string) => q.replace(/[,()%*\\:"]/g, ' ').trim()

/** La búsqueda libre también encuentra por nombre del responsable: primero se buscan sus ids */
async function idsResponsables(q: string): Promise<string[]> {
  const { data } = await supabase.from('perfiles').select('id').or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%,correo.ilike.%${q}%`).limit(50)
  return ((data ?? []) as Array<{ id: string }>).map((p) => p.id)
}

/** Condición "or" de la búsqueda libre (detalle, tabla, id del registro o nombre del responsable) */
async function condicionBusqueda(q: string): Promise<string | null> {
  const texto = limpiarBusqueda(q)
  if (!texto) return null
  const ids = await idsResponsables(texto)
  const condiciones = [`detalle.ilike.%${texto}%`, `tabla.ilike.%${texto}%`, `registro_id.eq.${texto}`]
  if (ids.length) condiciones.push(`usuario_id.in.(${ids.join(',')})`)
  return condiciones.join(',')
}

/**
 * Construye la consulta con los filtros. `sinResultado` ignora el filtro de resultado (para los contadores).
 * Es síncrona a propósito: el constructor de supabase-js es "thenable" y una función async lo ejecutaría al devolverlo.
 * Sin genéricos, para no disparar la recursión de tipos de supabase-js (TS2589).
 */
function consulta(f: FiltrosBitacora, busqueda: string | null, columnas: string, opciones: { count?: 'exact'; head?: boolean }, sinResultado = false) {
  let q = supabase.from('bitacora').select(columnas, opciones)
  if (f.modulo) q = q.eq('modulo', f.modulo)
  if (f.accion) q = q.eq('accion', f.accion)
  if (f.rol) q = q.eq('rol', f.rol)
  if (f.resultado && !sinResultado) q = q.eq('resultado', f.resultado)
  if (f.desde) q = q.gte('fecha', `${f.desde}T00:00:00${ZONA}`)
  if (f.hasta) q = q.lt('fecha', `${diaSiguiente(f.hasta)}T00:00:00${ZONA}`)
  if (busqueda) q = q.or(busqueda)
  return q
}

/** HU11.1 / HU11.2 — Página de eventos con los filtros aplicados (más recientes primero) */
export async function listarEventos(f: FiltrosBitacora, pagina: number, porPagina: number): Promise<Resultado<{ eventos: EventoBitacora[]; total: number }>> {
  const desde = (pagina - 1) * porPagina
  const { data, error, count } = await consulta(f, await condicionBusqueda(f.q), COLUMNAS, { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .range(desde, desde + porPagina - 1)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: { eventos: (data as unknown as FilaEvento[]).map(aEvento), total: count ?? 0 } }
}

export type ConteoResultados = Record<ResultadoBitacora, number>

/** Totales por resultado con los mismos filtros (excepto el de resultado), para los indicadores */
export async function contarResultados(f: FiltrosBitacora): Promise<Resultado<ConteoResultados>> {
  const resultados: ResultadoBitacora[] = ['exito', 'alerta', 'error']
  const busqueda = await condicionBusqueda(f.q)
  const respuestas = await Promise.all(resultados.map((r) => consulta(f, busqueda, 'id', { count: 'exact', head: true }, true).eq('resultado', r)))
  const error = respuestas.find((x) => x.error)?.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: { exito: respuestas[0].count ?? 0, alerta: respuestas[1].count ?? 0, error: respuestas[2].count ?? 0 } }
}

export const LIMITE_EXPORTACION = 3000

/** Eventos para exportar a CSV (hasta LIMITE_EXPORTACION, los más recientes) */
export async function eventosParaExportar(f: FiltrosBitacora): Promise<Resultado<EventoBitacora[]>> {
  const { data, error } = await consulta(f, await condicionBusqueda(f.q), COLUMNAS, {}).order('fecha', { ascending: false }).limit(LIMITE_EXPORTACION)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: (data as unknown as FilaEvento[]).map(aEvento) }
}

/** Actividad reciente (dashboard) */
export async function eventosRecientes(limite: number): Promise<Resultado<EventoBitacora[]>> {
  const { data, error } = await supabase.from('bitacora').select(COLUMNAS).order('fecha', { ascending: false }).order('id', { ascending: false }).limit(limite)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: (data as unknown as FilaEvento[]).map(aEvento) }
}
