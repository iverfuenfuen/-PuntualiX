import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui'

type PropsCampoContrasena = Omit<ComponentProps<typeof Input>, 'type' | 'adornoDerecha'>

/** Campo de contraseña con botón para mostrarla u ocultarla (como en VersionAntigua). */
export function CampoContrasena(props: PropsCampoContrasena) {
  const [visible, setVisible] = useState(false)
  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      adornoDerecha={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="rounded-md p-2 text-texto-secundario hover:bg-fondo-tarjeta-suave hover:text-texto-principal"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      }
    />
  )
}
