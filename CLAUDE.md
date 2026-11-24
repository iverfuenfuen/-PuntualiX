# PuntualiX: eje central de la refactorización

## Objetivo (no negociable)
Frontend final en React + Supabase que combine:
- UI/UX y estructura de componentes de /prototipo
- Lógica de negocio y flujos de /VersionAntigua (no se pierde nada)
- Identidad visual del Manual de Identidad Corporativa

## Reglas estrictas
- /prototipo y /VersionAntigua son SOLO LECTURA. Nunca editar ni borrar.
- Colores, fuentes (Poppins/Nunito) y logos salen SOLO del manual. Única adición: el verde nuevo `#384E38` como token
  `--color-primario` (decisión del usuario 2026-11-23: se usa en toda la interfaz, no solo en navbar y footer).
- No cambiar el stack, no instalar librerías nuevas, no reestructurar carpetas sin pedir permiso.
- Todas las llamadas a Supabase van en los archivos `servicio*.ts` de cada módulo (`src/features/<modulo>/`) y en
  `src/lib/supabase.ts`; nunca en componentes (decisión del usuario 2026-11-23: no se mueven a /src/services).
  Nunca usar la service_role key.
- No modificar el esquema de Supabase: si falta algo, proponerlo y esperar.

## Alcance de cada tarea
- Hacer SOLO lo que se pidió. Sin refactors extra, sin "mejoras" no solicitadas, sin tocar archivos no relacionados.
- Si ves algo que mejorar fuera del alcance, anótalo al final y no lo hagas.
- Ante la duda, preguntar antes de actuar.

## Estado
(Actualizar al terminar cada módulo: qué está hecho, qué sigue.)
- **Para retomar en otro chat o equipo: leer primero [CONTEXTO_NUEVO_CHAT.md](CONTEXTO_NUEVO_CHAT.md)** (todo el contexto,
  dónde vamos, el plan del 6b y la pregunta abierta sobre el back-end).
- Hecho: Etapas 0–5 del administrador, 6.0 (pantallas por rol) y 6a (fichas, detalle, historial y registrar aprendiz
  del instructor), además de las mejoras de Estadísticas (comparar 5, deserción, dimensión Instructor) y la migración 09.
  Pendiente la prueba manual de las Etapas 2, 4, 5 y 6a.
- **En pausa:** el paso 6b (Registro de asistencia) está planificado y aprobado, pero espera la respuesta del instructor
  del SENA sobre la carpeta `back-end/` (ver CONTEXTO_NUEVO_CHAT.md, sección 6). No empezar hasta tenerla.
- Decisiones de la Etapa 5: sin librerías (PDF = hoja imprimible, Excel = CSV), corte semestral, solo totales por
  ficha, historial de reportes con parámetros (sin Storage).

# CLAUDE.md — Contexto de PuntualiX 2.0

Guía para retomar el trabajo en cualquier computador sin depender de conversaciones anteriores.
Leer junto con [README.md](README.md) (instalación, arquitectura y **Changelog**).

## Proyecto
Plataforma SENA de gestión académica y control de asistencia (programa ADSO, ficha 3267541).
Roles: **administrador**, **instructor**, **aprendiz**.

## Reglas de construcción (corrección del usuario en la Etapa 4 — OBLIGATORIAS)
- Es una **refactorización** de Prototipo + VersionAntigua para sacar una versión mejor: **no improvisar**. Antes de
  hacer una pantalla, inventariar TODOS los bloques de la versión antigua y del Prototipo y conservarlos (fusionados sin
  repetir datos). No quitar bloques ni inventar funciones, textos o acciones que no estén en esas fuentes o en los
  casos de uso (`docs/Casos de usos.docx`).
- Cada función debe corresponder al **rol** según los casos de uso. El **administrador solo gestiona fichas y sus
  porcentajes**, instructores (HU02.1, HU12.2, HU12.4), roles y acceso (HU02.3, HU02.4), alertas de ficha (HU09.3),
  umbrales (RF17), bitácora (HU11) y estadísticas y reportes de ficha. **No** ve ni gestiona aprendices individualmente:
  las alertas por aprendiz (HU09.1, HU09.2, HU12.1) y el registro de aprendices (HU02.2) son del instructor.
- Toda pantalla principal usa el banner verde `components/layout/PageHeader` (como Fichas e Instructores), salvo que el
  Prototipo de esa pantalla tenga otro encabezado (p. ej. Bitácora).

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

Comandos (dentro de `front-end/`): `npm run dev` · `build` · `lint` · `test:db` (40 pruebas SQL/RLS) ·
`docs:diccionario` · `db:aplicar` (usa `.env.supabase.local`, nunca se sube).

## Convenciones
- Código, nombres y textos en **español** (`PaginaLogin`, `servicioAuth`, `cargando`…). Alias `@/` → `src/`.
- **Pantallas separadas por rol** (decisión del usuario 2026-11-24): `src/pages/auth`, `src/pages/admin/<modulo>`,
  `src/pages/instructor/<modulo>`, `src/pages/aprendiz/<modulo>` y `src/pages/comun` (pantallas de varios roles)
  guardan las `Pagina*.tsx` y los modales de un solo rol.
- **Lógica por módulo** en `src/features/<modulo>/`: `servicio<Modulo>.ts`, `presentacion.ts`, `esquemas.ts` (zod),
  `mensajes.ts` y los componentes que usan dos o más roles (p. ej. `SeccionesDetalle`, `TablaReportes`).
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
- Esquema = contrato de datos: migraciones `01`–`09` en `front-end/supabase/migrations/` (21 tablas, 5 vistas,
  24 enums, triggers de negocio, RLS por rol, 4 buckets). Referencia rápida: `supabase/DICCIONARIO_DATOS.md`.
- El rol se toma de `app_metadata` (no editable por el usuario). Crear usuarios desde la app requiere una
  Edge Function (Etapa 3). **Decisión del usuario (2026-11-23): las cuentas nuevas se crean por invitación por
  correo** (`inviteUserByEmail`); el usuario elige su contraseña y el administrador nunca la conoce.
- Usuarios de prueba y guía de conexión: `front-end/supabase/README.md`.

## Control de versiones
- Repositorio único (2026-11-24): `https://github.com/iverfuenfuen/-PuntualiX` (remoto `puntualix`). El repositorio
  viejo `iverfuenfuen/Puntualix2.0` fue borrado por el usuario.
  - Rama `react-supabase`: el proyecto completo (front-end, docs, Prototipo, VersionAntigua, CLAUDE.md). Es la rama de
    trabajo: `git push puntualix react-supabase`.
  - Rama `main`: solo `front-end/` en la raíz, que es lo que despliega Vercel.
- Commits pequeños y descriptivos por módulo. **Decisión del usuario (2026-11-24): por ahora los commits van SIN la línea
  `Co-Authored-By: Claude`**: el usuario no quiere que Claude figure como colaborador. Ya se quitó del historial.
- **Publicación en Vercel (main):** `git subtree split --prefix=front-end -b solo-front-end react-supabase` y luego
  `git push puntualix solo-front-end:main`. Publicar solo cuando el usuario lo pida.
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
| 4 | Dashboard (`/admin`), alertas con umbrales (`/admin/alertas`, `/admin/alertas/umbrales`), bitácora (`/admin/bitacora`) | ✅ código · ⏳ prueba manual del usuario |
| 5 | Estadísticas (`/admin/estadisticas`), reportes (`/admin/reportes`, `/admin/reportes/:id`) e historial por ficha/instructor | ✅ código · ⏳ prueba manual del usuario |
| 6 | Módulo Instructor (11 pantallas) | 🔄 6.0 y 6a ✅ · 6b ⏸️ en pausa (pregunta del back-end) · 6c–6f ⏳ |
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
  `npx -p supabase@3.4.0 -p @supabase/cli-windows-x64@3.4.0 supabase functions deploy invitar-usuario --project-ref ckppdfnzgbnwrnqrzkdx`
  y elegir **Yes** (el aviso de Docker no importa). En Windows, `npx supabase` solo falla con "No matching Supabase CLI
  binary package found for win32-x64": npm no instala el binario opcional. Último despliegue: 2026-11-24.
- SMTP propio con **Brevo** (2026-11-24): las invitaciones llegan a cualquier correo; remitente Gmail verificado
  (puede caer en Spam). Gmail no ofrecía contraseñas de aplicación en la cuenta. En Brevo hay que tener
  **desactivado el bloqueo de IP para claves SMTP** (Seguridad → IPs autorizadas): si no, Auth falla con
  `525 5.7.1 Unauthorized IP address` y la app muestra "Error sending invite email". El error real se ve en
  Supabase → Logs → Auth. Pruebas: alias `puntualix+aprendizN@gmail.com`.
- Usuarios de prueba (ya existen, no se invitan): `admin@puntualix.com`, `carlos.perez@puntualix.com` (instructor),
  `juan.perez@puntualix.com` (aprendiz). Sus correos no son reales.
- **Forma de trabajo:** las conversaciones de desarrollo son solo para código. Las tareas operativas (desplegar,
  configurar Supabase/SMTP, claves, pruebas manuales guiadas) se hacen en otro chat para ahorrar tokens.
  **Decisión del usuario (2026-11-24):** esas tareas, con su contexto e instrucciones paso a paso, viven en
  [PENDIENTES_USUARIO.md](PENDIENTES_USUARIO.md). Mantenerlo al día: cuando el usuario confirme que terminó una tarea,
  quitarla; cuando un cambio genere una nueva (migración, despliegue, prueba), agregarla.
- Pendiente: carga masiva de aprendices (Excel/CSV) reutilizando `invitar-usuario`. Etapa 3 también propone para la
  migración 09: rol formativo del instructor, tipo de contrato y dedicación semanal. Etapa 4 propone `bitacora.ip` y
  `bitacora.agente_usuario` (el Prototipo muestra IP y navegador en el detalle del evento).
- Etapa 4: la bitácora se filtra y pagina en el servidor (`servicioBitacora.consulta`, síncrona a propósito: el
  constructor de supabase-js es *thenable* y una función async lo ejecutaría). `bitacora/presentacion.ts` traduce los
  eventos técnicos a texto. El dashboard sigue el orden de `VersionAntigua/Admin/dashboard.html` y reutiliza los
  servicios de cada módulo. Etapa 5 debe llevar el comprobante PDF del evento de la bitácora.
- **Decisión del usuario (2026-11-23):** se mantiene "Matricular aprendiz" en el detalle de la ficha (está en el
  Prototipo). En Gestión de usuarios el administrador ya no puede registrar aprendices (el selector de rol no ofrece
  "Aprendiz").
- Regla de pantallas: **un solo lugar por dato** (encabezado = identidad, KPI = cifras, pestañas = distribución,
  modales sin métricas). En el admin, el rol y el acceso de cualquier usuario se gestionan solo en `/admin/usuarios`. **Decisión del usuario (2026-11-24):** HU02.4 también la tiene el instructor **líder** de la ficha, sobre sus aprendices (detalle de la ficha del instructor; la BD lo exige desde la migración `09_acceso_aprendiz_lider.sql`, aplicada en Supabase el 2026-11-24). Los datos demo
  (`supabase/datos_demo_fichas.sql`: 10 fichas `2901xxx`) también están cargados.
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
