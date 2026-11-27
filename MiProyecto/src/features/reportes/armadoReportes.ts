import type { Resultado } from '@/lib/resultado'
import { descargarCSV } from '@/lib/csv'
import { fechaISOaTexto, riesgoAprendiz } from '@/features/fichas/presentacion'
import { obtenerDetalleFicha } from '@/features/fichas/servicioFichas'
import { NIVEL_CUMPLIMIENTO, nivelCumplimiento } from '@/features/instructores/presentacion'
import { listarInstructores, obtenerPerfilInstructor } from '@/features/instructores/servicioInstructores'
import {
  desercion,
  distribucion,
  elementos,
  porcentajeAsistencia,
  porcentajeCumplimiento,
  registro,
  type Corte,
} from '@/features/estadisticas/presentacion'
import { obtenerDatosEstadisticas } from '@/features/estadisticas/servicioEstadisticas'
import { porcentaje } from '@/lib/utilidades'
import { ETIQUETA_JORNADA, ETIQUETA_MODALIDAD } from '@/types/dominio'
import type { EstadisticaReporte, Reporte } from './servicioReportes'

/**
 * Arma el contenido de un reporte a partir de sus parámetros (decisión del usuario: no se guarda el archivo).
 * La estructura sigue las hojas de VersionAntigua (reporte-ficha-ejemplo.html, reporte-instructor-ejemplo.html):
 * datos de cabecera, tarjetas de resumen y tablas. La misma estructura sirve para la hoja imprimible y el CSV.
 * Solo totales por ficha: ningún reporte lista aprendices.
 */

export interface TablaReporte {
  titulo: string
  encabezados: string[]
  filas: string[][]
}

export interface ContenidoReporte {
  titulo: string
  seccionDatos: string
  datos: Array<[string, string]>
  seccionResumen: string
  resumen: Array<{ valor: string; etiqueta: string }>
  tablas: TablaReporte[]
}

export const ETIQUETA_ESTADISTICA_REPORTE: Record<EstadisticaReporte, string> = {
  sede: 'Asistencia por sede',
  area: 'Asistencia por área',
  programa: 'Asistencia por programa',
  jornada: 'Asistencia por jornada',
  desercion: 'Deserción de aprendices',
  cumplimiento: 'Cumplimiento de instructores',
}

const periodo = (r: Pick<Reporte, 'desde' | 'hasta'>): Corte => ({ clave: 'periodo', etiqueta: '', desde: r.desde, hasta: r.hasta })
const hoy = () => new Date().toISOString().slice(0, 10)
const sinFiltros = { sede: '', area: '', programa: '', jornada: '' }
const pct = (v: number | null, d = 1) => porcentaje(v, d)

async function reporteFicha(r: Reporte): Promise<Resultado<ContenidoReporte>> {
  if (!r.fichaId) return { ok: false, mensaje: 'El reporte no tiene ficha asociada.' }
  const [detalle, datos] = await Promise.all([obtenerDetalleFicha(r.fichaId), obtenerDatosEstadisticas(r.desde, r.hasta, { fichaId: r.fichaId })])
  if (!detalle.ok) return detalle
  if (!detalle.datos) return { ok: false, mensaje: 'La ficha del reporte ya no existe.' }
  if (!datos.ok) return datos
  const { ficha, aprendices, competencias, umbrales } = detalle.datos
  const c = periodo(r)
  const d = distribucion(datos.datos.asistencias)
  const matriculados = aprendices.filter((a) => a.estado === 'matriculado')
  const enRiesgo = matriculados.filter((a) => riesgoAprendiz(a.porcentajeInasistencia, umbrales)).length
  const porCompetencia = new Map(elementos({ ...datos.datos, fichas: [ficha] }, c, 'competencia', sinFiltros, hoy()).map((e) => [e.clave, e]))

  return {
    ok: true,
    datos: {
      titulo: 'Reporte de ficha',
      seccionDatos: 'Datos de la ficha',
      datos: [
        ['Número de ficha', ficha.numero],
        ['Programa', ficha.programa],
        ['Sede', ficha.sede],
        ['Ambiente', ficha.ambiente ?? 'Sin ambiente'],
        ['Jornada', ETIQUETA_JORNADA[ficha.jornada]],
        ['Modalidad', ETIQUETA_MODALIDAD[ficha.modalidad]],
        ['Instructor líder', ficha.instructorLider ?? 'Sin asignar'],
        ['Aprendices activos', String(ficha.aprendicesActivos)],
        ['Fecha de inicio', fechaISOaTexto(ficha.fechaInicio)],
        ['Fecha fin', fechaISOaTexto(ficha.fechaFin)],
      ],
      seccionResumen: 'Resumen de asistencia del periodo',
      resumen: [
        { valor: pct(porcentajeAsistencia(d)), etiqueta: 'Asistencia' },
        { valor: pct(d.total ? (d.justificadas * 100) / d.total : null), etiqueta: 'Inasistencia justificada' },
        { valor: pct(d.total ? (d.ausentes * 100) / d.total : null), etiqueta: 'Inasistencia sin justificar' },
        { valor: pct(aprendices.length ? (matriculados.length * 100) / aprendices.length : null), etiqueta: 'Permanencia del grupo' },
        { valor: String(enRiesgo), etiqueta: 'Aprendices en riesgo de deserción' },
      ],
      tablas: [
        {
          titulo: 'Competencias en curso',
          encabezados: ['Competencia', 'Instructor', 'Sesiones en el periodo', 'Asistencia en el periodo'],
          filas: competencias.map((comp) => {
            const e = porCompetencia.get(String(comp.id))
            return [comp.nombre, comp.instructores.join(', ') || 'Sin asignar', String(e?.registro.ejecutadas ?? 0), pct(e ? porcentajeAsistencia(e.distribucion) : null)]
          }),
        },
      ],
    },
  }
}

async function reporteInstructor(r: Reporte): Promise<Resultado<ContenidoReporte>> {
  if (!r.instructorId) return { ok: false, mensaje: 'El reporte no tiene instructor asociado.' }
  const [perfil, datos] = await Promise.all([obtenerPerfilInstructor(r.instructorId), obtenerDatosEstadisticas(r.desde, r.hasta, { instructorId: r.instructorId })])
  if (!perfil.ok) return perfil
  if (!perfil.datos) return { ok: false, mensaje: 'El instructor del reporte ya no existe.' }
  if (!datos.ok) return datos
  const i = perfil.datos.instructor
  const c = periodo(r)
  const asistencias = datos.datos.asistencias.filter((a) => a.fecha >= c.desde && a.fecha <= c.hasta)
  const sesiones = datos.datos.sesiones.filter((s) => s.fecha >= c.desde && s.fecha <= c.hasta)

  return {
    ok: true,
    datos: {
      titulo: 'Reporte de desempeño de instructor',
      seccionDatos: 'Datos del instructor',
      datos: [
        ['Nombre', `${i.nombres} ${i.apellidos}`],
        ['Documento', `${i.tipoDocumento} ${i.numeroDocumento}`],
        ['Correo electrónico', i.correo],
        ['Teléfono', i.telefono ?? '—'],
        ['Área', i.area ?? '—'],
        ['Sede', i.sede ?? '—'],
        ['Fichas asignadas', i.fichas.map((f) => f.numero).join(', ') || 'Ninguna'],
      ],
      seccionResumen: 'Resumen de desempeño del periodo',
      resumen: [
        { valor: pct(porcentajeCumplimiento(registro(sesiones, hoy()))), etiqueta: 'Tasa de cumplimiento' },
        { valor: pct(porcentajeAsistencia(distribucion(asistencias))), etiqueta: 'Asistencia de aprendices' },
        { valor: String(i.fichas.length), etiqueta: 'Fichas asignadas' },
      ],
      tablas: [
        {
          titulo: 'Detalle por ficha',
          encabezados: ['Ficha', 'Programa', 'Asistencia', 'Cumplimiento'],
          filas: i.fichas.map((f) => [
            f.numero,
            f.programa,
            pct(porcentajeAsistencia(distribucion(asistencias.filter((a) => a.fichaId === f.id)))),
            pct(porcentajeCumplimiento(registro(sesiones.filter((s) => s.fichaId === f.id), hoy()))),
          ]),
        },
      ],
    },
  }
}

async function reporteEstadisticas(r: Reporte): Promise<Resultado<ContenidoReporte>> {
  const est: EstadisticaReporte = r.parametros.estadistica ?? (r.tipo === 'desercion' ? 'desercion' : r.tipo === 'cumplimiento_instructores' ? 'cumplimiento' : 'sede')
  const datos = await obtenerDatosEstadisticas(r.desde, r.hasta)
  if (!datos.ok) return datos
  const c = periodo(r)
  const base = { titulo: `Reporte de estadísticas — ${ETIQUETA_ESTADISTICA_REPORTE[est]}`, seccionDatos: 'Parámetros del reporte', datos: [['Tipo de estadística', ETIQUETA_ESTADISTICA_REPORTE[est]]] as Array<[string, string]> }

  if (est === 'desercion') {
    const porPrograma = new Map<string, typeof datos.datos.matriculas>()
    const fichas = new Map(datos.datos.fichas.map((f) => [f.id, f]))
    for (const m of datos.datos.matriculas) {
      const f = fichas.get(m.fichaId)
      if (f) porPrograma.set(f.programa, [...(porPrograma.get(f.programa) ?? []), m])
    }
    const total = desercion(datos.datos.matriculas, c)
    return {
      ok: true,
      datos: {
        ...base,
        seccionResumen: 'Indicadores generales',
        resumen: [
          { valor: pct(total.tasa), etiqueta: 'Tasa de deserción' },
          { valor: String(total.desertores), etiqueta: 'Matrículas retiradas o desertoras' },
          { valor: String(total.base), etiqueta: 'Matrículas vigentes' },
        ],
        tablas: [
          {
            titulo: 'Deserción por programa',
            encabezados: ['Programa', 'Matrículas vigentes', 'Retiradas o desertoras', 'Tasa de deserción'],
            filas: [...porPrograma.entries()].map(([programa, lista]) => {
              const x = desercion(lista, c)
              return [programa, String(x.base), String(x.desertores), pct(x.tasa)]
            }),
          },
        ],
      },
    }
  }

  if (est === 'cumplimiento') {
    const instructores = await listarInstructores()
    if (!instructores.ok) return instructores
    const nombres = new Map(instructores.datos.map((i) => [i.id, `${i.nombres} ${i.apellidos}`]))
    const sesiones = datos.datos.sesiones.filter((s) => s.fecha >= c.desde && s.fecha <= c.hasta)
    const porInstructor = new Map<string, typeof sesiones>()
    for (const s of sesiones) porInstructor.set(s.instructorId, [...(porInstructor.get(s.instructorId) ?? []), s])
    const filas = [...porInstructor.entries()].map(([id, lista]) => {
      const reg = registro(lista, hoy())
      const v = porcentajeCumplimiento(reg)
      return [nombres.get(id) ?? 'Instructor', String(reg.vencidas), String(reg.ejecutadas), pct(v), NIVEL_CUMPLIMIENTO[nivelCumplimiento(v)].etiqueta]
    })
    return {
      ok: true,
      datos: {
        ...base,
        seccionResumen: 'Indicadores generales',
        resumen: [
          { valor: pct(porcentajeCumplimiento(registro(sesiones, hoy()))), etiqueta: 'Cumplimiento general' },
          { valor: String(porInstructor.size), etiqueta: 'Instructores con sesiones' },
        ],
        tablas: [{ titulo: 'Cumplimiento por instructor', encabezados: ['Instructor', 'Sesiones vencidas', 'Con asistencia registrada', 'Cumplimiento', 'Nivel'], filas }],
      },
    }
  }

  const lista = elementos(datos.datos, c, est, sinFiltros, hoy()).filter((e) => e.distribucion.total > 0)
  const general = distribucion(datos.datos.asistencias.filter((a) => a.fecha >= c.desde && a.fecha <= c.hasta))
  return {
    ok: true,
    datos: {
      ...base,
      seccionResumen: 'Indicadores generales',
      resumen: [
        { valor: pct(porcentajeAsistencia(general)), etiqueta: 'Asistencia general' },
        { valor: String(general.total), etiqueta: 'Registros de asistencia' },
      ],
      tablas: [
        {
          titulo: ETIQUETA_ESTADISTICA_REPORTE[est],
          encabezados: ['Elemento', 'Fichas', 'Registros', 'Asistencia', 'Inasistencia sin justificar'],
          filas: lista.map((e) => [
            e.nombre,
            String(e.fichas.length),
            String(e.distribucion.total),
            pct(porcentajeAsistencia(e.distribucion)),
            pct(e.distribucion.total ? (e.distribucion.ausentes * 100) / e.distribucion.total : null),
          ]),
        },
      ],
    },
  }
}

export function armarReporte(r: Reporte): Promise<Resultado<ContenidoReporte>> {
  if (r.tipo === 'ficha') return reporteFicha(r)
  if (r.tipo === 'instructor') return reporteInstructor(r)
  return reporteEstadisticas(r)
}

/** CSV del reporte: cabecera, resumen y tablas, una sección debajo de otra */
export function descargarReporteCSV(r: Reporte, c: ContenidoReporte) {
  const filas: string[][] = [
    ['Periodo', `${fechaISOaTexto(r.desde)} — ${fechaISOaTexto(r.hasta)}`],
    ['Generado por', r.generadoPor ?? ''],
    [],
    [c.seccionDatos],
    ...c.datos.map(([k, v]) => [k, v]),
    [],
    [c.seccionResumen],
    ...c.resumen.map((x) => [x.etiqueta, x.valor]),
    ...c.tablas.flatMap((t) => [[], [t.titulo], t.encabezados, ...t.filas]),
  ]
  descargarCSV(`reporte-${r.tipo}-${r.id}`, [`${c.titulo} — ${r.titulo}`], filas)
}
