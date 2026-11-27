-- =====================================================================
-- PuntualiX — 01. Tipos y tablas
-- Ejecutar en: Supabase Dashboard > SQL Editor (en orden 01 → 06)
-- Base: PostgreSQL 15+ (Supabase)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS (catálogos cerrados)
-- ---------------------------------------------------------------------
create type public.rol_usuario         as enum ('administrador', 'instructor', 'aprendiz');
create type public.tipo_documento      as enum ('CC', 'TI', 'CE', 'PPT');
create type public.estado_usuario      as enum ('activo', 'inactivo');
create type public.nivel_formacion     as enum ('tecnico', 'tecnologo', 'auxiliar', 'operario', 'especializacion');
create type public.jornada             as enum ('manana', 'tarde', 'noche', 'mixta');
create type public.modalidad           as enum ('presencial', 'virtual', 'hibrida');
create type public.estado_ficha        as enum ('activa', 'en_pausa', 'etapa_productiva', 'finalizada', 'inactiva');
create type public.estado_matricula    as enum ('matriculado', 'aplazado', 'retirado', 'desertor', 'certificado');
create type public.tipo_vocero         as enum ('ninguno', 'titular', 'suplente');
create type public.estado_sesion       as enum ('programada', 'ejecutada', 'cancelada');
create type public.estado_asistencia   as enum ('presente', 'ausente', 'justificada');
create type public.estado_justificacion as enum ('pendiente', 'aprobada', 'rechazada');
create type public.prioridad_alerta    as enum ('baja', 'media', 'alta');
create type public.tipo_alerta         as enum ('inasistencia_aprendiz', 'riesgo_ficha', 'ficha_sin_lider', 'sesion_sin_registro');
create type public.estado_alerta       as enum ('nueva', 'en_seguimiento', 'atendida', 'descartada');
create type public.tipo_reporte        as enum ('ficha', 'instructor', 'aprendiz', 'estadisticas', 'desercion', 'cumplimiento_instructores');
create type public.formato_reporte     as enum ('pdf', 'xlsx', 'csv');
create type public.estado_reporte      as enum ('generando', 'listo', 'error');
create type public.modulo_sistema      as enum ('autenticacion', 'usuarios', 'fichas', 'instructores', 'asistencias',
                                                'justificaciones', 'alertas', 'material', 'reportes', 'configuracion');
create type public.accion_bitacora     as enum ('acceso', 'registro', 'modificacion', 'eliminacion', 'consulta', 'descarga');
create type public.resultado_bitacora  as enum ('exito', 'alerta', 'error');
create type public.tipo_material       as enum ('documento', 'presentacion', 'video', 'enlace');
create type public.categoria_material  as enum ('guia_aprendizaje', 'actividad_practica', 'material_competencia', 'material_evaluacion');
create type public.estado_material     as enum ('publicado', 'oculto');

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS INSTITUCIONALES
-- ---------------------------------------------------------------------
create table public.sedes (
  id          bigint generated always as identity primary key,
  nombre      varchar(120) not null unique,
  direccion   varchar(200),
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.areas (
  id          bigint generated always as identity primary key,
  nombre      varchar(120) not null unique,
  created_at  timestamptz not null default now()
);

create table public.ambientes (
  id          bigint generated always as identity primary key,
  sede_id     bigint not null references public.sedes (id) on delete restrict,
  nombre      varchar(80) not null,
  capacidad   smallint check (capacidad > 0),
  created_at  timestamptz not null default now(),
  unique (sede_id, nombre)
);

create table public.programas (
  id          bigint generated always as identity primary key,
  codigo      varchar(20) not null unique,
  nombre      varchar(200) not null,
  nivel       public.nivel_formacion not null,
  area_id     bigint not null references public.areas (id) on delete restrict,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.competencias (
  id          bigint generated always as identity primary key,
  programa_id bigint not null references public.programas (id) on delete cascade,
  codigo      varchar(20) not null,
  nombre      varchar(250) not null,
  horas       smallint check (horas > 0),
  created_at  timestamptz not null default now(),
  unique (programa_id, codigo)
);

create table public.resultados_aprendizaje (
  id             bigint generated always as identity primary key,
  competencia_id bigint not null references public.competencias (id) on delete cascade,
  codigo         varchar(20) not null,
  descripcion    text not null,
  created_at     timestamptz not null default now(),
  unique (competencia_id, codigo)
);

-- ---------------------------------------------------------------------
-- 3. USUARIOS
-- perfiles extiende auth.users (Supabase Auth gestiona correo y contraseña)
-- ---------------------------------------------------------------------
create table public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  tipo_documento   public.tipo_documento not null default 'CC',
  numero_documento varchar(20) not null,
  nombres          varchar(100) not null,
  apellidos        varchar(100) not null,
  correo           varchar(150) not null unique,
  telefono         varchar(20),
  rol              public.rol_usuario not null default 'aprendiz',
  estado           public.estado_usuario not null default 'activo',
  sede_id          bigint references public.sedes (id) on delete set null,
  avatar_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tipo_documento, numero_documento)
);

-- Datos propios del rol instructor (1:1 con perfiles)
create table public.instructores (
  id             uuid primary key references public.perfiles (id) on delete cascade,
  area_id        bigint references public.areas (id) on delete set null,
  especialidad   varchar(150),
  fecha_ingreso  date,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. FICHAS DE FORMACIÓN
-- ---------------------------------------------------------------------
create table public.fichas (
  id                  bigint generated always as identity primary key,
  numero              varchar(20) not null unique,
  programa_id         bigint not null references public.programas (id) on delete restrict,
  sede_id             bigint not null references public.sedes (id) on delete restrict,
  ambiente_id         bigint references public.ambientes (id) on delete set null,
  jornada             public.jornada not null,
  modalidad           public.modalidad not null default 'presencial',
  fecha_inicio        date not null,
  fecha_fin           date not null,
  estado              public.estado_ficha not null default 'activa',
  instructor_lider_id uuid references public.instructores (id) on delete set null,
  created_by          uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint fichas_fechas_validas check (fecha_fin > fecha_inicio),
  constraint fichas_numero_formato check (numero ~ '^[0-9]{4,20}$')
);

-- Asignación de instructores a una ficha por competencia (HU10.4)
create table public.ficha_instructores (
  id             bigint generated always as identity primary key,
  ficha_id       bigint not null references public.fichas (id) on delete cascade,
  instructor_id  uuid not null references public.instructores (id) on delete cascade,
  competencia_id bigint references public.competencias (id) on delete set null,
  fecha_inicio   date,
  fecha_fin      date,
  created_at     timestamptz not null default now(),
  unique (ficha_id, instructor_id, competencia_id),
  constraint ficha_instructores_fechas check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

-- Vinculación aprendiz ↔ ficha (HU02.2 matricular aprendiz)
create table public.matriculas (
  id               bigint generated always as identity primary key,
  ficha_id         bigint not null references public.fichas (id) on delete cascade,
  aprendiz_id      uuid not null references public.perfiles (id) on delete cascade,
  fecha_matricula  date not null default current_date,
  estado           public.estado_matricula not null default 'matriculado',
  vocero           public.tipo_vocero not null default 'ninguno',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (ficha_id, aprendiz_id)
);
-- Un aprendiz solo puede estar matriculado activamente en una ficha
create unique index matriculas_un_activo_por_aprendiz on public.matriculas (aprendiz_id) where estado = 'matriculado';
-- Máximo un vocero titular y uno suplente por ficha
create unique index matriculas_un_vocero_por_tipo on public.matriculas (ficha_id, vocero) where vocero <> 'ninguno';

-- ---------------------------------------------------------------------
-- 5. ASISTENCIA (RF08, RF09)
-- Una sesión = una clase de una competencia/RA en una fecha
-- ---------------------------------------------------------------------
create table public.sesiones (
  id             bigint generated always as identity primary key,
  ficha_id       bigint not null references public.fichas (id) on delete cascade,
  competencia_id bigint not null references public.competencias (id) on delete restrict,
  resultado_id   bigint references public.resultados_aprendizaje (id) on delete set null,
  instructor_id  uuid not null references public.instructores (id) on delete restrict,
  fecha          date not null,
  hora_inicio    time,
  hora_fin       time,
  estado         public.estado_sesion not null default 'programada',
  created_at     timestamptz not null default now(),
  constraint sesiones_horas check (hora_fin is null or hora_inicio is null or hora_fin > hora_inicio)
);

create table public.asistencias (
  id              bigint generated always as identity primary key,
  sesion_id       bigint not null references public.sesiones (id) on delete cascade,
  aprendiz_id     uuid not null references public.perfiles (id) on delete cascade,
  estado          public.estado_asistencia not null,
  observacion     varchar(500),
  registrado_por  uuid references public.perfiles (id) on delete set null default auth.uid(),
  registrado_en   timestamptz not null default now(),   -- RF09: fecha/hora automática
  actualizado_en  timestamptz not null default now(),
  unique (sesion_id, aprendiz_id)
);

-- ---------------------------------------------------------------------
-- 6. JUSTIFICACIONES (RF10, RF11, RF12)
-- ---------------------------------------------------------------------
create table public.justificaciones (
  id                    bigint generated always as identity primary key,
  asistencia_id         bigint not null unique references public.asistencias (id) on delete cascade,
  aprendiz_id           uuid not null references public.perfiles (id) on delete cascade,
  documento_path        text not null,          -- ruta en Storage (bucket "justificaciones")
  comentario            varchar(500),
  estado                public.estado_justificacion not null default 'pendiente',
  revisado_por          uuid references public.perfiles (id) on delete set null,
  revisado_en           timestamptz,
  observacion_revision  varchar(500),
  created_at            timestamptz not null default now()
);

create table public.justificacion_historial (
  id               bigint generated always as identity primary key,
  justificacion_id bigint not null references public.justificaciones (id) on delete cascade,
  estado_anterior  public.estado_justificacion,
  estado_nuevo     public.estado_justificacion not null,
  cambiado_por     uuid references public.perfiles (id) on delete set null,
  observacion      varchar(500),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. ALERTAS Y UMBRALES (RF16, RF17)
-- ---------------------------------------------------------------------
create table public.umbrales_alerta (
  id                      bigint generated always as identity primary key,
  prioridad               public.prioridad_alerta not null unique,
  porcentaje_inasistencia numeric(5, 2) not null check (porcentaje_inasistencia > 0 and porcentaje_inasistencia <= 100),
  descripcion             varchar(200),
  activo                  boolean not null default true,
  actualizado_por         uuid references public.perfiles (id) on delete set null,
  updated_at              timestamptz not null default now()
);

create table public.alertas (
  id           bigint generated always as identity primary key,
  tipo         public.tipo_alerta not null,
  prioridad    public.prioridad_alerta not null,
  ficha_id     bigint not null references public.fichas (id) on delete cascade,
  aprendiz_id  uuid references public.perfiles (id) on delete cascade,
  porcentaje   numeric(5, 2),
  descripcion  text not null,
  estado       public.estado_alerta not null default 'nueva',
  atendida_por uuid references public.perfiles (id) on delete set null,
  atendida_en  timestamptz,
  created_at   timestamptz not null default now()
);
-- Evita duplicar una alerta abierta del mismo tipo/prioridad para el mismo aprendiz/ficha
create unique index alertas_abierta_unica on public.alertas
  (tipo, prioridad, ficha_id, coalesce(aprendiz_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where estado in ('nueva', 'en_seguimiento');

create table public.notificaciones (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.perfiles (id) on delete cascade,
  alerta_id   bigint references public.alertas (id) on delete cascade,
  titulo      varchar(150) not null,
  mensaje     text not null,
  leida       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. REPORTES (RF18, RF20)
-- ---------------------------------------------------------------------
create table public.reportes (
  id             bigint generated always as identity primary key,
  tipo           public.tipo_reporte not null,
  titulo         varchar(200) not null,
  ficha_id       bigint references public.fichas (id) on delete set null,
  instructor_id  uuid references public.instructores (id) on delete set null,
  aprendiz_id    uuid references public.perfiles (id) on delete set null,
  fecha_desde    date,
  fecha_hasta    date,
  parametros     jsonb not null default '{}'::jsonb,
  formato        public.formato_reporte not null default 'pdf',
  archivo_path   text,
  estado         public.estado_reporte not null default 'generando',
  generado_por   uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint reportes_periodo check (fecha_hasta is null or fecha_desde is null or fecha_hasta >= fecha_desde)
);

-- ---------------------------------------------------------------------
-- 9. MATERIAL DE APOYO (módulo heredado de VersionAntigua)
-- ---------------------------------------------------------------------
create table public.materiales (
  id             bigint generated always as identity primary key,
  titulo         varchar(200) not null,
  descripcion    text,
  tipo           public.tipo_material not null,
  categoria      public.categoria_material not null,
  competencia_id bigint references public.competencias (id) on delete set null,
  ficha_id       bigint references public.fichas (id) on delete cascade,
  archivo_path   text,
  enlace_url     text,
  fecha_inicio   date,
  fecha_fin      date,
  estado         public.estado_material not null default 'publicado',
  subido_por     uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint materiales_origen check (archivo_path is not null or enlace_url is not null),
  constraint materiales_fechas check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

-- ---------------------------------------------------------------------
-- 10. BITÁCORA (RF19) — solo inserción, nunca se edita ni se borra
-- ---------------------------------------------------------------------
create table public.bitacora (
  id               bigint generated always as identity primary key,
  fecha            timestamptz not null default now(),
  usuario_id       uuid references public.perfiles (id) on delete set null,
  rol              public.rol_usuario,
  modulo           public.modulo_sistema not null,
  accion           public.accion_bitacora not null,
  tabla            varchar(60),
  registro_id      text,
  detalle          text,
  datos_anteriores jsonb,
  datos_nuevos     jsonb,
  resultado        public.resultado_bitacora not null default 'exito'
);

-- ---------------------------------------------------------------------
-- 11. ÍNDICES (RNF1 — rendimiento en búsquedas y filtros frecuentes)
-- ---------------------------------------------------------------------
create index on public.perfiles (rol, estado);
create index on public.fichas (sede_id, estado);
create index on public.fichas (programa_id);
create index on public.fichas (jornada);
create index on public.ficha_instructores (instructor_id);
create index on public.matriculas (ficha_id, estado);
create index on public.sesiones (ficha_id, fecha);
create index on public.sesiones (instructor_id, fecha);
create index on public.asistencias (aprendiz_id);
create index on public.justificaciones (aprendiz_id, estado);
create index on public.justificacion_historial (justificacion_id);
create index on public.alertas (ficha_id, estado);
create index on public.alertas (aprendiz_id);
create index on public.notificaciones (usuario_id, leida);
create index on public.reportes (generado_por, created_at desc);
create index on public.materiales (ficha_id, estado);
create index on public.bitacora (fecha desc);
create index on public.bitacora (usuario_id, fecha desc);
create index on public.bitacora (modulo, accion);
