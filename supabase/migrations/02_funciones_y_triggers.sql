-- =====================================================================
-- PuntualiX — 02. Funciones y triggers (reglas de negocio en la base)
-- Todas las funciones "security definer" fijan search_path = '' y usan
-- nombres totalmente calificados (recomendación de seguridad de Supabase).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FUNCIONES DE APOYO PARA PERMISOS (usadas por las políticas RLS)
-- ---------------------------------------------------------------------

-- Rol del usuario autenticado (null si no existe o está inactivo)
create or replace function public.fn_rol_actual()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$
  select p.rol from public.perfiles p
  where p.id = auth.uid() and p.estado = 'activo';
$$;

create or replace function public.fn_es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.fn_rol_actual() = 'administrador', false);
$$;

-- ¿El usuario autenticado es instructor (líder o asignado) de la ficha?
create or replace function public.fn_es_instructor_de_ficha(p_ficha_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.fn_rol_actual() = 'instructor' and (
    exists (select 1 from public.fichas f where f.id = p_ficha_id and f.instructor_lider_id = auth.uid())
    or exists (select 1 from public.ficha_instructores fi where fi.ficha_id = p_ficha_id and fi.instructor_id = auth.uid())
  );
$$;

-- ¿El usuario autenticado es aprendiz de la ficha?
create or replace function public.fn_es_aprendiz_de_ficha(p_ficha_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.fn_rol_actual() = 'aprendiz' and exists (
    select 1 from public.matriculas m where m.ficha_id = p_ficha_id and m.aprendiz_id = auth.uid()
  );
$$;

-- Ficha a la que pertenece una sesión
create or replace function public.fn_ficha_de_sesion(p_sesion_id bigint)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select s.ficha_id from public.sesiones s where s.id = p_sesion_id;
$$;

-- ---------------------------------------------------------------------
-- 2. MARCAS DE TIEMPO
-- ---------------------------------------------------------------------
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_perfiles_updated   before update on public.perfiles   for each row execute function public.fn_set_updated_at();
create trigger trg_fichas_updated     before update on public.fichas     for each row execute function public.fn_set_updated_at();
create trigger trg_matriculas_updated before update on public.matriculas for each row execute function public.fn_set_updated_at();
create trigger trg_materiales_updated before update on public.materiales for each row execute function public.fn_set_updated_at();
create trigger trg_umbrales_updated   before update on public.umbrales_alerta for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. ALTA AUTOMÁTICA DE PERFIL al crear un usuario en Supabase Auth
-- El ROL se lee de app_metadata (solo editable con service_role), nunca de
-- user_metadata (editable por el propio usuario) → evita auto-asignarse admin.
-- ---------------------------------------------------------------------
create or replace function public.fn_crear_perfil_nuevo_usuario()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol  public.rol_usuario := coalesce((new.raw_app_meta_data ->> 'rol')::public.rol_usuario, 'aprendiz');
begin
  insert into public.perfiles (id, correo, nombres, apellidos, tipo_documento, numero_documento, telefono, rol)
  values (
    new.id,
    new.email,
    coalesce(v_meta ->> 'nombres', split_part(new.email, '@', 1)),
    coalesce(v_meta ->> 'apellidos', ''),
    coalesce((v_meta ->> 'tipo_documento')::public.tipo_documento, 'CC'),
    coalesce(v_meta ->> 'numero_documento', 'PEND-' || left(new.id::text, 8)),
    v_meta ->> 'telefono',
    v_rol
  );
  return new;
end;
$$;

create trigger trg_auth_nuevo_usuario
  after insert on auth.users
  for each row execute function public.fn_crear_perfil_nuevo_usuario();

-- Si un perfil queda con rol instructor, garantiza su fila en "instructores"
create or replace function public.fn_sincronizar_instructor()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.rol = 'instructor' then
    insert into public.instructores (id) values (new.id) on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_perfiles_sincronizar_instructor
  after insert or update of rol on public.perfiles
  for each row execute function public.fn_sincronizar_instructor();

-- Un usuario NO administrador no puede cambiar rol, estado ni identificación.
-- Excepción HU02.4: el instructor puede activar/desactivar aprendices de sus fichas.
-- (auth.uid() es null cuando opera service_role o el SQL Editor → se permite)
create or replace function public.fn_proteger_campos_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_instructor_del_aprendiz boolean;
begin
  if auth.uid() is not null and not public.fn_es_admin() then
    v_instructor_del_aprendiz := old.rol = 'aprendiz' and exists (
      select 1 from public.matriculas m
      where m.aprendiz_id = old.id and public.fn_es_instructor_de_ficha(m.ficha_id)
    );
    if new.estado is distinct from old.estado and not v_instructor_del_aprendiz then
      raise exception 'No tiene permisos para cambiar el estado de este usuario' using errcode = '42501';
    end if;
    if new.rol is distinct from old.rol
       or new.correo is distinct from old.correo
       or new.tipo_documento is distinct from old.tipo_documento
       or new.numero_documento is distinct from old.numero_documento then
      raise exception 'Solo un administrador puede modificar rol, correo o documento'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_perfiles_proteger
  before update on public.perfiles
  for each row execute function public.fn_proteger_campos_perfil();

-- ---------------------------------------------------------------------
-- 4. REGLAS DE ASISTENCIA (RF08, RF09)
-- ---------------------------------------------------------------------
create or replace function public.fn_validar_asistencia()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_ficha_id bigint := public.fn_ficha_de_sesion(new.sesion_id);
begin
  if tg_op = 'INSERT' then
    -- Solo se registra asistencia a aprendices matriculados en la ficha de la sesión
    if not exists (
      select 1 from public.matriculas m
      where m.ficha_id = v_ficha_id and m.aprendiz_id = new.aprendiz_id and m.estado = 'matriculado'
    ) then
      raise exception 'El aprendiz no está matriculado en la ficha de esta sesión' using errcode = '23514';
    end if;
    new.registrado_en := now();          -- RF09: no se acepta una fecha enviada por el cliente
    new.registrado_por := coalesce(auth.uid(), new.registrado_por);
  else
    new.registrado_en := old.registrado_en; -- la fecha original de registro es inmutable
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;

create trigger trg_asistencias_validar
  before insert or update on public.asistencias
  for each row execute function public.fn_validar_asistencia();

-- Al registrar asistencia, la sesión pasa a "ejecutada" (alimenta el cumplimiento docente)
create or replace function public.fn_marcar_sesion_ejecutada()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.sesiones set estado = 'ejecutada'
  where id = new.sesion_id and estado = 'programada';
  return new;
end;
$$;

create trigger trg_asistencias_sesion_ejecutada
  after insert on public.asistencias
  for each row execute function public.fn_marcar_sesion_ejecutada();

-- ---------------------------------------------------------------------
-- 5. REGLAS DE JUSTIFICACIONES (RF10, RF11, RF12)
-- ---------------------------------------------------------------------
create or replace function public.fn_validar_justificacion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_asistencia public.asistencias%rowtype;
  v_ficha_id   bigint;
begin
  if tg_op = 'UPDATE' then
    v_ficha_id := (select s.ficha_id from public.asistencias a join public.sesiones s on s.id = a.sesion_id
                   where a.id = old.asistencia_id);
    if auth.uid() is not null and not (public.fn_es_admin() or public.fn_es_instructor_de_ficha(v_ficha_id)) then
      -- HU08.2: el aprendiz solo corrige documento/comentario mientras está pendiente
      if old.estado <> 'pendiente' then
        raise exception 'La justificación ya fue revisada y no puede modificarse' using errcode = '42501';
      end if;
      if new.estado is distinct from old.estado
         or new.observacion_revision is distinct from old.observacion_revision
         or new.asistencia_id is distinct from old.asistencia_id
         or new.aprendiz_id is distinct from old.aprendiz_id then
        raise exception 'Solo el instructor puede aprobar o rechazar la justificación' using errcode = '42501';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' then
    select * into v_asistencia from public.asistencias where id = new.asistencia_id;
    if v_asistencia.aprendiz_id is distinct from new.aprendiz_id then
      raise exception 'La inasistencia no pertenece al aprendiz' using errcode = '42501';
    end if;
    if v_asistencia.estado <> 'ausente' then
      raise exception 'Solo se pueden justificar inasistencias (estado ausente)' using errcode = '23514';
    end if;
    -- Toda justificación nace pendiente, sin importar lo que envíe el cliente
    new.estado := 'pendiente';
    new.revisado_por := null;
    new.revisado_en := null;
  elsif new.estado is distinct from old.estado then
    new.revisado_por := auth.uid();
    new.revisado_en := now();
  end if;
  return new;
end;
$$;

create trigger trg_justificaciones_validar
  before insert or update on public.justificaciones
  for each row execute function public.fn_validar_justificacion();

-- Historial de estados + efecto sobre la asistencia
create or replace function public.fn_justificacion_cambio_estado()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.justificacion_historial (justificacion_id, estado_anterior, estado_nuevo, cambiado_por, observacion)
    values (new.id, case when tg_op = 'UPDATE' then old.estado end, new.estado, auth.uid(), new.observacion_revision);

    if new.estado = 'aprobada' then
      update public.asistencias set estado = 'justificada' where id = new.asistencia_id;
    elsif new.estado = 'rechazada' and tg_op = 'UPDATE' then
      update public.asistencias set estado = 'ausente' where id = new.asistencia_id and estado = 'justificada';
    end if;

    -- HU09.4: avisar al aprendiz cuando su justificación cambia de estado
    if tg_op = 'UPDATE' then
      insert into public.notificaciones (usuario_id, titulo, mensaje)
      values (
        new.aprendiz_id,
        format('Justificación %s', new.estado),
        coalesce(nullif(new.observacion_revision, ''), format('Tu justificación fue marcada como %s.', new.estado))
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_justificaciones_historial
  after insert or update of estado on public.justificaciones
  for each row execute function public.fn_justificacion_cambio_estado();

-- ---------------------------------------------------------------------
-- 6. ALERTAS AUTOMÁTICAS (RF16) según umbrales configurables (RF17)
-- % inasistencia = ausencias NO justificadas / total de registros del aprendiz en la ficha
-- ---------------------------------------------------------------------
create or replace function public.fn_evaluar_alerta_aprendiz(p_aprendiz_id uuid, p_ficha_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_total      integer;
  v_ausencias  integer;
  v_porcentaje numeric(5, 2);
  v_umbral     public.umbrales_alerta%rowtype;
begin
  select count(*), count(*) filter (where a.estado = 'ausente')
    into v_total, v_ausencias
  from public.asistencias a
  join public.sesiones s on s.id = a.sesion_id
  where a.aprendiz_id = p_aprendiz_id and s.ficha_id = p_ficha_id;

  if v_total = 0 then
    return;
  end if;

  v_porcentaje := round(v_ausencias * 100.0 / v_total, 2);

  select * into v_umbral from public.umbrales_alerta
  where activo and porcentaje_inasistencia <= v_porcentaje
  order by porcentaje_inasistencia desc
  limit 1;

  if found then
    insert into public.alertas (tipo, prioridad, ficha_id, aprendiz_id, porcentaje, descripcion)
    values (
      'inasistencia_aprendiz', v_umbral.prioridad, p_ficha_id, p_aprendiz_id, v_porcentaje,
      format('El aprendiz alcanzó %s%% de inasistencias no justificadas (umbral %s: %s%%).',
             v_porcentaje, v_umbral.prioridad, v_umbral.porcentaje_inasistencia)
    )
    on conflict do nothing;  -- ya existe una alerta abierta equivalente
  end if;
end;
$$;

-- HU09.3: alerta cuando el % global de inasistencias de la FICHA supera un umbral
create or replace function public.fn_evaluar_alerta_ficha(p_ficha_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_total      integer;
  v_ausencias  integer;
  v_porcentaje numeric(5, 2);
  v_umbral     public.umbrales_alerta%rowtype;
  v_numero     text;
begin
  select count(*), count(*) filter (where a.estado = 'ausente')
    into v_total, v_ausencias
  from public.asistencias a
  join public.sesiones s on s.id = a.sesion_id
  where s.ficha_id = p_ficha_id;

  if v_total = 0 then
    return;
  end if;

  v_porcentaje := round(v_ausencias * 100.0 / v_total, 2);

  select * into v_umbral from public.umbrales_alerta
  where activo and porcentaje_inasistencia <= v_porcentaje
  order by porcentaje_inasistencia desc
  limit 1;

  if found then
    select numero into v_numero from public.fichas where id = p_ficha_id;
    insert into public.alertas (tipo, prioridad, ficha_id, porcentaje, descripcion)
    values (
      'riesgo_ficha', v_umbral.prioridad, p_ficha_id, v_porcentaje,
      format('La ficha %s acumula %s%% de inasistencias no justificadas (umbral %s: %s%%).',
             v_numero, v_porcentaje, v_umbral.prioridad, v_umbral.porcentaje_inasistencia)
    )
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.fn_asistencia_evaluar_alertas()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_ficha_id bigint := public.fn_ficha_de_sesion(new.sesion_id);
begin
  perform public.fn_evaluar_alerta_aprendiz(new.aprendiz_id, v_ficha_id);
  perform public.fn_evaluar_alerta_ficha(v_ficha_id);
  return new;
end;
$$;

create trigger trg_asistencias_alertas
  after insert or update of estado on public.asistencias
  for each row execute function public.fn_asistencia_evaluar_alertas();

-- Alerta cuando una ficha activa queda sin instructor líder
create or replace function public.fn_ficha_sin_lider()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.estado = 'activa' and new.instructor_lider_id is null then
    insert into public.alertas (tipo, prioridad, ficha_id, descripcion)
    values ('ficha_sin_lider', 'media', new.id, format('La ficha %s no tiene instructor líder asignado.', new.numero))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_fichas_sin_lider
  after insert or update of instructor_lider_id, estado on public.fichas
  for each row execute function public.fn_ficha_sin_lider();

-- Notificaciones: al instructor líder de la ficha y, si aplica, al aprendiz
create or replace function public.fn_notificar_alerta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_lider  uuid;
  v_numero text;
begin
  select f.instructor_lider_id, f.numero into v_lider, v_numero from public.fichas f where f.id = new.ficha_id;

  if v_lider is not null then
    insert into public.notificaciones (usuario_id, alerta_id, titulo, mensaje)
    values (v_lider, new.id, format('Alerta %s · Ficha %s', new.prioridad, v_numero), new.descripcion);
  end if;

  if new.aprendiz_id is not null then
    insert into public.notificaciones (usuario_id, alerta_id, titulo, mensaje)
    values (new.aprendiz_id, new.id, 'Aviso de inasistencias', new.descripcion);
  end if;

  -- HU09.3: las alertas de ficha también llegan a todos los administradores activos
  if new.tipo in ('riesgo_ficha', 'ficha_sin_lider') then
    insert into public.notificaciones (usuario_id, alerta_id, titulo, mensaje)
    select p.id, new.id, format('Alerta %s · Ficha %s', new.prioridad, v_numero), new.descripcion
    from public.perfiles p
    where p.rol = 'administrador' and p.estado = 'activo';
  end if;
  return new;
end;
$$;

create trigger trg_alertas_notificar
  after insert on public.alertas
  for each row execute function public.fn_notificar_alerta();

-- ---------------------------------------------------------------------
-- 7. BITÁCORA (RF19)
-- ---------------------------------------------------------------------

-- Registro automático de cambios. TG_ARGV[0] = módulo del sistema.
create or replace function public.fn_bitacora_cambios()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_anterior jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_nuevo    jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and v_anterior = v_nuevo then
    return new;  -- no hubo cambios reales
  end if;

  insert into public.bitacora (usuario_id, rol, modulo, accion, tabla, registro_id, detalle, datos_anteriores, datos_nuevos)
  values (
    auth.uid(),
    public.fn_rol_actual(),
    tg_argv[0]::public.modulo_sistema,
    case tg_op when 'INSERT' then 'registro' when 'UPDATE' then 'modificacion' else 'eliminacion' end::public.accion_bitacora,
    tg_table_name,
    coalesce(v_nuevo ->> 'id', v_anterior ->> 'id'),
    format('%s en %s', lower(tg_op), tg_table_name),
    v_anterior,
    v_nuevo
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_bit_perfiles        after insert or update or delete on public.perfiles           for each row execute function public.fn_bitacora_cambios('usuarios');
create trigger trg_bit_instructores    after insert or update or delete on public.instructores       for each row execute function public.fn_bitacora_cambios('instructores');
create trigger trg_bit_fichas          after insert or update or delete on public.fichas             for each row execute function public.fn_bitacora_cambios('fichas');
create trigger trg_bit_ficha_instr     after insert or update or delete on public.ficha_instructores for each row execute function public.fn_bitacora_cambios('instructores');
create trigger trg_bit_matriculas      after insert or update or delete on public.matriculas         for each row execute function public.fn_bitacora_cambios('fichas');
create trigger trg_bit_sesiones        after insert or update or delete on public.sesiones           for each row execute function public.fn_bitacora_cambios('asistencias');
create trigger trg_bit_asistencias     after insert or update or delete on public.asistencias        for each row execute function public.fn_bitacora_cambios('asistencias');
create trigger trg_bit_justificaciones after insert or update or delete on public.justificaciones    for each row execute function public.fn_bitacora_cambios('justificaciones');
create trigger trg_bit_umbrales        after insert or update or delete on public.umbrales_alerta    for each row execute function public.fn_bitacora_cambios('configuracion');
create trigger trg_bit_alertas         after update on public.alertas                                for each row execute function public.fn_bitacora_cambios('alertas');
create trigger trg_bit_reportes        after insert on public.reportes                               for each row execute function public.fn_bitacora_cambios('reportes');
create trigger trg_bit_materiales      after insert or update or delete on public.materiales         for each row execute function public.fn_bitacora_cambios('material');

-- Eventos que no son cambios de datos (inicio de sesión, consultas, descargas).
-- Se invoca desde el front con: supabase.rpc('fn_registrar_evento', {...})
create or replace function public.fn_registrar_evento(
  p_modulo    public.modulo_sistema,
  p_accion    public.accion_bitacora,
  p_detalle   text,
  p_resultado public.resultado_bitacora default 'exito'
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Requiere sesión iniciada' using errcode = '42501';
  end if;
  if p_accion not in ('acceso', 'consulta', 'descarga') then
    raise exception 'Solo se registran manualmente accesos, consultas y descargas' using errcode = '22023';
  end if;
  insert into public.bitacora (usuario_id, rol, modulo, accion, detalle, resultado)
  values (auth.uid(), public.fn_rol_actual(), p_modulo, p_accion, left(p_detalle, 1000), p_resultado);
end;
$$;

-- La bitácora es inmutable: ni siquiera un administrador puede editarla o borrarla
create or replace function public.fn_bitacora_inmutable()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'La bitácora es de solo inserción' using errcode = '42501';
end;
$$;

create trigger trg_bitacora_inmutable
  before update or delete on public.bitacora
  for each row execute function public.fn_bitacora_inmutable();
