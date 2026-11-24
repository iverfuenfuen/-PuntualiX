import { Outlet } from 'react-router'
import { useSesion } from '@/app/sesionContexto'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

/** Estructura común de todas las pantallas con sesión: Navbar + contenido + Footer. */
export function AppLayout() {
  const { usuario, notificacionesSinLeer, cerrarSesion } = useSesion()
  if (!usuario) return null // RutaProtegida ya redirige al login; esto solo satisface a TypeScript

  return (
    <div className="flex min-h-screen flex-col">
      {/* Enlace para saltar la navegación con teclado (WCAG 2.4.1, RNF7) */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-primario focus:shadow"
      >
        Saltar al contenido
      </a>
      {/* Al imprimir ("Descargar como PDF") solo sale el contenido de la pantalla */}
      <div className="contents print:hidden">
        <Navbar usuario={usuario} notificacionesSinLeer={notificacionesSinLeer} onCerrarSesion={cerrarSesion} />
      </div>
      <main id="contenido" className="mx-auto w-full max-w-[1440px] flex-1 space-y-6 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
