import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { NivelFormacion } from '@/types/dominio'

/** Catálogos institucionales (sedes, áreas, ambientes, programas) usados por Fichas, Instructores y Usuarios. */
export interface Catalogos {
  sedes: Array<{ id: number; nombre: string; activa: boolean }>
  areas: Array<{ id: number; nombre: string }>
  ambientes: Array<{ id: number; sedeId: number; nombre: string; capacidad: number | null }>
  programas: Array<{ id: number; codigo: string; nombre: string; nivel: NivelFormacion; areaId: number; activo: boolean }>
}

export async function obtenerCatalogos(): Promise<Resultado<Catalogos>> {
  const [sedes, areas, ambientes, programas] = await Promise.all([
    supabase.from('sedes').select('id, nombre, activa').order('nombre'),
    supabase.from('areas').select('id, nombre').order('nombre'),
    supabase.from('ambientes').select('id, sede_id, nombre, capacidad').order('nombre'),
    supabase.from('programas').select('id, codigo, nombre, nivel, area_id, activo').order('nombre'),
  ])
  const error = sedes.error ?? areas.error ?? ambientes.error ?? programas.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return {
    ok: true,
    datos: {
      sedes: sedes.data ?? [],
      areas: areas.data ?? [],
      ambientes: (ambientes.data ?? []).map((a: { id: number; sede_id: number; nombre: string; capacidad: number | null }) => ({
        id: a.id,
        sedeId: a.sede_id,
        nombre: a.nombre,
        capacidad: a.capacidad,
      })),
      programas: (programas.data ?? []).map(
        (p: { id: number; codigo: string; nombre: string; nivel: NivelFormacion; area_id: number; activo: boolean }) => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          nivel: p.nivel,
          areaId: p.area_id,
          activo: p.activo,
        }),
      ),
    },
  }
}
