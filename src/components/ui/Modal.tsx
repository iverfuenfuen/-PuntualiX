import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utilidades'

interface PropsModal {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  /** Código de la historia de usuario mostrado como etiqueta, p. ej. "HU10.1" */
  codigo?: string
  children: ReactNode
  /** Botones del pie (Cancelar / Guardar) */
  pie?: ReactNode
  tamano?: 'sm' | 'md' | 'lg' | 'xl'
}

const ANCHOS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

/**
 * Ventana modal basada en <dialog> nativo: el navegador gestiona el foco,
 * la tecla Esc y bloquea la interacción con el fondo (accesibilidad, RNF7).
 */
export function Modal({ abierto, onCerrar, titulo, descripcion, codigo, children, pie, tamano = 'md' }: PropsModal) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const idDescripcion = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={descripcion ? idDescripcion : undefined}
      onCancel={(e) => {
        e.preventDefault() // Esc: cerramos desde React para mantener el estado sincronizado
        onCerrar()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar() // clic en el fondo oscuro
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-fondo-tarjeta p-0 text-texto-cuerpo shadow-xl',
        'backdrop:bg-texto-principal/50 backdrop:backdrop-blur-[2px]',
        ANCHOS[tamano],
      )}
    >
      {abierto && (
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-borde px-6 py-4">
            <div>
              {codigo && <p className="mb-0.5 text-xs font-semibold tracking-wide text-estado-activo uppercase">{codigo}</p>}
              <h2 id={idTitulo} className="text-lg font-semibold">
                {titulo}
              </h2>
              {descripcion && (
                <p id={idDescripcion} className="mt-0.5 text-sm text-texto-secundario">
                  {descripcion}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-texto-secundario hover:bg-fondo-tarjeta-suave hover:text-texto-principal"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {pie && <footer className="flex flex-wrap justify-end gap-2 border-t border-borde bg-fondo-seccion-alterna px-6 py-4">{pie}</footer>}
        </div>
      )}
    </dialog>
  )
}
