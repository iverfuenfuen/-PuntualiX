---
name: Academic Attendance System
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#434841'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#737970'
  outline-variant: '#c3c8be'
  surface-tint: '#496548'
  primary: '#264127'
  on-primary: '#ffffff'
  primary-container: '#3d593d'
  on-primary-container: '#aeceab'
  inverse-primary: '#afcfac'
  secondary: '#626201'
  on-secondary: '#ffffff'
  secondary-container: '#e8e880'
  on-secondary-container: '#686808'
  tertiary: '#7d000c'
  on-tertiary: '#ffffff'
  tertiary-container: '#a70717'
  on-tertiary-container: '#ffb2ab'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbebc6'
  primary-fixed-dim: '#afcfac'
  on-primary-fixed: '#06210a'
  on-primary-fixed-variant: '#324d32'
  secondary-fixed: '#e8e880'
  secondary-fixed-dim: '#cccb67'
  on-secondary-fixed: '#1d1d00'
  on-secondary-fixed-variant: '#494900'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#930011'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
  surface-canvas: '#F4F6F4'
  surface-card: '#FFFFFF'
  border-subtle: '#E5EAE5'
  text-muted: '#64748B'
  state-success: '#2E7D32'
  state-warning: '#F9A825'
  state-critical: '#DC2626'
  state-info: '#1976D2'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Sistema de Diseño — PuntualiX (Gestión Académica y Control de Asistencia)

## Identidad Visual y Filosofía
- **Personalidad:** Profesional, minimalista, institucional, clara, tecnológica y estructurada.
- **Enfoque:** Alta legibilidad, orden jerárquico de información y reducción de saturación cognitiva en tableros analíticos institucionales.

## Paleta de Colores
- **Color Primario:** `#3D593D` (Verde oscuro institucional - Navbar, botones principales, acentos de marca)
- **Colores Secundarios:**
  - `#8A8A2D` (Verde oliva - resaltados suaves, badges, filtros activos, indicadores informativos)
  - `#FFFFFF` (Blanco puro - fondos de tarjetas, tablas, formularios)
  - `#BE1F24` (Rojo institucional - alertas críticas, inasistencias graves, riesgo de deserción)
- **Colores Semánticos / Estados de Apoyo:**
  - Éxito / Asistencia confirmada: `#2E7D32`
  - Advertencia / Riesgo moderado / Justificación pendiente: `#F9A825`
  - Error / Crítico / Inasistencia: `#BE1F24` / `#DC2626`
  - Información / Estadísticas: `#1976D2`
- **Neutros y Fondos:**
  - Fondo general de la aplicación: `#F4F6F4` o `#F8FAF8`
  - Superficie de contenedor / Cards: `#FFFFFF` con borde sutil `#E2E8F0` / `#E5EAE5`
  - Texto principal: `#1F2937`
  - Texto secundario / Muted: `#64748B`

## Tipografía
- **Titulares y Métricas (Primary Font):** `Poppins`, sans-serif (Bold / SemiBold para métricas, títulos, KPIs)
- **Cuerpo y Tablas (Secondary Font):** `Nunito`, sans-serif (Regular / Medium para tablas, textos descriptivos, reportes)

## Componentes Clave
- **Navbar Institucional:** Fondo `#3D593D`, texto blanco / opacidad 85%, logo oficial PuntualiX, navegación con enlaces a Dashboard, Fichas, Instructores, Bitácora, Estadísticas, Reportes y perfil de usuario.
- **Tarjetas KPI:** Elevación mínima, bordes suaves, acento de color semántico, comparativa porcentual versus mes anterior.
- **Tablas de Datos Densas:** Encabezados limpios, alternancia suave de filas, estados claros con chips de color semántico.
- **Widgets de Alertas & Riesgo:** Consolidación de información sin redundancia, filtros por criticidad.
