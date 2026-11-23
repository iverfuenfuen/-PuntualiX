import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

interface PropsEstadoError {
  titulo?: string
  mensaje: string
  onReintentar?: () => void
}

/** Estado de error de una pantalla o sección, con opción de reintentar la carga. */
export function EstadoError({ titulo = 'No fue posible cargar la información', mensaje, onReintentar }: PropsEstadoError) {
  return (
    <div role="alert">
      <EmptyState
        icono={TriangleAlert}
        titulo={titulo}
        descripcion={mensaje}
        accion={
          onReintentar && (
            <Button variante="secundario" icono={<RotateCcw className="size-4" aria-hidden />} onClick={onReintentar}>
              Reintentar
            </Button>
          )
        }
      />
    </div>
  )
}
