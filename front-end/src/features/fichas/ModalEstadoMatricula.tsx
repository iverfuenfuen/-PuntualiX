import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ModalConfirmacion, Select } from '@/components/ui'
import { ETIQUETA_ESTADO_MATRICULA, opcionesDe, type EstadoMatricula } from '@/types/dominio'
import { cambiarEstadoMatricula, type AprendizFicha } from './servicioFichas'

const ESTADOS_MATRICULA = opcionesDe(ETIQUETA_ESTADO_MATRICULA)

/** Cambia el estado de permanencia de un aprendiz en la ficha (aplazado, retirado, desertor, certificado). */
export function ModalEstadoMatricula({ aprendiz, onCerrar, onGuardado }: { aprendiz: AprendizFicha; onCerrar: () => void; onGuardado: (mensaje: string) => void }) {
  const [estado, setEstado] = useState<EstadoMatricula>(aprendiz.estado)
  return (
    <ModalConfirmacion
      abierto
      onCerrar={onCerrar}
      titulo="Estado de la matrícula"
      textoConfirmar="Guardar estado"
      onConfirmar={async () => {
        if (estado === aprendiz.estado) return onCerrar()
        const r = await cambiarEstadoMatricula(aprendiz.matriculaId, estado)
        if (!r.ok) return r.mensaje
        onGuardado(`El estado de ${aprendiz.nombres} ${aprendiz.apellidos} cambió a "${ETIQUETA_ESTADO_MATRICULA[estado]}".`)
      }}
    >
      <p>
        Aprendiz: <strong className="text-texto-principal">{aprendiz.nombres} {aprendiz.apellidos}</strong>
      </p>
      <Select etiqueta="Nuevo estado" opciones={ESTADOS_MATRICULA} value={estado} onChange={(e) => setEstado(e.target.value as EstadoMatricula)} />
      {estado !== 'matriculado' && aprendiz.vocero !== 'ninguno' && (
        <p className="flex items-center gap-2 font-semibold text-texto-principal">
          <TriangleAlert className="size-4 text-advertencia" aria-hidden /> Perderá la vocería de la ficha.
        </p>
      )}
      {estado !== 'matriculado' && <p className="text-xs">Su historial de asistencia se conserva.</p>}
    </ModalConfirmacion>
  )
}
