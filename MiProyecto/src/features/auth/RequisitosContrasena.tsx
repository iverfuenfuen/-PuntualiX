import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utilidades'

const REGLAS = [
  { texto: 'Mínimo 8 caracteres', cumple: (v: string) => v.length >= 8 },
  { texto: 'Al menos una letra', cumple: (v: string) => /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v) },
  { texto: 'Al menos un número', cumple: (v: string) => /\d/.test(v) },
]

/** Lista de requisitos que se marca en tiempo real mientras se escribe la contraseña (RNF2, RNF7). */
export function RequisitosContrasena({ valor }: { valor: string }) {
  return (
    <ul className="space-y-1 text-xs" aria-label="Requisitos de la contraseña">
      {REGLAS.map(({ texto, cumple }) => {
        const ok = cumple(valor)
        return (
          <li key={texto} className={cn('flex items-center gap-2', ok ? 'text-confirmacion' : 'text-texto-secundario')}>
            {ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
            {texto}
            <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
