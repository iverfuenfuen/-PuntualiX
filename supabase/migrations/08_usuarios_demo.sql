-- =====================================================================
-- PuntualiX — 08. Usuarios y datos de DEMOSTRACIÓN (opcional, no usar en producción)
-- REQUISITO PREVIO: crear en Authentication > Users > "Add user" los 3 usuarios
-- (marcar "Auto Confirm User"), con la contraseña que elijas:
--   admin@puntualix.com         → administrador
--   carlos.perez@puntualix.com  → instructor
--   juan.perez@puntualix.com    → aprendiz
-- Al crearlos, el trigger fn_crear_perfil_nuevo_usuario genera su perfil (rol aprendiz).
-- Este script asigna el rol correcto y crea una ficha de ejemplo con asistencia.
-- =====================================================================

-- 0. Verificación previa: los 3 usuarios deben existir en Authentication
do $$
declare
  v_faltan text;
begin
  select string_agg(c, ', ') into v_faltan
  from unnest(array['admin@puntualix.com', 'carlos.perez@puntualix.com', 'juan.perez@puntualix.com']) as c
  where not exists (select 1 from auth.users u where u.email = c);
  if v_faltan is not null then
    raise exception 'Primero crea estos usuarios en Authentication > Users > Add user: %', v_faltan;
  end if;
end;
$$;

-- 1. Rol en app_metadata (lo que lee el trigger) y en el perfil
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('rol', v.rol)
from (values
  ('admin@puntualix.com', 'administrador'),
  ('carlos.perez@puntualix.com', 'instructor'),
  ('juan.perez@puntualix.com', 'aprendiz')
) as v(correo, rol)
where u.email = v.correo;

update public.perfiles p
set rol = v.rol::public.rol_usuario,
    nombres = v.nombres,
    apellidos = v.apellidos,
    numero_documento = v.documento,
    sede_id = (select id from public.sedes where nombre = 'Casa de la Convención')
from (values
  ('admin@puntualix.com',        'administrador', 'Andres', 'Ramirez', '1000000001'),
  ('carlos.perez@puntualix.com', 'instructor',    'Carlos', 'Perez',   '1000000002'),
  ('juan.perez@puntualix.com',   'aprendiz',      'Juan',   'Perez',   '1000000003')
) as v(correo, rol, nombres, apellidos, documento)
where p.correo = v.correo;

update public.instructores
set especialidad = 'Desarrollo de Software',
    area_id = (select id from public.areas where nombre = 'Sistemas'),
    fecha_ingreso = '2026-05-02'
where id = (select id from public.perfiles where correo = 'carlos.perez@puntualix.com');

-- 2. Ficha de ejemplo 301002 con el instructor como líder y el aprendiz matriculado
insert into public.fichas (numero, programa_id, sede_id, ambiente_id, jornada, modalidad, fecha_inicio, fecha_fin, instructor_lider_id)
select '301002', pr.id, se.id, am.id, 'manana', 'presencial', '2026-07-26', '2027-11-30',
       (select id from public.perfiles where correo = 'carlos.perez@puntualix.com')
from public.programas pr, public.sedes se, public.ambientes am
where pr.codigo = '228118' and se.nombre = 'Casa de la Convención'
  and am.sede_id = se.id and am.nombre = 'Laboratorio de software';

insert into public.ficha_instructores (ficha_id, instructor_id, competencia_id, fecha_inicio, fecha_fin)
select f.id, p.id, c.id, '2026-07-26', '2026-12-15'
from public.fichas f, public.perfiles p, public.competencias c
where f.numero = '301002' and p.correo = 'carlos.perez@puntualix.com' and c.codigo = 'C02'
  and c.programa_id = f.programa_id;

insert into public.matriculas (ficha_id, aprendiz_id, vocero)
select f.id, p.id, 'titular'
from public.fichas f, public.perfiles p
where f.numero = '301002' and p.correo = 'juan.perez@puntualix.com';

-- 3. Cinco sesiones con asistencia (2 inasistencias = 40 % → dispara alerta "alta")
with ses as (
  insert into public.sesiones (ficha_id, competencia_id, resultado_id, instructor_id, fecha, hora_inicio, hora_fin)
  select f.id, c.id, ra.id, f.instructor_lider_id, d::date, '07:00', '13:00'
  from public.fichas f
  join public.competencias c on c.programa_id = f.programa_id and c.codigo = 'C02'
  join public.resultados_aprendizaje ra on ra.competencia_id = c.id and ra.codigo = 'RA01'
  cross join generate_series('2026-08-03'::date, '2026-08-07'::date, interval '1 day') as d
  where f.numero = '301002'
  returning id, fecha
)
insert into public.asistencias (sesion_id, aprendiz_id, estado, observacion)
select ses.id,
       (select id from public.perfiles where correo = 'juan.perez@puntualix.com'),
       case when extract(dow from ses.fecha) in (2, 4) then 'ausente' else 'presente' end::public.estado_asistencia,
       null
from ses;
