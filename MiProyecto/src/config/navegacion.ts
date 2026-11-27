import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BellRing,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  History,
  House,
  LineChart,
  SlidersHorizontal,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react'
import type { Rol } from '@/types/dominio'

export interface EnlaceNavegacion {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  /** true = solo se marca activo si la ruta coincide exactamente (p. ej. Dashboard) */
  exacto?: boolean
}

/**
 * Menú principal por rol.
 * Admin: igual al Prototipo. Instructor y Aprendiz: enlaces de VersionAntigua (data-roles del navbar).
 */
export const NAVEGACION: Record<Rol, EnlaceNavegacion[]> = {
  administrador: [
    { etiqueta: 'Dashboard', ruta: '/admin', icono: House, exacto: true },
    { etiqueta: 'Fichas', ruta: '/admin/fichas', icono: FileText },
    { etiqueta: 'Instructores', ruta: '/admin/instructores', icono: Users },
    { etiqueta: 'Bitácora', ruta: '/admin/bitacora', icono: History },
    { etiqueta: 'Estadísticas', ruta: '/admin/estadisticas', icono: LineChart },
    { etiqueta: 'Reportes', ruta: '/admin/reportes', icono: BarChart3 },
  ],
  instructor: [
    { etiqueta: 'Dashboard', ruta: '/instructor', icono: House, exacto: true },
    { etiqueta: 'Fichas', ruta: '/instructor/fichas', icono: FileText },
    { etiqueta: 'Asistencia', ruta: '/instructor/asistencia', icono: CalendarCheck },
    { etiqueta: 'Justificaciones', ruta: '/instructor/justificaciones', icono: FileCheck2 },
    { etiqueta: 'Reportes', ruta: '/instructor/reportes', icono: BarChart3 },
    { etiqueta: 'Material', ruta: '/instructor/material', icono: BookOpen },
  ],
  aprendiz: [
    { etiqueta: 'Dashboard', ruta: '/aprendiz', icono: House, exacto: true },
    { etiqueta: 'Mis asistencias', ruta: '/aprendiz/asistencias', icono: CalendarCheck },
    { etiqueta: 'Justificaciones', ruta: '/aprendiz/justificaciones', icono: FileCheck2 },
    { etiqueta: 'Material de apoyo', ruta: '/aprendiz/material', icono: BookOpen },
  ],
}

/** Destino de la campana de notificaciones por rol */
export const RUTA_ALERTAS: Record<Rol, string> = {
  administrador: '/admin/alertas',
  instructor: '/instructor/alertas',
  aprendiz: '/aprendiz/notificaciones',
}

/** Opciones del menú desplegable del usuario (además de "Cerrar sesión") */
export const MENU_USUARIO: Record<Rol, EnlaceNavegacion[]> = {
  administrador: [
    { etiqueta: 'Mi perfil', ruta: '/admin/perfil', icono: UserRound },
    { etiqueta: 'Gestión de usuarios', ruta: '/admin/usuarios', icono: UsersRound },
    { etiqueta: 'Umbrales de alerta', ruta: '/admin/alertas/umbrales', icono: SlidersHorizontal },
  ],
  instructor: [
    { etiqueta: 'Mi perfil', ruta: '/instructor/perfil', icono: UserRound },
    { etiqueta: 'Aprendices en alerta', ruta: '/instructor/alertas', icono: BellRing },
    { etiqueta: 'Bitácora', ruta: '/instructor/bitacora', icono: ClipboardList },
    { etiqueta: 'Descargas', ruta: '/instructor/descargas', icono: Download },
  ],
  aprendiz: [{ etiqueta: 'Mi perfil', ruta: '/aprendiz/perfil', icono: UserRound }],
}
