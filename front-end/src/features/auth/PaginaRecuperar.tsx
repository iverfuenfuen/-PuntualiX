import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { KeyRound, Mail, MailCheck } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from './AuthLayout'
import { Aviso } from './Aviso'
import { esquemaRecuperar, type DatosRecuperar } from './esquemas'
import { solicitarRecuperacion } from './servicioAuth'

/** Supabase permite un correo de recuperación por dirección cada 60 s */
const ESPERA_REENVIO_S = 60

/**
 * HU01.3 — Recuperar contraseña (Estados 1, 2 y 4 de olvidoContraseña.html).
 * El enlace del correo lleva a /restablecer (Estado 5).
 */
export function PaginaRecuperar() {
  const [correoEnviado, setCorreoEnviado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [espera, setEspera] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosRecuperar>({ resolver: zodResolver(esquemaRecuperar), defaultValues: { correo: '' } })

  // Cuenta regresiva para habilitar el reenvío
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  async function enviar(correo: string) {
    setError(null)
    const r = await solicitarRecuperacion(correo)
    if (!r.ok) return setError(r.mensaje)
    setCorreoEnviado(correo)
    setEspera(ESPERA_REENVIO_S)
  }

  const volver = (
    <p>
      Volver al{' '}
      <Link to="/login" className="font-semibold text-primario hover:underline">
        inicio de sesión
      </Link>
    </p>
  )

  if (correoEnviado) {
    return (
      <AuthLayout titulo="Correo enviado" icono={MailCheck} pie={volver}>
        <div className="space-y-4 text-center text-sm text-texto-apoyo">
          <p>
            Si <strong className="text-texto-principal">{correoEnviado}</strong> está registrado en PuntualiX, recibirás un enlace para
            establecer una nueva contraseña.
          </p>
          <p>
            El enlace expira en <strong className="text-texto-principal">60 minutos</strong>. Revisa también la carpeta de correo no deseado.
          </p>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Button variante="secundario" className="w-full" disabled={espera > 0} onClick={() => void enviar(correoEnviado)}>
            {espera > 0 ? `Reenviar enlace en ${espera} s` : 'Reenviar enlace'}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="¿Has olvidado tu contraseña?"
      descripcion="Ingresa tu correo y te enviaremos un enlace para establecer una nueva contraseña."
      icono={KeyRound}
      pie={volver}
    >
      <form onSubmit={handleSubmit((d) => enviar(d.correo))} noValidate className="space-y-4">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Input
          etiqueta="Correo institucional"
          type="email"
          autoComplete="email"
          placeholder="usuario@puntualix.com"
          iconoIzquierda={<Mail className="size-4" />}
          error={errors.correo?.message}
          {...register('correo')}
        />
        <Button type="submit" className="w-full" cargando={isSubmitting}>
          Enviar enlace de recuperación
        </Button>
      </form>
    </AuthLayout>
  )
}
