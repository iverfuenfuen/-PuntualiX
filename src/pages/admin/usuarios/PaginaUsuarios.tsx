import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleCheck, CircleX, Eye, FileDown, RotateCcw, Search, UserPlus, UsersRound, UserRoundPlus } from 'lucide-react'
import { useSesion } from '@/app/sesionContexto'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import {
  AvatarIniciales,
  Badge,
  Button,
  Card,
  CardHeader,
  DataTable,
  EstadoError,
  Input,
  KpiCard,
  ModalConfirmacion,
  Pagination,
  Select,
  Spinner,
  Tabs,
  type Columna,
  type Pestana,
} from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { obtenerCatalogos } from '@/features/catalogos/servicioCatalogos'
import { ETIQUETA_DOCUMENTO } from '@/features/perfil/servicioPerfil'
import { descargarCSV } from '@/lib/csv'
import { useCarga } from '@/lib/useCarga'
import { cn, porcentaje } from '@/lib/utilidades'
import { ETIQUETA_ROL, type Rol, type Tono } from '@/types/dominio'
import { ModalDetalleUsuario } from '@/pages/admin/usuarios/ModalDetalleUsuario'
import { ModalRegistrarUsuario } from '@/features/usuarios/ModalRegistrarUsuario'
import { cambiarEstadoUsuario, listarUsuarios, type Usuario } from '@/features/usuarios/servicioUsuarios'

type Vista = 'todos' | Rol
const POR_PAGINA = 10
const FILTROS = ['q', 'estado', 'sede'] as const
const TONO_ROL: Record<Rol, Tono> = { administrador: 'primario', instructor: 'informacion', aprendiz: 'neutro' }

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Usuarios creados desde el día 1 del mes en curso */
function contarDelMesActual(lista: Usuario[]): number {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  return lista.filter((u) => new Date(u.creadoEn) >= inicioMes).length
}

type Dialogo = { tipo: 'registrar' } | { tipo: 'detalle'; usuario: Usuario } | { tipo: 'estado'; usuario: Usuario } | null

/**
 * CU02 — Gestión de usuarios (HU02.1 registrar, HU02.3 asignar roles, HU02.4 desactivar). Diseño del Prototipo.
 * El rol se filtra SOLO con las pestañas (el Prototipo lo repetía también en un selector).
 */
export function PaginaUsuarios() {
  const { usuario: sesion } = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const usuarios = useCarga(listarUsuarios, [])
  const catalogos = useCarga(obtenerCatalogos, [])

  const vista = (parametros.get('vista') as Vista | null) ?? 'todos'
  const pagina = Math.max(1, Number(parametros.get('pagina')) || 1)
  const filtro = Object.fromEntries(FILTROS.map((f) => [f, parametros.get(f) ?? ''])) as Record<(typeof FILTROS)[number], string>
  const hayFiltros = FILTROS.some((f) => filtro[f])

  function cambiarParametro(clave: string, valor: string) {
    setParametros(
      (p) => {
        const n = new URLSearchParams(p)
        if (valor) n.set(clave, valor)
        else n.delete(clave)
        if (clave !== 'pagina') n.delete('pagina')
        return n
      },
      { replace: true },
    )
  }

  function terminar(mensaje: string) {
    setDialogo(null)
    setAviso(mensaje)
    usuarios.recargar()
  }

  const filtrados = useMemo(() => {
    const texto = normalizar(filtro.q.trim())
    return (usuarios.datos ?? []).filter((u) => {
      if (filtro.estado && u.estado !== filtro.estado) return false
      if (filtro.sede && String(u.sedeId) !== filtro.sede) return false
      return !texto || [`${u.nombres} ${u.apellidos}`, u.numeroDocumento, u.correo].some((c) => normalizar(c).includes(texto))
    })
  }, [usuarios.datos, filtro.q, filtro.estado, filtro.sede])

  const enVista = vista === 'todos' ? filtrados : filtrados.filter((u) => u.rol === vista)
  const totalPaginas = Math.max(1, Math.ceil(enVista.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = enVista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const pestanas: Pestana<Vista>[] = [
    { id: 'todos', etiqueta: 'Todos', contador: filtrados.length },
    ...(['administrador', 'instructor', 'aprendiz'] as const).map((r) => ({
      id: r,
      etiqueta: { administrador: 'Administradores', instructor: 'Instructores', aprendiz: 'Aprendices' }[r],
      contador: filtrados.filter((u) => u.rol === r).length,
    })),
  ]

  const todos = usuarios.datos ?? []
  const activos = todos.filter((u) => u.estado === 'activo').length
  const nuevosMes = useMemo(() => contarDelMesActual(usuarios.datos ?? []), [usuarios.datos])

  function exportar() {
    descargarCSV(
      `usuarios-puntualix-${new Date().toISOString().slice(0, 10)}`,
      ['Nombres', 'Apellidos', 'Tipo documento', 'Documento', 'Correo', 'Teléfono', 'Rol', 'Sede', 'Ficha', 'Estado', 'Registrado'],
      enVista.map((u) => [u.nombres, u.apellidos, u.tipoDocumento, u.numeroDocumento, u.correo, u.telefono, ETIQUETA_ROL[u.rol], u.sede, u.fichaActiva?.numero, u.estado, u.creadoEn.slice(0, 10)]),
    )
  }

  const columnas: Columna<Usuario>[] = [
    {
      clave: 'usuario',
      encabezado: 'Usuario y correo',
      celda: (u) => (
        <div className="flex items-center gap-3">
          <AvatarIniciales nombres={u.nombres} apellidos={u.apellidos} tono={u.estado === 'activo' ? 'primario' : 'neutro'} />
          <div className="min-w-0">
            <p className="font-semibold text-texto-principal">
              {u.nombres} {u.apellidos}
            </p>
            <p className="truncate text-xs text-texto-secundario">{u.correo}</p>
          </div>
        </div>
      ),
    },
    { clave: 'documento', encabezado: 'Documento', ocultarEnMovil: true, celda: (u) => <span className="whitespace-nowrap">{ETIQUETA_DOCUMENTO[u.tipoDocumento]} {u.numeroDocumento}</span> },
    { clave: 'rol', encabezado: 'Rol', celda: (u) => <Badge tono={TONO_ROL[u.rol]}>{ETIQUETA_ROL[u.rol]}</Badge> },
    {
      clave: 'ubicacion',
      encabezado: 'Sede / ficha',
      ocultarEnMovil: true,
      celda: (u) =>
        u.fichaActiva ? (
          <Link to={`/admin/fichas/${u.fichaActiva.id}`} className="text-primario hover:underline">
            Ficha {u.fichaActiva.numero}
          </Link>
        ) : (
          (u.sede ?? <span className="text-texto-secundario">Sin sede</span>)
        ),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      celda: (u) => (
        <Badge tono={u.estado === 'activo' ? 'exito' : 'critico'} punto conBorde>
          {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      alineacion: 'derecha',
      celda: (u) => (
        <div className="flex justify-end gap-2">
          <Button variante="secundario" tamano="sm" icono={<Eye className="size-3.5" aria-hidden />} onClick={() => setDialogo({ tipo: 'detalle', usuario: u })} disabled={!catalogos.datos} aria-label={`Ver detalle de ${u.nombres} ${u.apellidos}`}>
            Detalle
          </Button>
          {u.id === sesion?.id ? (
            <span className="self-center text-xs text-texto-secundario italic">Cuenta propia</span>
          ) : (
            <Button
              variante="secundario"
              tamano="sm"
              className={u.estado === 'activo' ? 'text-alerta-critica' : 'text-confirmacion'}
              icono={u.estado === 'activo' ? <CircleX className="size-3.5" aria-hidden /> : <CircleCheck className="size-3.5" aria-hidden />}
              onClick={() => setDialogo({ tipo: 'estado', usuario: u })}
              aria-label={`${u.estado === 'activo' ? 'Desactivar' : 'Activar'} a ${u.nombres} ${u.apellidos}`}
            >
              {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Breadcrumbs migas={[{ etiqueta: 'Inicio', ruta: '/admin' }, { etiqueta: 'Gestión de usuarios' }]} />
      <header className="flex flex-col gap-3 border-b border-borde pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Gestión de usuarios</h1>
          <p className="mt-1 text-sm text-texto-secundario">Cuentas, roles y permisos de acceso de administradores, instructores y aprendices.</p>
        </div>
        <Button icono={<UserPlus className="size-4" aria-hidden />} onClick={() => setDialogo({ tipo: 'registrar' })}>
          Registrar usuario
        </Button>
      </header>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}

      {usuarios.error ? (
        <Card>
          <EstadoError mensaje={usuarios.error} onReintentar={usuarios.recargar} />
        </Card>
      ) : usuarios.cargando ? (
        <Card>
          <Spinner texto="Cargando usuarios…" />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard titulo="Usuarios registrados" valor={todos.length} icono={UsersRound} tono="informacion" />
            <KpiCard
              titulo="Usuarios activos"
              valor={activos}
              icono={CircleCheck}
              tono="exito"
              insignia={{ texto: `${porcentaje(todos.length ? (activos / todos.length) * 100 : 0)} habilitados`, tono: 'exito' }}
              pie="Con acceso a la plataforma"
            />
            <KpiCard titulo="Usuarios inactivos" valor={todos.length - activos} icono={CircleX} tono="critico" pie="Sin acceso; conservan su historial" />
            <KpiCard titulo="Nuevos este mes" valor={nuevosMes} icono={UserRoundPlus} tono="primario" />
          </div>

          <Card>
            <CardHeader
              titulo="Directorio de usuarios"
              acciones={
                <>
                  <Tabs etiqueta="Filtrar por rol" pestanas={pestanas} activa={vista} onCambiar={(v) => cambiarParametro('vista', v === 'todos' ? '' : v)} />
                  <Button variante="secundario" icono={<FileDown className="size-4" aria-hidden />} onClick={exportar} disabled={enVista.length === 0}>
                    Exportar
                  </Button>
                </>
              }
            />
            <div className="grid gap-3 border-b border-borde bg-fondo-seccion-alterna/60 px-5 py-4 sm:grid-cols-[minmax(220px,2fr)_1fr_1fr_auto] sm:px-6">
              <Input
                etiqueta="Buscar usuario"
                etiquetaOculta
                type="search"
                placeholder="Buscar por nombre, documento o correo…"
                iconoIzquierda={<Search className="size-4" />}
                value={filtro.q}
                onChange={(e) => cambiarParametro('q', e.target.value)}
              />
              <Select
                etiqueta="Estado"
                etiquetaOculta
                placeholder="Estado: todos"
                opciones={[
                  { valor: 'activo', etiqueta: 'Activos' },
                  { valor: 'inactivo', etiqueta: 'Inactivos' },
                ]}
                value={filtro.estado}
                onChange={(e) => cambiarParametro('estado', e.target.value)}
              />
              <Select
                etiqueta="Sede"
                etiquetaOculta
                placeholder="Sede: todas"
                opciones={(catalogos.datos?.sedes ?? []).map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))}
                value={filtro.sede}
                onChange={(e) => cambiarParametro('sede', e.target.value)}
              />
              <Button
                variante="secundario"
                className={cn(!hayFiltros && 'invisible')}
                icono={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => setParametros(vista === 'todos' ? {} : { vista }, { replace: true })}
                aria-hidden={!hayFiltros}
                tabIndex={hayFiltros ? 0 : -1}
              >
                Limpiar
              </Button>
            </div>
            <DataTable
              titulo="Directorio de usuarios"
              columnas={columnas}
              filas={visibles}
              claveFila={(u) => u.id}
              claseFila={(u) => (u.estado === 'inactivo' ? 'opacity-70' : undefined)}
              mensajeVacio="Ningún usuario coincide con la búsqueda o los filtros aplicados."
            />
            {enVista.length > 0 && (
              <div className="border-t border-borde">
                <Pagination pagina={paginaActual} totalRegistros={enVista.length} porPagina={POR_PAGINA} onCambiar={(p) => cambiarParametro('pagina', p > 1 ? String(p) : '')} nombreRegistros="usuarios" />
              </div>
            )}
          </Card>

          <p className="rounded-xl border border-informacion/20 bg-informacion/5 px-4 py-3 text-xs text-texto-apoyo">
            <strong className="text-texto-principal">Políticas de acceso:</strong> los cambios de rol y de estado quedan registrados en la bitácora. Un usuario
            inactivo no puede iniciar sesión, pero conserva todo su historial.
          </p>
        </>
      )}

      {dialogo?.tipo === 'registrar' && (
        <ModalRegistrarUsuario
          onCerrar={() => setDialogo(null)}
          onRegistrado={(u) => terminar(`Se envió la invitación a ${u.correo}. ${u.nombres} debe abrir el correo y crear su contraseña para activar la cuenta.`)}
        />
      )}

      {dialogo?.tipo === 'detalle' && catalogos.datos && (
        <ModalDetalleUsuario
          usuario={dialogo.usuario}
          catalogos={catalogos.datos}
          esCuentaPropia={dialogo.usuario.id === sesion?.id}
          onCerrar={() => setDialogo(null)}
          onGuardado={terminar}
        />
      )}

      {dialogo?.tipo === 'estado' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setDialogo(null)}
          codigo="HU02.4"
          titulo={dialogo.usuario.estado === 'activo' ? `¿Desactivar a ${dialogo.usuario.nombres}?` : `¿Activar a ${dialogo.usuario.nombres}?`}
          textoConfirmar={dialogo.usuario.estado === 'activo' ? 'Desactivar acceso' : 'Activar acceso'}
          peligro={dialogo.usuario.estado === 'activo'}
          onConfirmar={async () => {
            const nuevo = dialogo.usuario.estado === 'activo' ? 'inactivo' : 'activo'
            const r = await cambiarEstadoUsuario(dialogo.usuario.id, nuevo)
            if (!r.ok) return r.mensaje
            terminar(`${dialogo.usuario.nombres} ${dialogo.usuario.apellidos} quedó ${nuevo}.`)
          }}
        >
          {dialogo.usuario.estado === 'activo' ? (
            <p>
              {dialogo.usuario.nombres} {dialogo.usuario.apellidos} no podrá iniciar sesión. <strong className="text-texto-principal">No se borra ninguna información</strong>: su
              historial se conserva y la cuenta se puede reactivar.
            </p>
          ) : (
            <p>
              {dialogo.usuario.nombres} {dialogo.usuario.apellidos} podrá volver a iniciar sesión con su correo y contraseña.
            </p>
          )}
        </ModalConfirmacion>
      )}
    </>
  )
}
