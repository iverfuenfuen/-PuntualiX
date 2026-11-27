import { useState, type ReactNode } from 'react'
import { Archive, CircleCheck, Download, FileText, LayoutGrid, Plus, Search, TriangleAlert } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AlertCard,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Input,
  KpiCard,
  Modal,
  Pagination,
  PanelAlertas,
  ProgressBar,
  Select,
  Spinner,
  Tabs,
  Textarea,
  type AlertaPanel,
  type Columna,
} from '@/components/ui'
import type { Tono } from '@/types/dominio'

/* ---------------------------------------------------------------
 * Datos de EJEMPLO tomados del Prototipo (solo para este catálogo)
 * --------------------------------------------------------------- */
const hace = (min: number) => new Date(Date.now() - min * 60_000)

const ALERTAS_EJEMPLO: AlertaPanel[] = [
  {
    id: 1,
    nivel: 'critica',
    titulo: 'Límite crítico superado',
    descripcion: (
      <>
        Ficha <strong>301005</strong> alcanzó el <strong>35 %</strong> de inasistencias no justificadas.
      </>
    ),
    fecha: hace(15),
    acciones: [{ etiqueta: 'Ver ficha', ruta: '/admin/fichas' }, { etiqueta: 'Notificar líder', principal: true, onClick: () => alert('Ejemplo: notificar al líder') }],
  },
  {
    id: 2,
    nivel: 'advertencia',
    titulo: 'Cerca del límite',
    descripcion: (
      <>
        Ficha <strong>301002</strong> acumula <strong>22 %</strong> de inasistencias en el módulo formativo.
      </>
    ),
    fecha: hace(40),
    acciones: [{ etiqueta: 'Ver ficha', ruta: '/admin/fichas' }, { etiqueta: 'Alerta preventiva', principal: true }],
  },
  {
    id: 3,
    nivel: 'informativa',
    titulo: 'Sin instructor líder',
    descripcion: (
      <>
        Ficha <strong>301009</strong> sin instructor responsable asignado tras cambio de ciclo.
      </>
    ),
    fecha: hace(60),
    acciones: [{ etiqueta: 'Asignar ahora', principal: true, ruta: '/admin/fichas' }],
  },
]

interface FichaEjemplo {
  numero: string
  nivel: 'Tecnólogo' | 'Técnico'
  programa: string
  jornada: string
  sede: string
  aprendices: number
  asistencia: number | null
  estado: { texto: string; tono: Tono }
}

const FICHAS_EJEMPLO: FichaEjemplo[] = [
  { numero: '301002', nivel: 'Tecnólogo', programa: 'Análisis y Desarrollo de Software (ADSO)', jornada: 'Mañana', sede: 'Convención', aprendices: 24, asistencia: 90, estado: { texto: 'Activo · Óptimo', tono: 'exito' } },
  { numero: '301003', nivel: 'Técnico', programa: 'Gestión Administrativa', jornada: 'Mañana', sede: 'Convención', aprendices: 12, asistencia: 85, estado: { texto: 'Activo · Moderado', tono: 'advertencia' } },
  { numero: '301004', nivel: 'Tecnólogo', programa: 'ADSO Nocturno', jornada: 'Noche', sede: 'CIAA', aprendices: 16, asistencia: 78, estado: { texto: 'Activo · Moderado', tono: 'advertencia' } },
  { numero: '301007', nivel: 'Técnico', programa: 'Mercadeo Digital', jornada: 'Mañana', sede: 'CIAA', aprendices: 10, asistencia: 52, estado: { texto: 'Crítico (deserción)', tono: 'critico' } },
  { numero: '364433', nivel: 'Tecnólogo', programa: 'Gestión Empresarial', jornada: 'Mañana', sede: 'Convención', aprendices: 20, asistencia: null, estado: { texto: 'Inactiva (cierre)', tono: 'neutro' } },
]

const COLUMNAS: Columna<FichaEjemplo>[] = [
  {
    clave: 'numero',
    encabezado: 'Ficha & código',
    celda: (f) => (
      <span className="flex items-center gap-2">
        <strong className="font-titulos text-texto-principal">{f.numero}</strong>
        <Badge tono={f.nivel === 'Tecnólogo' ? 'exito' : 'neutro'}>{f.nivel}</Badge>
      </span>
    ),
  },
  { clave: 'programa', encabezado: 'Programa de formación' },
  { clave: 'jornada', encabezado: 'Jornada & sede', ocultarEnMovil: true, celda: (f) => `${f.jornada} · ${f.sede}` },
  { clave: 'aprendices', encabezado: 'Aprendices', alineacion: 'centro', ocultarEnMovil: true },
  {
    clave: 'asistencia',
    encabezado: 'Asistencia promedio',
    ocultarEnMovil: true,
    celda: (f) =>
      f.asistencia === null ? <span className="text-xs text-texto-secundario">— Etapa práctica —</span> : <ProgressBar valor={f.asistencia} etiqueta={`Asistencia de la ficha ${f.numero}`} className="w-40" />,
  },
  { clave: 'estado', encabezado: 'Estado / riesgo', celda: (f) => <Badge tono={f.estado.tono} punto conBorde>{f.estado.texto}</Badge> },
  { clave: 'accion', encabezado: 'Acción', alineacion: 'derecha', celda: (f) => <Button tamano="sm" variante={f.estado.tono === 'critico' ? 'peligro' : 'primario'}>Ver ficha</Button> },
]

/* --------------------------------------------------------------- */

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-texto-secundario">{descripcion}</p>
      </div>
      {children}
    </section>
  )
}

/** Catálogo visual de los componentes de la Etapa 0 (ruta /componentes). */
export function CatalogoComponentes() {
  const [pestana, setPestana] = useState<'todas' | 'activas' | 'riesgo' | 'inactivas'>('todas')
  const [pagina, setPagina] = useState(1)
  const [modal, setModal] = useState(false)

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/' }, { etiqueta: 'Catálogo de componentes' }]} />

      <PageHeader
        icono={LayoutGrid}
        titulo="Catálogo de componentes"
        insignia="Etapa 0"
        descripcion="Componentes reutilizables de PuntualiX con datos de ejemplo del Prototipo. Cambia la información; la estructura se mantiene."
        acciones={
          <Button variante="sobreOscuro" icono={<Plus className="size-4" aria-hidden />} onClick={() => setModal(true)}>
            Abrir modal de ejemplo
          </Button>
        }
      />

      <Seccion titulo="Tarjetas KPI" descripcion="KpiCard: título, ícono, valor, insignia, barra de progreso, chips y pie.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard titulo="Fichas registradas" valor={54} icono={FileText} tono="exito" insignia={{ texto: '+3 este trimestre' }} pie="Cohortes activas y pasadas en sistema" />
          <KpiCard titulo="Fichas activas" valor={39} icono={CircleCheck} tono="informacion" insignia={{ texto: '72 % del total', tono: 'neutro' }} progreso={{ valor: 72, etiqueta: 'Porcentaje de fichas activas' }} pie="En etapa lectiva regular" />
          <KpiCard titulo="Inactivas / productiva" valor={15} icono={Archive} tono="advertencia" insignia={{ texto: '28 % cerradas', tono: 'neutro' }} pie="Práctica, certificadas o archivadas" />
          <KpiCard
            titulo="Alertas de deserción"
            valor={6}
            unidad="fichas con riesgo"
            icono={TriangleAlert}
            tono="critico"
            destacada
            chips={[{ etiqueta: 'Críticas: 2', tono: 'critico' }, { etiqueta: 'Moderadas: 4', tono: 'advertencia' }]}
          />
        </div>
      </Seccion>

      <Seccion titulo="Tarjetas de alerta" descripcion="AlertCard en sus 4 niveles y PanelAlertas, que las agrupa (Incidentes recientes del dashboard).">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid content-start gap-3 sm:grid-cols-2">
            <AlertCard nivel="critica" titulo="Supera el límite" descripcion={<>Juan Perez tiene <strong>32 %</strong> de inasistencias en la ficha <strong>301002</strong>.</>} fecha={hace(5)} />
            <AlertCard nivel="advertencia" titulo="Justificación pendiente" descripcion={<>Hay <strong>3 justificaciones</strong> esperando revisión.</>} fecha={hace(120)} acciones={[{ etiqueta: 'Revisar', principal: true }]} />
            <AlertCard nivel="informativa" titulo="Reporte listo" descripcion="El reporte mensual de la ficha 301003 está disponible para descargar." fecha={hace(1440)} acciones={[{ etiqueta: 'Descargar' }]} />
            <AlertCard nivel="leve" titulo="Tendencia al alza" descripcion={<>Las inasistencias de la ficha <strong>301004</strong> subieron al <strong>14 %</strong>.</>} />
          </div>
          <PanelAlertas alertas={ALERTAS_EJEMPLO} nuevas={3} rutaVerTodas="/admin/alertas" />
        </div>
      </Seccion>

      <Seccion titulo="Tabla, pestañas y paginación" descripcion="DataTable + Tabs + Pagination dentro de una Card (Directorio de fichas del Prototipo).">
        <Card>
          <CardHeader
            titulo="Directorio de fichas de formación"
            descripcion="Consulta, filtra y gestiona el estado operativo de cada grupo formativo."
            acciones={
              <>
                <Tabs
                  etiqueta="Filtrar fichas por estado"
                  activa={pestana}
                  onCambiar={setPestana}
                  pestanas={[
                    { id: 'todas', etiqueta: 'Todas', contador: 54 },
                    { id: 'activas', etiqueta: 'Activas', contador: 39 },
                    { id: 'riesgo', etiqueta: 'En riesgo', contador: 6, tono: 'critico' },
                    { id: 'inactivas', etiqueta: 'Inactivas', contador: 15 },
                  ]}
                />
                <Button variante="secundario" icono={<Download className="size-4" aria-hidden />}>
                  Exportar
                </Button>
              </>
            }
          />
          <div className="grid gap-3 border-b border-borde px-5 py-4 sm:grid-cols-3 sm:px-6">
            <Input etiqueta="Buscar ficha" etiquetaOculta placeholder="Buscar por número de ficha o programa…" iconoIzquierda={<Search className="size-4" />} />
            <Select etiqueta="Sede" etiquetaOculta opciones={[{ valor: 'conv', etiqueta: 'Casa de la Convención' }, { valor: 'ciaa', etiqueta: 'CIAA' }]} placeholder="Sede: todas" />
            <Select etiqueta="Jornada" etiquetaOculta opciones={['Mañana', 'Tarde', 'Noche'].map((j) => ({ valor: j, etiqueta: j }))} placeholder="Jornada: todas" />
          </div>
          <DataTable titulo="Directorio de fichas" columnas={COLUMNAS} filas={FICHAS_EJEMPLO} claveFila={(f) => f.numero} />
          <div className="border-t border-borde">
            <Pagination pagina={pagina} totalRegistros={54} porPagina={8} onCambiar={setPagina} nombreRegistros="fichas formativas registradas" />
          </div>
        </Card>
      </Seccion>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Botones e insignias" descripcion="Button (5 variantes, 2 tamaños, estado de carga) y Badge (7 tonos).">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Primario</Button>
                <Button variante="secundario">Secundario</Button>
                <Button variante="fantasma">Fantasma</Button>
                <Button variante="peligro">Peligro</Button>
                <Button cargando>Guardando</Button>
                <Button tamano="sm" icono={<Plus className="size-4" aria-hidden />}>Pequeño</Button>
              </div>
              <div className="flex flex-wrap gap-2 rounded-lg bg-primario p-3">
                <Button variante="sobreOscuro">Sobre fondo verde</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tono="exito" punto conBorde>Asistió</Badge>
                <Badge tono="advertencia" punto conBorde>Pendiente</Badge>
                <Badge tono="critico" punto conBorde>Inasistencia</Badge>
                <Badge tono="informacion">Información</Badge>
                <Badge tono="oliva">Filtro activo</Badge>
                <Badge tono="primario">Primario</Badge>
                <Badge>Neutro</Badge>
              </div>
              <div className="space-y-2">
                <ProgressBar valor={90} etiqueta="Ejemplo alto" />
                <ProgressBar valor={74} etiqueta="Ejemplo moderado" />
                <ProgressBar valor={52} etiqueta="Ejemplo bajo" />
              </div>
            </CardBody>
          </Card>
        </Seccion>

        <Seccion titulo="Campos de formulario" descripcion="Input, Select y Textarea con etiqueta, ayuda y error accesibles.">
          <Card>
            <CardBody className="space-y-4">
              <Input etiqueta="Número de ficha" requerido placeholder="Ej. 301002" ayuda="Solo números, entre 4 y 20 dígitos." />
              <Input etiqueta="Correo institucional" type="email" defaultValue="juan.perez" error="Ingrese un correo válido" />
              <Select etiqueta="Jornada" requerido placeholder="Seleccionar" opciones={[{ valor: 'manana', etiqueta: 'Mañana' }, { valor: 'tarde', etiqueta: 'Tarde' }, { valor: 'noche', etiqueta: 'Noche' }]} />
              <Textarea etiqueta="Observación" placeholder="Comentario para el aprendiz…" />
            </CardBody>
          </Card>
        </Seccion>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Estado vacío" descripcion="EmptyState para tablas o listas sin resultados.">
          <Card>
            <EmptyState titulo="Sin resultados" descripcion="No se encontraron fichas con los filtros seleccionados." accion={<Button variante="secundario">Limpiar filtros</Button>} />
          </Card>
        </Seccion>
        <Seccion titulo="Cargando" descripcion="Spinner con texto accesible.">
          <Card>
            <Spinner texto="Cargando fichas…" />
          </Card>
        </Seccion>
      </div>

      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        codigo="HU10.1"
        titulo="Registrar nueva ficha"
        descripcion="Ejemplo de modal: Esc o clic fuera para cerrar."
        tamano="lg"
        pie={
          <>
            <Button variante="secundario" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModal(false)}>Guardar ficha</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input etiqueta="Número de ficha" requerido placeholder="301010" />
          <Select etiqueta="Sede" requerido placeholder="Seleccionar" opciones={[{ valor: 'conv', etiqueta: 'Casa de la Convención' }, { valor: 'ciaa', etiqueta: 'CIAA' }]} />
          <Input etiqueta="Fecha de inicio" type="date" requerido />
          <Input etiqueta="Fecha fin" type="date" requerido />
        </div>
      </Modal>
    </>
  )
}
