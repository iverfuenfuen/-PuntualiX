import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Cliente único de Supabase para toda la aplicación.
 * Las credenciales se leen de variables de entorno (.env.local), nunca se escriben en el código.
 * La "anon key" es pública por diseño: la seguridad real la imponen las políticas RLS de la base.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigurado) {
  console.warn(
    '[PuntualiX] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example como .env.local y completa los valores (ver supabase/README.md).',
  )
}

/**
 * Dirección con la que se abrió la app, capturada ANTES de crear el cliente
 * (Supabase la limpia al procesar el enlace del correo). Permite saber si el usuario
 * llegó desde un enlace de recuperación de contraseña o con un enlace vencido.
 */
const urlInicial = new URL(window.location.href)
const parametrosHash = new URLSearchParams(urlInicial.hash.replace(/^#/, ''))
/** Invitación a una cuenta nueva (HU02.1): el usuario llega a /restablecer?invitacion=1 para crear su contraseña */
const esInvitacion =
  urlInicial.pathname === '/restablecer' && (urlInicial.searchParams.has('invitacion') || parametrosHash.get('type') === 'invite')
export const enlaceInicial = {
  esRecuperacion:
    esInvitacion ||
    (urlInicial.pathname === '/restablecer' && (urlInicial.searchParams.has('code') || parametrosHash.get('type') === 'recovery')),
  esInvitacion,
  error: urlInicial.searchParams.get('error_code') ?? parametrosHash.get('error_code'),
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'falta-configurar',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
