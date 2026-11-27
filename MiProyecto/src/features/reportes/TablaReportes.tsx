import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, Eye } from 'lucide-react'
import { AvatarIniciales, Badge, Button, DataTable, Pagination, type Columna } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { fechaISOaTexto } from '@/features/fichas/presentacion'
import { ETIQUETA_ESTADO_REPORTE, ETIQUETA_FORMATO_REPORTE, ETIQUETA_TIPO_REPORTE } from '@/types/dominio'
import { descargarReporte, TONO_TIPO_REPORTE } from './acciones'
import type { Reporte } from './servicioReportes'

const POR_PAGINA = 7
const fechaHora = (iso: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso))

/**
 * Historial de reportes (Prototipo "Historial de Reportes Generados" y VersionAntigua "Historial de reportes"):
 * Tipo · Referencia y programa · Periodo · Generado por · Fecha y hora · Formato · Estado · Acciones (ver, descargar).
 */
export function TablaReportes({ reportes, titulo, mensajeVacio }: { reportes: Reporte[]; titulo: string; mensajeVacio: string }) {
  const navegar = useNavigate()
  const [pagina, setPagina] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const totalPaginas = Math.max(1, Math.ceil(reportes.length / POR_PAGINA))
  const actual = Math.min(pagina, totalPaginas)
  const visibles = reportes.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA)

  const columnas: Columna<Reporte>[] = [
    {
      clave: 'tipo',
      encabezado: 'Tipo',
      celda: (r) => (
        <Badge tono={TONO_TIPO_REPORTE[r.tipo]} punto conBorde>
          {ETIQUETA_TIPO_REPORTE[r.tipo]}
        </Badge>
      ),
    },
    {
      clave: 'referencia',
      encabezado: 'Referencia y programa',
      celda: (r) => (
        <div className="min-w-0 max-w-sm">
          <p className="font-semibold text-texto-principal">{r.titulo}</p>
          <p className="truncate text-xs text-texto-secundario">{r.parametros.subtitulo ?? `REP-${r.id}`}</p>
        </div>
      ),
    },
    { clave: 'periodo', encabezado: 'Periodo evaluado', ocultarEnMovil: true, celda: (r) => <span className="whitespace-nowrap">{fechaISOaTexto(r.desde)} — {fechaISOaTexto(r.hasta)}</span> },
    {
      clave: 'generado',
      encabezado: 'Generado por',
      ocultarEnMovil: true,
      celda: (r) => {
        const [n, ...a] = (r.generadoPor ?? '—').split(' ')
        return (
          <div className="flex items-center gap-2">
            <AvatarIniciales nombres={n} apellidos={a.join(' ')} tono="neutro" />
            <span>{r.generadoPor ?? '—'}</span>
          </div>
        )
      },
    },
    { clave: 'fecha', encabezado: 'Fecha y hora', celda: (r) => <span className="whitespace-nowrap">{fechaHora(r.creadoEn)}</span> },
    { clave: 'formato', encabezado: 'Formato', ocultarEnMovil: true, celda: (r) => <Badge tono={r.formato === 'csv' ? 'exito' : 'critico'}>{ETIQUETA_FORMATO_REPORTE[r.formato]}</Badge> },
    {
      clave: 'estado',
      encabezado: 'Estado',
      celda: (r) => (
        <Badge tono={r.estado === 'listo' ? 'exito' : r.estado === 'error' ? 'critico' : 'advertencia'} punto conBorde>
          {ETIQUETA_ESTADO_REPORTE[r.estado]}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      alineacion: 'derecha',
      celda: (r) => (
        <div className="flex justify-end gap-1">
          <Button variante="fantasma" tamano="sm" onClick={() => navegar(`/admin/reportes/${r.id}`)} aria-label={`Ver el reporte ${r.titulo}`} title="Ver reporte">
            <Eye className="size-4" aria-hidden />
          </Button>
          <Button
            variante="fantasma"
            tamano="sm"
            onClick={async () => setError(await descargarReporte(r))}
            disabled={r.estado !== 'listo'}
            aria-label={`Descargar el reporte ${r.titulo} en ${ETIQUETA_FORMATO_REPORTE[r.formato]}`}
            title={`Descargar ${ETIQUETA_FORMATO_REPORTE[r.formato]}`}
          >
            <Download className="size-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      {error && (
        <div className="px-5 pt-4 sm:px-6">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      <DataTable titulo={titulo} columnas={columnas} filas={visibles} claveFila={(r) => r.id} mensajeVacio={mensajeVacio} />
      {reportes.length > 0 && (
        <div className="border-t border-borde">
          <Pagination pagina={actual} totalRegistros={reportes.length} porPagina={POR_PAGINA} onCambiar={setPagina} nombreRegistros="reportes generados" />
        </div>
      )}
    </>
  )
}
