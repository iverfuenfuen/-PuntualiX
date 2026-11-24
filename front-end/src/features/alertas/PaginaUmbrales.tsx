import { useMemo, useState } from 'react'
import { Save, SlidersHorizontal } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardHeader, EstadoError, Input, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { useCarga } from '@/lib/useCarga'
import { ETIQUETA_PRIORIDAD } from '@/types/dominio'
import { esquemaUmbrales, type FormularioUmbral } from './esquemas'
import { fechaHora, TONO_PRIORIDAD } from './presentacion'
import { guardarUmbrales, listarUmbrales, type UmbralConfigurado } from './servicioAlertas'

const aFormulario = (lista: UmbralConfigurado[]): FormularioUmbral[] =>
  lista.map((u) => ({ id: u.id, prioridad: u.prioridad, porcentaje: u.porcentaje, descripcion: u.descripcion ?? '', activo: u.activo }))

/**
 * RF17 — "El administrador podrá configurar los porcentajes utilizados para generar alertas y determinar el riesgo de
 * deserción académica". Ni el Prototipo ni VersionAntigua tienen esta pantalla: es un formulario simple con los campos
 * de la tabla umbrales_alerta (prioridad, porcentaje, descripción y activo).
 */
export function PaginaUmbrales() {
  const umbrales = useCarga(listarUmbrales, [])
  return (
    <>
      <PageHeader
        titulo="Umbrales de alerta"
        icono={SlidersHorizontal}
        descripcion="Porcentajes de inasistencia a partir de los cuales se generan las alertas y se determina el riesgo de deserción."
      />
      {umbrales.error ? (
        <Card>
          <EstadoError mensaje={umbrales.error} onReintentar={umbrales.recargar} />
        </Card>
      ) : !umbrales.datos ? (
        <Card>
          <Spinner texto="Cargando umbrales…" />
        </Card>
      ) : (
        // key: al guardar se recargan los datos y el formulario vuelve a partir de ellos
        <FormularioUmbrales key={umbrales.datos.map((u) => u.actualizadoEn).join()} umbrales={umbrales.datos} onGuardado={umbrales.recargar} />
      )}
    </>
  )
}

function FormularioUmbrales({ umbrales, onGuardado }: { umbrales: UmbralConfigurado[]; onGuardado: () => void }) {
  const { usuario } = useSesion()
  const inicial = useMemo(() => aFormulario(umbrales), [umbrales])
  const [valores, setValores] = useState<FormularioUmbral[]>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cambiados = valores.filter((v, i) => JSON.stringify(v) !== JSON.stringify(inicial[i]))
  const ultimo = umbrales.reduce((a, b) => (b.actualizadoEn > a.actualizadoEn ? b : a))

  function actualizar(indice: number, cambio: Partial<FormularioUmbral>) {
    setValores((vs) => vs.map((v, i) => (i === indice ? { ...v, ...cambio } : v)))
    setError(null)
  }

  async function guardar() {
    const r = esquemaUmbrales.safeParse(valores)
    if (!r.success) return setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message])))
    setErrores({})
    if (!usuario) return
    setGuardando(true)
    const g = await guardarUmbrales(r.data.filter((v, i) => JSON.stringify(v) !== JSON.stringify(inicial[i])), usuario.id)
    setGuardando(false)
    if (!g.ok) return setError(g.mensaje)
    onGuardado()
  }

  return (
    <Card>
      <CardHeader
        titulo="Porcentajes de inasistencia"
        descripcion={`Última modificación: ${fechaHora(ultimo.actualizadoEn)}${ultimo.actualizadoPor ? ` · ${ultimo.actualizadoPor}` : ''}`}
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
      >
        <ul className="divide-y divide-borde">
          {valores.map((v, i) => (
            <li key={v.id} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[160px_180px_minmax(0,1fr)_auto] lg:items-start">
              <div className="lg:pt-7">
                <Badge tono={TONO_PRIORIDAD[v.prioridad]} conBorde>
                  Prioridad {ETIQUETA_PRIORIDAD[v.prioridad].toLowerCase()}
                </Badge>
              </div>
              <Input
                etiqueta="Inasistencia desde (%)"
                type="number"
                inputMode="decimal"
                min={0.01}
                max={100}
                step={0.5}
                requerido
                value={Number.isFinite(v.porcentaje) ? v.porcentaje : ''}
                onChange={(e) => actualizar(i, { porcentaje: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                error={errores[`${i}.porcentaje`]}
              />
              <Input etiqueta="Descripción" maxLength={200} value={v.descripcion} onChange={(e) => actualizar(i, { descripcion: e.target.value })} error={errores[`${i}.descripcion`]} />
              <label className="flex items-center gap-2 text-sm font-semibold text-texto-principal lg:pt-9">
                <input type="checkbox" className="size-4 accent-primario" checked={v.activo} onChange={(e) => actualizar(i, { activo: e.target.checked })} />
                Activo
              </label>
            </li>
          ))}
        </ul>
        {(errores[''] || error) && (
          <div className="px-5 pb-4 sm:px-6">
            <Aviso tipo="error">{errores[''] ?? error}</Aviso>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-borde px-5 py-4 sm:px-6">
          <Button type="submit" icono={<Save className="size-4" aria-hidden />} cargando={guardando} disabled={cambiados.length === 0}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  )
}
