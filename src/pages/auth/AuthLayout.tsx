import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { BellRing, CalendarCheck, ChartColumn, ShieldCheck } from 'lucide-react'
import logoNegativo from '@/assets/img/LogoNegativo/negativo_con_eslogan_transparente.png'
import logoPositivo from '@/assets/img/LogoPositivo/positivo_con_eslogan_transparente.png'
import logoSena from '@/assets/img/LogoSena/SenaSobreBlanco.png'

interface PropsAuthLayout {
  titulo: string
  descripcion?: string
  /** Ícono pequeño junto a la etiqueta superior del formulario */
  icono: LucideIcon
  /** Etiqueta en mayúsculas sobre el título, p. ej. "Acceso a la plataforma" */
  etiqueta?: string
  children: ReactNode
  /** Enlaces de ayuda bajo el formulario */
  pie?: ReactNode
}

const PILARES = [
  { icono: CalendarCheck, texto: 'Asistencia por competencia' },
  { icono: BellRing, texto: 'Alertas tempranas de deserción' },
  { icono: ChartColumn, texto: 'Estadísticas y reportes' },
]

/** Franja con los tres colores del logotipo (verde, oliva y rojo del check) */
function FranjaMarca({ className }: { className?: string }) {
  return (
    <div className={`flex h-1 w-full ${className ?? ''}`} aria-hidden>
      <span className="flex-[3] bg-primario" />
      <span className="flex-[2] bg-estado-activo" />
      <span className="flex-1 bg-alerta-critica" />
    </div>
  )
}

/**
 * Pantallas de acceso (login, recuperar y restablecer contraseña) — diseño minimalista.
 * Panel de marca en verde sólido (escritorio) + formulario sobre fondo blanco.
 * Los logotipos se usan en sus versiones oficiales, sin alterarlos (Manual de Identidad, secc. 7).
 */
export function AuthLayout({ titulo, descripcion, icono: Icono, etiqueta = 'Acceso a la plataforma', children, pie }: PropsAuthLayout) {
  return (
    <div className="flex min-h-screen bg-fondo-principal">
      {/* ---------- Panel de marca (solo escritorio) ---------- */}
      <aside className="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-primario-oscuro p-12 text-white lg:flex">
        {/* Anillos geométricos decorativos */}
        <div className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full border-[56px] border-white/[0.04]" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -bottom-16 size-[260px] rounded-full border-[28px] border-estado-activo/20" aria-hidden />
        <div className="pointer-events-none absolute top-24 -left-24 size-48 rounded-full bg-white/[0.03]" aria-hidden />

        <img src={logoNegativo} alt="PuntualiX — Tu aliado en cada jornada" className="relative h-auto w-[220px]" />

        <div className="relative max-w-md">
          <h1 className="text-[2.6rem] leading-[1.15] font-bold text-white">
            Organización, seguimiento y control <span className="text-[#c9cf7a]">en un solo lugar.</span>
          </h1>
          <ul className="mt-10 space-y-4">
            {PILARES.map(({ icono: I, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10" aria-hidden>
                  <I className="size-4" />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© 2026 PuntualiX · Proyecto de formación SENA</p>
      </aside>

      {/* ---------- Formulario ---------- */}
      <div className="flex flex-1 flex-col">
        <FranjaMarca className="lg:hidden" />

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            <img src={logoPositivo} alt="PuntualiX — Tu aliado en cada jornada" className="mx-auto mb-10 h-auto w-[180px] lg:hidden" />

            <header className="mb-8">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest text-estado-activo uppercase">
                <Icono className="size-4" aria-hidden />
                {etiqueta}
              </p>
              <h2 className="text-3xl font-bold">{titulo}</h2>
              {descripcion && <p className="mt-2 text-sm text-texto-secundario">{descripcion}</p>}
            </header>

            {children}

            {pie && <div className="mt-8 space-y-2 text-sm">{pie}</div>}
          </div>
        </main>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-borde px-5 py-4 text-xs text-texto-secundario sm:flex-row sm:px-10">
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primario" aria-hidden />
            Tu información está protegida con los más altos estándares de seguridad.
          </p>
          <img src={logoSena} alt="SENA" className="size-7 object-contain" />
        </footer>
      </div>
    </div>
  )
}
