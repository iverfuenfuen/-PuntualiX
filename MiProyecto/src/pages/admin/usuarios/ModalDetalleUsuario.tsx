import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, Save, ShieldCheck } from 'lucide-react'
import { AvatarIniciales, Badge, Button, clasesBoton, Input, Modal, Select } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import type { Catalogos } from '@/features/catalogos/servicioCatalogos'
import { ETIQUETA_DOCUMENTO } from '@/features/perfil/servicioPerfil'
import { fechaCorta } from '@/lib/utilidades'
import { ETIQUETA_ROL, opcionesDe, type Rol } from '@/types/dominio'
import { esquemaEdicionUsuario, type FormularioEdicionUsuario } from '@/features/usuarios/esquemas'
import { actualizarUsuario, cambiarRol, type Usuario } from '@/features/usuarios/servicioUsuarios'

interface PropsDetalle {
  usuario: Usuario
  catalogos: Catalogos
  esCuentaPropia: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** Detalle de un usuario: editar datos de contacto y asignar rol (HU02.3). Se monta solo mientras está abierto. */
export function ModalDetalleUsuario({ usuario, catalogos, esCuentaPropia, onCerrar, onGuardado }: PropsDetalle) {
  const idFormulario = useId()
  const [rol, setRol] = useState<Rol>(usuario.rol)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormularioEdicionUsuario>({
    resolver: zodResolver(esquemaEdicionUsuario),
    defaultValues: {
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      telefono: usuario.telefono ?? '',
      sedeId: usuario.sedeId ? String(usuario.sedeId) : '',
    },
  })

  const cambiaRol = rol !== usuario.rol

  async function guardar(v: FormularioEdicionUsuario) {
    setErrorServidor(null)
    if (isDirty) {
      const r = await actualizarUsuario(usuario.id, { nombres: v.nombres, apellidos: v.apellidos, telefono: v.telefono || null, sedeId: v.sedeId ? Number(v.sedeId) : null })
      if (!r.ok) return setErrorServidor(r.mensaje)
    }
    if (cambiaRol) {
      const r = await cambiarRol(usuario.id, rol)
      if (!r.ok) return setErrorServidor(r.mensaje)
    }
    onGuardado(
      cambiaRol
        ? `${v.nombres} ${v.apellidos} ahora tiene el rol ${ETIQUETA_ROL[rol]}.`
        : `Los datos de ${v.nombres} ${v.apellidos} se guardaron correctamente.`,
    )
  }

  const opcionesSede = catalogos.sedes
    .filter((s) => s.activa || s.id === usuario.sedeId)
    .map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="lg"
      titulo={`${usuario.nombres} ${usuario.apellidos}`}
      descripcion={usuario.correo}
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} cargando={isSubmitting} disabled={!isDirty && !cambiaRol} icono={<Save className="size-4" aria-hidden />}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id={idFormulario} noValidate onSubmit={handleSubmit(guardar)} className="space-y-5">
        {errorServidor && <Aviso tipo="error">{errorServidor}</Aviso>}

        {/* Identificación de la cuenta: no editable aquí */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-fondo-seccion-alterna p-3 text-sm">
          <AvatarIniciales nombres={usuario.nombres} apellidos={usuario.apellidos} />
          <dl className="grid flex-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-texto-secundario">Documento</dt>
              <dd className="font-semibold text-texto-principal">
                {ETIQUETA_DOCUMENTO[usuario.tipoDocumento]} {usuario.numeroDocumento}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-texto-secundario">Registrado</dt>
              <dd className="font-semibold text-texto-principal">{fechaCorta(usuario.creadoEn)}</dd>
            </div>
            {usuario.fichaActiva && (
              <div>
                <dt className="text-xs text-texto-secundario">Ficha</dt>
                <dd>
                  <Link to={`/admin/fichas/${usuario.fichaActiva.id}`} className="font-semibold text-primario hover:underline">
                    Ficha {usuario.fichaActiva.numero}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
          <Badge tono={usuario.estado === 'activo' ? 'exito' : 'critico'} punto conBorde>
            {usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input etiqueta="Nombres" requerido error={errors.nombres?.message} {...register('nombres')} />
          <Input etiqueta="Apellidos" requerido error={errors.apellidos?.message} {...register('apellidos')} />
          <Input etiqueta="Teléfono" type="tel" error={errors.telefono?.message} {...register('telefono')} />
          <Select etiqueta="Sede" placeholder="Sin sede asignada" opciones={opcionesSede} {...register('sedeId')} />
        </div>

        {/* HU02.3 — Asignación de rol */}
        <fieldset className="space-y-3 rounded-xl border border-borde p-4">
          <legend className="flex items-center gap-1.5 px-1 font-titulos text-sm font-semibold text-texto-principal">
            <ShieldCheck className="size-4 text-primario" aria-hidden /> Rol en la plataforma (HU02.3)
          </legend>
          {esCuentaPropia ? (
            <p className="text-sm text-texto-secundario">No puede cambiar el rol de su propia cuenta: otro administrador debe hacerlo.</p>
          ) : (
            <>
              <Select etiqueta="Rol" etiquetaOculta opciones={opcionesDe(ETIQUETA_ROL)} value={rol} onChange={(e) => setRol(e.target.value as Rol)} />
              {cambiaRol && (
                <p className="text-xs text-texto-apoyo">
                  Al guardar, {usuario.nombres} pasará de <strong>{ETIQUETA_ROL[usuario.rol]}</strong> a <strong>{ETIQUETA_ROL[rol]}</strong> y solo verá las
                  pantallas de ese rol desde su próximo ingreso. El cambio queda en la bitácora.
                </p>
              )}
            </>
          )}
        </fieldset>

        {usuario.rol === 'instructor' && (
          <Link to={`/admin/instructores/${usuario.id}`} className={clasesBoton('fantasma', 'sm')}>
            <ExternalLink className="size-3.5" aria-hidden /> Ver perfil del instructor (área, especialidad y fichas)
          </Link>
        )}
      </form>
    </Modal>
  )
}
