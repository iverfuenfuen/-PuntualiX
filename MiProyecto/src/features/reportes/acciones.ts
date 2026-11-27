import { registrarEvento } from '@/features/auth/servicioAuth'
import type { TipoReporte, Tono } from '@/types/dominio'
import { armarReporte, descargarReporteCSV } from './armadoReportes'
import type { Resultado } from '@/lib/resultado'
import { obtenerReporte, registrarReporte, type NuevoReporte, type Reporte } from './servicioReportes'

export const TONO_TIPO_REPORTE: Record<TipoReporte, Tono> = {
  ficha: 'exito',
  instructor: 'informacion',
  aprendiz: 'neutro',
  estadisticas: 'primario',
  desercion: 'critico',
  cumplimiento_instructores: 'informacion',
}

/** Abre la hoja del reporte; con imprimir = true se abre lista para "Guardar como PDF" */
export function abrirHoja(id: number, imprimir = false) {
  window.open(`/admin/reportes/${id}${imprimir ? '?imprimir=1' : ''}`, '_blank', 'noopener')
}

/** Descarga un reporte en su formato: CSV se arma y descarga aquí; PDF abre la hoja imprimible */
export async function descargarReporte(r: Reporte): Promise<string | null> {
  if (r.formato !== 'csv') {
    abrirHoja(r.id, true)
    return null
  }
  const c = await armarReporte(r)
  if (!c.ok) return c.mensaje
  descargarReporteCSV(r, c.datos)
  void registrarEvento('reportes', 'descarga', `Descargó en CSV el reporte REP-${r.id}`)
  return null
}


export type EntregaReporte = 'registrar' | 'pdf' | 'csv'

/**
 * Registra el reporte en el historial y lo entrega: "registrar" solo lo guarda; "pdf" abre la hoja lista para imprimir;
 * "csv" lo descarga. La pestaña del PDF se abre ANTES de esperar a la BD para que el navegador no la bloquee.
 */
export async function generarReporte(nuevo: NuevoReporte, usuarioId: string, entrega: EntregaReporte): Promise<Resultado<number>> {
  const ventana = entrega === 'pdf' ? window.open('', '_blank') : null
  const r = await registrarReporte({ ...nuevo, formato: entrega === 'csv' ? 'csv' : 'pdf' }, usuarioId)
  if (!r.ok) {
    ventana?.close()
    return r
  }
  if (entrega === 'pdf') {
    if (ventana) ventana.location.href = `/admin/reportes/${r.datos}?imprimir=1`
    else abrirHoja(r.datos, true)
  }
  if (entrega === 'csv') {
    const reporte = await obtenerReporte(r.datos)
    if (!reporte.ok) return reporte
    if (reporte.datos) {
      const error = await descargarReporte(reporte.datos)
      if (error) return { ok: false, mensaje: error }
    }
  }
  return r
}
