# PuntualiX 2.0: contexto para retomar en un chat nuevo

> **Primer mensaje al chat nuevo:** «Lee CONTEXTO_NUEVO_CHAT.md, CLAUDE.md, PENDIENTES_USUARIO.md y README.md antes de
> hacer nada. Trabajamos en modo plan.»
>
> Escrito el 2026-11-24, al final de la sesión de desarrollo de la Etapa 6a.
> - **Fuente de verdad de las reglas:** [CLAUDE.md](CLAUDE.md).
> - **Tareas operativas del usuario:** [PENDIENTES_USUARIO.md](PENDIENTES_USUARIO.md).
> - **Changelog:** [README.md](README.md).
>
> Este archivo resume la conversación y dice exactamente dónde quedamos.

---

## 1. Cómo arrancar en otro computador (la institución)
1. **Traer el código.** Se clona con `git clone -b react-supabase https://github.com/iverfuenfuen/-PuntualiX.git Puntualix2.0`.
   - La rama `react-supabase` tiene el proyecto completo: `CLAUDE.md`, este archivo, `docs/`, `Prototipo/`,
     `VersionAntigua/` y `front-end/`.
   - La rama `main` tiene solo `front-end/`, para Vercel. **No** se desarrolla en `main`.
   - Después de clonar, conviene renombrar el remoto: `git remote rename origin puntualix`, para que coincida con los
     comandos de CLAUDE.md.
2. **Instalar:** `cd front-end` y luego `npm install`. Requiere Node 20 o superior.
3. **Configurar `front-end/.env.local`** (no está en git) con dos variables:
   - `VITE_SUPABASE_URL=https://ckppdfnzgbnwrnqrzkdx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<la anon key>`. Se copia del panel de Supabase, en Settings → API → anon public.
     **Nunca la `service_role`.**
4. **Arrancar:** `npm run dev` y abrir http://localhost:5173.
5. **Verificar:** `npm run lint` · `npx tsc --noEmit -p tsconfig.app.json` · `npm run build` · `npm run test:db`
   (deben pasar las 40 pruebas).
6. **CLI de Supabase** (solo para desplegar la Edge Function): `npx supabase login`. En Windows usar
   `npx -p supabase@3.4.0 -p @supabase/cli-windows-x64@3.4.0 supabase …`, porque el `npx supabase` normal falla con
   "No matching Supabase CLI binary package found".

## 2. El proyecto
- **Qué es:** una plataforma SENA de gestión académica y control de asistencia (programa ADSO, ficha 3267541). Tiene
  tres roles: administrador, instructor y aprendiz.
- **Objetivo:** un front-end React + Supabase que es una **refactorización** de dos versiones anteriores:
  - `Prototipo/`: 17 pantallas HTML del administrador. Aporta la UI/UX.
  - `VersionAntigua/`: 33 pantallas HTML de los 3 roles, sin JavaScript. Aporta los flujos, los campos y los bloques.
  - La identidad visual sale del Manual de Identidad (`docs/Manual de identidad corporativo.docx`).
  - Los casos de uso están en `docs/Casos de usos.docx`. Los RF y RNF, en `docs/RF.docx` y `docs/RNF.docx`.
- **Stack** (`front-end/`): React 19 · TypeScript · Vite 8 · Tailwind 4 (tokens en `src/styles/index.css`) ·
  React Router 8 · react-hook-form + zod · Recharts · lucide-react · Supabase JS · oxlint · PGlite para las pruebas
  SQL.

## 3. Reglas obligatorias (resumen; el detalle está en CLAUDE.md)
**Reglas estrictas**
- `Prototipo/` y `VersionAntigua/` son **de solo lectura**.
- Colores, fuentes (Poppins y Nunito) y logos **solo del Manual**, siempre con tokens (`bg-primario`,
  `text-alerta-critica`…). Nunca hex sueltos.
  - El verde `#384E38` es `--color-primario` y es definitivo.
  - El rojo `#BE1F24` es `--color-alerta-critica`.
- No cambiar el stack, no instalar librerías y no reestructurar carpetas **sin permiso**.
- **Solo los archivos `servicio*.ts`** (de `src/features/<modulo>/`) y `src/lib/supabase.ts` llaman a Supabase.
  Nunca usar la service_role en el front-end.
- **No modificar el esquema** sin proponerlo y esperar aprobación. Las migraciones nuevas van numeradas y con su
  prueba.
- Hacer **solo lo pedido**. Lo que se vea fuera del alcance se anota al final. Ante la duda, preguntar.

**Reglas de construcción (corrección del usuario en la Etapa 4)**
- No improvisar. Antes de cada pantalla, **inventariar todos los bloques** de VersionAntigua y del Prototipo y
  conservarlos, fusionados sin repetir datos.
- No inventar funciones, textos ni acciones que no estén en las fuentes o en los casos de uso.
- **Cada función según el rol** de los casos de uso:
  - **El administrador** gestiona fichas y sus porcentajes, instructores, roles y acceso, alertas de ficha, umbrales,
    bitácora y estadísticas y reportes. **No** gestiona aprendices individualmente.
  - Las alertas por aprendiz y el registro de aprendices son del **instructor**.
- **El Prototipo solo tiene pantallas del admin.** Para el instructor y el aprendiz, el contenido sale de
  VersionAntigua; el diseño se toma del admin como modelo, quitando las funciones que no corresponden al rol.
  - El **detalle de ficha del instructor** es una **copia del del admin con cambios ligeros**. El usuario lo aclaró
    el 2026-11-24.
- Las pantallas principales usan el banner verde `components/layout/PageHeader`.
- **Un solo lugar por dato:** el encabezado lleva la identidad, los KPI las cifras, las pestañas la distribución, y
  los modales no llevan métricas.
- Cada pantalla tiene sus estados de carga, error y vacío, valida con zod y cumple accesibilidad (RNF7) y diseño
  responsive (RNF6).
- Código y textos **en español** (`PaginaX`, `servicioX`, `cargando`). Alias `@/` → `src/`.

**Estructura de carpetas** (decisión del usuario 2026-11-24)
- `src/pages/{auth,admin,instructor,aprendiz,comun,dev}`: las páginas y los modales de **un** rol.
- `src/features/<modulo>/`: lógica y componentes compartidos.
  - `servicio*.ts`, `presentacion.ts`, `esquemas.ts`, `mensajes.ts`.
  - Componentes que usan dos o más roles, por ejemplo `SeccionesDetalle`, `TablaReportes`, `ModalMatricularAprendiz`,
    `EncabezadoFicha` y `ModalEstadoMatricula`.
- Rutas en `src/app/router.tsx`: `PANTALLAS` (rutas del menú, con `lazy`), `RUTAS_ADICIONALES` y `RUTAS_SIN_LAYOUT`.
  El menú de cada rol está en `src/config/navegacion.ts`.

## 4. Forma de trabajo con el usuario
- **Modo plan primero.** Se planifica, el usuario aprueba y después se programa.
- **Chats separados.**
  - El chat de desarrollo es solo para código.
  - Las tareas operativas (desplegar, Supabase, Vercel, SMTP, claves, pruebas manuales) se hacen en otro chat, a
    partir de `PENDIENTES_USUARIO.md`.
  - Claude mantiene ese archivo al día: quita lo terminado y agrega lo nuevo.
- **Agente revisor antes de cada commit:** `.claude/agents/revisor-refactor.md`, con herramientas Read, Grep, Glob y
  Bash.
  - Revisa el `git diff` contra `CLAUDE.md` con 6 preguntas: alcance, colores y fuentes, Supabase fuera de los
    servicios, librerías nuevas, funciones fuera del rol, y bloques quitados o inventados.
  - Responde con desviaciones o "sin desviaciones".
  - **No revisa** el banner `PageHeader` ni "un solo lugar por dato". Está pendiente proponer agregarlo.
- **Commits** pequeños por paso, **sin** la línea `Co-Authored-By: Claude`. Es decisión del usuario del
  2026-11-24: no quiere que Claude figure como colaborador. Rama `react-supabase`.
  - **Nunca** push a `main` ni forzar.
  - **Publicar solo cuando el usuario lo pida** (ver la sección 8).
- **En Bash:** no usar comillas invertidas dentro de `node -e "…"`. Para los parches grandes, escribir un script `.cjs`
  en el scratchpad y ejecutarlo, o usar la herramienta Edit.
- **El usuario escribe en español,** a veces con errores de tipeo. Respuestas claras, sin jerga, y preguntar con
  opciones cuando hay que decidir.

## 5. Fases y estado

| Etapa | Contenido | Estado | Commits clave |
|---|---|---|---|
| 0 | Entorno, tokens, BD (migraciones 01–08), layout, 15 componentes UI | ✅ | `eb6fbf4` |
| 1 | Login multirrol, recuperar y restablecer contraseña, rutas por rol, Mi perfil | ✅ | `eb6fbf4` |
| 2 | Fichas del admin: listado, detalle, registrar, actualizar, desactivar, asignar instructor, matricular | ✅ · ⏳ prueba manual | `9eb3c40`, `055b478` |
| 3 | Instructores, Gestión de usuarios y Edge Function `invitar-usuario` (invitación por correo) | ✅ desplegada y probada | `79dd3bc` |
| 4 | Dashboard, alertas de ficha con umbrales, bitácora del admin (rehecha fiel a las fuentes) | ✅ · ⏳ prueba manual | `6dcdfe5` |
| 5 | Estadísticas por corte, reportes, hojas imprimibles e historial por ficha e instructor | ✅ · ⏳ prueba manual | `9e6c7fc`, `b922ffe`, `4722be7` |
| 6.0 | Pantallas separadas por rol (`src/pages/`) | ✅ | `0ff5d89` |
| 6a | Instructor: Fichas, detalle de ficha, historial del aprendiz, Registrar aprendiz | ✅ · ⏳ prueba manual | `d6380bf`, `a2fb5a7`, `906e2c7` |
| extra | Estadísticas del admin: comparar hasta 5, deserción y cumplimiento por dimensión, dimensión Instructor | ✅ | `43e2601`, `d7314e3` |
| **6b** | **Registro de asistencia del instructor** | ⏸️ **planificado y en pausa** (sección 6) | — |
| 6c–6f | Justificaciones, alertas, dashboard, reportes, descargas, bitácora y material del instructor | ⏳ | — |
| 7 | Módulo Aprendiz (4 pantallas) | ⏳ | — |
| 8 | Página pública (RF01), accesibilidad, responsive, despliegue final | ⏳ | — |

### Lo último que se hizo, con detalle
- **6a, módulo Instructor**
  - `/instructor/fichas`, de VersionAntigua `fichas.html`:
    - resumen (asignadas, activas, inactivas, total de aprendices);
    - filtros por programa, estado y búsqueda;
    - tabla Número · Programa · Estado · Aprendices · Acciones (Asistencia y Ver ficha);
    - botón "Registrar aprendiz".
  - `/instructor/fichas/:id`: copia del detalle del admin, **sin** actualizar, desactivar, asignar instructores ni
    cambiar el estado de la matrícula.
    - El instructor matricula aprendices (HU02.2).
    - Si es el líder, activa o desactiva el acceso del aprendiz (HU02.4).
    - Abre el historial de cada aprendiz.
  - `/instructor/fichas/:id/aprendices/:aprendizId`: historial del aprendiz con KPI, asistencia por competencia y
    los registros por sesión (HU03.5, HU03.6, HU04.2, HU04.3).
  - `/instructor/fichas/registrar`, de `registrarAprendiz.html`:
    - datos del aprendiz (CC/TI) y asignación a la ficha;
    - flujo alterno "Aprendiz ya registrado";
    - invitación por correo; la Edge Function crea la matrícula.
- **Edge Function `invitar-usuario`:** el instructor activo puede invitar **solo aprendices** y **solo a una ficha
  activa suya**. La sede se toma de la ficha y la bitácora guarda el rol real. Ya está **desplegada**.
- **Migración 09** (`09_acceso_aprendiz_lider.sql`): solo el **instructor líder** cambia el estado de la cuenta de un
  aprendiz. Es un cambio en `fn_proteger_campos_perfil` y tiene su prueba. Ya está **aplicada** en Supabase.
- **Estadísticas del admin**
  - Comparación con casillas, hasta **5** elementos.
  - Estadísticas Asistencia / Registro (cumplimiento) / **Deserción**. La deserción no aplica a competencia ni a
    instructor.
  - Dimensión **Instructor**.
  - Comparativa global con pestañas Asistencia / Cumplimiento.
  - Tarjeta de deserción por ficha, sede, área, programa o jornada.
  - CSV con los 3 indicadores.
- **Navbar:** 80 px de alto (`h-20`).

## 6. PREGUNTA ABIERTA: back-end (bloquea el 6b)
El SENA pide **una carpeta `back-end/` escrita en un lenguaje de programación, para que la lógica no esté en el
front-end**. El usuario lo va a **consultar con su instructor** antes de seguir.

**Cómo está hoy:**
- El back-end es `front-end/supabase/`:
  - el modelo, las reglas y los permisos, en SQL y PL/pgSQL (triggers y RLS), migraciones 01–09;
  - la Edge Function en TypeScript;
  - 40 pruebas.
- Pero el front-end llama directo a Supabase (CRUD), y los cálculos de estadísticas y reportes
  (`features/estadisticas/presentacion.ts`, `features/reportes/armadoReportes.ts`) corren en el navegador.

**Opciones que se le presentaron al usuario (pendiente de decidir):**
1. **Supabase como back-end en `back-end/`.**
   - `front-end/supabase` pasa a `back-end/` y la lógica de cada módulo se mueve a Edge Functions (TypeScript): por
     ejemplo registrar asistencia, estadísticas y reportes.
   - El front-end solo las llama.
   - Mismo stack, sin servidor extra. Fue la opción recomendada.
2. **API propia en Node.js + Express** (TypeScript), con rutas, controladores y servicios.
   - Usa Supabase solo como base de datos y Auth.
   - Hay que reescribir los servicios de las Etapas 1 a 6a y desplegar un servidor aparte.
   - Cambia el stack, así que necesita permiso.
3. **API en el lenguaje que exija el SENA:** Python con FastAPI, Java con Spring, PHP…

**Preguntas para el instructor:**
1. ¿Sirve Supabase (PostgreSQL con PL/pgSQL más funciones TypeScript) como back-end, o exige una API propia?
2. Si exige una API, ¿en qué lenguaje?
3. ¿Pide una arquitectura concreta (MVC, REST, capas)?

**Lo que cambia según la respuesta:**
- dónde va la lógica del 6b (`registrarAsistencia`);
- la estructura de carpetas;
- la forma de publicar en `-PuntualiX`. Hoy es un `subtree` de `front-end/`; habría que publicar `front-end/` y
  `back-end/`.
- **Mientras no haya respuesta, no empezar el 6b.**
- **No mover** `front-end/supabase/` sin la decisión, porque rompería la publicación, los scripts y el despliegue de
  la función.

## 7. Plan aprobado del paso 6b: Registro de asistencia (`/instructor/asistencia`)
El usuario aprobó el plan; falta ajustarlo según la sección 6.

- **Fuentes**
  - Contenido: VersionAntigua `Instructor/asistencia/asistencia.html`.
  - Diseño: el del admin.
  - Casos de uso: HU03.1, HU03.2, HU03.3, HU03.4, RF08, RF09, RNF1 (35 aprendices en ≤ 1 min) y RNF4 (no perder lo
    diligenciado).
- **Inventario que se conserva**
  - Migas Inicio › Asistencia y el título "Registro de Asistencia", como banner `PageHeader`.
  - Sección "Registrar asistencia" con su descripción.
  - Selectores Ficha, Competencia, Resultado de aprendizaje y Fecha.
  - Tabla Aprendiz · Estado (Presente / Ausente / Justificada) · Observación / Justificación. El texto de ayuda es
    "Observación opcional", y "Motivo de justificación" cuando el estado es Justificada.
  - Botones Cancelar y Registrar asistencia.
- **Selectores**
  - Ficha: solo las fichas activas del instructor; se preselecciona con `?ficha=`.
  - Competencia: las asignadas en `ficha_instructores`. Si es el líder o tiene una asignación sin competencia, todas
    las del programa.
  - Resultado de aprendizaje: opcional.
  - Fecha: hoy por defecto, nunca futura y dentro de las fechas de la ficha.
- **Sesión del día**
  - Si ya hay asistencia para esa ficha, competencia, fecha e instructor, se carga para corregirla (HU03.4) y el
    botón dice "Guardar cambios".
  - Si no, todos arrancan en Presente.
- **Guardar**
  - Se reutiliza la sesión programada de ese día o se crea.
  - Las asistencias nuevas van en **un solo insert**; las existentes se actualizan **solo si cambiaron**, para no
    llenar la bitácora.
  - Lo diligenciado se guarda en `sessionStorage` (RNF4).
- **Servicio nuevo** `features/asistencia/servicioAsistencia.ts`:
  - `competenciasDelInstructor`, `resultadosDeCompetencia`, `aprendicesDeFicha`, `obtenerSesion`,
    `registrarAsistencia`.
  - Reutiliza `listarFichas`, `useCarga`, `traducirErrorBD`, `ETIQUETA_ESTADO_ASISTENCIA` y `hoyISO`.
- **Base de datos:** no hay cambios de esquema.
  - `sesiones_gestionar` exige que el instructor sea de la ficha y que `instructor_id = auth.uid()`.
  - Hay triggers que validan la matrícula, ponen `registrado_en` (RF09), marcan la sesión como `ejecutada`, evalúan
    las alertas y escriben en la bitácora.
- **Se omite** lo que no está en la fuente: "marcar todos", la lista de sesiones del día y la edición de horas.
- **Verificación:** tsc, lint, build y test:db; revisión con `revisor-refactor`; agregar la prueba manual a
  `PENDIENTES_USUARIO.md`.

## 8. Resto de la Etapa 6 (decisiones ya tomadas)
- **6c, Justificaciones** (de `justificaciones.html`; HU08.3–HU08.5, HU11.2, RF11, RF12):
  - KPI pendientes, aprobadas, rechazadas y total; filtros por estado, ficha y búsqueda.
  - Tabla # · Aprendiz · Ficha · Fecha de inasistencia · Documento (enlace firmado de Storage) · Estado ·
    Acciones (ver, aprobar, rechazar).
  - Modal con comentario, **obligatorio al rechazar**, e historial.
- **6c, Aprendices en alerta** `/instructor/alertas` (de `alertas.html` + `alertasLimite.html`; HU12.1, HU12.3,
  HU09.1–HU09.3):
  - Pestañas "Aprendices en alerta" y "Alertas de ficha", con filtros y modales de detalle.
  - Hace falta un servicio que incluya `inasistencia_aprendiz`.
- **6d, Dashboard** `/instructor` (de `dashboard.html`):
  - Saludo y selector de mes.
  - 5 KPI: fichas, aprendices, asistencia, riesgo moderado y riesgo crítico.
  - Dona de desempeño, alertas recientes, riesgo por ficha, tabla de fichas activas, actividad reciente → bitácora, y
    estadísticas del mes con tendencia.
- **6e, Reportes** (**decisión del usuario**):
  - Pestañas **Ficha** (HU05.1), **Aprendiz** (HU05.2, incumplimiento) y **Estadísticas solo de las fichas que tiene
    el instructor**, más el historial (HU05.3). Sin la pestaña "Instructor".
  - Hoja imprimible en `/instructor/reportes/:id` y CSV.
  - Las rutas fijas `/admin/...` de `features/reportes` deben pasar a `RUTA_INICIO_ROL[usuario.rol]`.
- **6e, Descargas** `/instructor/descargas` (de `descargas.html`): 3 tarjetas CSV (fichas, aprendices, competencias);
  cada descarga se registra en la bitácora.
- **6e, Bitácora** `/instructor/bitacora` (de `bitacora.html`; HU11.1): como la del admin, sin los filtros de rol y
  sede. RLS ya muestra solo los registros propios.
- **6f, Material** `/instructor/material` y `/disponibles` (de `subirMaterial.html` + `materialesDisponibles.html`;
  HU07.1, HU07.3, HU07.4):
  - Formulario con nombre, tipo, categoría (incluye "Material de evaluación"), descripción, ficha, competencia y
    archivo (PDF, DOCX, PPTX, MP4) en el bucket `materiales`.
  - Listado con filtros y las acciones descargar, editar y ocultar/publicar. Disponible = publicado, Borrador = oculto.
- **Cierre de la Etapa 6:** README (changelog 0.7.0, sección "Back-end: supabase/" para la presentación), tabla de
  etapas y estado en `CLAUDE.md`, anexos de `docs/RF.docx` y `docs/RNF.docx` (entre los comentarios
  `<!--PX-ESTADO-IMPLEMENTACION-->` y `<!--PX-VERIFICACION-RNF-->` de `word/document.xml`).
- **Se omite:** IP y dispositivo en la bitácora (propuesta para el back-end) y "Descargas totales" del material (no
  hay dato).

## 9. Decisiones del usuario (con fecha)
- **2026-11-23**
  - Verde `#384E38` definitivo y usado en toda la interfaz.
  - Los servicios se quedan en `features/` (no se crea `/src/services`).
  - Cuentas nuevas por **invitación por correo**.
  - El admin no registra aprendices desde Usuarios; "Matricular aprendiz" queda en el detalle de la ficha.
  - Etapa 5: sin librerías (PDF = hoja imprimible, Excel = CSV), corte semestral, solo totales por ficha, historial
    con parámetros.
- **2026-11-24**
  - Pantallas por rol en `src/pages/`.
  - Edge Function ampliada para el instructor.
  - Reportes del instructor con Ficha, Aprendiz y Estadísticas de sus fichas.
  - HU02.4 solo para el instructor líder, con la migración 09.
  - Estadísticas: comparar hasta 5, deserción y cumplimiento por dimensión, dimensión Instructor.
  - El detalle de ficha del instructor es una copia del admin con cambios ligeros.
  - Publicación en `iverfuenfuen/-PuntualiX` (solo `front-end/`).
  - SMTP con Brevo.
  - Tareas operativas en `PENDIENTES_USUARIO.md`.
  - Back-end en espera de la respuesta del instructor.

## 10. Infraestructura (estado al 2026-11-24)
- **Supabase**
  - Proyecto `ckppdfnzgbnwrnqrzkdx`.
  - Migraciones **01–09 aplicadas**.
  - Datos demo cargados (`front-end/supabase/datos_demo_fichas.sql`): 10 fichas `2901xxx`, 6 instructores demo y
    182 aprendices demo. Los usuarios demo no pueden iniciar sesión.
  - Edge Function `invitar-usuario` **desplegada**.
  - SMTP con **Brevo** funcionando. En Brevo hay que mantener desactivado el bloqueo de IP para las claves SMTP; si
    se activa, aparece el error `525 Unauthorized IP`.
  - La `service_role` solo va en `front-end/.env.supabase.local`, que nunca se sube.
- **Vercel:** proyecto `puntuali-x`, que importa `iverfuenfuen/-PuntualiX` (rama `main`), con el preset **Vite** y
  Root Directory en la raíz.
  - Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Hubo un error porque la URL apuntaba a
    `localhost:54321`; se corrigió en otro chat.
  - Las invitaciones ya se probaron en Vercel.
- **GitHub**
  - Un solo repositorio: `iverfuenfuen/-PuntualiX` (remoto `puntualix`). El viejo `iverfuenfuen/Puntualix2.0`
    fue borrado.
    - Rama `react-supabase`: el proyecto completo. Se sube con `git push puntualix react-supabase`.
    - Rama `main`: solo `front-end/`, para Vercel. Se publica con
      `git subtree split --prefix=front-end -b solo-front-end react-supabase` y luego
      `git push puntualix solo-front-end:main`.
  - La organización `puntualix-design` no se usa, porque la cuenta no tenía permiso (403).
- **Usuarios de prueba:** `admin@puntualix.com`, `carlos.perez@puntualix.com` (instructor; es líder de 301002 y de
  la ficha demo 2901102, y está asignado sin ser líder en 2901101 y 2901203) y `juan.perez@puntualix.com` (aprendiz).
  Las contraseñas las sabe el usuario; se cambian en Supabase → Authentication → Users.

## 11. Problemas conocidos y trucos
- **supabase-js:** el constructor de consultas es *thenable*. No hay que devolverlo desde una función `async`, porque
  se ejecuta (ver `servicioBitacora.consulta`).
- **PostgREST**
  - Cuando hay varias FK, indicar la relación (`perfiles!reportes_generado_por_fkey`).
  - Para filtrar por una tabla embebida usar `!inner` (`sesiones!inner(...)` con `.eq('sesiones.fecha', …)`).
- **`traducirErrorBD`** cambia los errores 42501 y 23514 por mensajes genéricos. Para mostrar el mensaje propio de un
  trigger hay que pasarlo en `porRestriccion`.
- **`database.types.ts`** es un marcador. Las filas se tipan a mano y se convierten con `as unknown as Fila[]`.
- **Alertas**
  - Solo el **instructor líder** recibe notificaciones de alertas (trigger `fn_notificar_alerta`).
  - Ningún proceso genera alertas `sesion_sin_registro`.
- **Paquete JS** principal de unos 380 kB; las páginas de auth y el layout siguen cargando sin `lazy`.
- **Archivos por fuera del patrón:** `SesionSupabaseProvider.tsx`, `PaginaRestablecer.tsx` y
  `pages/dev/Diagnostico.tsx` llaman a Supabase sin pasar por un servicio. Hay colores hex en `AlertCard`, `tonos.ts`,
  `estilosBoton.ts`, `PageHeader` y `AuthLayout`. Es anterior a este trabajo y está fuera de alcance.
- **Propuestas para la migración 10, pendientes del back-end:**
  - `bitacora.ip` y `agente_usuario`;
  - el rol formativo, el tipo de contrato y la dedicación del instructor;
  - `fichas.descripcion`.
- **Carga masiva de aprendices** (Excel o CSV) reutilizando `invitar-usuario`: pendiente.
- **La carpeta `claude/`** (sin punto) en la raíz es una copia vieja del agente: el usuario debe borrarla.

## 12. Qué hacer al abrir el chat nuevo
1. Leer este archivo, `CLAUDE.md`, `PENDIENTES_USUARIO.md` y el README.
2. Preguntar al usuario qué respondió el instructor sobre el back-end (sección 6).
3. Según la respuesta, entrar en **modo plan**, ajustar el plan del 6b (sección 7) y, si hace falta, planificar la
   creación de `back-end/`.
4. Al terminar cada paso, correr la verificación, pasar el agente revisor, hacer el commit y actualizar
   `PENDIENTES_USUARIO.md`. Al cerrar la etapa, actualizar `CLAUDE.md`.
