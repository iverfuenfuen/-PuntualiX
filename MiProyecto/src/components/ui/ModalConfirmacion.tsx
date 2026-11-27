import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface PropsConfirmacion {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  children: ReactNode
  textoConfirmar: string
  /** Acción a ejecutar; si devuelve un mensaje de error, se muestra y el modal sigue abierto */
  onConfirmar: () => Promise<string | null | void>
  peligro?: boolean
  codigo?: string
}

/** Confirmación de acciones sensibles (desactivar, quitar, retirar). Muestra el error del servidor si ocurre. */
export function ModalConfirmacion({ abierto, onCerrar, titulo, children, textoConfirmar, onConfirmar, peligro, codigo }: PropsConfirmacion) {
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setProcesando(true)
    setError(null)
    const mensaje = await onConfirmar()
    setProcesando(false)
    if (mensaje) setError(mensaje)
  }

  function cerrar() {
    setError(null)
    onCerrar()
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo={titulo}
      codigo={codigo}
      tamano="sm"
      pie={
        <>
          <Button variante="secundario" onClick={cerrar} disabled={procesando}>
            Cancelar
          </Button>
          <Button variante={peligro ? 'peligro' : 'primario'} onClick={confirmar} cargando={procesando}>
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-texto-apoyo">
        {children}
        {error && (
          <p role="alert" className="rounded-lg border border-alerta-critica/25 bg-alerta-critica/5 px-3 py-2 font-semibold text-alerta-critica">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
