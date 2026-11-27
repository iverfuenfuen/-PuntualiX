import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import logoPositivo from '@/assets/img/LogoPositivo/positivo_sin_eslogan_transparente.png'

type EstadoConexion =
  | { tipo: 'cargando' }
  | { tipo: 'sin-configurar' }
  | { tipo: 'ok' }
  | { tipo: 'error'; mensaje: string }

/**
 * Pantalla provisional de diagnóstico (Etapa 0).
 * Verifica que las variables de entorno existan y que el esquema de la base esté creado.
 * Disponible en /diagnostico mientras dure la migración.
 */
export function Diagnostico() {
  const [estado, setEstado] = useState<EstadoConexion>(
    supabaseConfigurado ? { tipo: 'cargando' } : { tipo: 'sin-configurar' },
  )

  useEffect(() => {
    if (!supabaseConfigurado) return
    // Consulta mínima: sin sesión RLS devuelve 0 filas, pero si la tabla no existe responde con error.
    supabase
      .from('umbrales_alerta')
      .select('id', { count: 'exact', head: true })
      .then(({ error }) =>
        setEstado(error ? { tipo: 'error', mensaje: error.message } : { tipo: 'ok' }),
      )
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-borde bg-fondo-tarjeta p-8 shadow-sm">
        <img src={logoPositivo} alt="PuntualiX" className="mx-auto mb-6 w-40" />
        <h1 className="mb-1 text-center text-h3">Diagnóstico de conexión</h1>
        <p className="mb-6 text-center text-sm text-texto-secundario">
          Organización, seguimiento y control en un solo lugar
        </p>

        {estado.tipo === 'cargando' && (
          <Mensaje icono={<LoaderCircle className="animate-spin text-informacion" />} titulo="Conectando con Supabase…" />
        )}
        {estado.tipo === 'sin-configurar' && (
          <Mensaje
            icono={<CircleAlert className="text-advertencia" />}
            titulo="Faltan las credenciales"
            detalle="Copia .env.example como .env.local, completa la URL y la anon key, y reinicia npm run dev."
          />
        )}
        {estado.tipo === 'ok' && (
          <Mensaje
            icono={<CheckCircle2 className="text-confirmacion" />}
            titulo="Conexión correcta"
            detalle="Supabase responde y el esquema de PuntualiX está creado."
          />
        )}
        {estado.tipo === 'error' && (
          <Mensaje
            icono={<CircleAlert className="text-alerta-critica" />}
            titulo="Supabase respondió con un error"
            detalle={`${estado.mensaje}. Revisa que ejecutaste los scripts de supabase/migrations.`}
          />
        )}
      </section>
    </main>
  )
}

function Mensaje({ icono, titulo, detalle }: { icono: ReactNode; titulo: string; detalle?: string }) {
  return (
    <div className="flex gap-3 rounded-lg bg-fondo-seccion-alterna p-4">
      <span className="mt-0.5 shrink-0">{icono}</span>
      <div>
        <p className="font-titulos font-semibold text-texto-principal">{titulo}</p>
        {detalle && <p className="text-sm text-texto-apoyo">{detalle}</p>}
      </div>
    </div>
  )
}
