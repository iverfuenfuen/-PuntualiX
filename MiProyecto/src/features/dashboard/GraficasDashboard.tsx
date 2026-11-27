import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ETIQUETA_RIESGO } from '@/features/fichas/presentacion'
import { porcentaje } from '@/lib/utilidades'
import type { PuntoSemana } from './presentacion'

/**
 * Gráficas del dashboard (se descargan aparte, solo al mostrarse). Colores solo con tokens (var(--color-…)) y una tabla
 * equivalente para lectores de pantalla en cada una (RNF7).
 */

const ejes = { tickLine: false, tick: { fill: 'var(--color-texto-secundario)', fontSize: 11 } } as const

export interface BarraRiesgo {
  ficha: string
  inasistencia: number
  riesgo: 'media' | 'alta'
}

const COLOR_RIESGO = { media: 'var(--color-advertencia)', alta: 'var(--color-alerta-critica)' }

/** VersionAntigua "Riesgo de deserción por ficha": inasistencia de las fichas en riesgo moderado y crítico */
export function GraficaRiesgoFichas({ datos }: { datos: BarraRiesgo[] }) {
  return (
    <figure>
      <div className="h-52 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 18, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--color-borde)" vertical={false} />
            <XAxis dataKey="ficha" {...ejes} axisLine={{ stroke: 'var(--color-borde)' }} interval={0} />
            <YAxis tickFormatter={(v: number) => `${v} %`} {...ejes} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--color-fondo-seccion-alterna)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as BarraRiesgo | undefined
                if (!active || !p) return null
                return (
                  <div className="rounded-lg border border-borde bg-fondo-tarjeta px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-texto-principal">Ficha {p.ficha}</p>
                    <p className="text-texto-apoyo">Inasistencia: {porcentaje(p.inasistencia, 1)}</p>
                    <p className="text-texto-secundario">{ETIQUETA_RIESGO[p.riesgo].texto}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="inasistencia" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
              {datos.map((d) => (
                <Cell key={d.ficha} fill={COLOR_RIESGO[d.riesgo]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Riesgo de deserción por ficha</caption>
        <thead>
          <tr>
            <th scope="col">Ficha</th>
            <th scope="col">Inasistencia</th>
            <th scope="col">Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.ficha}>
              <td>{d.ficha}</td>
              <td>{porcentaje(d.inasistencia, 1)}</td>
              <td>{ETIQUETA_RIESGO[d.riesgo].texto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** "Tendencia de asistencia" (VersionAntigua) con el diseño de "Evolución semanal" del Prototipo: barras por semana y meta SENA */
export function GraficaTendenciaSemanal({ datos, meta }: { datos: PuntoSemana[]; meta: number }) {
  const filas = datos.map((d) => ({ ...d, valor: d.porcentaje ?? 0 }))
  return (
    <figure>
      <div className="h-52 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 22, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--color-borde)" vertical={false} />
            <XAxis dataKey="semana" {...ejes} axisLine={{ stroke: 'var(--color-borde)' }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v} %`} {...ejes} axisLine={false} />
            <ReferenceLine y={meta} stroke="var(--color-texto-secundario)" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ fill: 'var(--color-fondo-seccion-alterna)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as PuntoSemana | undefined
                if (!active || !p) return null
                return (
                  <div className="rounded-lg border border-borde bg-fondo-tarjeta px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-texto-principal">
                      {p.semana}
                      {p.actual && ' (actual)'}
                    </p>
                    <p className="text-texto-apoyo">Asistencia: {porcentaje(p.porcentaje, 1)}</p>
                    <p className="text-texto-secundario">{p.registros} registros</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
              {filas.map((d) => (
                <Cell key={d.semana} fill={d.actual ? 'var(--color-confirmacion)' : 'var(--color-primario)'} fillOpacity={d.actual ? 1 : 0.7} />
              ))}
              <LabelList dataKey="porcentaje" position="top" formatter={(v: unknown) => (typeof v === 'number' ? porcentaje(v) : '—')} fill="var(--color-texto-secundario)" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Tendencia de asistencia por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana</th>
            <th scope="col">Asistencia</th>
            <th scope="col">Registros</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.semana}>
              <td>{d.semana}</td>
              <td>{porcentaje(d.porcentaje, 1)}</td>
              <td>{d.registros}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
