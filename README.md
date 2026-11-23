# PuntualiX 2.0 — Gestión académica y control de asistencia

> *"Organización, seguimiento y control en un solo lugar"*

Plataforma web del SENA para registrar asistencia por competencia, gestionar justificaciones, generar alertas de
deserción, estadísticas y reportes. Tiene tres roles: **Administrador**, **Instructor** y **Aprendiz**.

## Estructura del repositorio

```
Puntualix2.0/
├── front-end/          ← PROYECTO ACTIVO (React + TypeScript + Supabase)
├── Prototipo/          ← Referencia de UI/UX (solo lectura): 17 pantallas HTML del rol Administrador
├── VersionAntigua/     ← Versión HTML/CSS original (solo lectura): flujos, campos, permisos y recursos gráficos
└── docs/
    ├── RF.docx                              Requisitos funcionales (RF01–RF21)
    ├── RNF.docx                             Requisitos no funcionales (RNF1–RNF7)
    ├── Casos de usos.docx                   Historias de usuario HU01–HU12
    └── Manual de identidad corporativo.docx Colores, tipografía y uso del logotipo
```

## Instalación y ejecución

Requisitos: **Node.js 20 o superior** (probado con Node 24) y una cuenta en Supabase.

```bash
cd front-end
npm install
cp .env.example .env.local     # completar con la URL y la anon key de Supabase
npm run dev                    # http://localhost:5173
```

Para crear la base de datos, sigue la guía paso a paso de [front-end/supabase/README.md](front-end/supabase/README.md).

| Comando (dentro de `front-end/`) | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Verifica los tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente la versión de producción |
| `npm run lint` | Revisión estática del código (oxlint) |
| `npm run test:db` | Ejecuta las migraciones SQL en una base local y prueba 38 reglas de negocio y de seguridad |
| `npm run docs:diccionario` | Regenera `supabase/DICCIONARIO_DATOS.md` desde el esquema |

## Arquitectura

| Capa | Tecnología | Motivo |
|---|---|---|
| Interfaz | React 19 + TypeScript 7 + Vite 8 | Componentes reutilizables; tipos que detectan errores antes de ejecutar |
| Estilos | Tailwind CSS 4 con los tokens del Manual de Identidad | Misma técnica que el Prototipo, con los colores y fuentes oficiales |
| Rutas | React Router | Navegación por rol |
| Formularios | react-hook-form + zod | Validaciones declarativas, con los mensajes de VersionAntigua |
| Gráficas | Recharts | Estadísticas y dashboard |
| Íconos | lucide-react | Reemplaza la mezcla de Font Awesome y Material Symbols |
| Backend | Supabase: PostgreSQL, Auth, Storage y RLS | Base de datos, autenticación y archivos sin servidor propio |
| Despliegue | Vercel (`front-end/vercel.json`) | Hosting estático con soporte para SPA |

```
front-end/
├── public/                 favicon
├── src/
│   ├── app/                router.tsx (rutas por rol) · sesionContexto.ts (contrato de sesión) · sesion.tsx (demo)
│   ├── assets/             fuentes Poppins/Nunito y logos (de VersionAntigua)
│   ├── components/
│   │   ├── layout/         AppLayout, Navbar, MenuUsuario, Footer, PageHeader, Breadcrumbs
│   │   └── ui/             Button, Badge, Card, KpiCard, AlertCard, PanelAlertas, DataTable, Tabs,
│   │                       Pagination, Modal, ModalConfirmacion, Input/Select/Textarea, ProgressBar,
│   │                       EmptyState, EstadoError, Spinner, AvatarIniciales
│   ├── config/navegacion.ts menú principal, campana y menú de usuario de cada rol
│   ├── features/           un módulo por caso de uso: páginas, modales, esquemas zod y su
│   │                       servicio<Modulo>.ts (ÚNICO lugar que consulta Supabase)
│   │   ├── auth/           login, recuperar y restablecer contraseña              [Etapa 1]
│   │   ├── perfil/         Mi perfil y cambio de contraseña                       [Etapa 1]
│   │   └── fichas/         listado, detalle, registrar/actualizar, asignar, matricular [Etapa 2]
│   ├── lib/                supabase.ts (cliente único) · utilidades.ts · resultado.ts (errores de BD)
│   │                       · useCarga.ts (cargando/error/recargar) · csv.ts (exportar)
│   ├── pages/              Inicio, Diagnóstico, EnConstruccion, NoEncontrada, dev/CatalogoComponentes
│   ├── styles/             index.css (tokens de identidad) y fonts.css
│   └── types/              database.types.ts (generado desde Supabase)
└── supabase/
    ├── migrations/         01…08 scripts SQL ordenados
    ├── tests/              pruebas de reglas de negocio y RLS
    ├── scripts/            base local (PGlite) y generador del diccionario
    ├── DICCIONARIO_DATOS.md
    └── README.md           guía de conexión paso a paso
```

### Identidad visual (Manual de Identidad Corporativa)

| Token | Valor | Uso |
|---|---|---|
| `primario` | `#384E38` | Navbar, footer, botones principales (verde del Prototipo; el Manual indica `#3D593D`) |
| `primario-oscuro` | `#2D4732` | Banner de encabezado y hover de botones (Prototipo) |
| `estado-activo` | `#808000` | Badges, filtros activos |
| `confirmacion` | `#2E7D32` | Asistencia confirmada, aprobado |
| `advertencia` | `#F9A825` | Riesgo moderado, justificación pendiente |
| `error` | `#FF0000` | Errores del sistema (uso restrictivo) |
| `alerta-critica` | `#BE1F24` | Alertas críticas, riesgo de deserción |
| `informacion` | `#1976D2` | Información, estadísticas, reportes |
| `font-titulos` | Poppins 500–800 | Títulos, métricas, KPIs |
| `font-contenido` | Nunito 400 y 600 | Texto, tablas, formularios |

## Plan de migración por etapas

| Etapa | Contenido | Estado |
|---|---|---|
| 0 | Entorno, tokens, base de datos y guía Supabase · layout y componentes UI | ✅ Completa |
| 1 | Autenticación: login multi-rol, recuperar y cambiar contraseña, rutas por rol | ✅ Completa |
| 2 | Fichas (Admin): listado, detalle con pestañas, registrar, actualizar, asignar instructor, matricular | ✅ Lista para pruebas |
| 3 | Usuarios e instructores (Admin): panel, perfil, registro, cumplimiento | ⏳ |
| 4 | Dashboard, alertas con umbrales y bitácora | ⏳ |
| 5 | Estadísticas, reportes e historial | ⏳ |
| 6 | Módulo Instructor (11 pantallas) | ⏳ |
| 7 | Módulo Aprendiz (4 pantallas) | ⏳ |
| 8 | Página pública (RF01), revisión de accesibilidad y diseño responsivo, despliegue | ⏳ |

---

## Registro de Cambios (Changelog)

### [0.3.0] — 2026-11-23 · Sesión 3: Cierre de la Etapa 1 y Etapa 2 (Fichas del Administrador)

**Continuidad entre computadores**
- Nuevo `CLAUDE.md` en la raíz: stack, convenciones, reglas de identidad visual, Supabase, control de versiones,
  estado de avance y pendientes. Permite retomar el trabajo en cualquier equipo.
- El verde `#384E38` del Prototipo queda como **definitivo** (confirmado por el usuario).
- Etapa 1 probada por el usuario con el proyecto Supabase real (conexión e inicio de sesión) en el segundo equipo.

**Tomado de `Prototipo/`**
- *Listado general de fichas*: banner con total de fichas, 4 tarjetas KPI (registradas, activas, inactivas y
  alertas de deserción con chips críticas/moderadas), pestañas Todas / Activas / En riesgo / Inactivas, tabla con
  nivel, jornada y sede, barra de asistencia, estado combinado con riesgo y botón "Ver ficha" (rojo si es crítica),
  exportar listado.
- *Detalle integral de la ficha*: encabezado verde con estado, código del programa, jornada, modalidad, cupo y
  ciclo lectivo, anillo de asistencia general, 4 KPI, pestañas Información general / Instructores / Aprendices /
  Competencias, y panel lateral de vocería, alertas de deserción temprana y trazabilidad.
- Modales *Registrar ficha (HU10.1)* con el panel "Antes de registrar", *Actualizar ficha (HU10.2)* con número
  bloqueado, instructor líder, vocero y zona "Desactivar ficha (HU10.3)", *Asignar instructor (HU10.4)* con
  buscador, competencias a cargo y vigencia, y *Matricular aprendiz (HU02.2)* en 2 pasos (validación por
  documento y datos de la matrícula) con barra de cupo.

**Rescatado de `VersionAntigua/`**
- Filtros del listado (sede, programa, jornada, estado) y el botón "Limpiar filtros".
- Campos del registro: número, sede, programa, modalidad, fechas, jornada y estado; los mensajes del panel
  "Antes de registrar" (número único, verificar programa, asignaciones posteriores).
- Datos del detalle: instructor líder, vocero, área, duración en meses y lista de instructores por competencia.
- Ficha de ejemplo 3267541 como referencia del formato de número.

**Nuevo y mejoras**
- RF05 completo: además de los filtros antiguos, filtro por **ambiente** y **área**. El ambiente se limita a la
  sede elegida y el programa al área elegida. La búsqueda ignora mayúsculas y tildes y también encuentra por
  código de programa.
- Los filtros, la pestaña y la página viven en la URL: al volver del detalle se conservan.
- Exportar listado a CSV compatible con Excel en español (separador `;` y tildes correctas).
- Riesgo por aprendiz calculado con los **umbrales configurables** de la base (10 / 20 / 30 % de inasistencia);
  los aprendices en riesgo se resaltan y aparecen en el panel de alertas tempranas.
- Cambio de estado de matrícula (aplazado, retirado, desertor, certificado); quien deja de estar matriculado
  pierde la vocería. Reactivación de matrículas previas en la misma ficha.
- Reactivar una ficha inactiva. Una ficha inactiva no admite asignaciones ni matrículas.
- Quitar asignaciones de instructor; si era el líder y no le quedan asignaciones, la ficha queda sin líder y la
  base genera la alerta "ficha sin líder".
- Errores de la base traducidos a mensajes claros por restricción (`lib/resultado.ts`): número de ficha
  duplicado, fechas incoherentes, matrícula activa en otra ficha, vocero repetido…
- Componentes reutilizables nuevos: `EstadoError` (con Reintentar), `ModalConfirmacion`, `AvatarIniciales`, y
  el hook `useCarga` para los estados cargando / error / recarga de todas las pantallas.
- Pantallas cargadas bajo demanda: listado 10,7 kB y detalle 39,6 kB (minificados).
- Las 14 consultas del módulo se validaron contra el Supabase real (relaciones sin ambigüedad).
- `docs/RF.docx`: anexo "Estado de implementación" (RF01–RF21). `docs/RNF.docx`: anexo "Verificación de
  cumplimiento" (RNF1, 2, 3, 6 y 7).

**Eliminación de información repetida (error grave de VersionAntigua)**
- *Problema original:* los datos estaban escritos a mano en varios lugares y las copias se contradecían. Los 17
  "Ver más" abrían la misma página. Las pestañas Instructores y Competencias listaban equipos distintos (solo 2
  de 7 coincidían). Las 4 tarjetas de métricas estaban duplicadas dentro de "Actualizar ficha". "5 de 24 = 4.8 %"
  cuando es 20,8 %. El título decía 301002 y el formulario 248273392993.
- *Cómo lo resuelve el Prototipo:* una ruta por ficha, métricas una sola vez bajo el encabezado, pestañas con
  contadores, modal de actualizar sin métricas y competencias ligadas a la asignación del instructor.
- *Versión nueva:* cada dato existe una vez en la BD y todo se calcula a partir de ahí. Instructores y
  Competencias leen la misma tabla, y los porcentajes los calcula la vista. Además, cada dato tiene **un solo
  lugar en pantalla**:
  - Encabezado = identidad (estado, sede, número, programa) + jornada, modalidad, ciclo e instructor líder.
  - Tarjetas KPI = cifras (matriculados/cupo, asistencia y meta, riesgos). Se quitó el anillo de asistencia
    que repetía el porcentaje.
  - Información general = solo lo que no está arriba: código del programa, área, ambiente, cupo, duración y
    fecha de registro.
  - Vocería = panel lateral (más la insignia en la lista). Los títulos de las tarjetas ya no repiten los
    contadores de las pestañas.
  - Listado: se quitó la insignia "N fichas totales" del banner (la tarjeta "Fichas registradas" ya lo dice).
  - Corregido: la sede aparecía dos veces en el encabezado.

**Decisiones y pendientes (coordinar con back-end)**
- **Cupo de la ficha** = capacidad del ambiente asignado; la tabla `fichas` no tiene columna de cupo. Si la
  matrícula supera el cupo se avisa pero no se bloquea.
- El Prototipo muestra **rol formativo** (técnico / transversal), **dedicación semanal** y la VersionAntigua una
  **descripción** de la ficha: no existen en el esquema. Solo se guarda el instructor líder. Propuesta: columnas
  `ficha_instructores.rol` y `fichas.descripcion` en una migración 09.
- **Crear la cuenta del aprendiz** desde la matrícula y la **carga masiva** desde Excel/CSV necesitan la Edge
  Function de creación de usuarios (Etapa 3). Por ahora se matricula a aprendices ya registrados.
- Número de ficha: 6 a 8 dígitos en el registro (Prototipo); la base admite 4 a 20.
- `src/types/database.types.ts` sigue siendo un marcador temporal; las filas se tipan a mano en cada servicio.
  Generarlo requiere `npx supabase login` con la cuenta del proyecto.

### [0.2.0] — 2026-11-23 · Sesión 2: Conexión con Supabase y Etapa 0 (layout y componentes)

**Cambio de color (decisión del equipo)**
- El verde institucional pasa al del Prototipo: `primario` `#3D593D` → `#384E38` (navbar, footer, botones) y
  `primario-oscuro` `#2F462F` → `#2D4732` (banner y hover). Se cambia solo en los tokens de `index.css`, así que
  todos los componentes lo heredan. **Pendiente:** actualizar el Manual de Identidad para que coincida.

**Conexión con Supabase (proyecto real)**
- Migraciones 01 a 08 aplicadas y verificadas en el proyecto (servidor `aws-1-us-east-1`): 21 tablas, 4 buckets,
  3 usuarios de prueba con su rol y la ficha 301002.
- Las 2 alertas automáticas se generaron correctamente.
- Se comprobó el login de los 3 roles: cada uno ve solo lo que su rol permite (RLS).
- Nuevo `npm run db:aplicar`:
  - aplica las migraciones pendientes de forma transaccional y registra las aplicadas en `privado.migraciones`;
  - detecta las que se ejecutaron a mano en el SQL Editor;
  - crea los usuarios de prueba con la API de administración y genera `.env.local`.
- `08_usuarios_demo.sql` ahora valida que existan los 3 usuarios y muestra un mensaje claro si faltan.

**Tomado de `Prototipo/`**
- Navbar con fondo verde institucional, enlaces con ícono, estado activo, campana y cápsula blanca de usuario.
- Banner de encabezado de página (`PageHeader`).
- Tarjetas KPI con insignia, barra de progreso y chips.
- Tarjetas de alerta "Incidentes recientes" con acciones.
- Tabla densa, pestañas segmentadas, paginación y estilo de los modales.

**Rescatado de `VersionAntigua/`**
- Contenido del footer: créditos SENA, programa ADSO y ficha 3267541, con los logos negativo y SENA.
- Enlaces de navegación por rol (`data-roles`) y opciones del menú de usuario (perfil, gestión de usuarios,
  cerrar sesión).
- Niveles de alerta crítica, advertencia e informativa del dashboard.
- Rangos de asistencia: ≥ 80 % alto, 70–79 % moderado, < 70 % bajo.

**Nuevo y mejoras**
- 15 componentes de UI reutilizables (`@/components/ui`) y 6 de estructura (`@/components/layout`). Su estructura
  es fija y solo cambian los datos que reciben.
- Colores sueltos del Prototipo reemplazados por tokens centralizados en `index.css`. El verde institucional quedó finalmente en el tono del Prototipo (ver "Cambio de color").
- El logotipo respeta el ancho mínimo de 120 px del manual.
- Accesibilidad (RNF7):
  - enlace "Saltar al contenido";
  - modal con `<dialog>` nativo (foco atrapado y tecla Esc);
  - pestañas navegables con flechas del teclado;
  - campos con `aria-invalid` y `aria-describedby`;
  - tablas con `caption`;
  - estados que siempre combinan color con texto;
  - texto amarillo oscurecido para cumplir el contraste AA.
- Diseño responsivo (RNF6):
  - menú desplegable ☰ en pantallas de menos de 1280 px;
  - columnas secundarias de las tablas ocultas en celular;
  - paginación que pasa a dos líneas cuando no cabe.
- Enrutador con todas las rutas de los 3 roles. Las pantallas pendientes muestran en qué etapa se construyen.
- Contrato de sesión (`useSesion`) listo para conectar Supabase Auth en la Etapa 1 sin tocar el layout.
- Catálogo visual en `/componentes` y página de inicio temporal con acceso a cada rol.

**Correcciones**
- En Windows, la letra de unidad `c:` / `C:` hacía que Vite empaquetara React dos veces. El síntoma era el error
  *"Cannot read properties of null (reading 'useContext')"*. Se corrigió con una raíz única en `vite.config.ts` y
  `resolve.dedupe`.
- La pestaña "En riesgo" no se mostraba en rojo porque dos clases de color chocaban.

**Pendiente**
- El paquete JS pesa 592 kB. Se dividirá por pantalla (carga diferida) a partir de la Etapa 1.

### [0.1.0] — 2026-11-23 · Sesión 1: Auditoría, entorno y base de datos

**Auditoría (Fase 1)**
- Se analizaron las 17 pantallas de `Prototipo/`, las 33 pantallas de `VersionAntigua/`, `RF.docx`,
  `Casos de usos.docx` y el `Manual de identidad corporativo.docx`.
- Hallazgo: `VersionAntigua` es HTML/CSS sin lógica JavaScript. Solo tenía el login simulado, porque en esa fase
  no se permitía usar JS. La lógica de negocio se reconstruyó a partir de los formularios, los filtros, los
  mensajes de error y los casos de uso.

**Tomado de `Prototipo/`**
- Tailwind CSS como técnica de estilos y la estructura de componentes que guiará las etapas siguientes: navbar con
  cápsula de usuario, banner de encabezado, tarjetas KPI, tablas con filtros, modales y pestañas.
- Estructura de campos de los modales HU10.1, HU10.2, HU10.4, HU02.1 y HU02.2, y estados de ficha ampliados
  (*en pausa*, *etapa productiva*, *finalizada*).
- Formatos de reporte PDF, XLSX y CSV.

**Rescatado de `VersionAntigua/`**
- Tokens de color y tipografía (`tokens.css`), fuentes Poppins y Nunito alojadas localmente, logos y favicon.
- Catálogos: sedes, áreas, programas, jornadas, competencias, resultados de aprendizaje, tipos y categorías de
  material, y estados de asistencia y justificación.
- Permisos por rol del navbar (`data-roles`) trasladados a políticas RLS.
- Flujos del login FA01.1.1 a FA01.1.4 (se implementan en la Etapa 1).
- Límite crítico institucional del 30 % de inasistencias, usado como umbral inicial.
- Módulos de **Material de apoyo** y **Descargas**, que no tenían prototipo.

**Ajustes según el Manual de Identidad**
- `alerta-critica` pasa de `#D32F2F` a `#BE1F24` (rojo institucional del manual).

**Nuevo**
- Proyecto `front-end/` con Vite 8, React 19, TypeScript 7, Tailwind 4, Supabase JS, React Router,
  react-hook-form, zod, Recharts y lucide-react. Alias de importación `@/`.
- Base de datos Supabase:
  - **Estructura:** 21 tablas, 5 vistas de estadísticas, 24 tipos enumerados e índices.
  - **Reglas de negocio en triggers:**
    - perfil automático al crear un usuario;
    - el rol se toma de `app_metadata` (protección contra escalamiento de privilegios);
    - la fecha de asistencia la pone el servidor (RF09);
    - toda justificación nace pendiente;
    - historial automático de justificaciones (RF12);
    - alertas automáticas por aprendiz y por ficha (RF16, HU09.3);
    - notificaciones (HU09.1 a HU09.4);
    - bitácora inmutable (RF19).
  - **Seguridad RLS** por rol en todas las tablas y en Storage (RNF2).
  - **Almacenamiento:** 4 buckets con límites de tamaño y de tipo de archivo.
- 38 pruebas automáticas del SQL (`npm run test:db`), todas en verde.
- Diccionario de datos generado desde el esquema (`supabase/DICCIONARIO_DATOS.md`).
- Guía de conexión con Supabase paso a paso (`front-end/supabase/README.md`).
- Pantalla provisional de diagnóstico de conexión.
- `docs/RNF.docx` creado: RNF1 a RNF6 con criterios medibles y **RNF7 (nuevo)**: usabilidad, accesibilidad e
  identidad visual.
- `docs/Documentación de RF v2.0.docx` renombrado a `docs/RF.docx`.
- Se eliminó la carpeta `.git` local para preparar un repositorio limpio. El historial anterior sigue en GitHub
  (`origin/main` y `origin/admin`).

**Pendiente o decisiones abiertas**
- Supabase devuelve el mismo error para "usuario no existe" y "contraseña incorrecta". Distinguirlos
  (FA01.1.1 y FA01.1.2) permitiría adivinar qué correos están registrados. Se propone un mensaje único (ver RNF2).
- Crear usuarios desde la aplicación requiere una Edge Function. Está planificada para las etapas 1 y 3.
- Los códigos de programa distintos de ADSO (228118) son de ejemplo.
- El Manual no incluye Nunito Light (300) ni los valores de la escala de grises.
