# CLAUDE.md — Contexto de PuntualiX 2.0

Guía para retomar el trabajo en cualquier computador sin depender de conversaciones anteriores.
Leer junto con [README.md](README.md) (instalación, arquitectura y **Changelog**).

## Proyecto
Plataforma SENA de gestión académica y control de asistencia (programa ADSO, ficha 3267541).
Roles: **administrador**, **instructor**, **aprendiz**.

## Carpetas
| Carpeta | Rol | Regla |
|---|---|---|
| `front-end/` | Proyecto activo (React + TS + Supabase) | Aquí se escribe todo el código |
| `Prototipo/` | Referencia de UI/UX (17 pantallas HTML del Admin) | **Solo lectura** |
| `VersionAntigua/` | Versión HTML/CSS original (33 pantallas): flujos, campos, permisos, recursos | **Solo lectura** |
| `docs/` | `RF.docx`, `RNF.docx`, `Casos de usos.docx`, `Manual de identidad corporativo.docx` | Actualizar RF/RNF al cerrar módulos |

Nota: `VersionAntigua` no tiene lógica JS (solo login simulado). Las reglas de negocio se reconstruyeron
desde formularios, filtros, mensajes de error y casos de uso, y viven en la BD (triggers + RLS).

## Stack (`front-end/`)
React 19 · TypeScript 7 · Vite 8 · Tailwind CSS 4 (`@theme` en `src/styles/index.css`) · React Router 8
(`createBrowserRouter`, rutas `lazy`) · react-hook-form + zod · Recharts · lucide-react · Supabase JS ·
oxlint · PGlite para probar el SQL localmente. Node ≥ 20.

Comandos (dentro de `front-end/`): `npm run dev` · `build` · `lint` · `test:db` (38 pruebas SQL/RLS) ·
`docs:diccionario` · `db:aplicar` (usa `.env.supabase.local`, nunca se sube).

## Convenciones
- Código, nombres y textos en **español** (`PaginaLogin`, `servicioAuth`, `cargando`…). Alias `@/` → `src/`.
- **Un módulo por caso de uso** en `src/features/<modulo>/`: páginas `Pagina*.tsx`, `esquemas.ts` (zod),
  `mensajes.ts` y `servicio<Modulo>.ts`.
- **Solo los archivos `servicio*.ts` llaman a Supabase** (cliente único en `src/lib/supabase.ts`). Los
  componentes nunca importan `supabase` directamente.
- UI reutilizable en `src/components/ui` (exportada desde `index.ts`) y estructura en `src/components/layout`.
  Antes de crear un componente nuevo, revisar el catálogo en `/componentes` (solo en `npm run dev`).
- Pantalla nueva: agregarla a `PANTALLAS` en `src/app/router.tsx` con `lazy` (división de código) y quitarla de
  `ETAPA_POR_RUTA`. El menú de cada rol está en `src/config/navegacion.ts`.
- Cada pantalla maneja los estados **cargando / error / vacío** (`Spinner`, `EmptyState`) y valida sus
  formularios con zod.
- Accesibilidad (RNF7): etiquetas en todos los campos, `aria-invalid`/`aria-describedby`, `caption` en tablas,
  foco visible y estados que combinan color con texto. Responsive (RNF6): menú ☰ por debajo de 1280 px.
- Tipos de la BD en `src/types/database.types.ts` (generado) y de dominio en `src/types/dominio.ts`.
- Si al frontend le falta una tabla, columna o política: **no inventarla**. Documentarla y proponerla al
  responsable del back-end (o como nueva migración numerada en `supabase/migrations/`, con su prueba).

## Identidad visual (regla estricta)
- Única fuente de verdad: el **Manual de Identidad**. Los tokens están en `front-end/src/styles/index.css`.
  **Prohibido** escribir colores hex o fuentes sueltas en los componentes: usar `bg-primario`,
  `text-alerta-critica`, `font-titulos`, etc.
- Poppins (500–800) para títulos y métricas; Nunito (400, 600) para contenido. Fuentes alojadas localmente.
- Verde institucional DEFINITIVO (confirmado por el usuario, no cambiar): el del Prototipo en `--color-primario`
  `#384E38` y `--color-primario-oscuro` `#2D4732` (el Manual dice `#3D593D`; es el Manual el que debe actualizarse).
- `--color-alerta-critica` es `#BE1F24` (rojo del Manual).
- Logotipos en `src/assets/img/` (positivo, negativo, monocromático, favicons). Respetar la zona de respeto y el
  ancho mínimo de 120 px; no deformar, rotar ni aplicar sombras o efectos.
- Si el Prototipo contradice el Manual, gana el Manual y se consulta con el equipo.

## Supabase
- El frontend usa **solo la anon key** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` en `front-end/.env.local`).
  La `service_role` solo vive en `.env.supabase.local` para `db:aplicar`; nunca se sube.
- Esquema = contrato de datos: migraciones `01`–`08` en `front-end/supabase/migrations/` (21 tablas, 5 vistas,
  24 enums, triggers de negocio, RLS por rol, 4 buckets). Referencia rápida: `supabase/DICCIONARIO_DATOS.md`.
- El rol se toma de `app_metadata` (no editable por el usuario). Crear usuarios desde la app requiere una
  Edge Function (Etapa 3). **Decisión del usuario (2026-11-23): las cuentas nuevas se crean por invitación por
  correo** (`inviteUserByEmail`); el usuario elige su contraseña y el administrador nunca la conoce.
- Usuarios de prueba y guía de conexión: `front-end/supabase/README.md`.

## Control de versiones
- Rama de trabajo: `react-supabase` (remoto `origin`). Commits pequeños y descriptivos por módulo.
- **No** hacer push a `main` ni forzar cambios sin pedirlo. `Prototipo/` y `VersionAntigua/` no se modifican.
- Al cerrar cada módulo: actualizar el Changelog del README (qué se tomó del Prototipo, qué se rescató de
  VersionAntigua, mejoras), la tabla de etapas, `docs/RF.docx` / `docs/RNF.docx` y la sección de estado de abajo.

## Estado de avance (actualizar al cerrar cada etapa)
| Etapa | Contenido | Estado |
|---|---|---|
| 0 | Entorno, tokens, BD, layout y 15 componentes UI | ✅ |
| 1 | Login multi-rol, recuperar/restablecer contraseña, rutas por rol, Mi perfil con cambio de contraseña | ✅ |
| 2 | Fichas (Admin): `/admin/fichas` y `/admin/fichas/:id` con registrar, actualizar, desactivar, asignar instructor y matricular | ✅ código · ⏳ prueba manual del usuario |
| 3 | Instructores (`/admin/instructores`, `/admin/instructores/:id`) y Usuarios (`/admin/usuarios`) + Edge Function `invitar-usuario` | ✅ función desplegada (2026-11-23) e invitación probada de punta a punta |
| 4 | Dashboard (`/admin`), alertas con umbrales (`/admin/alertas`, `/admin/alertas/umbrales`), bitácora (`/admin/bitacora`) | ⏳ siguiente: empezar aquí |
| 5 | Estadísticas, reportes e historial | ⏳ |
| 6 | Módulo Instructor (11 pantallas) | ⏳ |
| 7 | Módulo Aprendiz (4 pantallas) | ⏳ |
| 8 | Página pública (RF01), accesibilidad, responsive, despliegue | ⏳ |

## Pendientes conocidos
- Paquete JS principal de ~715 kB: las páginas de auth y el layout aún se cargan de forma directa. Pasarlas a `lazy`.
- `vercel.json` de la raíz aún redirige a `/frontend/HTML/InicioSesion.html` (versión antigua). El despliegue
  nuevo usa `front-end/vercel.json` (Root Directory = `front-end` en Vercel). Revisar la raíz antes de desplegar.
- `src/types/database.types.ts` es un marcador (`any`): las filas se tipan a mano en cada servicio y las consultas
  con relaciones se convierten con `as unknown as Fila[]`. Generarlo requiere `npx supabase login`.
- Etapa 2 dejó para el back-end (migración 09 propuesta): `ficha_instructores.rol` (técnico/transversal),
  dedicación semanal y `fichas.descripcion`. El cupo se toma de `ambientes.capacidad`.
- La Edge Function `supabase/functions/invitar-usuario` YA está desplegada (CLI con sesión iniciada en el equipo
  del usuario). Si se modifica, redesplegar desde `front-end/` con
  `npx supabase functions deploy invitar-usuario --project-ref ckppdfnzgbnwrnqrzkdx` (el aviso de Docker no importa).
- Aún sin SMTP propio: Supabase solo envía correos a miembros del equipo de la organización (pocos por hora).
  Pendiente del usuario: configurar SMTP (Gmail con contraseña de aplicación) para invitar a cualquier correo.
- Usuarios de prueba (ya existen, no se invitan): `admin@puntualix.com`, `carlos.perez@puntualix.com` (instructor),
  `juan.perez@puntualix.com` (aprendiz). Sus correos no son reales.
- **Forma de trabajo:** las conversaciones de desarrollo son solo para código. Las tareas operativas (desplegar,
  configurar Supabase/SMTP, claves, pruebas manuales guiadas) se hacen en otro chat para ahorrar tokens.
- Pendiente: carga masiva de aprendices (Excel/CSV) reutilizando `invitar-usuario`. Etapa 3 también propone para la
  migración 09: rol formativo del instructor, tipo de contrato y dedicación semanal.
- Regla de pantallas: **un solo lugar por dato** (encabezado = identidad, KPI = cifras, pestañas = distribución,
  modales sin métricas). El rol y el acceso de cualquier usuario se gestionan solo en `/admin/usuarios`.
- En Bash, NO usar comillas invertidas dentro de `node -e "..."`: bash las ejecuta como comandos. Para editar
  documentación usar la herramienta Edit, o un script escrito a un archivo.
- Herramientas útiles: `lib/useCarga.ts` (estados de carga), `lib/resultado.ts` (`traducirErrorBD` con mensajes
  por restricción), `lib/csv.ts`, `ModalConfirmacion`, `EstadoError`, `AvatarIniciales`. Los modales con
  formulario se montan solo al abrirse (`{abierto && <Modal…/>}`) para partir de datos frescos.
- Los anexos de avance de `docs/RF.docx` y `docs/RNF.docx` van entre comentarios `<!--PX-ESTADO-IMPLEMENTACION-->`
  y `<!--PX-VERIFICACION-RNF-->` dentro de `word/document.xml`: reemplazar ese bloque en lugar de duplicarlo.
- Mensaje único de error de login (no distinguir "usuario no existe" de "contraseña incorrecta"), ver RNF2.
- El Manual no define Nunito 300 ni la escala de grises; los códigos de programa distintos de ADSO (228118)
  son de ejemplo.
