import { useMemo, useState } from 'react'
import { Save, SlidersHorizontal, Undo2 } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Badge, Button, Card, CardHeader, EstadoError, Input, Spinner, TONO_SOLIDO } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { riesgoAprendiz } from '@/features/fichas/presentacion'
import { listarFichas } from '@/features/fichas/servicioFichas'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_PRIORIDAD, type PrioridadAlerta } from '@/types/dominio'
import { esquemaUmbrales, type FormularioUmbral } from './esquemas'
import { fechaHora, TONO_PRIORIDAD } from './presentacion'
import { guardarUmbrales, listarUmbrales, type UmbralConfigurado } from './servicioAlertas'

const SIGNIFICADO: Record<PrioridadAlerta, string> = {
  baja: 'Seguimiento preventivo: la inasistencia empieza a subir.',
  media: 'Cerca del límite: se notifica al instructor líder.',
  alta: 'Límite crítico superado: riesgo de deserción.',
}

const aFormulario = (lista: UmbralConfigurado[]): FormularioUmbral[] =>
  lista.map((u) => ({ id: u.id, prioridad: u.prioridad, porcentaje: u.porcentaje, descripcion: u.descripcion ?? '', activo: u.activo }))

/** RF17 — Configuración de los umbrales que disparan las alertas automáticas (solo administrador). */
export function PaginaUmbrales() {
  const umbrales = useCarga(listarUmbrales, [])
  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Alertas', ruta: '/admin/alertas' }, { etiqueta: 'Umbrales de alerta' }]} />
      <header className="border-b border-borde pb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Umbrales de alerta</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Porcentajes de inasistencia no justificada a partir de los cuales el sistema genera alertas para aprendices y fichas.
        </p>
      </header>
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
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const fichas = useCarga(listarFichas, [])

  const cambiados = valores.filter((v, i) => JSON.stringify(v) !== JSON.stringify(inicial[i]))
  const ultimo = umbrales.reduce((a, b) => (b.actualizadoEn > a.actualizadoEn ? b : a))

  function actualizar(indice: number, cambio: Partial<FormularioUmbral>) {
    setValores((vs) => vs.map((v, i) => (i === indice ? { ...v, ...cambio } : v)))
    setMensaje(null)
  }

  // Vista previa: cómo quedarían clasificadas HOY las fichas activas con los valores escritos
  const activosValidos = valores.filter((v) => v.activo && Number.isFinite(v.porcentaje) && v.porcentaje > 0)
  const previa = useMemo(() => {
    const conteo: Record<PrioridadAlerta, number> = { baja: 0, media: 0, alta: 0 }
    const lista = activosValidos.map((v) => ({ prioridad: v.prioridad, porcentaje: v.porcentaje }))
    for (const f of fichas.datos ?? []) {
      if (f.estado !== 'activa' || f.totalRegistros === 0) continue
      const nivel = riesgoAprendiz(f.porcentajeInasistencia, lista)
      if (nivel) conteo[nivel]++
    }
    return conteo
  }, [fichas.datos, activosValidos])

  async function guardar() {
    const r = esquemaUmbrales.safeParse(valores)
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message])))
      return
    }
    setErrores({})
    if (!usuario) return
    setGuardando(true)
    const g = await guardarUmbrales(
      r.data.filter((v, i) => JSON.stringify(v) !== JSON.stringify(inicial[i])),
      usuario.id,
    )
    setGuardando(false)
    if (!g.ok) return setMensaje({ tipo: 'error', texto: g.mensaje })
    onGuardado()
  }

  const errorGeneral = errores['']

  return (
    <>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            titulo="Niveles de alerta"
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
              {valores.map((v, i) => {
                const error = errores[`${i}.porcentaje`]
                return (
                  <li key={v.id} className={cn('grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[180px_160px_minmax(0,1fr)] lg:items-start', !v.activo && 'bg-fondo-seccion-alterna/60')}>
                    <div className="space-y-2">
                      <Badge tono={TONO_PRIORIDAD[v.prioridad]} conBorde>
                        Prioridad {ETIQUETA_PRIORIDAD[v.prioridad].toLowerCase()}
                      </Badge>
                      <p className="text-xs text-texto-secundario">{SIGNIFICADO[v.prioridad]}</p>
                      <label className="flex items-center gap-2 text-sm text-texto-principal">
                        <input
                          type="checkbox"
                          className="size-4 accent-primario focus-visible:outline-2 focus-visible:outline-primario"
                          checked={v.activo}
                          onChange={(e) => actualizar(i, { activo: e.target.checked })}
                        />
                        {v.activo ? 'Activo' : 'Inactivo (no genera alertas)'}
                      </label>
                    </div>
                    <Input
                      etiqueta="Inasistencia desde"
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      max={100}
                      step={0.5}
                      requerido
                      adornoDerecha={<span className="text-sm text-texto-secundario">%</span>}
                      value={Number.isFinite(v.porcentaje) ? v.porcentaje : ''}
                      onChange={(e) => actualizar(i, { porcentaje: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                      error={error}
                      disabled={!v.activo}
                    />
                    <Input
                      etiqueta="Descripción"
                      placeholder="Ej: Inasistencia crítica"
                      maxLength={200}
                      value={v.descripcion}
                      onChange={(e) => actualizar(i, { descripcion: e.target.value })}
                      error={errores[`${i}.descripcion`]}
                    />
                  </li>
                )
              })}
            </ul>
            {errorGeneral && (
              <div className="px-5 pb-4 sm:px-6">
                <Aviso tipo="error">{errorGeneral}</Aviso>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-borde px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button
                type="button"
                variante="secundario"
                icono={<Undo2 className="size-4" aria-hidden />}
                onClick={() => {
                  setValores(inicial)
                  setErrores({})
                }}
                disabled={cambiados.length === 0 || guardando}
              >
                Descartar cambios
              </Button>
              <Button type="submit" icono={<Save className="size-4" aria-hidden />} cargando={guardando} disabled={cambiados.length === 0}>
                Guardar umbrales
              </Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal className="size-4 text-primario" aria-hidden /> Escala resultante
          </h2>
          <EscalaUmbrales umbrales={activosValidos} />
          <h3 className="mt-5 text-sm font-semibold text-texto-principal">Fichas activas que quedarían en cada nivel</h3>
          {fichas.cargando ? (
            <Spinner />
          ) : fichas.error ? (
            <p className="mt-2 text-sm text-texto-secundario">No fue posible calcular la vista previa.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {(['alta', 'media', 'baja'] as const).map((p) => (
                <li key={p} className="flex items-center justify-between">
                  <Badge tono={TONO_PRIORIDAD[p]}>Prioridad {ETIQUETA_PRIORIDAD[p].toLowerCase()}</Badge>
                  <span className="font-titulos font-semibold">{previa[p]} fichas</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-texto-secundario">
            El nivel de riesgo de las fichas cambia en cuanto se guardan los umbrales. Las alertas nuevas se generan con los siguientes registros de asistencia; las
            alertas ya abiertas no se recalculan. Cada cambio queda registrado en la bitácora.
          </p>
        </Card>
      </div>
    </>
  )
}

/** Barra 0–100 % dividida por los umbrales activos (sin alerta → baja → media → alta) */
function EscalaUmbrales({ umbrales }: { umbrales: Array<{ prioridad: PrioridadAlerta; porcentaje: number }> }) {
  const ordenados = [...umbrales].sort((a, b) => a.porcentaje - b.porcentaje)
  const tramos = [
    { desde: 0, hasta: ordenados[0]?.porcentaje ?? 100, clase: TONO_SOLIDO.exito, texto: 'Sin alerta' },
    ...ordenados.map((u, k) => ({
      desde: u.porcentaje,
      hasta: ordenados[k + 1]?.porcentaje ?? 100,
      clase: TONO_SOLIDO[TONO_PRIORIDAD[u.prioridad]],
      texto: `Prioridad ${ETIQUETA_PRIORIDAD[u.prioridad].toLowerCase()}`,
    })),
  ].filter((t) => t.hasta > t.desde)

  return (
    <div className="mt-3">
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={tramos.map((t) => `${t.texto}: de ${porcentaje(t.desde, 2)} a ${porcentaje(t.hasta, 2)}`).join('; ')}>
        {tramos.map((t) => (
          <span key={t.texto} className={cn('h-full border-r-2 border-white last:border-r-0', t.clase)} style={{ width: `${t.hasta - t.desde}%` }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-texto-apoyo">
        {tramos.map((t) => (
          <li key={t.texto} className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-full', t.clase)} aria-hidden />
            <span className="font-semibold text-texto-principal">{t.texto}</span>
            <span>
              {porcentaje(t.desde, 2)} – {porcentaje(t.hasta, 2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
