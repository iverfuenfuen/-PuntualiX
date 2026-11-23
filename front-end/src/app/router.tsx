import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import { BellRing } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { MENU_USUARIO, NAVEGACION, RUTA_ALERTAS, type EnlaceNavegacion } from '@/config/navegacion'
import { PaginaLogin } from '@/features/auth/PaginaLogin'
import { PaginaRecuperar } from '@/features/auth/PaginaRecuperar'
import { PaginaRestablecer } from '@/features/auth/PaginaRestablecer'
import { EnConstruccion } from '@/pages/EnConstruccion'
import { NoEncontrada } from '@/pages/NoEncontrada'
import { RUTA_INICIO_ROL, type Rol } from '@/types/dominio'
import { RedireccionInicio, RutaProtegida } from './RutaProtegida'
import { SesionSupabaseProvider } from './SesionSupabaseProvider'

/**
 * Etapa del plan en la que se construye cada pantalla (ver README → Plan de migración).
 * Al construir una pantalla se agrega a PANTALLAS y deja de mostrarse <EnConstruccion>.
 */
const ETAPA_POR_RUTA: Record<string, number> = {
  '/admin/estadisticas': 5, '/admin/reportes': 5,
}
const ETAPA_POR_ROL: Record<Rol, number> = { administrador: 4, instructor: 6, aprendiz: 7 }

/** Pantallas ya construidas: se cargan bajo demanda (división del código por ruta, RNF1) */
const cargarPerfil = async () => ({ Component: (await import('@/features/perfil/PaginaPerfil')).PaginaPerfil })
const PANTALLAS: Record<string, RouteObject['lazy']> = {
  '/admin/perfil': cargarPerfil,
  '/instructor/perfil': cargarPerfil,
  '/aprendiz/perfil': cargarPerfil,
  // Etapa 3 — Instructores y Usuarios (Admin)
  '/admin/instructores': async () => ({ Component: (await import('@/features/instructores/PaginaInstructores')).PaginaInstructores }),
  '/admin/usuarios': async () => ({ Component: (await import('@/features/usuarios/PaginaUsuarios')).PaginaUsuarios }),
  // Etapa 4 — Dashboard, alertas con umbrales y bitácora (Admin)
  '/admin': async () => ({ Component: (await import('@/features/dashboard/PaginaDashboard')).PaginaDashboard }),
  '/admin/alertas': async () => ({ Component: (await import('@/features/alertas/PaginaAlertas')).PaginaAlertas }),
  '/admin/alertas/umbrales': async () => ({ Component: (await import('@/features/alertas/PaginaUmbrales')).PaginaUmbrales }),
  '/admin/bitacora': async () => ({ Component: (await import('@/features/bitacora/PaginaBitacora')).PaginaBitacora }),
  // Etapa 2 — Fichas (Admin)
  '/admin/fichas': async () => ({ Component: (await import('@/features/fichas/PaginaFichas')).PaginaFichas }),
}

/** Pantallas que no aparecen en el menú (detalles, formularios). La ruta es relativa a la del rol. */
const RUTAS_ADICIONALES: Record<Rol, RouteObject[]> = {
  administrador: [
    { path: 'fichas/:id', lazy: async () => ({ Component: (await import('@/features/fichas/PaginaDetalleFicha')).PaginaDetalleFicha }) },
    { path: 'instructores/:id', lazy: async () => ({ Component: (await import('@/features/instructores/PaginaPerfilInstructor')).PaginaPerfilInstructor }) },
  ],
  instructor: [],
  aprendiz: [],
}

function rutasDeRol(rol: Rol): RouteObject {
  const base = RUTA_INICIO_ROL[rol]
  const enlaces: EnlaceNavegacion[] = [
    ...NAVEGACION[rol],
    ...MENU_USUARIO[rol],
    { etiqueta: 'Alertas y notificaciones', ruta: RUTA_ALERTAS[rol], icono: BellRing },
  ]
  const unicos = [...new Map(enlaces.map((e) => [e.ruta, e])).values()]

  return {
    path: base,
    element: <RutaProtegida roles={[rol]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          ...unicos.map(({ etiqueta, ruta, icono }): RouteObject => {
            const ubicacion = ruta === base ? { index: true as const } : { path: ruta.slice(base.length + 1) }
            const lazy = PANTALLAS[ruta]
            if (lazy) return { ...ubicacion, lazy }
            return { ...ubicacion, element: <EnConstruccion titulo={etiqueta} icono={icono} etapa={ETAPA_POR_RUTA[ruta] ?? ETAPA_POR_ROL[rol]} /> }
          }),
          ...RUTAS_ADICIONALES[rol],
        ],
      },
    ],
  }
}

/**
 * Páginas de apoyo para el equipo de desarrollo (no forman parte de la plataforma):
 *  - /componentes: muestra todos los componentes de src/components con datos de ejemplo.
 *  - /diagnostico: verifica la conexión con Supabase.
 * import.meta.env.DEV es false al compilar (npm run build), así que quedan fuera de la versión publicada.
 */
const rutasDesarrollo: RouteObject[] = import.meta.env.DEV
  ? [
      { path: '/diagnostico', lazy: async () => ({ Component: (await import('@/pages/dev/Diagnostico')).Diagnostico }) },
      {
        path: '/componentes',
        element: <RutaProtegida />,
        children: [
          {
            element: <AppLayout />,
            children: [{ index: true, lazy: async () => ({ Component: (await import('@/pages/dev/CatalogoComponentes')).CatalogoComponentes }) }],
          },
        ],
      },
    ]
  : []

export const router = createBrowserRouter([
  {
    element: (
      <SesionSupabaseProvider>
        <Outlet />
      </SesionSupabaseProvider>
    ),
    children: [
      { path: '/', element: <RedireccionInicio /> },
      // Acceso (públicas)
      { path: '/login', element: <PaginaLogin /> },
      { path: '/recuperar', element: <PaginaRecuperar /> },
      { path: '/restablecer', element: <PaginaRestablecer /> },
      // Herramientas del equipo: SOLO en desarrollo (npm run dev), nunca en la versión publicada
      ...rutasDesarrollo,
      // Secciones por rol (protegidas)
      rutasDeRol('administrador'),
      rutasDeRol('instructor'),
      rutasDeRol('aprendiz'),
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
