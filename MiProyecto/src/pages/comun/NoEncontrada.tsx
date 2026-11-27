import { Link } from 'react-router'
import { MapPinOff } from 'lucide-react'
import { clasesBoton, EmptyState } from '@/components/ui'

export function NoEncontrada() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        icono={MapPinOff}
        titulo="Página no encontrada"
        descripcion="La dirección que buscas no existe o fue movida."
        accion={
          <Link to="/" className={clasesBoton('primario')}>
            Volver al inicio
          </Link>
        }
      />
    </main>
  )
}
