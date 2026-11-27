import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { BarChart3, CalendarCheck, FileSearch, PencilLine, RotateCcw, Siren, TriangleAlert, UsersRound } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Button, Card, clasesBoton, EmptyState, EstadoError, KpiCard, ModalConfirmacion, Spinner, Tabs, type Pestana } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { useCarga } from '@/lib/useCarga'
import { porcentaje } from '@/lib/utilidades'
import { ModalAsignarInstructor } from '@/pages/admin/fichas/ModalAsignarInstructor'
import { ModalFormularioFicha } from '@/pages/admin/fichas/ModalFormularioFicha'
import { ModalMatricularAprendiz } from '@/features/fichas/ModalMatricularAprendiz'
import { riesgoAprendiz } from '@/features/fichas/presentacion'
import { EncabezadoFicha } from '@/features/fichas/EncabezadoFicha'
import { ModalEstadoMatricula } from '@/features/fichas/ModalEstadoMatricula'
import { InformacionGeneral, ListaAprendices, ListaCompetencias, ListaInstructores, PanelLateral } from '@/features/fichas/SeccionesDetalle'
import {
  cambiarEstadoFicha,
  obtenerCatalogos,
  obtenerDetalleFicha,
  quitarAsignacion,
  type AprendizFicha,
  type AsignacionInstructor,
} from '@/features/fichas/servicioFichas'

type Seccion = 'general' | 'instructores' | 'aprendices' | 'competencias'
type Dialogo =
  | { tipo: 'actualizar' }
  | { tipo: 'desactivar' }
  | { tipo: 'reactivar' }
  | { tipo: 'asignar' }
  | { tipo: 'quitar'; asignacion: AsignacionInstructor }
  | { tipo: 'matricular' }
  | { tipo: 'estadoMatricula'; aprendiz: AprendizFicha }
  | null

/** RF06 — Detalle integral de la ficha con navegación por pestañas (Prototipo). HU10.2, HU10.3, HU10.4, HU02.2. */
export function PaginaDetalleFicha() {
  const { id } = useParams()
  const fichaId = Number(id)
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [parametros, setParametros] = useSearchParams()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [aviso, setAviso] = useState<string | null>((ubicacion.state as { aviso?: string } | null)?.aviso ?? null)

  const detalle = useCarga(() => obtenerDetalleFicha(fichaId), [fichaId])
  const catalogos = useCarga(obtenerCatalogos, [])
  const seccion = (parametros.get('pestana') as Seccion | null) ?? 'general'

  function cambiarSeccion(s: Seccion) {
    setParametros(s === 'general' ? {} : { pestana: s }, { replace: true })
  }

  /** Cierra el diálogo, muestra el mensaje y recarga los datos */
  function terminar(mensaje: string) {
    setDialogo(null)
    setAviso(mensaje)
    detalle.recargar()
    // El aviso inicial (tras registrar) no debe reaparecer al recargar la página
    if (ubicacion.state) navegar(ubicacion.pathname + ubicacion.search, { replace: true, state: null })
  }

  const migas = [
    { etiqueta: 'Inicio', ruta: '/admin' },
    { etiqueta: 'Fichas', ruta: '/admin/fichas' },
    { etiqueta: detalle.datos ? `Ficha ${detalle.datos.ficha.numero}` : 'Detalle' },
  ]

  if (!Number.isInteger(fichaId) || fichaId <= 0 || (detalle.datos === null && !detalle.cargando && !detalle.error)) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>
          <EmptyState
            icono={FileSearch}
            titulo="Ficha no encontrada"
            descripcion="La ficha no existe o no tiene permisos para consultarla."
            accion={
              <Link to="/admin/fichas" className={clasesBoton('primario')}>
                Volver al listado de fichas
              </Link>
            }
          />
        </Card>
      </>
    )
  }

  if (detalle.error) {
    return (
      <>
        <Breadcrumbs migas={migas} />
        <Card>
          <EstadoError mensaje={detalle.error} onReintentar={detalle.recargar} />
        </Card>
      </>
    )
  }

  if (!detalle.datos) {
    return (
      <Card>
        <Spinner texto="Cargando ficha…" />
      </Card>
    )
  }

  const d = detalle.datos
  const { ficha } = d
  const editable = ficha.estado !== 'inactiva'
  const matriculados = d.aprendices.filter((a) => a.estado === 'matriculado')
  const riesgos = matriculados.map((a) => riesgoAprendiz(a.porcentajeInasistencia, d.umbrales))
  const moderados = riesgos.filter((r) => r === 'media').length
  const criticos = riesgos.filter((r) => r === 'alta').length
  const instructoresUnicos = new Set(d.instructores.map((i) => i.instructorId)).size

  const pestanas: Pestana<Seccion>[] = [
    { id: 'general', etiqueta: 'Información general' },
    { id: 'instructores', etiqueta: 'Instructores', contador: instructoresUnicos },
    { id: 'aprendices', etiqueta: 'Aprendices', contador: matriculados.length },
    { id: 'competencias', etiqueta: 'Competencias', contador: d.competencias.length },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs migas={migas} />
        <div className="flex flex-wrap gap-2">
          {/* VersionAntigua: "Ver reportes" lleva al historial de reportes de la ficha */}
          <Link to={`/admin/fichas/${ficha.id}/reportes`} className={clasesBoton('secundario')}>
            <BarChart3 className="size-4" aria-hidden /> Ver reportes
          </Link>
          {editable ? (
            <Button variante="secundario" icono={<PencilLine className="size-4" aria-hidden />} onClick={() => setDialogo({ tipo: 'actualizar' })} disabled={!catalogos.datos}>
              Actualizar ficha
            </Button>
          ) : (
            <Button icono={<RotateCcw className="size-4" aria-hidden />} onClick={() => setDialogo({ tipo: 'reactivar' })}>
              Reactivar ficha
            </Button>
          )}
        </div>
      </div>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {!editable && (
        <Aviso tipo="error">Esta ficha está inactiva: no admite nuevas asignaciones ni matrículas. Su información histórica se conserva.</Aviso>
      )}

      <EncabezadoFicha detalle={d} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Aprendices matriculados"
          valor={matriculados.length}
          unidad={d.capacidadAmbiente ? `/ ${d.capacidadAmbiente} cupos` : undefined}
          icono={UsersRound}
          tono="primario"
          progreso={d.capacidadAmbiente ? { valor: (matriculados.length / d.capacidadAmbiente) * 100, etiqueta: 'Ocupación del cupo' } : undefined}
        />
        <KpiCard
          titulo="Asistencia promedio"
          valor={porcentaje(ficha.porcentajeAsistencia)}
          icono={CalendarCheck}
          tono="exito"
          insignia={ficha.porcentajeAsistencia != null ? { texto: ficha.porcentajeAsistencia >= 80 ? 'Meta 80 % superada' : 'Bajo la meta del 80 %', tono: ficha.porcentajeAsistencia >= 80 ? 'exito' : 'advertencia' } : undefined}
          pie={ficha.totalRegistros ? `${ficha.totalRegistros} registros de asistencia` : 'Aún no hay asistencia registrada'}
        />
        <KpiCard titulo="Riesgo moderado" valor={moderados} unidad="en plan de acompañamiento" icono={TriangleAlert} tono="advertencia" />
        <KpiCard titulo="Riesgo crítico" valor={criticos} unidad="requieren citación" icono={Siren} tono="critico" destacada={criticos > 0} />
      </div>

      <Tabs etiqueta="Secciones de la ficha" pestanas={pestanas} activa={seccion} onCambiar={cambiarSeccion} className="bg-fondo-tarjeta shadow-sm" />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]" role="tabpanel" aria-label={pestanas.find((p) => p.id === seccion)?.etiqueta}>
        <div className="min-w-0">
          {seccion === 'general' && <InformacionGeneral detalle={d} />}
          {seccion === 'instructores' && (
            <ListaInstructores detalle={d} editable={editable} onAsignar={() => setDialogo({ tipo: 'asignar' })} onQuitar={(asignacion) => setDialogo({ tipo: 'quitar', asignacion })} />
          )}
          {seccion === 'aprendices' && (
            <ListaAprendices detalle={d} editable={editable} onMatricular={() => setDialogo({ tipo: 'matricular' })} onCambiarEstado={(aprendiz) => setDialogo({ tipo: 'estadoMatricula', aprendiz })} />
          )}
          {seccion === 'competencias' && <ListaCompetencias detalle={d} />}
        </div>
        <PanelLateral detalle={d} onVerAprendices={() => cambiarSeccion('aprendices')} />
      </div>

      {/* Diálogos */}
      {dialogo?.tipo === 'actualizar' && catalogos.datos && (
        <ModalFormularioFicha
          modo="actualizar"
          onCerrar={() => setDialogo(null)}
          catalogos={catalogos.datos}
          detalle={d}
          onGuardado={() => terminar('Los cambios de la ficha se guardaron correctamente.')}
          onDesactivar={() => setDialogo({ tipo: 'desactivar' })}
        />
      )}

      <ModalConfirmacion
        abierto={dialogo?.tipo === 'desactivar'}
        onCerrar={() => setDialogo(null)}
        codigo="HU10.3"
        titulo={`¿Desactivar la ficha ${ficha.numero}?`}
        textoConfirmar="Desactivar ficha"
        peligro
        onConfirmar={async () => {
          const r = await cambiarEstadoFicha(ficha.id, 'inactiva')
          if (!r.ok) return r.mensaje
          terminar('La ficha quedó inactiva. Su información histórica se conserva.')
        }}
      >
        <p>La ficha dejará de estar disponible para nuevos procesos académicos (asignaciones, matrículas y registro de asistencia).</p>
        <p>
          <strong className="text-texto-principal">No se borra ninguna información:</strong> asistencias, justificaciones y reportes se conservan y la ficha se puede reactivar.
        </p>
      </ModalConfirmacion>

      <ModalConfirmacion
        abierto={dialogo?.tipo === 'reactivar'}
        onCerrar={() => setDialogo(null)}
        titulo={`¿Reactivar la ficha ${ficha.numero}?`}
        textoConfirmar="Reactivar ficha"
        onConfirmar={async () => {
          const r = await cambiarEstadoFicha(ficha.id, 'activa')
          if (!r.ok) return r.mensaje
          terminar('La ficha está activa nuevamente.')
        }}
      >
        <p>La ficha volverá a estar disponible para asignaciones, matrículas y registro de asistencia.</p>
      </ModalConfirmacion>

      {dialogo?.tipo === 'quitar' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setDialogo(null)}
          titulo="¿Quitar la asignación?"
          textoConfirmar="Quitar asignación"
          peligro
          onConfirmar={async () => {
            const r = await quitarAsignacion(dialogo.asignacion, ficha, d.instructores)
            if (!r.ok) return r.mensaje
            terminar('La asignación del instructor se quitó de la ficha.')
          }}
        >
          <p>
            {dialogo.asignacion.nombres} {dialogo.asignacion.apellidos} dejará de tener a cargo{' '}
            <strong className="text-texto-principal">{dialogo.asignacion.competencia ?? 'la asignación general'}</strong> en esta ficha.
          </p>
          {ficha.instructorLiderId === dialogo.asignacion.instructorId && d.instructores.filter((i) => i.instructorId === dialogo.asignacion.instructorId).length === 1 && (
            <p className="font-semibold text-alerta-critica">Es el instructor líder: la ficha quedará sin líder y se generará una alerta.</p>
          )}
        </ModalConfirmacion>
      )}

      {dialogo?.tipo === 'asignar' && (
        <ModalAsignarInstructor detalle={d} onCerrar={() => setDialogo(null)} onGuardado={() => terminar('El instructor quedó asignado a la ficha.')} />
      )}

      {dialogo?.tipo === 'matricular' && <ModalMatricularAprendiz detalle={d} onCerrar={() => setDialogo(null)} onGuardado={terminar} />}

      {dialogo?.tipo === 'estadoMatricula' && (
        <ModalEstadoMatricula aprendiz={dialogo.aprendiz} onCerrar={() => setDialogo(null)} onGuardado={terminar} />
      )}
    </>
  )
}
