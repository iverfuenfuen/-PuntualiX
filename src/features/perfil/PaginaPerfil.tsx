import { useEffect, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, KeyRound, Lock, LogOut, Save, ShieldCheck, UserRound } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Avatar } from '@/components/layout/MenuUsuario'
import { Badge, Button, Card, Input, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { CampoContrasena } from '@/features/auth/CampoContrasena'
import { esquemaCambiarContrasena, type DatosCambiarContrasena } from '@/features/auth/esquemas'
import { RequisitosContrasena } from '@/features/auth/RequisitosContrasena'
import { cambiarContrasena } from '@/features/auth/servicioAuth'
import { cn } from '@/lib/utilidades'
import { ETIQUETA_ROL, RUTA_INICIO_ROL } from '@/types/dominio'
import {
  actualizarDatosPersonales,
  esquemaDatosPersonales,
  ETIQUETA_DOCUMENTO,
  obtenerPerfilCompleto,
  type DatosPersonales,
  type PerfilCompleto,
} from './servicioPerfil'

type Seccion = 'datos' | 'seguridad'

/** Mi perfil — datos personales (CU02) y cambio de contraseña (HU01.2, RF03). Diseño del Prototipo. */
export function PaginaPerfil() {
  const { usuario, cerrarSesion, recargarPerfil } = useSesion()
  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [errorCarga, setErrorCarga] = useState(false)
  const [seccion, setSeccion] = useState<Seccion>('datos')

  useEffect(() => {
    if (!usuario) return
    let vigente = true
    obtenerPerfilCompleto(usuario.id).then((p) => {
      if (!vigente) return
      if (p) setPerfil(p)
      else setErrorCarga(true)
    })
    return () => {
      vigente = false
    }
  }, [usuario])

  if (!usuario) return null

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: RUTA_INICIO_ROL[usuario.rol] }, { etiqueta: 'Mi perfil' }]} />
      <header className="border-b border-borde pb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Mi perfil</h1>
        <p className="mt-1 text-sm text-texto-secundario">Gestiona tu información personal y las credenciales de acceso.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Tarjeta lateral */}
        <Card className="h-fit p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              <Avatar usuario={usuario} tamano="lg" />
            </div>
            <Badge tono="exito" icono={<ShieldCheck className="size-3.5" aria-hidden />}>
              {ETIQUETA_ROL[usuario.rol]}
            </Badge>
            <p className="mt-2 font-titulos text-lg font-semibold text-texto-principal">
              {usuario.nombres} {usuario.apellidos}
            </p>
            <p className="text-sm break-all text-texto-secundario">{usuario.correo}</p>
          </div>
          <dl className="mt-5 space-y-2 border-y border-borde py-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-texto-secundario">Rol actual</dt>
              <dd className="font-semibold text-texto-principal">{ETIQUETA_ROL[usuario.rol]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-texto-secundario">Sede vinculada</dt>
              <dd className="text-right font-semibold text-texto-principal">{perfil?.sede ?? 'Sin asignar'}</dd>
            </div>
          </dl>
          <nav aria-label="Secciones del perfil" className="mt-4 space-y-1">
            <BotonSeccion activo={seccion === 'datos'} onClick={() => setSeccion('datos')} icono={<UserRound className="size-4" aria-hidden />}>
              Datos personales
            </BotonSeccion>
            <BotonSeccion activo={seccion === 'seguridad'} onClick={() => setSeccion('seguridad')} icono={<KeyRound className="size-4" aria-hidden />}>
              Seguridad y contraseña
            </BotonSeccion>
          </nav>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            className="mt-4 flex w-full items-center justify-center gap-2 border-t border-borde pt-4 text-sm font-semibold text-alerta-critica hover:underline"
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </Card>

        {/* Contenido de la sección */}
        <Card className="p-6 sm:p-8">
          {errorCarga ? (
            <Aviso tipo="error">No fue posible cargar tu perfil. Recarga la página.</Aviso>
          ) : !perfil ? (
            <Spinner texto="Cargando perfil…" />
          ) : seccion === 'datos' ? (
            <FormularioDatos
              perfil={perfil}
              alGuardar={async (p) => {
                setPerfil(p)
                await recargarPerfil()
              }}
            />
          ) : (
            <FormularioContrasena correo={perfil.correo} />
          )}
        </Card>
      </div>
    </>
  )
}

function BotonSeccion({ activo, onClick, icono, children }: { activo: boolean; onClick: () => void; icono: ReactNode; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        activo ? 'bg-primario/10 font-semibold text-primario' : 'text-texto-apoyo hover:bg-fondo-seccion-alterna',
      )}
    >
      {icono}
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-4" aria-hidden />
    </button>
  )
}

function EncabezadoSeccion({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <header className="mb-6 border-b border-borde pb-4">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      <p className="mt-0.5 text-sm text-texto-secundario">{descripcion}</p>
    </header>
  )
}

function FormularioDatos({ perfil, alGuardar }: { perfil: PerfilCompleto; alGuardar: (p: PerfilCompleto) => Promise<void> }) {
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DatosPersonales>({
    resolver: zodResolver(esquemaDatosPersonales),
    defaultValues: { nombres: perfil.nombres, apellidos: perfil.apellidos, telefono: perfil.telefono ?? '' },
  })

  async function alEnviar(datos: DatosPersonales) {
    setResultado(null)
    const r = await actualizarDatosPersonales(perfil.id, datos)
    if (!r.ok) return setResultado({ tipo: 'error', texto: r.mensaje ?? 'Error al guardar' })
    reset(datos)
    await alGuardar({ ...perfil, ...datos, telefono: datos.telefono || null })
    setResultado({ tipo: 'exito', texto: 'Datos actualizados correctamente.' })
  }

  return (
    <form onSubmit={handleSubmit(alEnviar)} noValidate>
      <EncabezadoSeccion titulo="Información básica" descripcion="Consulta y actualiza tus datos registrados en PuntualiX." />
      <div className="space-y-5">
        {resultado && <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input etiqueta="Nombres" requerido autoComplete="given-name" error={errors.nombres?.message} {...register('nombres')} />
          <Input etiqueta="Apellidos" requerido autoComplete="family-name" error={errors.apellidos?.message} {...register('apellidos')} />
          <Input
            etiqueta="Documento de identidad"
            value={`${ETIQUETA_DOCUMENTO[perfil.tipoDocumento] ?? perfil.tipoDocumento} ${perfil.numeroDocumento}`}
            disabled
            readOnly
            adornoDerecha={<Lock className="mr-2 size-4 text-texto-deshabilitado" aria-hidden />}
            ayuda="Solo un administrador puede modificarlo."
          />
          <Input
            etiqueta="Correo institucional"
            value={perfil.correo}
            disabled
            readOnly
            adornoDerecha={<Lock className="mr-2 size-4 text-texto-deshabilitado" aria-hidden />}
            ayuda="Es tu usuario de acceso; solo un administrador puede cambiarlo."
          />
          <Input etiqueta="Teléfono de contacto" type="tel" autoComplete="tel" placeholder="+57 300 000 0000" error={errors.telefono?.message} {...register('telefono')} />
          <Input etiqueta="Sede asignada" value={perfil.sede ?? 'Sin asignar'} disabled readOnly />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-borde pt-5">
          <Button variante="secundario" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
            Cancelar
          </Button>
          <Button type="submit" cargando={isSubmitting} disabled={!isDirty} icono={<Save className="size-4" aria-hidden />}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </form>
  )
}

function FormularioContrasena({ correo }: { correo: string }) {
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DatosCambiarContrasena>({
    resolver: zodResolver(esquemaCambiarContrasena),
    defaultValues: { actual: '', contrasena: '', confirmacion: '' },
  })
  const contrasenaEscrita = useWatch({ control, name: 'contrasena' })

  async function alEnviar(datos: DatosCambiarContrasena) {
    setResultado(null)
    const r = await cambiarContrasena(correo, datos.actual, datos.contrasena)
    if (!r.ok) return setResultado({ tipo: 'error', texto: r.mensaje })
    reset()
    setResultado({ tipo: 'exito', texto: 'Contraseña actualizada correctamente.' })
  }

  return (
    <form onSubmit={handleSubmit(alEnviar)} noValidate>
      <EncabezadoSeccion titulo="Seguridad de la cuenta" descripcion="Cambia tu contraseña. Necesitas la contraseña actual para confirmar que eres tú." />
      <div className="max-w-md space-y-5">
        {resultado && <Aviso tipo={resultado.tipo}>{resultado.texto}</Aviso>}
        <CampoContrasena etiqueta="Contraseña actual" requerido autoComplete="current-password" error={errors.actual?.message} {...register('actual')} />
        <CampoContrasena etiqueta="Nueva contraseña" requerido autoComplete="new-password" error={errors.contrasena?.message} {...register('contrasena')} />
        <RequisitosContrasena valor={contrasenaEscrita} />
        <CampoContrasena etiqueta="Confirmar nueva contraseña" requerido autoComplete="new-password" error={errors.confirmacion?.message} {...register('confirmacion')} />
        <Button type="submit" cargando={isSubmitting} icono={<KeyRound className="size-4" aria-hidden />}>
          Actualizar contraseña
        </Button>
      </div>
    </form>
  )
}
