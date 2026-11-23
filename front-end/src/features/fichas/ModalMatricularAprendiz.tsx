import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, IdCard, SearchCheck, UserPlus, UsersRound } from 'lucide-react'
import { AvatarIniciales, Button, Input, Modal, ProgressBar, Select } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { ETIQUETA_TIPO_DOCUMENTO, ETIQUETA_VOCERO, opcionesDe, type TipoDocumento, type TipoVocero } from '@/types/dominio'
import { esquemaBusquedaAprendiz, type FormularioBusquedaAprendiz } from './esquemas'
import { hoyISO } from './presentacion'
import { buscarAprendiz, matricularAprendiz, type AprendizEncontrado, type DetalleFicha } from './servicioFichas'

interface PropsMatricular {
  detalle: DetalleFicha
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/**
 * HU02.2 — Matricular un aprendiz en la ficha.
 * Paso 1: se busca por documento entre los usuarios con rol aprendiz. Paso 2: fecha y vocería.
 * Crear la cuenta del aprendiz corresponde a Gestión de usuarios (requiere una Edge Function, Etapa 3).
 */
export function ModalMatricularAprendiz({ detalle, onCerrar, onGuardado }: PropsMatricular) {
  const { ficha, aprendices, capacidadAmbiente } = detalle
  const idBusqueda = useId()
  const [encontrado, setEncontrado] = useState<AprendizEncontrado | null>(null)
  const [mensajeBusqueda, setMensajeBusqueda] = useState<string | null>(null)
  const [fecha, setFecha] = useState(hoyISO())
  const [vocero, setVocero] = useState<TipoVocero>('ninguno')
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormularioBusquedaAprendiz>({
    resolver: zodResolver(esquemaBusquedaAprendiz),
    defaultValues: { tipoDocumento: 'CC', numeroDocumento: '' },
  })

  const matriculados = aprendices.filter((a) => a.estado === 'matriculado').length
  const tieneTitular = aprendices.some((a) => a.vocero === 'titular')
  const tieneSuplente = aprendices.some((a) => a.vocero === 'suplente')
  const cupoLleno = capacidadAmbiente != null && matriculados >= capacidadAmbiente

  // Bloqueos de negocio que la BD también impone (se explican antes de intentar guardar)
  const bloqueo = !encontrado
    ? null
    : !encontrado.activo
      ? 'La cuenta de este aprendiz está inactiva. Debe reactivarse en Gestión de usuarios antes de matricularlo.'
      : encontrado.fichaActiva?.id === ficha.id
        ? 'El aprendiz ya está matriculado en esta ficha.'
        : encontrado.fichaActiva
          ? `El aprendiz tiene una matrícula activa en la ficha ${encontrado.fichaActiva.numero}. Debe retirarse o aplazarse de esa ficha antes de matricularlo aquí.`
          : null

  async function consultar(v: FormularioBusquedaAprendiz) {
    setEncontrado(null)
    setMensajeBusqueda(null)
    setErrorServidor(null)
    const r = await buscarAprendiz(v.tipoDocumento as TipoDocumento, v.numeroDocumento, ficha.id)
    if (!r.ok) return setMensajeBusqueda(r.mensaje)
    if (!r.datos) return setMensajeBusqueda('No hay un aprendiz registrado con ese documento. Primero debe crearse su cuenta en Gestión de usuarios.')
    setEncontrado(r.datos)
  }

  async function matricular() {
    if (!encontrado || bloqueo) return
    setGuardando(true)
    setErrorServidor(null)
    const r = await matricularAprendiz({ fichaId: ficha.id, aprendiz: encontrado, fechaMatricula: fecha, vocero })
    setGuardando(false)
    if (!r.ok) return setErrorServidor(r.mensaje)
    onGuardado(`${encontrado.nombres} ${encontrado.apellidos} quedó matriculado en la ficha ${ficha.numero}.`)
  }

  const opcionesVocero = opcionesDe(ETIQUETA_VOCERO).filter((o) => (o.valor !== 'titular' || !tieneTitular) && (o.valor !== 'suplente' || !tieneSuplente))

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="lg"
      codigo={`HU02.2 · Ficha ${ficha.numero}`}
      titulo="Matricular aprendiz"
      descripcion={`Vinculación de aprendices a ${ficha.programa}.`}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button icono={<CircleCheck className="size-4" aria-hidden />} onClick={matricular} cargando={guardando} disabled={!encontrado || !!bloqueo || !fecha}>
            {encontrado?.matriculaPrevia ? 'Reactivar matrícula' : 'Matricular aprendiz'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Cupo */}
        <div className="rounded-xl border border-borde bg-fondo-seccion-alterna p-4">
          <p className="flex items-center gap-2 text-sm text-texto-apoyo">
            <UsersRound className="size-4 text-primario" aria-hidden />
            Cupo de formación: <strong className="text-texto-principal">{matriculados} matriculados</strong>
            {capacidadAmbiente != null && <span>(capacidad del ambiente: {capacidadAmbiente})</span>}
          </p>
          {capacidadAmbiente != null && (
            <ProgressBar className="mt-2" valor={(matriculados / capacidadAmbiente) * 100} tono={cupoLleno ? 'critico' : 'primario'} etiqueta="Ocupación del cupo de la ficha" />
          )}
        </div>
        {cupoLleno && <Aviso tipo="error">La ficha alcanzó la capacidad de su ambiente. Puede matricular, pero verifique el cupo con la coordinación.</Aviso>}

        {/* Paso 1 */}
        <form id={idBusqueda} noValidate onSubmit={handleSubmit(consultar)} className="space-y-3">
          <p className="flex items-center justify-between font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">
            <span className="flex items-center gap-2">
              <SearchCheck className="size-4 text-primario" aria-hidden /> Validación de identidad
            </span>
            <span className="text-xs font-normal tracking-normal text-texto-secundario normal-case">Paso 1 de 2</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
            <Select etiqueta="Tipo de documento" requerido opciones={opcionesDe(ETIQUETA_TIPO_DOCUMENTO)} error={errors.tipoDocumento?.message} {...register('tipoDocumento')} />
            <Input
              etiqueta="Número de documento"
              requerido
              inputMode="numeric"
              placeholder="Ej: 1024567890"
              iconoIzquierda={<IdCard className="size-4" />}
              error={errors.numeroDocumento?.message}
              {...register('numeroDocumento')}
            />
            <Button type="submit" variante="secundario" className="sm:mt-[26px]" cargando={isSubmitting}>
              Consultar
            </Button>
          </div>
          {mensajeBusqueda && <Aviso tipo="error">{mensajeBusqueda}</Aviso>}
        </form>

        {/* Paso 2 */}
        {encontrado && (
          <section className="space-y-4 border-t border-borde pt-5" aria-label="Datos de la matrícula">
            <p className="flex items-center justify-between font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">
              <span className="flex items-center gap-2">
                <UserPlus className="size-4 text-primario" aria-hidden /> Datos de la matrícula
              </span>
              <span className="text-xs font-normal tracking-normal text-texto-secundario normal-case">Paso 2 de 2</span>
            </p>
            <div className="flex items-center gap-3 rounded-xl border border-confirmacion/25 bg-confirmacion/5 p-3">
              <AvatarIniciales nombres={encontrado.nombres} apellidos={encontrado.apellidos} tono="exito" />
              <div className="min-w-0">
                <p className="font-semibold text-texto-principal">
                  {encontrado.nombres} {encontrado.apellidos}
                </p>
                <p className="truncate text-xs text-texto-secundario">{encontrado.correo}</p>
                {encontrado.matriculaPrevia && (
                  <p className="text-xs font-semibold text-informacion">Tuvo una matrícula previa en esta ficha: se reactivará.</p>
                )}
              </div>
            </div>
            {bloqueo ? (
              <Aviso tipo="error">{bloqueo}</Aviso>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input etiqueta="Fecha de matrícula" type="date" requerido value={fecha} onChange={(e) => setFecha(e.target.value)} />
                <Select
                  etiqueta="Vocería"
                  opciones={opcionesVocero}
                  value={vocero}
                  onChange={(e) => setVocero(e.target.value as TipoVocero)}
                  ayuda={tieneTitular && tieneSuplente ? 'La ficha ya tiene vocero titular y suplente.' : undefined}
                />
              </div>
            )}
            {errorServidor && <Aviso tipo="error">{errorServidor}</Aviso>}
          </section>
        )}
      </div>
    </Modal>
  )
}
