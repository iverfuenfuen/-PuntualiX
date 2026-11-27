import { cn, iniciales } from '@/lib/utilidades'
import type { Tono } from '@/types/dominio'
import { TONO_SUAVE } from './tonos'

interface PropsAvatarIniciales {
  nombres: string
  apellidos?: string
  tono?: Tono
  className?: string
}

/** Círculo con las iniciales de una persona (listas de aprendices e instructores). Decorativo para lectores de pantalla. */
export function AvatarIniciales({ nombres, apellidos = '', tono = 'primario', className }: PropsAvatarIniciales) {
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full font-titulos text-sm font-bold', TONO_SUAVE[tono], className)} aria-hidden>
      {iniciales(nombres, apellidos)}
    </span>
  )
}
