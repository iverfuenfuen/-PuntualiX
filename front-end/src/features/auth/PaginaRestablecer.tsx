import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router'
import { LinkIcon, ShieldCheck } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { PantallaCargando } from '@/app/RutaProtegida'
import { Button, clasesBoton } from '@/components/ui'
import { enlaceInicial, supabase } from '@/lib/supabase'
import { RUTA_INICIO_ROL } from '@/types/dominio'
import { AuthLayout } from './AuthLayout'
import { Aviso } from './Aviso'
import { CampoContrasena } from './CampoContrasena'
import { esquemaNuevaContrasena, type DatosNuevaContrasena } from './esquemas'
import { MENSAJES } from './mensajes'
import { RequisitosContrasena } from './RequisitosContrasena'
import { establecerContrasena } from './servicioAuth'

/**
 * HU01.3 — Establecer nueva contraseña (Estado 5 de olvidoContraseña.html).
 * HU02.1 — También recibe la invitación de una cuenta nueva: el usuario crea aquí su primera contraseña.
 * Se llega desde el enlace del correo; Supabase crea una sesión temporal de recuperación.
 * Si el enlace venció o es inválido se muestra el Estado 4 (solicitar uno nuevo).
 */
export function PaginaRestablecer() {
  const { cargando, usuario, enRecuperacion } = useSesion()
  const navegar = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DatosNuevaContrasena>({ resolver: zodResolver(esquemaNuevaContrasena), defaultValues: { contrasena: '', confirmacion: '' } })
  const contrasenaEscrita = useWatch({ control, name: 'contrasena' })

  if (cargando) return <PantallaCargando />

  // Usuario con sesión normal (no de recuperación): cambia su contraseña desde "Mi perfil"
  if (usuario && !enRecuperacion) return <Navigate to={`${RUTA_INICIO_ROL[usuario.rol]}/perfil`} replace />

  // Estado 4 — enlace vencido, usado o inexistente
  if (enlaceInicial.error || !usuario) {
    return (
      <AuthLayout titulo="Enlace no válido" icono={LinkIcon}>
        <div className="space-y-4 text-center">
          <Aviso tipo="error">{MENSAJES.enlaceExpirado}</Aviso>
          <Link to="/recuperar" className={clasesBoton('primario', 'md', 'w-full')}>
            Solicitar un nuevo enlace
          </Link>
          <p className="text-sm">
            <Link to="/login" className="font-semibold text-primario hover:underline">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  async function alEnviar(datos: DatosNuevaContrasena) {
    setError(null)
    const r = await establecerContrasena(datos.contrasena)
    if (!r.ok) return setError(r.mensaje)
    // Se cierra la sesión temporal y se pide iniciar sesión con la nueva contraseña
    await supabase.auth.signOut()
    const mensajeExito = enlaceInicial.esInvitacion
      ? 'Tu cuenta está activa. Inicia sesión con tu correo y la contraseña que acabas de crear.'
      : 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'
    navegar('/login', { replace: true, state: { mensajeExito } })
  }

  return (
    <AuthLayout
      titulo={enlaceInicial.esInvitacion ? 'Bienvenido a PuntualiX: crea tu contraseña' : 'Establecer nueva contraseña'}
      descripcion={`Cuenta: ${usuario.correo}`}
      icono={ShieldCheck}
    >
      <form onSubmit={handleSubmit(alEnviar)} noValidate className="space-y-4">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <CampoContrasena etiqueta="Nueva contraseña" autoComplete="new-password" error={errors.contrasena?.message} {...register('contrasena')} />
        <RequisitosContrasena valor={contrasenaEscrita} />
        <CampoContrasena etiqueta="Confirmar contraseña" autoComplete="new-password" error={errors.confirmacion?.message} {...register('confirmacion')} />
        <Button type="submit" className="w-full" cargando={isSubmitting}>
          {enlaceInicial.esInvitacion ? 'Crear contraseña y activar cuenta' : 'Establecer contraseña'}
        </Button>
      </form>
    </AuthLayout>
  )
}
