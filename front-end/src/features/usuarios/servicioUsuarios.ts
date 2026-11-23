import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { Rol, TipoDocumento } from '@/types/dominio'

/**
 * Servicio de Gestión de usuarios (CU02: HU02.1 registrar, HU02.3 asignar roles, HU02.4 desactivar).
 * - Leer, cambiar rol/estado y editar datos: directo con RLS (solo el administrador puede; el trigger
 *   fn_proteger_campos_perfil bloquea a cualquier otro rol).
 * - Crear cuentas: Edge Function "invitar-usuario" (necesita la llave service_role, que no puede estar aquí).
 */

export type EstadoUsuario = 'activo' | 'inactivo'

export interface Usuario {
  id: string
  nombres: string
  apellidos: string
  correo: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  telefono: string | null
  rol: Rol
  estado: EstadoUsuario
  sedeId: number | null
  sede: string | null
  creadoEn: string
  /** Solo aprendices: ficha donde tiene matrícula activa */
  fichaActiva: { id: number; numero: string } | null
}

interface FilaUsuario {
  id: string
  nombres: string
  apellidos: string
  correo: string
  tipo_documento: TipoDocumento
  numero_documento: string
  telefono: string | null
  rol: Rol
  estado: EstadoUsuario
  sede_id: number | null
  created_at: string
  sedes: { nombre: string } | null
  matriculas: Array<{ estado: string; fichas: { id: number; numero: string } | null }>
}

const COLUMNAS = 'id, nombres, apellidos, correo, tipo_documento, numero_documento, telefono, rol, estado, sede_id, created_at, sedes(nombre), matriculas(estado, fichas(id, numero))'
/** PostgREST devuelve como máximo 1000 filas por consulta: se pide por bloques para no perder usuarios */
const BLOQUE = 1000

function aUsuario(f: FilaUsuario): Usuario {
  const activa = f.matriculas?.find((m) => m.estado === 'matriculado')?.fichas ?? null
  return {
    id: f.id,
    nombres: f.nombres,
    apellidos: f.apellidos,
    correo: f.correo,
    tipoDocumento: f.tipo_documento,
    numeroDocumento: f.numero_documento,
    telefono: f.telefono,
    rol: f.rol,
    estado: f.estado,
    sedeId: f.sede_id,
    sede: f.sedes?.nombre ?? null,
    creadoEn: f.created_at,
    fichaActiva: activa,
  }
}

/** Listado completo de usuarios (el filtrado por rol, estado, sede y texto se hace en la interfaz) */
export async function listarUsuarios(): Promise<Resultado<Usuario[]>> {
  const filas: FilaUsuario[] = []
  for (let desde = 0; ; desde += BLOQUE) {
    const { data, error } = await supabase
      .from('perfiles')
      .select(COLUMNAS)
      .order('apellidos')
      .order('nombres')
      .range(desde, desde + BLOQUE - 1)
    if (error) return { ok: false, mensaje: traducirErrorBD(error) }
    filas.push(...(data as unknown as FilaUsuario[]))
    if (data.length < BLOQUE) break
  }
  return { ok: true, datos: filas.map(aUsuario) }
}

/** HU02.3 — Asignar rol. Al pasar a instructor, la BD crea su ficha de instructor (trigger). */
export async function cambiarRol(id: string, rol: Rol): Promise<Resultado> {
  const { error } = await supabase.from('perfiles').update({ rol }).eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: undefined }
}

/** HU02.4 — Activar o desactivar el acceso. No borra nada: el usuario conserva su historial. */
export async function cambiarEstadoUsuario(id: string, estado: EstadoUsuario): Promise<Resultado> {
  const { error } = await supabase.from('perfiles').update({ estado }).eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: undefined }
}

export interface DatosEditablesUsuario {
  nombres: string
  apellidos: string
  telefono: string | null
  sedeId: number | null
}

export async function actualizarUsuario(id: string, d: DatosEditablesUsuario): Promise<Resultado> {
  const { error } = await supabase
    .from('perfiles')
    .update({ nombres: d.nombres.trim(), apellidos: d.apellidos.trim(), telefono: d.telefono?.trim() || null, sede_id: d.sedeId })
    .eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: undefined }
}

export interface DatosInvitacion {
  rol: Rol
  nombres: string
  apellidos: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  correo: string
  telefono: string | null
  sedeId: number | null
  instructor?: { areaId: number | null; especialidad: string | null; fechaIngreso: string | null }
}

/**
 * HU02.1 / HU02.2 — Registra la cuenta y envía la invitación por correo (Edge Function "invitar-usuario").
 * El usuario abre el correo, llega a /restablecer y crea su propia contraseña.
 */
export async function invitarUsuario(d: DatosInvitacion): Promise<Resultado<{ id: string; correo: string }>> {
  const { data, error } = await supabase.functions.invoke('invitar-usuario', {
    body: { ...d, redirigirA: `${window.location.origin}/restablecer?invitacion=1` },
  })
  if (error) {
    // La función respondió con un error de negocio (correo repetido, sin permisos…): su mensaje ya está en español
    if (error instanceof FunctionsHttpError) {
      const cuerpo = await error.context.json().catch(() => null)
      if (error.context.status === 404) return { ok: false, mensaje: MENSAJE_SIN_FUNCION }
      return { ok: false, mensaje: cuerpo?.mensaje ?? 'No fue posible registrar el usuario. Intente nuevamente.' }
    }
    // No se pudo llegar a la función: normalmente porque aún no está desplegada en el proyecto
    return { ok: false, mensaje: MENSAJE_SIN_FUNCION }
  }
  return { ok: true, datos: { id: data.id, correo: data.correo } }
}

const MENSAJE_SIN_FUNCION =
  'El servicio de invitaciones no está disponible. Verifique que la Edge Function "invitar-usuario" esté desplegada (ver supabase/README.md) y su conexión a Internet.'
