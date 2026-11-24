import { useId, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Ban, CircleCheck, Hash, Lock, Save, ShieldCheck } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import {
  ETIQUETA_ESTADO_FICHA,
  ETIQUETA_JORNADA,
  ETIQUETA_MODALIDAD,
  ETIQUETA_NIVEL,
  opcionesDe,
  type EstadoFicha,
  type Jornada,
  type Modalidad,
} from '@/types/dominio'
import { esquemaActualizarFicha, esquemaRegistrarFicha, type FormularioFicha } from '@/features/fichas/esquemas'
import { actualizarFicha, asignarVocero, registrarFicha, type Catalogos, type DetalleFicha } from '@/features/fichas/servicioFichas'

/** Se monta solo mientras está abierto: cada apertura parte de los datos actuales de la ficha. */
type PropsModalFicha = {
  onCerrar: () => void
  catalogos: Catalogos
} & (
  | { modo: 'registrar'; onGuardado: (idNuevo: number) => void; detalle?: undefined; onDesactivar?: undefined }
  | { modo: 'actualizar'; detalle: DetalleFicha; onGuardado: () => void; onDesactivar: () => void }
)

const VACIO: FormularioFicha = {
  numero: '',
  sedeId: '',
  ambienteId: '',
  programaId: '',
  modalidad: 'presencial',
  jornada: '',
  fechaInicio: '',
  fechaFin: '',
  estado: 'activa',
  instructorLiderId: '',
}

const ESTADOS_REGISTRO: EstadoFicha[] = ['activa', 'en_pausa']

/** HU10.1 Registrar ficha · HU10.2 Actualizar ficha (con acceso a HU10.3 Desactivar). Estructura del Prototipo. */
export function ModalFormularioFicha(props: PropsModalFicha) {
  const { onCerrar, catalogos, modo } = props
  const esRegistro = modo === 'registrar'
  const idFormulario = useId()
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [voceros, setVoceros] = useState(() => {
    const vocero = (tipo: 'titular' | 'suplente') => String(props.detalle?.aprendices.find((a) => a.vocero === tipo)?.matriculaId ?? '')
    return { titular: vocero('titular'), suplente: vocero('suplente') }
  })

  const valoresIniciales = useMemo<FormularioFicha>(() => {
    if (props.modo === 'registrar') return VACIO
    const f = props.detalle.ficha
    return {
      numero: f.numero,
      sedeId: String(f.sedeId),
      ambienteId: f.ambienteId ? String(f.ambienteId) : '',
      programaId: String(f.programaId),
      modalidad: f.modalidad,
      jornada: f.jornada,
      fechaInicio: f.fechaInicio,
      fechaFin: f.fechaFin,
      estado: f.estado,
      instructorLiderId: f.instructorLiderId ?? '',
    }
  }, [props.modo, props.detalle])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormularioFicha>({
    resolver: zodResolver(esRegistro ? esquemaRegistrarFicha : esquemaActualizarFicha),
    defaultValues: valoresIniciales,
  })

  const sedeId = useWatch({ control, name: 'sedeId' })
  const programaId = useWatch({ control, name: 'programaId' })
  const ambienteId = useWatch({ control, name: 'ambienteId' })

  const ambientesSede = catalogos.ambientes.filter((a) => String(a.sedeId) === sedeId)

  const programa = catalogos.programas.find((p) => String(p.id) === programaId)
  const ambiente = catalogos.ambientes.find((a) => String(a.id) === ambienteId)

  // Programas y sedes inactivos solo se muestran si ya están asignados a la ficha
  const opcionesProgramas = catalogos.programas
    .filter((p) => p.activo || String(p.id) === valoresIniciales.programaId)
    .map((p) => ({ valor: String(p.id), etiqueta: `${p.nombre} — Código ${p.codigo}` }))
  const opcionesSedes = catalogos.sedes
    .filter((s) => s.activa || String(s.id) === valoresIniciales.sedeId)
    .map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))
  const opcionesEstado = opcionesDe(ETIQUETA_ESTADO_FICHA).filter((o) => !esRegistro || ESTADOS_REGISTRO.includes(o.valor))

  const lideresPosibles =
    props.modo === 'actualizar'
      ? [...new Map(props.detalle.instructores.map((i) => [i.instructorId, `${i.nombres} ${i.apellidos}`])).entries()]
      : []
  const aprendicesActivos = props.modo === 'actualizar' ? props.detalle.aprendices.filter((a) => a.estado === 'matriculado') : []
  const opcionesAprendices = aprendicesActivos.map((a) => ({ valor: String(a.matriculaId), etiqueta: `${a.nombres} ${a.apellidos} — ${a.numeroDocumento}` }))

  async function guardar(v: FormularioFicha) {
    setErrorServidor(null)
    const datos = {
      programaId: Number(v.programaId),
      sedeId: Number(v.sedeId),
      ambienteId: v.ambienteId ? Number(v.ambienteId) : null,
      jornada: v.jornada as Jornada,
      modalidad: v.modalidad as Modalidad,
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin,
      estado: v.estado as EstadoFicha,
    }

    if (props.modo === 'registrar') {
      const r = await registrarFicha({ ...datos, numero: v.numero })
      if (!r.ok) return setErrorServidor(r.mensaje)
      props.onGuardado(r.datos)
      return
    }

    if (voceros.titular && voceros.titular === voceros.suplente) {
      return setErrorServidor('El vocero titular y el suplente deben ser aprendices distintos.')
    }
    const fichaId = props.detalle.ficha.id
    const r = await actualizarFicha(fichaId, { ...datos, instructorLiderId: v.instructorLiderId || null })
    if (!r.ok) return setErrorServidor(r.mensaje)

    // Vocería (HU10.2): solo se toca si cambió
    for (const tipo of ['titular', 'suplente'] as const) {
      const anterior = String(props.detalle.aprendices.find((a) => a.vocero === tipo)?.matriculaId ?? '')
      if (voceros[tipo] === anterior) continue
      const rv = await asignarVocero(fichaId, tipo, voceros[tipo] ? Number(voceros[tipo]) : null)
      if (!rv.ok) return setErrorServidor(rv.mensaje)
    }
    props.onGuardado()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="xl"
      codigo={esRegistro ? 'HU10.1' : 'HU10.2'}
      titulo={esRegistro ? 'Registrar nueva ficha de formación' : `Actualizar ficha ${props.detalle.ficha.numero}`}
      descripcion={
        esRegistro
          ? 'Diligencie los datos requeridos para abrir una nueva ficha en PuntualiX.'
          : 'Mantenga vigente la información administrativa de la ficha.'
      }
      pie={
        <>
          <p className="mr-auto self-center text-xs text-texto-secundario">
            Los campos marcados con <span className="text-alerta-critica">*</span> son obligatorios.
          </p>
          <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} cargando={isSubmitting} icono={<Save className="size-4" aria-hidden />}>
            {esRegistro ? 'Registrar ficha' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className={esRegistro ? 'grid gap-6 lg:grid-cols-[1fr_280px]' : undefined}>
        <form id={idFormulario} noValidate onSubmit={handleSubmit(guardar)} className="space-y-4">
          {errorServidor && <Aviso tipo="error">{errorServidor}</Aviso>}

          <div className="grid gap-4 sm:grid-cols-2">
            {esRegistro ? (
              <Input
                etiqueta="Número de ficha"
                requerido
                inputMode="numeric"
                placeholder="Ej: 3267541"
                ayuda="Entre 6 y 8 dígitos, único en el sistema."
                iconoIzquierda={<Hash className="size-4" />}
                error={errors.numero?.message}
                {...register('numero')}
              />
            ) : (
              <Input
                etiqueta="Número de ficha"
                disabled
                ayuda="No se puede modificar para preservar la integridad del historial."
                iconoIzquierda={<Lock className="size-4" />}
                {...register('numero')}
              />
            )}
            <Select etiqueta="Sede de formación" requerido placeholder="Seleccione la sede" opciones={opcionesSedes} error={errors.sedeId?.message} {...register('sedeId', { onChange: () => setValue('ambienteId', '') })} />
          </div>

          <Select
            etiqueta="Programa de formación"
            requerido
            placeholder="Seleccione el programa"
            opciones={opcionesProgramas}
            ayuda={programa ? `Nivel de formación: ${ETIQUETA_NIVEL[programa.nivel]}` : undefined}
            error={errors.programaId?.message}
            {...register('programaId')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select etiqueta="Modalidad" requerido opciones={opcionesDe(ETIQUETA_MODALIDAD)} error={errors.modalidad?.message} {...register('modalidad')} />
            <Select etiqueta="Jornada" requerido placeholder="Seleccione la jornada" opciones={opcionesDe(ETIQUETA_JORNADA)} error={errors.jornada?.message} {...register('jornada')} />
            <Input etiqueta="Fecha de inicio" requerido type="date" error={errors.fechaInicio?.message} {...register('fechaInicio')} />
            <Input etiqueta="Fecha de finalización" requerido type="date" error={errors.fechaFin?.message} {...register('fechaFin')} />
            <Select
              etiqueta="Ambiente de aprendizaje"
              placeholder={sedeId ? 'Sin ambiente asignado' : 'Seleccione primero la sede'}
              disabled={!sedeId}
              opciones={ambientesSede.map((a) => ({ valor: String(a.id), etiqueta: a.nombre }))}
              ayuda={ambiente?.capacidad ? `Capacidad: ${ambiente.capacidad} aprendices (cupo de la ficha)` : undefined}
              {...register('ambienteId')}
            />
            <Select
              etiqueta={esRegistro ? 'Estado inicial' : 'Estado de la ficha'}
              requerido
              opciones={opcionesEstado}
              error={errors.estado?.message}
              {...register('estado')}
            />
          </div>

          {props.modo === 'actualizar' && (
            <>
              <Select
                etiqueta="Instructor líder"
                placeholder="Sin instructor líder"
                opciones={lideresPosibles.map(([id, nombre]) => ({ valor: id, etiqueta: nombre }))}
                ayuda={lideresPosibles.length ? 'Solo aparecen los instructores asignados a la ficha.' : 'Asigne primero instructores a la ficha (pestaña Instructores).'}
                disabled={lideresPosibles.length === 0}
                {...register('instructorLiderId')}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  etiqueta="Vocero titular"
                  placeholder="Sin vocero titular"
                  opciones={opcionesAprendices}
                  disabled={opcionesAprendices.length === 0}
                  value={voceros.titular}
                  onChange={(e) => setVoceros((v) => ({ ...v, titular: e.target.value }))}
                />
                <Select
                  etiqueta="Vocero suplente"
                  placeholder="Sin vocero suplente"
                  opciones={opcionesAprendices}
                  disabled={opcionesAprendices.length === 0}
                  value={voceros.suplente}
                  onChange={(e) => setVoceros((v) => ({ ...v, suplente: e.target.value }))}
                />
              </div>

              {props.detalle.ficha.estado !== 'inactiva' && (
                <div className="flex flex-col gap-3 rounded-xl border border-alerta-critica/25 bg-alerta-critica/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-alerta-critica">Desactivar ficha (HU10.3)</p>
                    <p className="text-xs text-texto-apoyo">Impide su uso en nuevos procesos académicos y conserva toda su información histórica.</p>
                  </div>
                  <Button variante="secundario" className="text-alerta-critica" icono={<Ban className="size-4" aria-hidden />} onClick={props.onDesactivar}>
                    Desactivar ficha
                  </Button>
                </div>
              )}
            </>
          )}
        </form>

        {esRegistro && (
          <aside className="space-y-4 rounded-xl border border-borde bg-fondo-seccion-alterna p-4 text-sm" aria-label="Antes de registrar">
            <p className="flex items-center gap-2 font-titulos font-semibold text-texto-principal">
              <ShieldCheck className="size-4 text-primario" aria-hidden /> Antes de registrar
            </p>
            <ul className="space-y-3 text-texto-apoyo">
              {[
                ['Número único', 'El número de ficha debe ser único en el sistema.'],
                ['Programa correcto', 'Verifique que el programa de formación seleccionado sea el correcto.'],
                ['Asignaciones posteriores', 'Después del registro podrá asignar instructores y matricular aprendices.'],
                ['Alertas tempranas', 'Con las asistencias registradas se activan las alertas de deserción de PuntualiX.'],
              ].map(([titulo, texto]) => (
                <li key={titulo} className="flex gap-2">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-confirmacion" aria-hidden />
                  <span>
                    <strong className="text-texto-principal">{titulo}:</strong> {texto}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </Modal>
  )
}
