import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { CircleCheck, CircleSlash, Eye, UserPlus } from 'lucide-react'
import { Badge, Button, clasesBoton, Modal } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { porcentaje } from '@/lib/utilidades'
import { ETIQUETA_ESTADO_ALERTA, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO_ALERTA, type EstadoAlerta } from '@/types/dominio'
import { fechaHora, TONO_ESTADO_ALERTA, TONO_PRIORIDAD, tituloAlerta } from './presentacion'
import { cambiarEstadoAlerta, estaAbierta, type Alerta, type UmbralConfigurado } from './servicioAlertas'

interface Props {
  alerta: Alerta
  umbrales: UmbralConfigurado[]
  usuarioId: string
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

const MENSAJE_CAMBIO: Partial<Record<EstadoAlerta, string>> = {
  en_seguimiento: 'quedó en seguimiento',
  atendida: 'se marcó como atendida',
  descartada: 'se descartó',
}

/** RF16 / HU09.3 — Detalle y seguimiento de una alerta (VersionAntigua: panel "Alerta de inasistencias por ficha"). */
export function ModalDetalleAlerta({ alerta, umbrales, usuarioId, onCerrar, onGuardado }: Props) {
  const [guardando, setGuardando] = useState<EstadoAlerta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abierta = estaAbierta(alerta)
  const limite = umbrales.find((u) => u.prioridad === alerta.prioridad)
  const esInasistencia = alerta.tipo === 'inasistencia_aprendiz' || alerta.tipo === 'riesgo_ficha'

  async function cambiar(estado: EstadoAlerta) {
    setGuardando(estado)
    setError(null)
    const r = await cambiarEstadoAlerta(alerta.id, estado, usuarioId)
    setGuardando(null)
    if (!r.ok) return setError(r.mensaje)
    onGuardado(`La alerta de la ficha ${alerta.ficha.numero} ${MENSAJE_CAMBIO[estado]}.`)
  }

  const datos: Array<[string, ReactNode]> = [
    ['Ficha', <Link key="f" to={`/admin/fichas/${alerta.ficha.id}`} className="font-semibold text-primario hover:underline">{alerta.ficha.numero}</Link>],
    ['Programa', alerta.ficha.programa || '—'],
    ['Instructor líder', alerta.ficha.instructorLider ?? <span className="font-semibold text-alerta-critica">Sin asignar</span>],
    ...(alerta.aprendiz ? [['Aprendiz', alerta.aprendiz.nombre] as [string, ReactNode]] : []),
    ...(esInasistencia
      ? ([
          ['Porcentaje detectado', <strong key="p" className="text-texto-principal">{porcentaje(alerta.porcentaje, 2)}</strong>],
          ['Umbral vigente', limite ? `${porcentaje(limite.porcentaje, 2)} (prioridad ${ETIQUETA_PRIORIDAD[limite.prioridad].toLowerCase()})` : '—'],
        ] as Array<[string, ReactNode]>)
      : []),
    ['Fecha de generación', fechaHora(alerta.creadaEn)],
    ...(alerta.atendidaEn ? [['Cerrada', `${fechaHora(alerta.atendidaEn)}${alerta.atendidaPor ? ` · ${alerta.atendidaPor}` : ''}`] as [string, ReactNode]] : []),
  ]

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="md"
      codigo={`RF16 · Alerta #${alerta.id}`}
      titulo={tituloAlerta(alerta)}
      descripcion={ETIQUETA_TIPO_ALERTA[alerta.tipo]}
      pie={
        abierta ? (
          <>
            <Button variante="secundario" icono={<CircleSlash className="size-4" aria-hidden />} onClick={() => cambiar('descartada')} cargando={guardando === 'descartada'} disabled={!!guardando}>
              Descartar
            </Button>
            {alerta.estado === 'nueva' && (
              <Button variante="secundario" icono={<Eye className="size-4" aria-hidden />} onClick={() => cambiar('en_seguimiento')} cargando={guardando === 'en_seguimiento'} disabled={!!guardando}>
                Iniciar seguimiento
              </Button>
            )}
            <Button icono={<CircleCheck className="size-4" aria-hidden />} onClick={() => cambiar('atendida')} cargando={guardando === 'atendida'} disabled={!!guardando}>
              Marcar como atendida
            </Button>
          </>
        ) : (
          <Button variante="secundario" onClick={onCerrar}>
            Cerrar
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tono={TONO_PRIORIDAD[alerta.prioridad]} conBorde>
            Prioridad {ETIQUETA_PRIORIDAD[alerta.prioridad].toLowerCase()}
          </Badge>
          <Badge tono={TONO_ESTADO_ALERTA[alerta.estado]} punto>
            {ETIQUETA_ESTADO_ALERTA[alerta.estado]}
          </Badge>
        </div>

        <p className="rounded-xl border border-borde bg-fondo-seccion-alterna p-4 text-sm text-texto-apoyo">{alerta.descripcion}</p>

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-texto-secundario">{etiqueta}</dt>
              <dd className="text-texto-principal">{valor}</dd>
            </div>
          ))}
        </dl>

        {abierta && alerta.tipo === 'ficha_sin_lider' && (
          <Link to={`/admin/fichas/${alerta.ficha.id}`} className={clasesBoton('secundario', 'sm')}>
            <UserPlus className="size-3.5" aria-hidden /> Asignar instructor líder en la ficha
          </Link>
        )}
        {abierta && (
          <p className="text-xs text-texto-secundario">
            Al cerrar la alerta queda registrado quién la atendió. Si la situación se repite, el sistema generará una alerta nueva.
          </p>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
      </div>
    </Modal>
  )
}
