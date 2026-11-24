import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, Modal } from '@/components/ui'
import { porcentaje } from '@/lib/utilidades'
import { ETIQUETA_PRIORIDAD, ETIQUETA_TIPO_ALERTA } from '@/types/dominio'
import { fechaHora } from './presentacion'
import type { AlertaFicha, UmbralConfigurado } from './servicioAlertas'

interface Props {
  alerta: AlertaFicha
  umbrales: UmbralConfigurado[]
  onCerrar: () => void
}

/**
 * HU09.3 — Detalle de una alerta de ficha. Mismos datos que el panel de detalle de VersionAntigua (alertas.html):
 * ficha y programa, instructor líder, límite configurado, porcentaje detectado, fecha de generación y descripción.
 * Solo lectura, como en la versión original.
 */
export function ModalDetalleAlerta({ alerta, umbrales, onCerrar }: Props) {
  const limite = umbrales.find((u) => u.prioridad === alerta.prioridad)
  const esInasistencia = alerta.tipo === 'riesgo_ficha'

  const datos: Array<[string, ReactNode]> = [
    [
      'Ficha',
      <Link key="f" to={`/admin/fichas/${alerta.ficha.id}`} className="font-semibold text-primario hover:underline">
        Ficha {alerta.ficha.numero}
        {alerta.ficha.programa && ` — ${alerta.ficha.programa}`}
      </Link>,
    ],
    ['Instructor líder', alerta.ficha.instructorLider ?? <span className="font-semibold text-alerta-critica">Sin asignar</span>],
    ...(esInasistencia
      ? ([
          ['Límite configurado', limite ? porcentaje(limite.porcentaje, 2) : '—'],
          ['Porcentaje detectado', <strong key="p">{porcentaje(alerta.porcentaje, 2)}</strong>],
        ] as Array<[string, ReactNode]>)
      : []),
    ['Fecha de generación', fechaHora(alerta.creadaEn)],
  ]

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="md"
      codigo={`Prioridad ${ETIQUETA_PRIORIDAD[alerta.prioridad].toLowerCase()} · Ficha ${alerta.ficha.numero}`}
      titulo={esInasistencia ? 'Alerta de inasistencias por ficha' : ETIQUETA_TIPO_ALERTA[alerta.tipo]}
      pie={
        <Button variante="secundario" onClick={onCerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        <dl className="divide-y divide-borde rounded-xl border border-borde text-sm">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-texto-secundario">{etiqueta}</dt>
              <dd className="text-texto-principal sm:text-right">{valor}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-texto-apoyo">{alerta.descripcion}</p>
      </div>
    </Modal>
  )
}
