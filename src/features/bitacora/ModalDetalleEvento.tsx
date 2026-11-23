import { CircleAlert, CircleCheck, CircleX, Database, UserRound } from 'lucide-react'
import { Badge, Button, Modal } from '@/components/ui'
import { cn } from '@/lib/utilidades'
import { ETIQUETA_MODULO, ETIQUETA_RESULTADO, ETIQUETA_ROL } from '@/types/dominio'
import { cambiosDelEvento, ETIQUETA_TABLA, fechaCompleta, identificarRegistro, tituloEvento } from './presentacion'
import type { EventoBitacora } from './servicioBitacora'

const ICONO_RESULTADO = { exito: CircleCheck, alerta: CircleAlert, error: CircleX }
const CAJA_RESULTADO = {
  exito: 'border-confirmacion/25 bg-confirmacion/5 text-confirmacion',
  alerta: 'border-advertencia/40 bg-advertencia/10 text-texto-principal',
  error: 'border-alerta-critica/25 bg-alerta-critica/5 text-alerta-critica',
}

/** HU11.3 — Detalle de un evento de auditoría (diseño del Prototipo, solo con los datos que registra la BD). */
export function ModalDetalleEvento({ evento, onCerrar }: { evento: EventoBitacora; onCerrar: () => void }) {
  const Icono = ICONO_RESULTADO[evento.resultado]
  const cambios = cambiosDelEvento(evento)
  const registro = identificarRegistro(evento)
  const tituloCambios = evento.accion === 'modificacion' ? 'Campos modificados' : evento.accion === 'eliminacion' ? 'Datos eliminados' : 'Datos registrados'

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="lg"
      codigo={`HU11.3 · EVT-${evento.id}`}
      titulo="Detalle del evento de auditoría"
      descripcion={`${ETIQUETA_MODULO[evento.modulo]} · ${tituloEvento(evento)}`}
      pie={<Button onClick={onCerrar}>Cerrar</Button>}
    >
      <div className="space-y-5">
        <div className={cn('flex items-center gap-3 rounded-xl border p-4', CAJA_RESULTADO[evento.resultado])}>
          <Icono className="size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-titulos text-xs font-semibold tracking-wide uppercase">Resultado de la operación</p>
            <p className="font-semibold">{ETIQUETA_RESULTADO[evento.resultado]}</p>
          </div>
        </div>

        <section className="rounded-xl border border-borde p-4">
          <h3 className="mb-3 flex items-center gap-2 font-titulos text-sm font-semibold tracking-wide uppercase">
            <UserRound className="size-4 text-primario" aria-hidden /> Responsable y contexto
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-texto-secundario">Usuario responsable</dt>
              <dd className="font-semibold text-texto-principal">{evento.usuario ?? 'Sistema (proceso automático)'}</dd>
              {evento.rol && <dd className="text-xs text-texto-secundario">{ETIQUETA_ROL[evento.rol]}</dd>}
            </div>
            <div>
              <dt className="text-xs text-texto-secundario">Fecha y hora exacta</dt>
              <dd className="text-texto-principal">{fechaCompleta(evento.fecha)} (hora de Colombia)</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-borde p-4">
          <h3 className="mb-3 flex items-center gap-2 font-titulos text-sm font-semibold tracking-wide uppercase">
            <Database className="size-4 text-primario" aria-hidden /> Operación y registro afectado
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-texto-secundario">Módulo</dt>
              <dd className="text-texto-principal">{ETIQUETA_MODULO[evento.modulo]}</dd>
            </div>
            <div>
              <dt className="text-xs text-texto-secundario">Acción</dt>
              <dd className="text-texto-principal">{tituloEvento(evento)}</dd>
            </div>
            {evento.tabla && (
              <div>
                <dt className="text-xs text-texto-secundario">Registro afectado</dt>
                <dd className="text-texto-principal">
                  {registro ?? ETIQUETA_TABLA[evento.tabla] ?? evento.tabla}
                  {evento.registroId && <span className="ml-1 text-xs text-texto-secundario">(id {evento.registroId})</span>}
                </dd>
              </div>
            )}
            {evento.detalle && !evento.tabla && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-texto-secundario">Detalle</dt>
                <dd className="text-texto-principal">{evento.detalle}</dd>
              </div>
            )}
          </dl>

          {cambios.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-borde">
              <table className="w-full text-sm">
                <caption className="border-b border-borde bg-fondo-seccion-alterna px-3 py-2 text-left font-semibold text-texto-principal">{tituloCambios}</caption>
                <thead>
                  <tr className="border-b border-borde text-xs text-texto-secundario">
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Campo</th>
                    {evento.datosAnteriores && <th scope="col" className="px-3 py-2 text-left font-semibold">Antes</th>}
                    {evento.datosNuevos && <th scope="col" className="px-3 py-2 text-left font-semibold">Después</th>}
                  </tr>
                </thead>
                <tbody>
                  {cambios.map((c) => (
                    <tr key={c.campo} className="border-b border-borde last:border-b-0 align-top">
                      <th scope="row" className="px-3 py-2 text-left font-semibold whitespace-nowrap text-texto-principal">{c.campo}</th>
                      {evento.datosAnteriores && <td className="px-3 py-2 break-all text-texto-apoyo">{c.antes}</td>}
                      {evento.datosNuevos && <td className={cn('px-3 py-2 break-all', evento.datosAnteriores ? 'font-semibold text-texto-principal' : 'text-texto-apoyo')}>{c.despues}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {evento.accion === 'modificacion' && cambios.length === 0 && <p className="mt-3 text-xs text-texto-secundario">Solo cambiaron campos técnicos (fechas de actualización).</p>}
        </section>

        <p className="text-xs text-texto-secundario">
          <Badge tono="neutro">Solo lectura</Badge> La bitácora no se puede modificar ni eliminar, ni siquiera por un administrador.
        </p>
      </div>
    </Modal>
  )
}
