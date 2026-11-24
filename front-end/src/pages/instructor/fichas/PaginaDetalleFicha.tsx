import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { BarChart3, CalendarCheck, FileSearch, Siren, TriangleAlert, UsersRound } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Card, clasesBoton, EmptyState, EstadoError, KpiCard, ModalConfirmacion, Spinner, Tabs, type Pestana } from '@/components/ui'
import { useSesion } from '@/app/sesionContexto'
import { Aviso } from '@/features/auth/Aviso'
import { EncabezadoFicha } from '@/features/fichas/EncabezadoFicha'
import { ModalMatricularAprendiz } from '@/features/fichas/ModalMatricularAprendiz'
import { riesgoAprendiz } from '@/features/fichas/presentacion'
import { InformacionGeneral, ListaAprendices, ListaCompetencias, ListaInstructores, PanelLateral } from '@/features/fichas/SeccionesDetalle'
import { obtenerDetalleFicha, type AprendizFicha } from '@/features/fichas/servicioFichas'
import { cambiarEstadoUsuario } from '@/features/usuarios/servicioUsuarios'
import { useCarga } from '@/lib/useCarga'
import { porcentaje } from '@/lib/utilidades'

type Seccion = 'general' | 'instructores' | 'aprendices' | 'competencias'
type Dialogo = { tipo: 'matricular' } | { tipo: 'acceso'; aprendiz: AprendizFicha } | null

/**
 * RF06 / RF07 — Detalle de una ficha asignada al instructor. Misma estructura del detalle del Prototipo, sin las
 * funciones del administrador (actualizar, desactivar, asignar instructores). El instructor matricula y registra
 * aprendices (HU02.2), activa o desactiva el acceso (HU02.4) y consulta el
 * historial de cada aprendiz (HU03.5, HU03.6).
 */
export function PaginaDetalleFicha() {
  const { id } = useParams()
  const fichaId = Number(id)
  const navegar = useNavigate()
  const { refrescarNotificaciones } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const ubicacion = useLocation()
  // Aviso que llega desde Registrar aprendiz
  const [aviso, setAviso] = useState<string | null>((ubicacion.state as { aviso?: string } | null)?.aviso ?? null)

  const detalle = useCarga(() => obtenerDetalleFicha(fichaId), [fichaId])
  const seccion = (parametros.get('pestana') as Seccion | null) ?? 'general'
  const cambiarSeccion = (s: Seccion) => setParametros(s === 'general' ? {} : { pestana: s }, { replace: true })

  function terminar(mensaje: string) {
    setDialogo(null)
    setAviso(mensaje)
    detalle.recargar()
    void refrescarNotificaciones()
  }

  const migas = [
    { etiqueta: 'Inicio', ruta: '/instructor' },
    { etiqueta: 'Fichas', ruta: '/instructor/fichas' },
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
            descripcion="La ficha no existe o no está asignada a usted."
            accion={
              <Link to="/instructor/fichas" className={clasesBoton('primario')}>
                Volver a mis fichas
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
  const activa = ficha.estado === 'activa'
  const matriculados = d.aprendices.filter((a) => a.estado === 'matriculado')
  const riesgos = matriculados.map((a) => riesgoAprendiz(a.porcentajeInasistencia, d.umbrales))
  const moderados = riesgos.filter((r) => r === 'media').length
  const criticos = riesgos.filter((r) => r === 'alta').length

  const pestanas: Pestana<Seccion>[] = [
    { id: 'general', etiqueta: 'Información general' },
    { id: 'instructores', etiqueta: 'Instructores', contador: new Set(d.instructores.map((i) => i.instructorId)).size },
    { id: 'aprendices', etiqueta: 'Aprendices', contador: matriculados.length },
    { id: 'competencias', etiqueta: 'Competencias', contador: d.competencias.length },
  ]

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs migas={migas} />
        <div className="flex flex-wrap gap-2">
          <Link to={`/instructor/reportes?ficha=${ficha.id}`} className={clasesBoton('secundario')}>
            <BarChart3 className="size-4" aria-hidden /> Ver reportes
          </Link>
          {activa && (
            <Link to={`/instructor/asistencia?ficha=${ficha.id}`} className={clasesBoton('primario')}>
              <CalendarCheck className="size-4" aria-hidden /> Registrar asistencia
            </Link>
          )}
        </div>
      </div>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {!activa && <Aviso tipo="error">Esta ficha no está activa: no admite matrículas ni registro de asistencia. Su información histórica se conserva.</Aviso>}

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
          {seccion === 'instructores' && <ListaInstructores detalle={d} editable={false} onAsignar={() => undefined} onQuitar={() => undefined} />}
          {seccion === 'aprendices' && (
            <ListaAprendices
              detalle={d}
              editable={activa}
              onMatricular={() => setDialogo({ tipo: 'matricular' })}
              onVerHistorial={(a) => navegar(`/instructor/fichas/${ficha.id}/aprendices/${a.aprendizId}`)}
              onCambiarAcceso={(aprendiz) => setDialogo({ tipo: 'acceso', aprendiz })}
            />
          )}
          {seccion === 'competencias' && <ListaCompetencias detalle={d} />}
        </div>
        <PanelLateral detalle={d} onVerAprendices={() => cambiarSeccion('aprendices')} />
      </div>

      {dialogo?.tipo === 'matricular' && <ModalMatricularAprendiz detalle={d} porInstructor onCerrar={() => setDialogo(null)} onGuardado={terminar} />}
      {dialogo?.tipo === 'acceso' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setDialogo(null)}
          codigo="HU02.4"
          titulo={dialogo.aprendiz.cuentaActiva ? '¿Desactivar el acceso del aprendiz?' : '¿Activar el acceso del aprendiz?'}
          textoConfirmar={dialogo.aprendiz.cuentaActiva ? 'Desactivar acceso' : 'Activar acceso'}
          peligro={dialogo.aprendiz.cuentaActiva}
          onConfirmar={async () => {
            const { aprendiz } = dialogo
            const r = await cambiarEstadoUsuario(aprendiz.aprendizId, aprendiz.cuentaActiva ? 'inactivo' : 'activo')
            if (!r.ok) return r.mensaje
            terminar(`${aprendiz.nombres} ${aprendiz.apellidos} ${aprendiz.cuentaActiva ? 'ya no puede' : 'puede de nuevo'} iniciar sesión en la plataforma.`)
          }}
        >
          <p>
            Aprendiz: <strong className="text-texto-principal">{dialogo.aprendiz.nombres} {dialogo.aprendiz.apellidos}</strong>
          </p>
          {dialogo.aprendiz.cuentaActiva ? (
            <p>No podrá iniciar sesión mientras su acceso esté desactivado. Su historial de asistencia y justificaciones se conserva.</p>
          ) : (
            <p>Podrá volver a iniciar sesión con su correo y contraseña.</p>
          )}
        </ModalConfirmacion>
      )}
    </>
  )
}
