import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utilidades'

/**
 * Campos de formulario con etiqueta, ayuda y mensaje de error accesibles.
 * Compatibles con react-hook-form: <Input {...register('correo')} error={errors.correo?.message} />
 */

interface PropsBaseCampo {
  etiqueta: string
  error?: string
  ayuda?: string
  requerido?: boolean
  /** Oculta visualmente la etiqueta (sigue disponible para lectores de pantalla) */
  etiquetaOculta?: boolean
}

const claseControl = (error?: string) =>
  cn(
    'w-full rounded-lg border bg-fondo-tarjeta px-3 text-sm text-texto-principal placeholder:text-texto-deshabilitado',
    'transition-colors focus:border-primario focus:ring-2 focus:ring-primario/20 focus:outline-none',
    'disabled:cursor-not-allowed disabled:bg-fondo-seccion-alterna disabled:text-texto-secundario',
    error ? 'border-alerta-critica' : 'border-borde',
  )

function Contenedor({
  id,
  etiqueta,
  error,
  ayuda,
  requerido,
  etiquetaOculta,
  children,
}: PropsBaseCampo & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={cn('block text-sm font-semibold text-texto-principal', etiquetaOculta && 'sr-only')}>
        {etiqueta}
        {requerido && (
          <span className="ml-0.5 text-alerta-critica" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-alerta-critica">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-texto-secundario">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}

function atributosAccesibles(id: string, error?: string, ayuda?: string, requerido?: boolean) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
    'aria-required': requerido || undefined,
  }
}

type PropsInput = PropsBaseCampo &
  InputHTMLAttributes<HTMLInputElement> & {
    ref?: Ref<HTMLInputElement>
    iconoIzquierda?: ReactNode
    /** Elemento interactivo dentro del campo, a la derecha (p. ej. botón mostrar contraseña) */
    adornoDerecha?: ReactNode
  }

export function Input({ etiqueta, error, ayuda, requerido, etiquetaOculta, iconoIzquierda, adornoDerecha, className, id: idProp, ...resto }: PropsInput) {
  const idAuto = useId()
  const id = idProp ?? idAuto
  return (
    <Contenedor id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={requerido} etiquetaOculta={etiquetaOculta}>
      <div className="relative">
        {iconoIzquierda && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-texto-secundario" aria-hidden>
            {iconoIzquierda}
          </span>
        )}
        <input
          {...atributosAccesibles(id, error, ayuda, requerido)}
          className={cn(claseControl(error), 'h-10', iconoIzquierda ? 'pl-9' : undefined, adornoDerecha ? 'pr-11' : undefined, className)}
          {...resto}
        />
        {adornoDerecha && <span className="absolute inset-y-0 right-1 flex items-center">{adornoDerecha}</span>}
      </div>
    </Contenedor>
  )
}

export interface OpcionSelect {
  valor: string
  etiqueta: string
}

type PropsSelect = PropsBaseCampo &
  SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement>; opciones: OpcionSelect[]; placeholder?: string }

export function Select({ etiqueta, error, ayuda, requerido, etiquetaOculta, opciones, placeholder, className, id: idProp, ...resto }: PropsSelect) {
  const idAuto = useId()
  const id = idProp ?? idAuto
  return (
    <Contenedor id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={requerido} etiquetaOculta={etiquetaOculta}>
      <div className="relative">
        <select
          {...atributosAccesibles(id, error, ayuda, requerido)}
          className={cn(claseControl(error), 'h-10 appearance-none pr-9', className)}
          {...resto}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-texto-secundario" aria-hidden />
      </div>
    </Contenedor>
  )
}

type PropsTextarea = PropsBaseCampo & TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }

export function Textarea({ etiqueta, error, ayuda, requerido, etiquetaOculta, className, id: idProp, rows = 3, ...resto }: PropsTextarea) {
  const idAuto = useId()
  const id = idProp ?? idAuto
  return (
    <Contenedor id={id} etiqueta={etiqueta} error={error} ayuda={ayuda} requerido={requerido} etiquetaOculta={etiquetaOculta}>
      <textarea rows={rows} {...atributosAccesibles(id, error, ayuda, requerido)} className={cn(claseControl(error), 'py-2', className)} {...resto} />
    </Contenedor>
  )
}
