import { supabase } from '@/lib/supabase'
import { traducirErrorBD, type Resultado } from '@/lib/resultado'
import type { EstadoAlerta, PrioridadAlerta, TipoAlerta } from '@/types/dominio'

/**
 * Servicio de Alertas del administrador (RF16, RF17, HU09.3).
 * El administrador solo se relaciona con las FICHAS: ve las alertas de ficha (inasistencia de la ficha, ficha sin
 * instructor líder). Las alertas individuales de aprendices son del instructor y del aprendiz (HU09.1, HU09.2, HU12.1).
 * Las alertas las genera la BD con triggers según los umbrales; aquí solo se consultan (VersionAntigua: solo lectura).
 */

export const TIPOS_ALERTA_FICHA: TipoAlerta[] = ['riesgo_ficha', 'ficha_sin_lider', 'sesion_sin_registro']
const ACTIVAS: EstadoAlerta[] = ['nueva', 'en_seguimiento']

export interface AlertaFicha {
  id: number
  tipo: TipoAlerta
  prioridad: PrioridadAlerta
  descripcion: string
  /** % de inasistencia de la ficha que la originó (null en "ficha sin líder") */
  porcentaje: number | null
  creadaEn: string
  ficha: {
    id: number
    numero: string
    programa: string
    sedeId: number | null
    instructorLider: string | null
  }
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

type FilaAlerta = {
  id: number
  tipo: TipoAlerta
  prioridad: PrioridadAlerta
  descripcion: string
  porcentaje: number | string | null
  created_at: string
  ficha_id: number
}
type FilaFicha = { id: number; numero: string; programa: string; sede_id: number | null; instructor_lider: string | null }

/** HU09.3 — Alertas activas de las fichas (las más recientes primero) */
export async function listarAlertasFicha(): Promise<Resultado<AlertaFicha[]>> {
  const [alertas, fichas] = await Promise.all([
    supabase
      .from('alertas')
      .select('id, tipo, prioridad, descripcion, porcentaje, created_at, ficha_id')
      .in('tipo', TIPOS_ALERTA_FICHA)
      .in('estado', ACTIVAS)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase.from('v_fichas_resumen').select('id, numero, programa, sede_id, instructor_lider'),
  ])
  const error = alertas.error ?? fichas.error
  if (error) return { ok: false, mensaje: traducirErrorBD(error) }

  const fichasPorId = new Map((fichas.data as FilaFicha[]).map((f) => [f.id, f]))
  const datos = (alertas.data as FilaAlerta[]).map((a): AlertaFicha => {
    const f = fichasPorId.get(a.ficha_id)
    return {
      id: a.id,
      tipo: a.tipo,
      prioridad: a.prioridad,
      descripcion: a.descripcion,
      porcentaje: a.porcentaje == null ? null : Number(a.porcentaje),
      creadaEn: a.created_at,
      ficha: {
        id: a.ficha_id,
        numero: f?.numero ?? String(a.ficha_id),
        programa: f?.programa ?? '',
        sedeId: f?.sede_id ?? null,
        instructorLider: f?.instructor_lider ?? null,
      },
    }
  })
  return { ok: true, datos }
}

/** Al abrir las alertas, las notificaciones propias se dan por leídas (campana del Navbar, HU09.3) */
export async function marcarNotificacionesLeidas(): Promise<void> {
  await supabase.from('notificaciones').update({ leida: true }).eq('leida', false)
}

// ---------------------------------------------------------------------
// Umbrales (RF17: "El administrador podrá configurar los porcentajes utilizados para generar alertas")
// ---------------------------------------------------------------------

type Persona = { nombres: string; apellidos: string } | null
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
      actualizadoPor: u.perfiles ? `${u.perfiles.nombres} ${u.perfiles.apellidos}` : null,
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
