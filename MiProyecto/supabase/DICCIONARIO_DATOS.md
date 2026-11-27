# Diccionario de Datos — PuntualiX

> **Documento generado automáticamente** desde `supabase/migrations` con `npm run docs:diccionario`.
> No editar a mano: para cambiar una descripción, modifica `07_comentarios.sql` y vuelve a generar.
> Motor: PostgreSQL (Supabase) · Esquema: `public` · Generado: 2026-11-23

**Convenciones:** PK = llave primaria · FK = llave foránea · UQ = valor único ·
"Nulo: No" = obligatorio · `auth.uid()` = usuario con sesión iniciada · identidad = número autoincremental.

## Índice

**Tablas:** [sedes](#sedes) · [areas](#areas) · [ambientes](#ambientes) · [programas](#programas) · [competencias](#competencias) · [resultados_aprendizaje](#resultados_aprendizaje) · [perfiles](#perfiles) · [instructores](#instructores) · [fichas](#fichas) · [ficha_instructores](#ficha_instructores) · [matriculas](#matriculas) · [sesiones](#sesiones) · [asistencias](#asistencias) · [justificaciones](#justificaciones) · [justificacion_historial](#justificacion_historial) · [umbrales_alerta](#umbrales_alerta) · [alertas](#alertas) · [notificaciones](#notificaciones) · [reportes](#reportes) · [materiales](#materiales) · [bitacora](#bitacora)

**Vistas:** [v_asistencia_aprendiz](#v_asistencia_aprendiz) · [v_asistencia_aprendiz_competencia](#v_asistencia_aprendiz_competencia) · [v_asistencia_competencia](#v_asistencia_competencia) · [v_fichas_resumen](#v_fichas_resumen) · [v_cumplimiento_instructor](#v_cumplimiento_instructor)

**Otros:** [Tipos enumerados](#tipos-enumerados) · [Relaciones](#relaciones)

## Tablas

### sedes

Sedes físicas del centro de formación.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la sede. |
| `nombre` | character varying(120) | No |  | UQ | Nombre oficial de la sede (único). |
| `direccion` | character varying(200) | Sí |  |  | Dirección física. |
| `activa` | boolean | No | true |  | Indica si la sede está en uso. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

### areas

Áreas temáticas o de especialidad que agrupan programas e instructores.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del área. |
| `nombre` | character varying(120) | No |  | UQ | Nombre del área (único). |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

### ambientes

Ambientes de aprendizaje (aulas, laboratorios) de cada sede. RF05.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del ambiente. |
| `sede_id` | bigint | No |  | UQ (sede_id, nombre), FK → sedes | Sede a la que pertenece el ambiente. |
| `nombre` | character varying(80) | No |  | UQ (sede_id, nombre) | Nombre del ambiente (único dentro de la sede). |
| `capacidad` | smallint | Sí |  |  | Número máximo de aprendices. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

**Reglas de integridad:**

- `ambientes_capacidad_check`: `CHECK ((capacidad > 0))`

### programas

Programas de formación del catálogo institucional.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del programa. |
| `codigo` | character varying(20) | No |  | UQ | Código oficial del programa SENA (único). |
| `nombre` | character varying(200) | No |  |  | Nombre del programa de formación. |
| `nivel` | nivel_formacion | No |  |  | Nivel de formación: tecnico, tecnologo, auxiliar, operario, especializacion. |
| `area_id` | bigint | No |  | FK → areas | Área a la que pertenece el programa. |
| `activo` | boolean | No | true |  | Indica si el programa se oferta actualmente. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

### competencias

Competencias que componen un programa de formación. RF08, RF15.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la competencia. |
| `programa_id` | bigint | No |  | UQ (programa_id, codigo), FK → programas | Programa al que pertenece. |
| `codigo` | character varying(20) | No |  | UQ (programa_id, codigo) | Código de la competencia (único dentro del programa). |
| `nombre` | character varying(250) | No |  |  | Nombre de la competencia. |
| `horas` | smallint | Sí |  |  | Duración en horas. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

**Reglas de integridad:**

- `competencias_horas_check`: `CHECK ((horas > 0))`

### resultados_aprendizaje

Resultados de aprendizaje (RA) de cada competencia. RF08.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del resultado de aprendizaje. |
| `competencia_id` | bigint | No |  | UQ (competencia_id, codigo), FK → competencias | Competencia a la que pertenece. |
| `codigo` | character varying(20) | No |  | UQ (competencia_id, codigo) | Código del RA (único dentro de la competencia). |
| `descripcion` | text | No |  |  | Descripción del resultado esperado. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

### perfiles

Datos de todos los usuarios. Extiende auth.users (Supabase Auth guarda correo y contraseña cifrada). RF02, CU02.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | uuid | No |  | PK, FK → users | Mismo uuid del usuario en auth.users. |
| `tipo_documento` | tipo_documento | No | 'CC' | UQ (tipo_documento, numero_documento) | Tipo de documento: CC, TI, CE, PPT. |
| `numero_documento` | character varying(20) | No |  | UQ (tipo_documento, numero_documento) | Número de documento (único junto con el tipo). |
| `nombres` | character varying(100) | No |  |  | Nombres del usuario. |
| `apellidos` | character varying(100) | No |  |  | Apellidos del usuario. |
| `correo` | character varying(150) | No |  | UQ | Correo de acceso (copiado de auth.users, único). |
| `telefono` | character varying(20) | Sí |  |  | Teléfono de contacto. |
| `rol` | rol_usuario | No | 'aprendiz' |  | Rol: administrador, instructor o aprendiz. Solo lo cambia un administrador (HU02.3). |
| `estado` | estado_usuario | No | 'activo' |  | activo / inactivo. Un usuario inactivo no puede operar, pero conserva su historial (HU02.4). |
| `sede_id` | bigint | Sí |  | FK → sedes | Sede principal del usuario. |
| `avatar_url` | text | Sí |  |  | Ruta de la foto de perfil (bucket avatares). |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |
| `updated_at` | timestamp with time zone | No | now() |  | Fecha de la última modificación (automática). |

### instructores

Datos propios del rol instructor (relación 1:1 con perfiles). HU02.1.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | uuid | No |  | PK, FK → perfiles | uuid del perfil del instructor. |
| `area_id` | bigint | Sí |  | FK → areas | Área de desempeño. |
| `especialidad` | character varying(150) | Sí |  |  | Especialidad del instructor. |
| `fecha_ingreso` | date | Sí |  |  | Fecha de vinculación a la institución. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

### fichas

Fichas (grupos) de formación. CU10, RF04-RF06.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador interno de la ficha. |
| `numero` | character varying(20) | No |  | UQ | Número de ficha SENA (solo dígitos, único). |
| `programa_id` | bigint | No |  | FK → programas | Programa de formación. |
| `sede_id` | bigint | No |  | FK → sedes | Sede donde se imparte. |
| `ambiente_id` | bigint | Sí |  | FK → ambientes | Ambiente de aprendizaje asignado. |
| `jornada` | jornada | No |  |  | Jornada: manana, tarde, noche, mixta. |
| `modalidad` | modalidad | No | 'presencial' |  | Modalidad: presencial, virtual, hibrida. |
| `fecha_inicio` | date | No |  |  | Fecha de inicio de la formación. |
| `fecha_fin` | date | No |  |  | Fecha de finalización (debe ser posterior al inicio). |
| `estado` | estado_ficha | No | 'activa' |  | activa, en_pausa, etapa_productiva, finalizada, inactiva (HU10.3: desactivar conserva el historial). |
| `instructor_lider_id` | uuid | Sí |  | FK → instructores | Instructor líder responsable de la ficha. |
| `created_by` | uuid | Sí | auth.uid() | FK → perfiles | Usuario que registró la ficha. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |
| `updated_at` | timestamp with time zone | No | now() |  | Fecha de la última modificación (automática). |

**Reglas de integridad:**

- `fichas_fechas_validas`: `CHECK ((fecha_fin > fecha_inicio))`
- `fichas_numero_formato`: `CHECK (((numero)::text ~ '^[0-9]{4,20}$'::text))`

### ficha_instructores

Asignación de uno o varios instructores a una ficha, por competencia. HU10.4.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la asignación. |
| `ficha_id` | bigint | No |  | UQ (ficha_id, instructor_id, competencia_id), FK → fichas | Ficha asignada. |
| `instructor_id` | uuid | No |  | UQ (ficha_id, instructor_id, competencia_id), FK → instructores | Instructor asignado. |
| `competencia_id` | bigint | Sí |  | UQ (ficha_id, instructor_id, competencia_id), FK → competencias | Competencia que imparte en la ficha. |
| `fecha_inicio` | date | Sí |  |  | Inicio de la asignación. |
| `fecha_fin` | date | Sí |  |  | Fin de la asignación. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

**Reglas de integridad:**

- `ficha_instructores_fechas`: `CHECK (((fecha_fin IS NULL) OR (fecha_inicio IS NULL) OR (fecha_fin >= fecha_inicio)))`

### matriculas

Vinculación de aprendices a fichas. Un aprendiz solo tiene una matrícula activa. HU02.2, RF07.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la matrícula. |
| `ficha_id` | bigint | No |  | UQ (ficha_id, aprendiz_id), FK → fichas | Ficha en la que se matricula. |
| `aprendiz_id` | uuid | No |  | UQ (ficha_id, aprendiz_id), FK → perfiles | Perfil del aprendiz. |
| `fecha_matricula` | date | No | CURRENT_DATE |  | Fecha de matrícula. |
| `estado` | estado_matricula | No | 'matriculado' |  | matriculado, aplazado, retirado, desertor, certificado. |
| `vocero` | tipo_vocero | No | 'ninguno' |  | ninguno, titular o suplente (máximo uno de cada tipo por ficha). |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |
| `updated_at` | timestamp with time zone | No | now() |  | Fecha de la última modificación (automática). |

**Reglas de integridad:**

- `matriculas_un_activo_por_aprendiz`: `CREATE UNIQUE INDEX matriculas_un_activo_por_aprendiz ON matriculas (aprendiz_id) WHERE (estado = 'matriculado'::estado_matricula)`
- `matriculas_un_vocero_por_tipo`: `CREATE UNIQUE INDEX matriculas_un_vocero_por_tipo ON matriculas (ficha_id, vocero) WHERE (vocero <> 'ninguno'::tipo_vocero)`

### sesiones

Clases programadas o ejecutadas de una competencia en una fecha. Base del cumplimiento docente. RF08, HU12.2.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la sesión. |
| `ficha_id` | bigint | No |  | FK → fichas | Ficha de la sesión. |
| `competencia_id` | bigint | No |  | FK → competencias | Competencia trabajada. |
| `resultado_id` | bigint | Sí |  | FK → resultados_aprendizaje | Resultado de aprendizaje trabajado. |
| `instructor_id` | uuid | No |  | FK → instructores | Instructor que dicta la sesión. |
| `fecha` | date | No |  |  | Fecha de la sesión (año, mes y día, HU03.3). |
| `hora_inicio` | time without time zone | Sí |  |  | Hora de inicio. |
| `hora_fin` | time without time zone | Sí |  |  | Hora de fin (posterior al inicio). |
| `estado` | estado_sesion | No | 'programada' |  | programada, ejecutada (automático al registrar asistencia) o cancelada. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

**Reglas de integridad:**

- `sesiones_horas`: `CHECK (((hora_fin IS NULL) OR (hora_inicio IS NULL) OR (hora_fin > hora_inicio)))`

### asistencias

Estado de asistencia de cada aprendiz en cada sesión. RF08, RF09, CU03.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del registro de asistencia. |
| `sesion_id` | bigint | No |  | UQ (sesion_id, aprendiz_id), FK → sesiones | Sesión a la que corresponde. |
| `aprendiz_id` | uuid | No |  | UQ (sesion_id, aprendiz_id), FK → perfiles | Aprendiz (debe estar matriculado en la ficha de la sesión). |
| `estado` | estado_asistencia | No |  |  | presente, ausente o justificada (pasa a justificada al aprobarse una justificación). |
| `observacion` | character varying(500) | Sí |  |  | Observación del instructor. |
| `registrado_por` | uuid | Sí | auth.uid() | FK → perfiles | Usuario que registró la asistencia. |
| `registrado_en` | timestamp with time zone | No | now() |  | Fecha y hora del registro, asignada por el servidor e inmutable (RF09). |
| `actualizado_en` | timestamp with time zone | No | now() |  | Fecha y hora de la última corrección (HU03.4). |

### justificaciones

Soportes presentados por aprendices para justificar inasistencias. RF10, RF11, CU08.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la justificación. |
| `asistencia_id` | bigint | No |  | UQ, FK → asistencias | Inasistencia justificada (una justificación por inasistencia). |
| `aprendiz_id` | uuid | No |  | FK → perfiles | Aprendiz que la presenta. |
| `documento_path` | text | No |  |  | Ruta del soporte en Storage (bucket justificaciones). |
| `comentario` | character varying(500) | Sí |  |  | Comentario del aprendiz. |
| `estado` | estado_justificacion | No | 'pendiente' |  | pendiente (al crearse), aprobada o rechazada. |
| `revisado_por` | uuid | Sí |  | FK → perfiles | Instructor que la revisó (automático). |
| `revisado_en` | timestamp with time zone | Sí |  |  | Fecha y hora de la revisión (automática). |
| `observacion_revision` | character varying(500) | Sí |  |  | Comentario del instructor sobre la decisión (HU08.5). |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |

### justificacion_historial

Historial de cambios de estado de cada justificación (automático). RF12, HU11.2.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del cambio. |
| `justificacion_id` | bigint | No |  | FK → justificaciones | Justificación modificada. |
| `estado_anterior` | estado_justificacion | Sí |  |  | Estado antes del cambio (vacío al crearse). |
| `estado_nuevo` | estado_justificacion | No |  |  | Estado después del cambio. |
| `cambiado_por` | uuid | Sí |  | FK → perfiles | Usuario que hizo el cambio. |
| `observacion` | character varying(500) | Sí |  |  | Observación registrada en el cambio. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha y hora del cambio. |

### umbrales_alerta

Porcentajes de inasistencia que disparan alertas, configurables por el administrador. RF17.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del umbral. |
| `prioridad` | prioridad_alerta | No |  | UQ | Prioridad de la alerta que genera: baja, media, alta (única). |
| `porcentaje_inasistencia` | numeric(5,2) | No |  |  | Porcentaje de inasistencias no justificadas (0-100] a partir del cual se alerta. |
| `descripcion` | character varying(200) | Sí |  |  | Descripción del umbral. |
| `activo` | boolean | No | true |  | Si está inactivo no genera alertas. |
| `actualizado_por` | uuid | Sí |  | FK → perfiles | Administrador que lo modificó por última vez. |
| `updated_at` | timestamp with time zone | No | now() |  | Fecha de la última modificación (automática). |

**Reglas de integridad:**

- `umbrales_alerta_porcentaje_inasistencia_check`: `CHECK (((porcentaje_inasistencia > (0)::numeric) AND (porcentaje_inasistencia <= (100)::numeric)))`

### alertas

Alertas generadas automáticamente por inasistencia o novedades de ficha. RF16, CU09.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la alerta. |
| `tipo` | tipo_alerta | No |  |  | inasistencia_aprendiz, riesgo_ficha, ficha_sin_lider, sesion_sin_registro. |
| `prioridad` | prioridad_alerta | No |  |  | baja, media, alta (según el umbral alcanzado). |
| `ficha_id` | bigint | No |  | FK → fichas | Ficha relacionada. |
| `aprendiz_id` | uuid | Sí |  | FK → perfiles | Aprendiz relacionado (solo en alertas de inasistencia individual). |
| `porcentaje` | numeric(5,2) | Sí |  |  | Porcentaje de inasistencia que la originó. |
| `descripcion` | text | No |  |  | Texto descriptivo de la alerta. |
| `estado` | estado_alerta | No | 'nueva' |  | nueva, en_seguimiento, atendida, descartada. |
| `atendida_por` | uuid | Sí |  | FK → perfiles | Usuario que la atendió. |
| `atendida_en` | timestamp with time zone | Sí |  |  | Fecha en que fue atendida. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de generación. |

**Reglas de integridad:**

- `alertas_abierta_unica`: `CREATE UNIQUE INDEX alertas_abierta_unica ON alertas (tipo, prioridad, ficha_id, COALESCE(aprendiz_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE (estado = ANY (ARRAY['nueva'::estado_alerta, 'en_seguimiento'::estado_alerta]))`

### notificaciones

Avisos individuales mostrados en la campana de notificaciones. HU09.1-HU09.4.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador de la notificación. |
| `usuario_id` | uuid | No |  | FK → perfiles | Destinatario. |
| `alerta_id` | bigint | Sí |  | FK → alertas | Alerta que la originó (si aplica). |
| `titulo` | character varying(150) | No |  |  | Título corto. |
| `mensaje` | text | No |  |  | Contenido del aviso. |
| `leida` | boolean | No | false |  | Si el destinatario ya la leyó. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de envío. |

### reportes

Historial de reportes generados y sus archivos. RF18, RF20, CU05, CU06.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del reporte. |
| `tipo` | tipo_reporte | No |  |  | ficha, instructor, aprendiz, estadisticas, desercion, cumplimiento_instructores. |
| `titulo` | character varying(200) | No |  |  | Título visible del reporte. |
| `ficha_id` | bigint | Sí |  | FK → fichas | Ficha consultada (si aplica). |
| `instructor_id` | uuid | Sí |  | FK → instructores | Instructor consultado (si aplica). |
| `aprendiz_id` | uuid | Sí |  | FK → perfiles | Aprendiz consultado (si aplica). |
| `fecha_desde` | date | Sí |  |  | Inicio del periodo evaluado. |
| `fecha_hasta` | date | Sí |  |  | Fin del periodo evaluado. |
| `parametros` | jsonb | No | '{}' |  | Filtros usados al generarlo (sede, área, jornada...), en formato JSON. |
| `formato` | formato_reporte | No | 'pdf' |  | pdf, xlsx o csv. |
| `archivo_path` | text | Sí |  |  | Ruta del archivo en Storage (bucket reportes). |
| `estado` | estado_reporte | No | 'generando' |  | generando, listo, error. |
| `generado_por` | uuid | Sí | auth.uid() | FK → perfiles | Usuario que lo generó. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de generación. |

**Reglas de integridad:**

- `reportes_periodo`: `CHECK (((fecha_hasta IS NULL) OR (fecha_desde IS NULL) OR (fecha_hasta >= fecha_desde)))`

### materiales

Material de apoyo publicado por instructores para las fichas. CU07.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del material. |
| `titulo` | character varying(200) | No |  |  | Nombre del material. |
| `descripcion` | text | Sí |  |  | Descripción del contenido. |
| `tipo` | tipo_material | No |  |  | documento, presentacion, video, enlace. |
| `categoria` | categoria_material | No |  |  | guia_aprendizaje, actividad_practica, material_competencia, material_evaluacion. |
| `competencia_id` | bigint | Sí |  | FK → competencias | Competencia relacionada. |
| `ficha_id` | bigint | Sí |  | FK → fichas | Ficha que puede verlo. |
| `archivo_path` | text | Sí |  |  | Ruta del archivo en Storage (bucket materiales). |
| `enlace_url` | text | Sí |  |  | URL externa (alternativa al archivo). |
| `fecha_inicio` | date | Sí |  |  | Fecha desde la que está disponible. |
| `fecha_fin` | date | Sí |  |  | Fecha hasta la que está disponible. |
| `estado` | estado_material | No | 'publicado' |  | publicado u oculto (HU07.4 desactivar). |
| `subido_por` | uuid | Sí | auth.uid() | FK → perfiles | Instructor que lo publicó. |
| `created_at` | timestamp with time zone | No | now() |  | Fecha de creación del registro. |
| `updated_at` | timestamp with time zone | No | now() |  | Fecha de la última modificación (automática). |

**Reglas de integridad:**

- `materiales_origen`: `CHECK (((archivo_path IS NOT NULL) OR (enlace_url IS NOT NULL)))`
- `materiales_fechas`: `CHECK (((fecha_fin IS NULL) OR (fecha_inicio IS NULL) OR (fecha_fin >= fecha_inicio)))`

### bitacora

Registro de auditoría inmutable de operaciones del sistema (solo inserción). RF19, CU11.

| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |
|---|---|---|---|---|---|
| `id` | bigint | No | identidad | PK | Identificador del evento. |
| `fecha` | timestamp with time zone | No | now() |  | Fecha y hora del evento. |
| `usuario_id` | uuid | Sí |  | FK → perfiles | Usuario responsable. |
| `rol` | rol_usuario | Sí |  |  | Rol del usuario al momento del evento. |
| `modulo` | modulo_sistema | No |  |  | Módulo del sistema afectado. |
| `accion` | accion_bitacora | No |  |  | acceso, registro, modificacion, eliminacion, consulta, descarga. |
| `tabla` | character varying(60) | Sí |  |  | Tabla afectada (en cambios de datos). |
| `registro_id` | text | Sí |  |  | Identificador del registro afectado. |
| `detalle` | text | Sí |  |  | Descripción legible del evento. |
| `datos_anteriores` | jsonb | Sí |  |  | Copia JSON del registro antes del cambio. |
| `datos_nuevos` | jsonb | Sí |  |  | Copia JSON del registro después del cambio. |
| `resultado` | resultado_bitacora | No | 'exito' |  | exito, alerta, error. |

## Vistas

Todas usan `security_invoker`: respetan los permisos (RLS) de quien consulta.

### v_asistencia_aprendiz

Indicadores de asistencia por aprendiz y ficha. RF13, HU04.2.

| Columna | Tipo |
|---|---|
| `aprendiz_id` | uuid |
| `aprendiz` | text |
| `ficha_id` | bigint |
| `ficha_numero` | character varying(20) |
| `total_registros` | bigint |
| `presentes` | bigint |
| `ausencias` | bigint |
| `justificadas` | bigint |
| `porcentaje_asistencia` | numeric |
| `porcentaje_inasistencia` | numeric |

### v_asistencia_aprendiz_competencia

Indicadores de asistencia por aprendiz y competencia. RF15, HU04.3.

| Columna | Tipo |
|---|---|
| `aprendiz_id` | uuid |
| `ficha_id` | bigint |
| `competencia_id` | bigint |
| `competencia` | character varying(250) |
| `total_registros` | bigint |
| `presentes` | bigint |
| `ausencias` | bigint |
| `justificadas` | bigint |
| `porcentaje_asistencia` | numeric |
| `porcentaje_inasistencia` | numeric |

### v_asistencia_competencia

Indicadores de asistencia por ficha y competencia. RF15.

| Columna | Tipo |
|---|---|
| `ficha_id` | bigint |
| `competencia_id` | bigint |
| `competencia` | character varying(250) |
| `sesiones` | bigint |
| `total_registros` | bigint |
| `porcentaje_asistencia` | numeric |
| `porcentaje_inasistencia` | numeric |

### v_fichas_resumen

Resumen de cada ficha con aprendices, % de asistencia y nivel de riesgo. RF04, RF05, RF14, RF21.

| Columna | Tipo |
|---|---|
| `id` | bigint |
| `numero` | character varying(20) |
| `estado` | estado_ficha |
| `jornada` | jornada |
| `modalidad` | modalidad |
| `fecha_inicio` | date |
| `fecha_fin` | date |
| `programa_id` | bigint |
| `programa` | character varying(200) |
| `nivel` | nivel_formacion |
| `area_id` | bigint |
| `area` | character varying(120) |
| `sede_id` | bigint |
| `sede` | character varying(120) |
| `ambiente_id` | bigint |
| `ambiente` | character varying(80) |
| `instructor_lider_id` | uuid |
| `instructor_lider` | text |
| `aprendices_activos` | bigint |
| `total_registros` | bigint |
| `porcentaje_asistencia` | numeric |
| `porcentaje_inasistencia` | numeric |
| `nivel_riesgo` | prioridad_alerta |

### v_cumplimiento_instructor

Sesiones planificadas vs. ejecutadas por instructor y ficha. HU12.2, HU12.4.

| Columna | Tipo |
|---|---|
| `instructor_id` | uuid |
| `instructor` | text |
| `sede_id` | bigint |
| `area_id` | bigint |
| `ficha_id` | bigint |
| `sesiones_planificadas` | bigint |
| `sesiones_ejecutadas` | bigint |
| `porcentaje_cumplimiento` | numeric |

## Tipos enumerados

| Tipo | Valores permitidos |
|---|---|
| `accion_bitacora` | acceso, registro, modificacion, eliminacion, consulta, descarga |
| `categoria_material` | guia_aprendizaje, actividad_practica, material_competencia, material_evaluacion |
| `estado_alerta` | nueva, en_seguimiento, atendida, descartada |
| `estado_asistencia` | presente, ausente, justificada |
| `estado_ficha` | activa, en_pausa, etapa_productiva, finalizada, inactiva |
| `estado_justificacion` | pendiente, aprobada, rechazada |
| `estado_material` | publicado, oculto |
| `estado_matricula` | matriculado, aplazado, retirado, desertor, certificado |
| `estado_reporte` | generando, listo, error |
| `estado_sesion` | programada, ejecutada, cancelada |
| `estado_usuario` | activo, inactivo |
| `formato_reporte` | pdf, xlsx, csv |
| `jornada` | manana, tarde, noche, mixta |
| `modalidad` | presencial, virtual, hibrida |
| `modulo_sistema` | autenticacion, usuarios, fichas, instructores, asistencias, justificaciones, alertas, material, reportes, configuracion |
| `nivel_formacion` | tecnico, tecnologo, auxiliar, operario, especializacion |
| `prioridad_alerta` | baja, media, alta |
| `resultado_bitacora` | exito, alerta, error |
| `rol_usuario` | administrador, instructor, aprendiz |
| `tipo_alerta` | inasistencia_aprendiz, riesgo_ficha, ficha_sin_lider, sesion_sin_registro |
| `tipo_documento` | CC, TI, CE, PPT |
| `tipo_material` | documento, presentacion, video, enlace |
| `tipo_reporte` | ficha, instructor, aprendiz, estadisticas, desercion, cumplimiento_instructores |
| `tipo_vocero` | ninguno, titular, suplente |

## Relaciones

| Tabla origen | Columna(s) | Tabla destino | Regla |
|---|---|---|---|
| alertas | ficha_id | fichas | al borrar: CASCADE |
| alertas | aprendiz_id | perfiles | al borrar: CASCADE |
| alertas | atendida_por | perfiles | al borrar: SET NULL |
| ambientes | sede_id | sedes | al borrar: RESTRICT |
| asistencias | sesion_id | sesiones | al borrar: CASCADE |
| asistencias | aprendiz_id | perfiles | al borrar: CASCADE |
| asistencias | registrado_por | perfiles | al borrar: SET NULL |
| bitacora | usuario_id | perfiles | al borrar: SET NULL |
| competencias | programa_id | programas | al borrar: CASCADE |
| ficha_instructores | ficha_id | fichas | al borrar: CASCADE |
| ficha_instructores | instructor_id | instructores | al borrar: CASCADE |
| ficha_instructores | competencia_id | competencias | al borrar: SET NULL |
| fichas | programa_id | programas | al borrar: RESTRICT |
| fichas | sede_id | sedes | al borrar: RESTRICT |
| fichas | ambiente_id | ambientes | al borrar: SET NULL |
| fichas | instructor_lider_id | instructores | al borrar: SET NULL |
| fichas | created_by | perfiles | al borrar: SET NULL |
| instructores | id | perfiles | al borrar: CASCADE |
| instructores | area_id | areas | al borrar: SET NULL |
| justificacion_historial | justificacion_id | justificaciones | al borrar: CASCADE |
| justificacion_historial | cambiado_por | perfiles | al borrar: SET NULL |
| justificaciones | asistencia_id | asistencias | al borrar: CASCADE |
| justificaciones | aprendiz_id | perfiles | al borrar: CASCADE |
| justificaciones | revisado_por | perfiles | al borrar: SET NULL |
| materiales | competencia_id | competencias | al borrar: SET NULL |
| materiales | ficha_id | fichas | al borrar: CASCADE |
| materiales | subido_por | perfiles | al borrar: SET NULL |
| matriculas | ficha_id | fichas | al borrar: CASCADE |
| matriculas | aprendiz_id | perfiles | al borrar: CASCADE |
| notificaciones | usuario_id | perfiles | al borrar: CASCADE |
| notificaciones | alerta_id | alertas | al borrar: CASCADE |
| perfiles | id | users | al borrar: CASCADE |
| perfiles | sede_id | sedes | al borrar: SET NULL |
| programas | area_id | areas | al borrar: RESTRICT |
| reportes | ficha_id | fichas | al borrar: SET NULL |
| reportes | instructor_id | instructores | al borrar: SET NULL |
| reportes | aprendiz_id | perfiles | al borrar: SET NULL |
| reportes | generado_por | perfiles | al borrar: SET NULL |
| resultados_aprendizaje | competencia_id | competencias | al borrar: CASCADE |
| sesiones | ficha_id | fichas | al borrar: CASCADE |
| sesiones | competencia_id | competencias | al borrar: RESTRICT |
| sesiones | resultado_id | resultados_aprendizaje | al borrar: SET NULL |
| sesiones | instructor_id | instructores | al borrar: RESTRICT |
| umbrales_alerta | actualizado_por | perfiles | al borrar: SET NULL |
