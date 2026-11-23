import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { porcentaje } from '@/lib/utilidades'
import { META_CUMPLIMIENTO, type PuntoMensual } from './presentacion'

/**
 * Cumplimiento mes a mes (una sola serie: el título la nombra, sin leyenda).
 * Colores solo con tokens del Manual (var(--color-…)); la meta del 80 % es una referencia gris punteada.
 * Incluye una tabla equivalente para lectores de pantalla (accesibilidad, RNF7).
 */
export function GraficaCumplimiento({ datos }: { datos: PuntoMensual[] }) {
  return (
    <figure>
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 16, right: 16, bottom: 4, left: -12 }}>
            <CartesianGrid stroke="var(--color-borde)" strokeDasharray="0" vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={{ stroke: 'var(--color-borde)' }} tick={{ fill: 'var(--color-texto-secundario)', fontSize: 12 }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v} %`} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-texto-secundario)', fontSize: 12 }} />
            <ReferenceLine
              y={META_CUMPLIMIENTO}
              stroke="var(--color-texto-secundario)"
              strokeDasharray="4 4"
              label={{ value: `Meta ${META_CUMPLIMIENTO} %`, position: 'insideTopRight', fill: 'var(--color-texto-secundario)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-texto-deshabilitado)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as PuntoMensual | undefined
                if (!active || !p) return null
                return (
                  <div className="rounded-lg border border-borde bg-fondo-tarjeta px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-texto-principal">{p.mes}</p>
                    <p className="text-texto-apoyo">Cumplimiento: {porcentaje(p.cumplimiento, 1)}</p>
                    <p className="text-texto-secundario">
                      {p.ejecutadas} de {p.vencidas} sesiones con asistencia registrada
                    </p>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="cumplimiento"
              stroke="var(--color-primario)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-primario)', stroke: 'var(--color-fondo-tarjeta)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--color-primario)', stroke: 'var(--color-fondo-tarjeta)', strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Cumplimiento docente por mes</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Cumplimiento</th>
            <th scope="col">Sesiones registradas</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.mes}>
              <td>{d.mes}</td>
              <td>{porcentaje(d.cumplimiento, 1)}</td>
              <td>
                {d.ejecutadas} de {d.vencidas}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
