import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarCheck, Check, Eraser, FolderOpen, Info, UsersRound } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Card, CardHeader, EmptyState, EstadoError, Input, Select, Spinner } from '@/components/ui'
import { useSesion } from '@/app/sesionContexto'
import { Aviso } from '@/features/auth/Aviso'
import { crearEsquemaSeleccion, MAXIMO_OBSERVACION, type SeleccionAsistencia } from '@/features/asistencia/esquemas'
import {
  aprendicesDeFicha,
  competenciasDelInstructor,
  obtenerSesion,
  registrarAsistencia,
  resultadosDeCompetencia,
  type AprendizAsistencia,
  type OpcionCatalogo,
  type RegistroAsistencia,
  type SesionDelDia,
} from '@/features/asistencia/servicioAsistencia'
import { hoyISO } from '@/features/fichas/presentacion'
import { listarFichas } from '@/features/fichas/servicioFichas'
import { useCarga } from '@/lib/useCarga'
import { ETIQUETA_ESTADO_ASISTENCIA, opcionesDe, type EstadoAsistencia } from '@/types/dominio'

const ESTADOS = opcionesDe(ETIQUETA_ESTADO_ASISTENCIA)
const sinDatos = async <T,>() => ({ ok: true as const, datos: null as T | null })

/**
 * HU03.1–HU03.4 / RF08 / RF09 — Registro de asistencia (VersionAntigua: Instructor/asistencia/asistencia.html).
 * Ficha · Competencia · Resultado de aprendizaje · Fecha, y la tabla Aprendiz · Estado · Observación / Justificación.
 * Si la sesión del día ya tiene asistencia, se carga para corregirla (HU03.4).
 */
export function PaginaAsistencia() {
  const { usuario } = useSesion()
  const [parametros] = useSearchParams()
  const [hoy] = useState(hoyISO)
  const [sel, setSel] = useState<SeleccionAsistencia>({ fichaId: parametros.get('ficha') ?? '', competenciaId: '', resultadoId: '', fecha: hoy })
  const [aviso, setAviso] = useState<string | null>(null)

  const fichas = useCarga(listarFichas, [])
  const activas = useMemo(() => (fichas.datos ?? []).filter((f) => f.estado === 'activa'), [fichas.datos])
  const ficha = activas.find((f) => String(f.id) === sel.fichaId) ?? null
  const fichaId = ficha?.id ?? null
  const competenciaId = sel.competenciaId ? Number(sel.competenciaId) : null

  const competencias = useCarga(
    () => (ficha && usuario ? competenciasDelInstructor(ficha.id, usuario.id, ficha.instructorLiderId === usuario.id, ficha.programaId) : sinDatos<OpcionCatalogo[]>()),
    [fichaId, usuario?.id],
  )
  const resultados = useCarga(() => (competenciaId ? resultadosDeCompetencia(competenciaId) : sinDatos<OpcionCatalogo[]>()), [competenciaId])
  const aprendices = useCarga(() => (fichaId ? aprendicesDeFicha(fichaId) : sinDatos<AprendizAsistencia[]>()), [fichaId])

  const validacion = crearEsquemaSeleccion(hoy, ficha?.fechaInicio ?? null, ficha?.fechaFin ?? null).safeParse(sel)
  const errores = validacion.success ? {} : Object.fromEntries(validacion.error.issues.map((i) => [i.path[0], i.message]))
  const fechaValida = !!sel.fecha && !errores.fecha
  const sesion = useCarga(
    () => (fichaId && competenciaId && fechaValida && usuario ? obtenerSesion(fichaId, competenciaId, sel.fecha, usuario.id) : sinDatos<SesionDelDia>()),
    [fichaId, competenciaId, sel.fecha, fechaValida, usuario?.id],
  )

  function cambiar(cambios: Partial<SeleccionAsistencia>) {
    setAviso(null)
    setSel((s) => {
      const n = { ...s, ...cambios }
      if ('fichaId' in cambios) n.competenciaId = n.resultadoId = ''
      if ('competenciaId' in cambios) n.resultadoId = ''
      return n
    })
  }

  const listo = !!fichaId && !!competenciaId && fechaValida && !!aprendices.datos && !sesion.cargando && !sesion.error
  const errorCarga = fichas.error ?? competencias.error ?? aprendices.error ?? sesion.error ?? resultados.error

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/instructor' }, { etiqueta: 'Asistencia' }]} />
      <PageHeader titulo="Registro de Asistencia" icono={CalendarCheck} descripcion="Toma y corrección de la asistencia de las sesiones de formación de sus fichas." />

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      {fichas.error ? (
        <Card>
          <EstadoError mensaje={fichas.error} onReintentar={fichas.recargar} />
        </Card>
      ) : !fichas.datos ? (
        <Card>
          <Spinner texto="Cargando fichas…" />
        </Card>
      ) : activas.length === 0 ? (
        <Card>
          <EmptyState icono={FolderOpen} titulo="Sin fichas activas" descripcion="No tiene fichas activas a su cargo para registrar asistencia." />
        </Card>
      ) : (
        <Card>
          <CardHeader titulo="Registrar asistencia" descripcion="Selecciona la ficha, competencia y registra la asistencia de los aprendices" />
          <div className="grid gap-3 border-y border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
            <Select
              etiqueta="Ficha"
              placeholder="Seleccionar ficha"
              opciones={activas.map((f) => ({ valor: String(f.id), etiqueta: `${f.numero} — ${f.programa}` }))}
              value={sel.fichaId}
              onChange={(e) => cambiar({ fichaId: e.target.value })}
            />
            <Select
              etiqueta="Competencia"
              placeholder="Seleccionar competencia"
              opciones={(competencias.datos ?? []).map((c) => ({ valor: String(c.id), etiqueta: c.nombre }))}
              value={sel.competenciaId}
              onChange={(e) => cambiar({ competenciaId: e.target.value })}
              disabled={!ficha || competencias.cargando}
              ayuda={ficha && competencias.datos?.length === 0 ? 'No tiene competencias asignadas en esta ficha.' : undefined}
            />
            <Select
              etiqueta="Resultado de aprendizaje"
              placeholder="Seleccionar resultado"
              opciones={(resultados.datos ?? []).map((r) => ({ valor: String(r.id), etiqueta: r.nombre }))}
              value={sel.resultadoId}
              onChange={(e) => cambiar({ resultadoId: e.target.value })}
              disabled={!competenciaId || !resultados.datos?.length}
              ayuda={competenciaId && resultados.datos?.length === 0 ? 'Esta competencia no tiene resultados registrados (opcional).' : undefined}
            />
            <Input
              etiqueta="Fecha"
              type="date"
              max={hoy}
              min={ficha?.fechaInicio}
              value={sel.fecha}
              onChange={(e) => cambiar({ fecha: e.target.value })}
              error={sel.fecha ? (errores.fecha as string | undefined) : undefined}
            />
          </div>

          {errorCarga ? (
            <EstadoError
              mensaje={errorCarga}
              onReintentar={() => {
                competencias.recargar()
                aprendices.recargar()
                sesion.recargar()
              }}
            />
          ) : !ficha || !competenciaId ? (
            <EmptyState icono={Info} titulo="Seleccione la ficha y la competencia" descripcion="Después elija la fecha para cargar la lista de aprendices." compacto />
          ) : !listo ? (
            fechaValida ? <Spinner texto="Cargando aprendices…" /> : <EmptyState titulo="Revise la fecha" descripcion={(errores.fecha as string) ?? ''} compacto />
          ) : aprendices.datos!.length === 0 ? (
            <EmptyState icono={UsersRound} titulo="Sin aprendices matriculados" descripcion="Esta ficha no tiene aprendices matriculados." compacto />
          ) : (
            <TablaAsistencia
              key={`${fichaId}|${competenciaId}|${sel.fecha}|${sesion.datos?.id ?? 'nueva'}`}
              clave={`asistencia:${fichaId}|${competenciaId}|${sel.fecha}`}
              aprendices={aprendices.datos!}
              sesion={sesion.datos}
              onGuardar={async (registros) => {
                const r = await registrarAsistencia({
                  fichaId: fichaId!,
                  competenciaId: competenciaId!,
                  resultadoId: sel.resultadoId ? Number(sel.resultadoId) : null,
                  fecha: sel.fecha,
                  instructorId: usuario!.id,
                  registros,
                  sesion: sesion.datos,
                })
                if (!r.ok) return r.mensaje
                const cuenta = (e: EstadoAsistencia) => registros.filter((x) => x.estado === e).length
                setAviso(
                  `${sesion.datos?.registros.size ? 'Asistencia actualizada' : 'Asistencia registrada'} para la ficha ${ficha.numero} el ${sel.fecha}: ${cuenta('presente')} presentes, ${cuenta('ausente')} ausentes y ${cuenta('justificada')} justificadas.`,
                )
                sesion.recargar()
                return null
              }}
            />
          )}
        </Card>
      )}
    </>
  )
}

interface PropsTabla {
  clave: string
  aprendices: AprendizAsistencia[]
  sesion: SesionDelDia | null
  /** Devuelve el mensaje de error o null si se guardó */
  onGuardar: (registros: RegistroAsistencia[]) => Promise<string | null>
}

/** Valores iniciales: los guardados en la sesión, o "Presente" para todos (VersionAntigua) */
function inicial(aprendices: AprendizAsistencia[], sesion: SesionDelDia | null): Record<string, RegistroAsistencia> {
  return Object.fromEntries(
    aprendices.map((a) => {
      const g = sesion?.registros.get(a.aprendizId)
      return [a.aprendizId, { aprendizId: a.aprendizId, estado: g?.estado ?? 'presente', observacion: g?.observacion ?? '' }]
    }),
  )
}

/** Tabla Aprendiz · Estado · Observación. Lo diligenciado se conserva en sessionStorage hasta guardarlo (RNF4). */
function TablaAsistencia({ clave, aprendices, sesion, onGuardar }: PropsTabla) {
  const base = useMemo(() => inicial(aprendices, sesion), [aprendices, sesion])
  const [valores, setValores] = useState<Record<string, RegistroAsistencia>>(() => {
    try {
      const borrador = JSON.parse(sessionStorage.getItem(clave) ?? 'null') as Record<string, RegistroAsistencia> | null
      return borrador ? { ...base, ...Object.fromEntries(Object.entries(borrador).filter(([id]) => id in base)) } : base
    } catch {
      return base
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const registrada = (sesion?.registros.size ?? 0) > 0

  function actualizar(id: string, cambio: Partial<RegistroAsistencia>) {
    setValores((v) => {
      const n = { ...v, [id]: { ...v[id], ...cambio } }
      sessionStorage.setItem(clave, JSON.stringify(n))
      return n
    })
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const mensaje = await onGuardar(aprendices.map((a) => valores[a.aprendizId]))
    setGuardando(false)
    if (mensaje) return setError(`${mensaje} Lo diligenciado se conserva: puede intentarlo de nuevo.`)
    sessionStorage.removeItem(clave)
  }

  return (
    <>
      {registrada && (
        <div className="px-5 pt-4 sm:px-6">
          <p className="flex items-center gap-2 rounded-xl border border-informacion/25 bg-informacion/5 p-3 text-sm text-texto-apoyo">
            <Info className="size-4 shrink-0 text-informacion" aria-hidden />
            Esta sesión ya tiene asistencia registrada: puede corregirla.
          </p>
        </div>
      )}
      {error && (
        <div className="px-5 pt-4 sm:px-6">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Registro de asistencia de los aprendices</caption>
          <thead className="border-b border-borde bg-fondo-seccion-alterna text-left text-xs font-semibold tracking-wide text-texto-secundario uppercase">
            <tr>
              <th scope="col" className="px-5 py-3 sm:px-6">
                Aprendiz
              </th>
              <th scope="col" className="px-3 py-3">
                Estado
              </th>
              <th scope="col" className="px-5 py-3 sm:px-6">
                Observación / Justificación
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {aprendices.map((a) => {
              const v = valores[a.aprendizId]
              const nombre = `${a.nombres} ${a.apellidos}`
              return (
                <tr key={a.aprendizId}>
                  <td className="px-5 py-2.5 sm:px-6">
                    <p className="font-semibold text-texto-principal">{nombre}</p>
                  </td>
                  <td className="min-w-40 px-3 py-2.5">
                    <Select etiqueta={`Estado de ${nombre}`} etiquetaOculta opciones={ESTADOS} value={v.estado} onChange={(e) => actualizar(a.aprendizId, { estado: e.target.value as EstadoAsistencia })} />
                  </td>
                  <td className="min-w-56 px-5 py-2.5 sm:px-6">
                    <Input
                      etiqueta={`Observación de ${nombre}`}
                      etiquetaOculta
                      maxLength={MAXIMO_OBSERVACION}
                      placeholder={v.estado === 'justificada' ? 'Motivo de justificación' : 'Observación opcional'}
                      value={v.observacion}
                      onChange={(e) => actualizar(a.aprendizId, { observacion: e.target.value })}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-borde px-5 py-4 sm:px-6">
        <Button
          variante="secundario"
          icono={<Eraser className="size-4" aria-hidden />}
          disabled={guardando}
          onClick={() => {
            setValores(base)
            setError(null)
            sessionStorage.removeItem(clave)
          }}
        >
          Cancelar
        </Button>
        <Button icono={<Check className="size-4" aria-hidden />} cargando={guardando} onClick={guardar}>
          {registrada ? 'Guardar cambios' : 'Registrar asistencia'}
        </Button>
      </div>
    </>
  )
}
