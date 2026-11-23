import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation } from 'react-router'
import { Lock, Mail, TriangleAlert } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { PantallaCargando } from '@/app/RutaProtegida'
import { Button, Input, Modal } from '@/components/ui'
import { RUTA_INICIO_ROL } from '@/types/dominio'
import { AuthLayout } from './AuthLayout'
import { Aviso } from './Aviso'
import { CampoContrasena } from './CampoContrasena'
import { esquemaLogin, type DatosLogin } from './esquemas'
import { MENSAJES } from './mensajes'
import { iniciarSesion } from './servicioAuth'

interface EstadoNavegacion {
  desde?: string
  mensajeExito?: string
}

/** HU01.1 — Inicio de sesión multi-rol (RF02). Flujos alternos FA01.1.1 a FA01.1.4 de VersionAntigua. */
export function PaginaLogin() {
  const { cargando, usuario } = useSesion()
  const estado = (useLocation().state ?? {}) as EstadoNavegacion
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [cuentaDesactivada, setCuentaDesactivada] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosLogin>({ resolver: zodResolver(esquemaLogin), defaultValues: { correo: '', contrasena: '' } })

  // Con sesión activa no tiene sentido ver el login: se envía a su inicio (o a donde quería ir)
  if (cargando && !isSubmitting) return <PantallaCargando />
  if (usuario) {
    const destino = estado.desde && estado.desde.startsWith(RUTA_INICIO_ROL[usuario.rol]) ? estado.desde : RUTA_INICIO_ROL[usuario.rol]
    return <Navigate to={destino} replace />
  }

  async function alEnviar(datos: DatosLogin) {
    setErrorGeneral(null)
    const resultado = await iniciarSesion(datos.correo, datos.contrasena)
    if (resultado.ok) return // el proveedor de sesión detecta el cambio y esta página redirige
    if (resultado.codigo === 'cuenta_desactivada') setCuentaDesactivada(true)
    else setErrorGeneral(resultado.mensaje)
  }

  return (
    <AuthLayout
      titulo="Iniciar sesión"
      descripcion="Accede a tu cuenta para iniciar"
      icono={Lock}
      pie={
        <p className="text-texto-secundario">
          ¿Tienes problemas con tu cuenta? <span className="font-semibold text-texto-principal">Contacta al administrador de tu centro.</span>
        </p>
      }
    >
      <form onSubmit={handleSubmit(alEnviar)} noValidate className="space-y-4">
        {estado.mensajeExito && !errorGeneral && <Aviso tipo="exito">{estado.mensajeExito}</Aviso>}
        {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

        <Input
          etiqueta="Correo institucional"
          type="email"
          autoComplete="username"
          placeholder="usuario@puntualix.com"
          iconoIzquierda={<Mail className="size-4" />}
          error={errors.correo?.message}
          {...register('correo')}
        />
        <CampoContrasena
          etiqueta="Contraseña"
          autoComplete="current-password"
          placeholder="Contraseña"
          error={errors.contrasena?.message}
          {...register('contrasena')}
        />

        <p className="text-right text-sm">
          <Link to="/recuperar" className="font-semibold text-primario hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        <Button type="submit" className="w-full" cargando={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>

      {/* FA01.1.4 — Cuenta desactivada */}
      <Modal
        abierto={cuentaDesactivada}
        onCerrar={() => setCuentaDesactivada(false)}
        titulo="Cuenta desactivada"
        tamano="sm"
        pie={<Button onClick={() => setCuentaDesactivada(false)}>Entendido</Button>}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-alerta-critica/10 text-alerta-critica" aria-hidden>
            <TriangleAlert className="size-5" />
          </span>
          <p className="text-sm text-texto-apoyo">{MENSAJES.cuentaDesactivada}</p>
        </div>
      </Modal>
    </AuthLayout>
  )
}
