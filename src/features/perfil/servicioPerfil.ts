import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { Rol } from '@/types/dominio'

export interface PerfilCompleto {
  id: string
  nombres: string
  apellidos: string
  correo: string
  rol: Rol
  tipoDocumento: string
  numeroDocumento: string
  telefono: string | null
  sede: string | null
}

interface FilaPerfilCompleto {
  id: string
  nombres: string
  apellidos: string
  correo: string
  rol: Rol
  tipo_documento: string
  numero_documento: string
  telefono: string | null
  sedes: { nombre: string } | null
}

export async function obtenerPerfilCompleto(id: string): Promise<PerfilCompleto | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombres, apellidos, correo, rol, tipo_documento, numero_documento, telefono, sedes(nombre)')
    .eq('id', id)
    .maybeSingle<FilaPerfilCompleto>()
  if (error || !data) return null
  return {
    id: data.id,
    nombres: data.nombres,
    apellidos: data.apellidos,
    correo: data.correo,
    rol: data.rol,
    tipoDocumento: data.tipo_documento,
    numeroDocumento: data.numero_documento,
    telefono: data.telefono,
    sede: data.sedes?.nombre ?? null,
  }
}

/** Campos que el propio usuario puede editar. Rol, correo y documento solo los cambia un administrador (trigger en BD). */
export const esquemaDatosPersonales = z.object({
  nombres: z.string().trim().min(2, 'Ingrese al menos 2 caracteres').max(100, 'Máximo 100 caracteres'),
  apellidos: z.string().trim().min(2, 'Ingrese al menos 2 caracteres').max(100, 'Máximo 100 caracteres'),
  telefono: z
    .string()
    .trim()
    .max(20, 'Máximo 20 caracteres')
    .refine((v) => v === '' || /^\+?[0-9\s]{7,20}$/.test(v), 'Ingrese solo números (7 a 20 dígitos), puede iniciar con +'),
})
export type DatosPersonales = z.infer<typeof esquemaDatosPersonales>

export async function actualizarDatosPersonales(id: string, datos: DatosPersonales): Promise<{ ok: boolean; mensaje?: string }> {
  const { error } = await supabase
    .from('perfiles')
    .update({ nombres: datos.nombres, apellidos: datos.apellidos, telefono: datos.telefono || null })
    .eq('id', id)
  if (error) return { ok: false, mensaje: 'No fue posible guardar los cambios. Intente nuevamente.' }
  return { ok: true }
}

export const ETIQUETA_DOCUMENTO: Record<string, string> = {
  CC: 'C.C.',
  TI: 'T.I.',
  CE: 'C.E.',
  PPT: 'P.P.T.',
}
