import { cn } from '@/lib/utilidades'

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'sobreOscuro'
export type TamanoBoton = 'sm' | 'md'

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-primario text-white hover:bg-primario-oscuro shadow-sm',
  secundario: 'bg-fondo-tarjeta text-texto-principal border border-borde hover:bg-fondo-seccion-alterna',
  fantasma: 'text-texto-apoyo hover:bg-fondo-tarjeta-suave hover:text-texto-principal',
  peligro: 'bg-alerta-critica text-white hover:bg-[#9e1a1e] shadow-sm',
  // Botón blanco para usar sobre el banner verde (PageHeader) o la navbar
  sobreOscuro: 'bg-white text-primario hover:bg-white/90 shadow-sm',
}

const TAMANOS: Record<TamanoBoton, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

/** Clases de botón reutilizables, p. ej. para un <Link> con apariencia de botón */
export function clasesBoton(variante: VarianteBoton = 'primario', tamano: TamanoBoton = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-titulos font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTES[variante],
    TAMANOS[tamano],
    extra,
  )
}
