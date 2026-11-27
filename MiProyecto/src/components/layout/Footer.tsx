import logoNegativoEslogan from '@/assets/img/LogoNegativo/negativo_con_eslogan_transparente.png'
import logoSena from '@/assets/img/LogoSena/SenaSobreVerde.png'

interface PropsFooter {
  /** Programa y ficha del equipo que desarrolla PuntualiX (créditos de VersionAntigua) */
  programa?: string
  ficha?: string
  anio?: number
}

/** Pie de página institucional: mismo contenido de VersionAntigua con el estilo del Prototipo. */
export function Footer({ programa = 'Análisis y desarrollo de Software', ficha = '3267541', anio = 2026 }: PropsFooter) {
  return (
    <footer className="mt-auto bg-primario px-4 py-4 text-xs text-white sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <img src={logoNegativoEslogan} alt="PuntualiX" className="h-auto w-[120px] shrink-0" />
          <div className="space-y-0.5 leading-tight">
            <p>Desarrollado en el marco del proyecto de formación SENA · {anio}</p>
            <p className="text-[11px] text-white/75">© {anio} Puntualix. Todos los derechos reservados</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <img src={logoSena} alt="SENA" className="size-8 shrink-0 object-contain" />
          <span className="hidden h-6 w-px bg-white/25 sm:block" aria-hidden />
          <div className="space-y-0.5 text-center leading-tight sm:text-right">
            <p>Programa: {programa}</p>
            <p className="text-[11px] text-white/75">Ficha: {ficha}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
