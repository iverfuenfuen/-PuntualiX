import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { EstadoAlerta, PrioridadAlerta, TipoAlerta } from '@/types/dominio'

/**
 * Servicio del módulo Alertas (CU09, RF16, RF17, HU09.1–HU09.3).
 * Las alertas las genera la BD (triggers según los umbrales); aquí solo se consultan y se gestiona su estado.
 */

export interface Alerta {
  id: number
  tipo: TipoAlerta
  prioridad: PrioridadAlerta
  estado: EstadoAlerta
  descripcion: string
  /** % de inasistencia que la originó (null en "ficha sin líder") */
  porcentaje: number | null
  creadaEn: string
  atendidaEn: string | null
  atendidaPor: string | null
  ficha: {
    id: number
    numero: string
    programa: string
    sedeId: number | null
    sede: string | null
    instructorLider: string | null
  }
  aprendiz: { id: string; nombre: string } | null
}

export interface UmbralConfigurado {
  id: number
  prioridad: PrioridadAlerta
  porcentaje: number
  descripcion: string | null
  activo: boolean
  actualizadoEn: string
  actualizadoPor: string | null
}

type Persona = { nombres: string; apellidos: string } | null
type FilaAlerta = {
  id: number
  tipo: TipoAlerta
  prioridad: PrioridadAlerta
  estado: EstadoAlerta
  descripcion: string
  porcentaje: number | string | null
  created_at: string
  atendida_en: string | null
  ficha_id: number
  aprendiz: (Persona & { id: string }) | null
  atendio: Persona
}
type FilaFicha = { id: number; numero: string; programa: string; sede_id: number | null; sede: string | null; instructor_lider: string | null }

const nombre = (p: Persona) => (p ? `${p.nombres} ${p.apellidos}` : null)
const ABIERTAS: EstadoAlerta[] = ['nueva', 'en_seguimiento']
export const estaAbierta = (a: Pick<Alerta, 'estado'>) => ABIERTAS.includes(a.estado)

/** RF16 — Alertas generadas (las más recientes primero). `soloAbiertas` y `limite` sirven al dashboard. */
export async function listarAlertas(opciones: { soloAbiertas?: boolean; limite?: number } = {}): Promise<Resultado<Alerta[]>> {
  let consulta = supabase
    .from('alertas')
    .select(
      'id, tipo, prioridad, estado, descripcion, porcentaje, created_at, atendida_en, ficha_id, aprendiz:perfiles!alertas_aprendiz_id_fkey(id, nombres, apellidos), atendio:perfiles!alertas_atendida_por_fkey(nombres, apellidos)',
    )
    .order('created_at', { ascending: false })
    .limit(opciones.limite ?? 1000)
  if (opciones.soloAbiertas) consulta = consulta.in('estado', ABIERTAS)

  const [alertas, fichas] = await Promise.all([
    consulta,
    supabase.from('v_fichas_resumen').select('id, numero, programa, sede_id, sede, instructor_lider'),
  ])
  const error = alertas.error ?? fichas.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }

  const fichasPorId = new Map((fichas.data as FilaFicha[]).map((f) => [f.id, f]))
  const datos = (alertas.data as unknown as FilaAlerta[]).map((a): Alerta => {
    const f = fichasPorId.get(a.ficha_id)
    return {
      id: a.id,
      tipo: a.tipo,
      prioridad: a.prioridad,
      estado: a.estado,
      descripcion: a.descripcion,
      porcentaje: a.porcentaje == null ? null : Number(a.porcentaje),
      creadaEn: a.created_at,
      atendidaEn: a.atendida_en,
      atendidaPor: nombre(a.atendio),
      ficha: {
        id: a.ficha_id,
        numero: f?.numero ?? String(a.ficha_id),
        programa: f?.programa ?? '',
        sedeId: f?.sede_id ?? null,
        sede: f?.sede ?? null,
        instructorLider: f?.instructor_lider ?? null,
      },
      aprendiz: a.aprendiz ? { id: a.aprendiz.id, nombre: `${a.aprendiz.nombres} ${a.aprendiz.apellidos}` } : null,
    }
  })
  return { ok: true, datos }
}

/** RF16 / HU09.3 — Seguimiento de una alerta. Al cerrarla (atendida o descartada) queda registrado quién y cuándo. */
export async function cambiarEstadoAlerta(id: number, estado: EstadoAlerta, usuarioId: string): Promise<Resultado> {
  const cierra = estado === 'atendida' || estado === 'descartada'
  const { error } = await supabase
    .from('alertas')
    .update({ estado, atendida_por: cierra ? usuarioId : null, atendida_en: cierra ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  return { ok: true, datos: undefined }
}

/** Al abrir el centro de alertas, las notificaciones propias se dan por leídas (campana del Navbar, HU09.1) */
export async function marcarNotificacionesLeidas(): Promise<void> {
  await supabase.from('notificaciones').update({ leida: true }).eq('leida', false)
}

// ---------------------------------------------------------------------
// Umbrales (RF17)
// ---------------------------------------------------------------------

type FilaUmbral = {
  id: number
  prioridad: PrioridadAlerta
  porcentaje_inasistencia: number | string
  descripcion: string | null
  activo: boolean
  updated_at: string
  perfiles: Persona
}

const ORDEN_PRIORIDAD: Record<PrioridadAlerta, number> = { baja: 0, media: 1, alta: 2 }

export async function listarUmbrales(): Promise<Resultado<UmbralConfigurado[]>> {
  const { data, error } = await supabase
    .from('umbrales_alerta')
    .select('id, prioridad, porcentaje_inasistencia, descripcion, activo, updated_at, perfiles(nombres, apellidos)')
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }
  const datos = (data as unknown as FilaUmbral[])
    .map((u): UmbralConfigurado => ({
      id: u.id,
      prioridad: u.prioridad,
      porcentaje: Number(u.porcentaje_inasistencia),
      descripcion: u.descripcion,
      activo: u.activo,
      actualizadoEn: u.updated_at,
      actualizadoPor: nombre(u.perfiles),
    }))
    .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad])
  return { ok: true, datos }
}

export interface CambioUmbral {
  id: number
  porcentaje: number
  descripcion: string
  activo: boolean
}

/** RF17 — Guarda los umbrales modificados (cada cambio queda en la bitácora por trigger) */
export async function guardarUmbrales(cambios: CambioUmbral[], usuarioId: string): Promise<Resultado> {
  for (const c of cambios) {
    const { error } = await supabase
      .from('umbrales_alerta')
      .update({ porcentaje_inasistencia: c.porcentaje, descripcion: c.descripcion.trim() || null, activo: c.activo, actualizado_por: usuarioId })
      .eq('id', c.id)
    if (error) {
      return {
        ok: false,
        mensaje: traducirErrorBD(error, {
          umbrales_alerta_porcentaje_inasistencia_check: 'Cada porcentaje debe ser mayor que 0 y como máximo 100.',
        }),
      }
    }
  }
  return { ok: true, datos: undefined }
}
