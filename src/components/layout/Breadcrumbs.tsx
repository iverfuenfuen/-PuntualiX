import { Fragment } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

export interface Miga {
  etiqueta: string
  ruta?: string
}

/** Ruta de navegación: Inicio › Configuración › Gestión de usuarios */
export function Breadcrumbs({ migas }: { migas: Miga[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-texto-secundario">
      <ol className="flex flex-wrap items-center gap-1.5">
        {migas.map((m, i) => {
          const ultima = i === migas.length - 1
          return (
            <Fragment key={`${m.etiqueta}-${i}`}>
              <li>
                {m.ruta && !ultima ? (
                  <Link to={m.ruta} className="hover:text-primario hover:underline">
                    {m.etiqueta}
                  </Link>
                ) : (
                  <span aria-current={ultima ? 'page' : undefined} className={ultima ? 'font-semibold text-texto-principal' : undefined}>
                    {m.etiqueta}
                  </span>
                )}
              </li>
              {!ultima && (
                <li aria-hidden>
                  <ChevronRight className="size-3.5" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
