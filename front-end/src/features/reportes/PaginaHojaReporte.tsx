import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, FileDown, Printer } from 'lucide-react'
import logoNegativo from '@/assets/img/LogoNegativo/negativo_sin_eslogan_transparente.png'
import { Button, EmptyState, EstadoError, Spinner } from '@/components/ui'
import { registrarEvento } from '@/features/auth/servicioAuth'
import { fechaISOaTexto } from '@/features/fichas/presentacion'
import { useCarga } from '@/lib/useCarga'
import type { Resultado } from '@/lib/resultado'
import { ETIQUETA_ROL, type Rol } from '@/types/dominio'
import { armarReporte, descargarReporteCSV, type ContenidoReporte } from './armadoReportes'
import { obtenerReporte, type Reporte } from './servicioReportes'

async function cargar(id: number): Promise<Resultado<{ reporte: Reporte; contenido: ContenidoReporte } | null>> {
  const r = await obtenerReporte(id)
  if (!r.ok) return r
  if (!r.datos) return { ok: true, datos: null }
  const c = await armarReporte(r.datos)
  if (!c.ok) return c
  return { ok: true, datos: { reporte: r.datos, contenido: c.datos } }
}

const fechaGeneracion = (iso: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso))

/**
 * Hoja de reporte imprimible (VersionAntigua: reporte-ficha-ejemplo.html y reporte-instructor-ejemplo.html).
 * Sin navbar ni pie; con @media print la barra superior desaparece y "Imprimir → Guardar como PDF" produce el PDF
 * (decisión del usuario: sin librerías de PDF). Con ?imprimir=1 abre el diálogo de impresión al terminar de cargar.
 */
export function PaginaHojaReporte() {
  const { id } = useParams()
  const [parametros] = useSearchParams()
  const hoja = useCarga(() => cargar(Number(id)), [id])
  const impreso = useRef(false)

  useEffect(() => {
    if (!hoja.datos || impreso.current || parametros.get('imprimir') !== '1') return
    impreso.current = true
    void registrarEvento('reportes', 'descarga', `Descargó en PDF el reporte REP-${hoja.datos.reporte.id}`)
    setTimeout(() => window.print(), 300)
  }, [hoja.datos, parametros])

  if (hoja.error) return <div className="p-8"><EstadoError mensaje={hoja.error} onReintentar={hoja.recargar} /></div>
  if (!hoja.datos && hoja.cargando) return <div className="p-8"><Spinner texto="Armando el reporte…" /></div>
  if (!hoja.datos) return <div className="p-8"><EmptyState titulo="Reporte no encontrado" descripcion="El reporte no existe o no tiene permiso para verlo." /></div>

  const { reporte: r, contenido: c } = hoja.datos
  return (
    <div className="min-h-screen bg-fondo-seccion-alterna print:bg-white">
      <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-2 px-4 py-4 print:hidden">
        <Link to="/admin/reportes" className="flex items-center gap-1.5 text-sm font-semibold text-primario hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Volver a Reportes
        </Link>
        <div className="flex gap-2">
          <Button
            variante="secundario"
            icono={<FileDown className="size-4" aria-hidden />}
            onClick={() => {
              descargarReporteCSV(r, c)
              void registrarEvento('reportes', 'descarga', `Descargó en CSV el reporte REP-${r.id}`)
            }}
          >
            Descargar CSV
          </Button>
          <Button
            icono={<Printer className="size-4" aria-hidden />}
            onClick={() => {
              void registrarEvento('reportes', 'descarga', `Descargó en PDF el reporte REP-${r.id}`)
              window.print()
            }}
          >
            Imprimir / Guardar como PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto max-w-[900px] bg-fondo-tarjeta shadow-sm print:shadow-none">
        <header className="flex flex-col gap-4 bg-primario-oscuro px-8 py-6 text-white sm:flex-row sm:items-center sm:justify-between print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <div className="flex items-center gap-5">
            <img src={logoNegativo} alt="PuntualiX" className="h-auto w-[120px]" />
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">{c.titulo}</h1>
              <p className="text-sm text-white/85">
                Período consultado: {fechaISOaTexto(r.desde)} — {fechaISOaTexto(r.hasta)}
              </p>
            </div>
          </div>
          <dl className="text-sm text-white/90 sm:text-right">
            <div>
              <dt className="inline">Generado por: </dt>
              <dd className="inline font-semibold">{r.generadoPor ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline">Rol: </dt>
              <dd className="inline">{r.generadoPorRol ? ETIQUETA_ROL[r.generadoPorRol as Rol] : '—'}</dd>
            </div>
            <div>
              <dt className="inline">Fecha de generación: </dt>
              <dd className="inline">{fechaGeneracion(r.creadoEn)}</dd>
            </div>
            <div>
              <dt className="inline">Referencia: </dt>
              <dd className="inline">REP-{r.id}</dd>
            </div>
          </dl>
        </header>

        <div className="space-y-8 px-8 py-7">
          <section>
            <h2 className="mb-3 border-b border-borde pb-2 text-base font-semibold">{c.seccionDatos}</h2>
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {c.datos.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold tracking-wide text-texto-secundario uppercase">{k}</dt>
                  <dd className="text-sm text-texto-principal">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="mb-3 border-b border-borde pb-2 text-base font-semibold">{c.seccionResumen}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {c.resumen.map((x) => (
                <div key={x.etiqueta} className="rounded-xl border border-borde p-4 text-center">
                  <p className="font-titulos text-2xl font-bold text-primario">{x.valor}</p>
                  <p className="text-xs text-texto-secundario">{x.etiqueta}</p>
                </div>
              ))}
            </div>
          </section>

          {c.tablas.map((t) => (
            <section key={t.titulo}>
              <h2 className="mb-3 border-b border-borde pb-2 text-base font-semibold">{t.titulo}</h2>
              {t.filas.length === 0 ? (
                <p className="text-sm text-texto-secundario">Sin datos en el periodo consultado.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">{t.titulo}</caption>
                  <thead>
                    <tr className="border-b border-borde bg-fondo-seccion-alterna">
                      {t.encabezados.map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 text-left font-titulos text-xs font-semibold tracking-wide text-texto-secundario uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.filas.map((f, i) => (
                      <tr key={i} className="border-b border-borde last:border-b-0">
                        {f.map((celda, j) => (
                          <td key={j} className="px-3 py-2 text-texto-principal">
                            {celda}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>

        <footer className="border-t border-borde px-8 py-4 text-center text-xs text-texto-secundario">
          Documento generado automáticamente por PuntualiX · Programa de formación SENA · {new Date(r.creadoEn).getFullYear()}
        </footer>
      </article>
    </div>
  )
}
