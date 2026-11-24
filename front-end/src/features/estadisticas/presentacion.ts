import type { FichaResumen } from '@/features/fichas/servicioFichas'
import { nivelCumplimiento } from '@/features/instructores/presentacion'
import { ETIQUETA_JORNADA, type Tono } from '@/types/dominio'
import type { AsistenciaCorte, DatosEstadisticas, MatriculaCorte, SesionCorte } from './servicioEstadisticas'

/**
 * Cálculos de Estadísticas por corte académico (RF14, RF15, RF20). Mismas fórmulas que las vistas de la BD:
 * % asistencia = (presentes + justificadas) / registros; cumplimiento = sesiones ejecutadas / no canceladas vencidas.
 */

// ---------------------------------------------------------------------
// Cortes (semestres): Ene–Jun = I, Jul–Dic = II
// ---------------------------------------------------------------------
export interface Corte {
  clave: string
  etiqueta: string
  desde: string
  hasta: string
}

export function crearCorte(anio: number, semestre: 1 | 2): Corte {
  return {
    clave: `${anio}-${semestre === 1 ? 'I' : 'II'}`,
    etiqueta: `${anio}-${semestre === 1 ? 'I' : 'II'}`,
    desde: `${anio}-${semestre === 1 ? '01-01' : '07-01'}`,
    hasta: `${anio}-${semestre === 1 ? '06-30' : '12-31'}`,
  }
}

export function corteDeFecha(fecha: Date): Corte {
  return crearCorte(fecha.getFullYear(), fecha.getMonth() < 6 ? 1 : 2)
}

export function corteAnterior(c: Corte): Corte {
  const [a, s] = c.clave.split('-')
  return s === 'II' ? crearCorte(Number(a), 1) : crearCorte(Number(a) - 1, 2)
}

export function corteDeClave(clave: string): Corte | null {
  const m = /^(\d{4})-(I|II)$/.exec(clave)
  return m ? crearCorte(Number(m[1]), m[2] === 'I' ? 1 : 2) : null
}

/** El corte actual y los anteriores (selector del banner) */
export function cortesDisponibles(n = 6): Corte[] {
  const lista = [corteDeFecha(new Date())]
  while (lista.length < n) lista.push(corteAnterior(lista[lista.length - 1]))
  return lista
}

const enCorte = <T extends { fecha: string }>(lista: T[], c: Corte) => lista.filter((x) => x.fecha >= c.desde && x.fecha <= c.hasta)

// ---------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------
export interface Distribucion {
  total: number
  presentes: number
  justificadas: number
  ausentes: number
}

export function distribucion(asistencias: AsistenciaCorte[]): Distribucion {
  return {
    total: asistencias.length,
    presentes: asistencias.filter((a) => a.estado === 'presente').length,
    justificadas: asistencias.filter((a) => a.estado === 'justificada').length,
    ausentes: asistencias.filter((a) => a.estado === 'ausente').length,
  }
}

export const porcentajeAsistencia = (d: Distribucion) => (d.total ? ((d.presentes + d.justificadas) * 100) / d.total : null)

export interface Registro {
  vencidas: number
  ejecutadas: number
  pendientes: number
  canceladas: number
}

export function registro(sesiones: SesionCorte[], hoy: string): Registro {
  const vencidas = sesiones.filter((s) => s.estado !== 'cancelada' && s.fecha <= hoy)
  return {
    vencidas: vencidas.length,
    ejecutadas: vencidas.filter((s) => s.estado === 'ejecutada').length,
    pendientes: vencidas.filter((s) => s.estado === 'programada').length,
    canceladas: sesiones.filter((s) => s.estado === 'cancelada').length,
  }
}

export const porcentajeCumplimiento = (r: Registro) => (r.vencidas ? (r.ejecutadas * 100) / r.vencidas : null)

const CIERRES = new Set(['desertor', 'retirado'])

export interface Desercion {
  /** Matrículas cerradas en el corte (desertor + retirado) */
  desertores: number
  soloDesertores: number
  retirados: number
  /** Matrículas vigentes en el corte */
  base: number
  tasa: number | null
}

/** Deserción del corte: matrículas que pasaron a desertor/retirado en el corte, sobre las vigentes en el corte */
export function desercion(matriculas: MatriculaCorte[], c: Corte): Desercion {
  const vigentes = matriculas.filter((m) => m.fechaMatricula <= c.hasta && !(m.estado !== 'matriculado' && m.actualizada < c.desde))
  const cerradas = vigentes.filter((m) => CIERRES.has(m.estado) && m.actualizada >= c.desde && m.actualizada <= c.hasta)
  const soloDesertores = cerradas.filter((m) => m.estado === 'desertor').length
  return {
    desertores: cerradas.length,
    soloDesertores,
    retirados: cerradas.length - soloDesertores,
    base: vigentes.length,
    tasa: vigentes.length ? (cerradas.length * 100) / vigentes.length : null,
  }
}

export interface ResumenCorte {
  asistencia: number | null
  cumplimiento: number | null
  desercion: number | null
  fichasConDatos: number
}

export function resumenCorte(d: DatosEstadisticas, c: Corte, hoy: string): ResumenCorte {
  const asistencias = enCorte(d.asistencias, c)
  return {
    asistencia: porcentajeAsistencia(distribucion(asistencias)),
    cumplimiento: porcentajeCumplimiento(registro(enCorte(d.sesiones, c), hoy)),
    desercion: desercion(d.matriculas, c).tasa,
    fichasConDatos: new Set(asistencias.map((a) => a.fichaId)).size,
  }
}

// ---------------------------------------------------------------------
// Dimensiones: ficha, sede, área, programa, jornada, competencia
// ---------------------------------------------------------------------
export type Dimension = 'ficha' | 'sede' | 'area' | 'programa' | 'jornada' | 'competencia'
export type Estadistica = 'asistencia' | 'registro' | 'desercion'

export const ETIQUETA_DIMENSION: Record<Dimension, string> = {
  ficha: 'Ficha',
  sede: 'Sede',
  area: 'Área',
  programa: 'Programa',
  jornada: 'Jornada',
  competencia: 'Competencia',
}
export const ETIQUETA_DIMENSION_PLURAL: Record<Dimension, string> = {
  ficha: 'Fichas',
  sede: 'Sedes',
  area: 'Áreas',
  programa: 'Programas',
  jornada: 'Jornadas',
  competencia: 'Competencias',
}
export const ETIQUETA_ESTADISTICA: Record<Estadistica, string> = { asistencia: 'Asistencia', registro: 'Registro de asistencia (cumplimiento)', desercion: 'Deserción' }
/** En deserción un valor menor es mejor */
export const menorEsMejor = (est: Estadistica) => est === 'desercion'

export interface FiltrosFicha {
  sede: string
  area: string
  programa: string
  jornada: string
}

export const cumpleFiltros = (f: FichaResumen, filtros: FiltrosFicha) =>
  (!filtros.sede || String(f.sedeId) === filtros.sede) &&
  (!filtros.area || String(f.areaId) === filtros.area) &&
  (!filtros.programa || String(f.programaId) === filtros.programa) &&
  (!filtros.jornada || f.jornada === filtros.jornada)

/** Clave y nombre del elemento al que pertenece una ficha en cada dimensión */
function grupoDeFicha(f: FichaResumen, dim: Exclude<Dimension, 'competencia'>): [string, string] {
  switch (dim) {
    case 'ficha':
      return [String(f.id), `${f.numero} — ${f.programa}`]
    case 'sede':
      return [String(f.sedeId), f.sede]
    case 'area':
      return [String(f.areaId), f.area]
    case 'programa':
      return [String(f.programaId), f.programa]
    case 'jornada':
      return [f.jornada, ETIQUETA_JORNADA[f.jornada]]
  }
}

export interface Elemento {
  clave: string
  nombre: string
  fichas: FichaResumen[]
  distribucion: Distribucion
  registro: Registro
  /** Por competencia no aplica (las matrículas son de la ficha): queda en null */
  desercion: Desercion | null
}

/** Agrupa las asistencias y sesiones del corte por la dimensión elegida (solo fichas que cumplen los filtros) */
export function elementos(d: DatosEstadisticas, c: Corte, dim: Dimension, filtros: FiltrosFicha, hoy: string): Elemento[] {
  const fichas = d.fichas.filter((f) => cumpleFiltros(f, filtros))
  const porId = new Map(fichas.map((f) => [f.id, f]))
  const asistencias = enCorte(d.asistencias, c).filter((a) => porId.has(a.fichaId))
  const sesiones = enCorte(d.sesiones, c).filter((s) => porId.has(s.fichaId))

  const grupos = new Map<string, { nombre: string; fichas: Set<FichaResumen>; asistencias: AsistenciaCorte[]; sesiones: SesionCorte[]; matriculas: MatriculaCorte[] }>()
  const grupo = (clave: string, nombre: string) => {
    let g = grupos.get(clave)
    if (!g) grupos.set(clave, (g = { nombre, fichas: new Set(), asistencias: [], sesiones: [], matriculas: [] }))
    return g
  }
  const claveDe = (fichaId: number, competenciaId: number): [string, string] =>
    dim === 'competencia' ? [String(competenciaId), d.competencias.get(competenciaId) ?? `Competencia ${competenciaId}`] : grupoDeFicha(porId.get(fichaId)!, dim)

  if (dim !== 'competencia') {
    for (const f of fichas.filter((x) => x.estado === 'activa')) grupo(...grupoDeFicha(f, dim)).fichas.add(f)
    for (const m of d.matriculas) {
      const f = porId.get(m.fichaId)
      if (f) grupo(...grupoDeFicha(f, dim)).matriculas.push(m)
    }
  }
  for (const a of asistencias) {
    const g = grupo(...claveDe(a.fichaId, a.competenciaId))
    g.asistencias.push(a)
    g.fichas.add(porId.get(a.fichaId)!)
  }
  for (const s of sesiones) {
    const g = grupo(...claveDe(s.fichaId, s.competenciaId))
    g.sesiones.push(s)
    g.fichas.add(porId.get(s.fichaId)!)
  }

  return [...grupos.entries()]
    .map(([clave, g]) => ({
      clave,
      nombre: g.nombre,
      fichas: [...g.fichas],
      distribucion: distribucion(g.asistencias),
      registro: registro(g.sesiones, hoy),
      desercion: dim === 'competencia' ? null : desercion(g.matriculas, c),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
}

/** Valor principal del elemento para la estadística elegida */
export const valorElemento = (e: Elemento, est: Estadistica) =>
  est === 'asistencia' ? porcentajeAsistencia(e.distribucion) : est === 'registro' ? porcentajeCumplimiento(e.registro) : (e.desercion?.tasa ?? null)

/** Las tres partes de la dona (efectiva/justificada/injustificada, ejecutadas/pendientes/canceladas o permanencia/retiros/deserción) */
export function partes(e: Elemento, est: Estadistica): Array<{ etiqueta: string; valor: number; color: string; texto: string }> {
  if (est === 'asistencia') {
    const t = e.distribucion.total || 1
    return [
      { etiqueta: 'Asistencia efectiva', valor: (e.distribucion.presentes * 100) / t, color: 'var(--color-confirmacion)', texto: 'bg-confirmacion' },
      { etiqueta: 'Inasistencia justificada', valor: (e.distribucion.justificadas * 100) / t, color: 'var(--color-advertencia)', texto: 'bg-advertencia' },
      { etiqueta: 'Inasistencia injustificada', valor: (e.distribucion.ausentes * 100) / t, color: 'var(--color-alerta-critica)', texto: 'bg-alerta-critica' },
    ]
  }
  if (est === 'desercion') {
    const d = e.desercion ?? { base: 0, desertores: 0, soloDesertores: 0, retirados: 0 }
    const t = d.base || 1
    return [
      { etiqueta: 'Permanecen en formación', valor: ((d.base - d.desertores) * 100) / t, color: 'var(--color-confirmacion)', texto: 'bg-confirmacion' },
      { etiqueta: 'Retirados', valor: (d.retirados * 100) / t, color: 'var(--color-advertencia)', texto: 'bg-advertencia' },
      { etiqueta: 'Desertores', valor: (d.soloDesertores * 100) / t, color: 'var(--color-alerta-critica)', texto: 'bg-alerta-critica' },
    ]
  }
  const t = e.registro.vencidas + e.registro.canceladas || 1
  return [
    { etiqueta: 'Sesiones con asistencia registrada', valor: (e.registro.ejecutadas * 100) / t, color: 'var(--color-confirmacion)', texto: 'bg-confirmacion' },
    { etiqueta: 'Pendientes de registro', valor: (e.registro.pendientes * 100) / t, color: 'var(--color-advertencia)', texto: 'bg-advertencia' },
    { etiqueta: 'Canceladas', valor: (e.registro.canceladas * 100) / t, color: 'var(--color-alerta-critica)', texto: 'bg-alerta-critica' },
  ]
}

/** Prototipo: verde ≥ 80 "En meta", ámbar ≥ 70 "En seguimiento", rojo < 70 "Crítico" */
export function nivelElemento(v: number | null, est: Estadistica = 'asistencia'): { texto: string; estado: string; tono: Tono } {
  if (v == null) return { texto: 'Sin datos', estado: 'Sin registros en el corte', tono: 'neutro' }
  // Deserción (meta institucional < 5 %): verde < 3, ámbar < 5, rojo ≥ 5
  if (est === 'desercion') {
    if (v < 3) return { texto: 'Baja', estado: 'En meta', tono: 'exito' }
    if (v < 5) return { texto: 'Moderada', estado: 'En seguimiento', tono: 'advertencia' }
    return { texto: 'Alta', estado: 'Requiere atención', tono: 'critico' }
  }
  if (v >= 80) return { texto: 'Alto', estado: 'En meta', tono: 'exito' }
  if (v >= 70) return { texto: 'Moderado', estado: 'En seguimiento', tono: 'advertencia' }
  return { texto: 'Crítico', estado: 'Requiere atención', tono: 'critico' }
}

/** Comparativa global (por ficha, sede, área, programa o jornada) del indicador elegido, con la tendencia frente al corte anterior */
export function comparativa(d: DatosEstadisticas, c: Corte, dim: Exclude<Dimension, 'competencia'>, hoy: string, est: Estadistica = 'asistencia') {
  const sinFiltros = { sede: '', area: '', programa: '', jornada: '' }
  const previos = new Map(elementos(d, corteAnterior(c), dim, sinFiltros, hoy).map((e) => [e.clave, valorElemento(e, est)]))
  return elementos(d, c, dim, sinFiltros, hoy)
    .map((e) => {
      const actual = valorElemento(e, est)
      const previo = previos.get(e.clave) ?? null
      return { clave: e.clave, nombre: e.nombre, valor: actual, tendencia: actual != null && previo != null ? actual - previo : null }
    })
    .filter((x) => x.valor != null)
    .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
}

/** Deserción por programa en el corte (conteos agregados, sin datos de aprendices) */
export function desercionPorPrograma(d: DatosEstadisticas, c: Corte) {
  const fichas = new Map(d.fichas.map((f) => [f.id, f]))
  const porPrograma = new Map<string, MatriculaCorte[]>()
  for (const m of d.matriculas) {
    const f = fichas.get(m.fichaId)
    if (!f) continue
    porPrograma.set(f.programa, [...(porPrograma.get(f.programa) ?? []), m])
  }
  return [...porPrograma.entries()]
    .map(([programa, lista]) => ({ programa, ...desercion(lista, c) }))
    .filter((x) => x.tasa != null)
    .sort((a, b) => (b.tasa ?? 0) - (a.tasa ?? 0))
}

/** Distribución de los instructores por nivel de cumplimiento en el corte (cortes del panel de instructores) */
export function distribucionInstructores(d: DatosEstadisticas, c: Corte, hoy: string) {
  const porInstructor = new Map<string, SesionCorte[]>()
  for (const s of enCorte(d.sesiones, c)) porInstructor.set(s.instructorId, [...(porInstructor.get(s.instructorId) ?? []), s])
  const conteo = { al_dia: 0, seguimiento: 0, critico: 0 }
  for (const lista of porInstructor.values()) {
    const nivel = nivelCumplimiento(porcentajeCumplimiento(registro(lista, hoy)))
    if (nivel !== 'sin_sesiones') conteo[nivel]++
  }
  return { ...conteo, total: conteo.al_dia + conteo.seguimiento + conteo.critico }
}

export function variacionTexto(v: number | null, sufijo = 'vs corte ant.'): string | undefined {
  if (v == null) return undefined
  const r = Math.round(v * 10) / 10
  return `${r > 0 ? '+' : ''}${r.toLocaleString('es-CO')} % ${sufijo}`
}

/** Filas para el CSV de un conjunto de elementos (HU06.3: totales por ficha y competencia, sin datos de aprendices) */
export function filasCSV(lista: Elemento[]) {
  return lista.map((e) => [
    e.nombre,
    e.distribucion.total,
    e.distribucion.presentes,
    e.distribucion.justificadas,
    e.distribucion.ausentes,
    e.distribucion.total ? (((e.distribucion.presentes + e.distribucion.justificadas) * 100) / e.distribucion.total).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '',
    e.registro.vencidas,
    e.registro.ejecutadas,
    e.registro.pendientes,
    e.registro.canceladas,
    e.desercion?.base ?? '',
    e.desercion?.desertores ?? '',
    e.desercion?.tasa?.toLocaleString('es-CO', { maximumFractionDigits: 1 }) ?? '',
  ])
}
export const ENCABEZADOS_CSV = ['Elemento', 'Registros', 'Presentes', 'Justificadas', 'Injustificadas', '% asistencia', 'Sesiones vencidas', 'Ejecutadas', 'Pendientes de registro', 'Canceladas', 'Matrículas vigentes', 'Retirados o desertores', '% deserción']
