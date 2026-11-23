import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utilidades'

/** Mensaje en línea de éxito o error dentro de un formulario (anunciado a lectores de pantalla). */
export function Aviso({ tipo, children }: { tipo: 'error' | 'exito'; children: ReactNode }) {
  const Icono = tipo === 'error' ? CircleAlert : CircleCheck
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold',
        tipo === 'error' ? 'border-alerta-critica/25 bg-alerta-critica/5 text-alerta-critica' : 'border-confirmacion/25 bg-confirmacion/5 text-confirmacion',
      )}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}
