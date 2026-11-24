import { useState } from 'react'
import { useParams } from 'react-router'
import { CalendarCheck, CalendarX, FileCheck2, History } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, CardHeader, DataTable, EmptyState, EstadoError, KpiCard, Pagination, ProgressBar, Spinner, type Columna } from '@/components/ui'
import { ETIQUETA_RIESGO, fechaISOaTexto, riesgoAprendiz } from '@/features/fichas/presentacion'
import { obtenerDetalleFicha, obtenerHistorialAprendiz, type AsistenciaCompetenciaAprendiz, type RegistroAsistenciaAprendiz } from '@/features/fichas/servicioFichas'
import { useCarga } from '@/lib/useCarga'
import { porcentaje } from '@/lib/utilidades'
import { ETIQUETA_ESTADO_ASISTENCIA, ETIQUETA_ESTADO_MATRICULA, TONO_ESTADO_ASISTENCIA } from '@/types/dominio'

const POR_PAGINA = 10

/**
 * HU03.5 / HU03.6 / HU04.2 / HU04.3 — Historial de asistencia de un aprendiz en una ficha del instructor:
 * indicadores del aprendiz (RF13), comparación por competencia (RF15) y cada registro con su observación.
 */
export function PaginaHistorialAprendiz() {
  const { id, aprendizId = '' } = useParams()
  const fichaId = Number(id)
  const [pagina, setPagina] = useState(1)
  const detalle = useCarga(() => obtenerDetalleFicha(fichaId), [fichaId])
  const historial = useCarga(() => obtenerHistorialAprendiz(fichaId, aprendizId), [fichaId, aprendizId])

  const aprendiz = detalle.datos?.aprendices.find((a) => a.aprendizId === aprendizId)
  const migas = [
    { etiqueta: 'Inicio', ruta: '/instructor' },
    { etiqueta: 'Fichas', ruta: '/instructor/fichas' },
    { etiqueta: detalle.datos ? `Ficha ${detalle.datos.ficha.numero}` : 'Ficha', ruta: `/instructor/fichas/${fichaId}?pestana=aprendices` },
    { etiqueta: 'Historial del aprendiz' },
  ]

  const error = detalle.error ?? historial.error
  if (error) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>
          <EstadoError mensaje={error} onReintentar={() => (detalle.recargar(), historial.recargar())} />
        </Card>
      </>
    )
  }
  if (!detalle.datos || !historial.datos) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>{detalle.cargando || historial.cargando ? <Spinner texto="Cargando historial…" /> : <EmptyState titulo="Ficha no encontrada" descripcion="La ficha no existe o no está asignada a usted." />}</Card>
      </>
    )
  }
  if (!aprendiz) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>
          <EmptyState titulo="Aprendiz no encontrado" descripcion="El aprendiz no está matriculado en esta ficha." />
        </Card>
      </>
    )
  }

  const { competencias, registros } = historial.datos
  const suma = (k: 'presentes' | 'ausencias' | 'justificadas') => competencias.reduce((s, c) => s + c[k], 0)
  const riesgo = riesgoAprendiz(aprendiz.porcentajeInasistencia, detalle.datos.umbrales)
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA))
  const actual = Math.min(pagina, totalPaginas)

  return (
    <>
      <Breadcrumbs migas={migas} />
      <PageHeader
        titulo={`${aprendiz.nombres} ${aprendiz.apellidos}`}
        icono={History}
        insignia={`Ficha ${detalle.datos.ficha.numero} · ${ETIQUETA_ESTADO_MATRICULA[aprendiz.estado]}`}
        descripcion={`Historial de asistencia en ${detalle.datos.ficha.programa}, por competencia y por sesión.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Asistencia"
          valor={porcentaje(aprendiz.porcentajeAsistencia)}
          icono={CalendarCheck}
          tono="exito"
          insignia={riesgo ? { texto: ETIQUETA_RIESGO[riesgo].texto, tono: ETIQUETA_RIESGO[riesgo].tono } : undefined}
          pie={`${aprendiz.totalRegistros} registros de asistencia`}
        />
        <KpiCard titulo="Presente" valor={suma('presentes')} icono={CalendarCheck} tono="primario" pie="Sesiones con asistencia" />
        <KpiCard titulo="Inasistencias" valor={suma('ausencias')} icono={CalendarX} tono="critico" pie={`${porcentaje(aprendiz.porcentajeInasistencia)} sin justificar`} />
        <KpiCard titulo="Justificadas" valor={suma('justificadas')} icono={FileCheck2} tono="informacion" pie="Inasistencias con justificación aprobada" />
      </div>

      <Card>
        <CardHeader titulo="Asistencia por competencia" descripcion="Comparación del aprendiz entre las competencias de la ficha (RF15)." />
        <DataTable titulo="Asistencia por competencia" columnas={COLUMNAS_COMPETENCIA} filas={competencias} claveFila={(c) => c.competenciaId} mensajeVacio="Aún no hay asistencia registrada para este aprendiz." />
      </Card>

      <Card>
        <CardHeader titulo="Registros de asistencia" descripcion="Cada sesión registrada, de la más reciente a la más antigua." />
        <DataTable
          titulo="Registros de asistencia"
          columnas={COLUMNAS_REGISTRO}
          filas={registros.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA)}
          claveFila={(r) => r.id}
          mensajeVacio="Aún no hay asistencia registrada para este aprendiz."
        />
        {registros.length > 0 && (
          <div className="border-t border-borde">
            <Pagination pagina={actual} totalRegistros={registros.length} porPagina={POR_PAGINA} onCambiar={setPagina} nombreRegistros="registros" />
          </div>
        )}
      </Card>
    </>
  )
}

const COLUMNAS_COMPETENCIA: Columna<AsistenciaCompetenciaAprendiz>[] = [
  { clave: 'competencia', encabezado: 'Competencia', celda: (c) => <span className="font-semibold text-texto-principal">{c.competencia}</span> },
  { clave: 'registros', encabezado: 'Registros', alineacion: 'centro', ocultarEnMovil: true, celda: (c) => c.totalRegistros },
  { clave: 'presentes', encabezado: 'Presente', alineacion: 'centro', ocultarEnMovil: true, celda: (c) => c.presentes },
  { clave: 'ausencias', encabezado: 'Ausente', alineacion: 'centro', ocultarEnMovil: true, celda: (c) => c.ausencias },
  { clave: 'justificadas', encabezado: 'Justificada', alineacion: 'centro', ocultarEnMovil: true, celda: (c) => c.justificadas },
  {
    clave: 'porcentaje',
    encabezado: 'Asistencia',
    className: 'min-w-40',
    celda: (c) => (c.porcentajeAsistencia == null ? '—' : <ProgressBar valor={c.porcentajeAsistencia} etiqueta={`Asistencia en ${c.competencia}`} />),
  },
]

const COLUMNAS_REGISTRO: Columna<RegistroAsistenciaAprendiz>[] = [
  { clave: 'fecha', encabezado: 'Fecha', celda: (r) => <span className="whitespace-nowrap">{fechaISOaTexto(r.fecha)}</span> },
  { clave: 'competencia', encabezado: 'Competencia', celda: (r) => r.competencia },
  {
    clave: 'estado',
    encabezado: 'Estado',
    celda: (r) => (
      <Badge tono={TONO_ESTADO_ASISTENCIA[r.estado]} punto conBorde>
        {ETIQUETA_ESTADO_ASISTENCIA[r.estado]}
      </Badge>
    ),
  },
  { clave: 'observacion', encabezado: 'Observación / justificación', ocultarEnMovil: true, celda: (r) => <span className="text-texto-secundario">{r.observacion || '—'}</span> },
]
