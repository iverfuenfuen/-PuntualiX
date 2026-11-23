import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, Mail, Send, ShieldCheck } from 'lucide-react'
import { Button, EstadoError, Input, Modal, Select, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { useCarga } from '@/lib/useCarga'
import { ETIQUETA_ROL, ETIQUETA_TIPO_DOCUMENTO, opcionesDe, type Rol, type TipoDocumento } from '@/types/dominio'
import { esquemaRegistroUsuario, type FormularioRegistroUsuario } from './esquemas'
import { invitarUsuario } from './servicioUsuarios'

interface PropsRegistrar {
  onCerrar: () => void
  /** Se llama con el id y el correo de la cuenta creada */
  onRegistrado: (usuario: { id: string; correo: string; nombres: string; apellidos: string }) => void
  /** Rol preseleccionado; con rolFijo no se puede cambiar (p. ej. desde Instructores o desde Matricular) */
  rolInicial?: Rol
  rolFijo?: boolean
  documentoInicial?: { tipo: TipoDocumento; numero: string }
}

const CODIGO_HU: Record<Rol, string> = { administrador: 'HU02.3', instructor: 'HU02.1', aprendiz: 'HU02.2' }

/**
 * HU02.1 Registrar instructor · HU02.2 Registrar aprendiz (y administradores).
 * La cuenta se crea por INVITACIÓN: el usuario recibe un correo y elige su contraseña.
 * Se monta solo mientras está abierto.
 */
export function ModalRegistrarUsuario({ onCerrar, onRegistrado, rolInicial = 'instructor', rolFijo, documentoInicial }: PropsRegistrar) {
  const idFormulario = useId()
  const catalogos = useCarga(obtenerCatalogos, [])
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormularioRegistroUsuario>({
    resolver: zodResolver(esquemaRegistroUsuario),
    defaultValues: {
      rol: rolInicial,
      nombres: '',
      apellidos: '',
      tipoDocumento: documentoInicial?.tipo ?? 'CC',
      numeroDocumento: documentoInicial?.numero ?? '',
      correo: '',
      telefono: '',
      sedeId: '',
      areaId: '',
      especialidad: '',
      fechaIngreso: '',
    },
  })
  const rol = useWatch({ control, name: 'rol' }) as Rol

  async function guardar(v: FormularioRegistroUsuario) {
    setErrorServidor(null)
    const r = await invitarUsuario({
      rol: v.rol as Rol,
      nombres: v.nombres,
      apellidos: v.apellidos,
      tipoDocumento: v.tipoDocumento as TipoDocumento,
      numeroDocumento: v.numeroDocumento,
      correo: v.correo,
      telefono: v.telefono || null,
      sedeId: v.sedeId ? Number(v.sedeId) : null,
      instructor:
        v.rol === 'instructor'
          ? { areaId: v.areaId ? Number(v.areaId) : null, especialidad: v.especialidad || null, fechaIngreso: v.fechaIngreso || null }
          : undefined,
    })
    if (!r.ok) return setErrorServidor(r.mensaje)
    onRegistrado({ ...r.datos, nombres: v.nombres.trim(), apellidos: v.apellidos.trim() })
  }

  const opcionesSede = (catalogos.datos?.sedes ?? []).filter((s) => s.activa).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))
  const opcionesArea = (catalogos.datos?.areas ?? []).map((a) => ({ valor: String(a.id), etiqueta: a.nombre }))

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="xl"
      codigo={CODIGO_HU[rol] ?? 'HU02.1'}
      titulo={rolFijo ? `Registrar ${ETIQUETA_ROL[rolInicial].toLowerCase()}` : 'Registrar nuevo usuario'}
      descripcion="La persona recibirá un correo de invitación para crear su contraseña y activar su cuenta."
      pie={
        <>
          <p className="mr-auto self-center text-xs text-texto-secundario">
            Los campos marcados con <span className="text-alerta-critica">*</span> son obligatorios.
          </p>
          <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} cargando={isSubmitting} icono={<Send className="size-4" aria-hidden />} disabled={!catalogos.datos}>
            Registrar y enviar invitación
          </Button>
        </>
      }
    >
      {catalogos.cargando ? (
        <Spinner texto="Cargando formulario…" />
      ) : catalogos.error ? (
        <EstadoError mensaje={catalogos.error} onReintentar={catalogos.recargar} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <form id={idFormulario} noValidate onSubmit={handleSubmit(guardar)} className="space-y-4">
            {errorServidor && <Aviso tipo="error">{errorServidor}</Aviso>}

            {!rolFijo && (
              <Select etiqueta="Rol en la plataforma" requerido opciones={opcionesDe(ETIQUETA_ROL)} error={errors.rol?.message} {...register('rol')} />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input etiqueta="Nombres" requerido autoComplete="off" placeholder="Ej: Juan Carlos" error={errors.nombres?.message} {...register('nombres')} />
              <Input etiqueta="Apellidos" requerido autoComplete="off" placeholder="Ej: Castillo Gómez" error={errors.apellidos?.message} {...register('apellidos')} />
              <Select etiqueta="Tipo de documento" requerido opciones={opcionesDe(ETIQUETA_TIPO_DOCUMENTO)} error={errors.tipoDocumento?.message} {...register('tipoDocumento')} />
              <Input etiqueta="Número de documento" requerido inputMode="numeric" placeholder="Ej: 1024567890" error={errors.numeroDocumento?.message} {...register('numeroDocumento')} />
              <Input
                etiqueta="Correo electrónico"
                requerido
                type="email"
                autoComplete="off"
                placeholder="usuario@sena.edu.co"
                iconoIzquierda={<Mail className="size-4" />}
                ayuda="A este correo llegará la invitación. Será su usuario de acceso."
                error={errors.correo?.message}
                {...register('correo')}
              />
              <Input etiqueta="Teléfono" type="tel" placeholder="Ej: 321 987 6543" error={errors.telefono?.message} {...register('telefono')} />
              <Select etiqueta="Sede" placeholder="Sin sede asignada" opciones={opcionesSede} {...register('sedeId')} />
            </div>

            {rol === 'instructor' && (
              <fieldset className="grid gap-4 rounded-xl border border-borde p-4 sm:grid-cols-2">
                <legend className="px-1 font-titulos text-sm font-semibold text-texto-principal">Datos del instructor</legend>
                <Select etiqueta="Área" requerido placeholder="Seleccione el área" opciones={opcionesArea} error={errors.areaId?.message} {...register('areaId')} />
                <Input etiqueta="Especialidad" placeholder="Ej: Desarrollo de software" error={errors.especialidad?.message} {...register('especialidad')} />
                <Input etiqueta="Fecha de ingreso" type="date" error={errors.fechaIngreso?.message} {...register('fechaIngreso')} />
              </fieldset>
            )}
          </form>

          <aside className="space-y-4 rounded-xl border border-borde bg-fondo-seccion-alterna p-4 text-sm" aria-label="Antes de registrar">
            <p className="flex items-center gap-2 font-titulos font-semibold text-texto-principal">
              <ShieldCheck className="size-4 text-primario" aria-hidden /> Antes de registrar
            </p>
            <ul className="space-y-3 text-texto-apoyo">
              {[
                ['Datos únicos', 'El documento y el correo no pueden estar registrados en otra cuenta.'],
                ['Invitación segura', 'La persona crea su propia contraseña desde el correo; nadie más la conoce.'],
                [
                  'Después del registro',
                  rol === 'aprendiz' ? 'Podrá matricularse en una ficha.' : rol === 'instructor' ? 'Podrá asignarse a una o varias fichas.' : 'Tendrá acceso completo a la administración.',
                ],
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
        </div>
      )}
    </Modal>
  )
}
