-- =====================================================================
-- PuntualiX — 03. Vistas de estadísticas
-- security_invoker = true → la vista respeta las políticas RLS de quien consulta
-- (un aprendiz solo ve sus números; un instructor, los de sus fichas).
-- Fórmulas:
--   % asistencia     = (presentes + justificadas) / total registros × 100
--   % inasistencia   = ausentes (no justificadas)  / total registros × 100
-- =====================================================================

-- RF13 · HU04.2 — Estadísticas por aprendiz en su ficha
create or replace view public.v_asistencia_aprendiz
with (security_invoker = true) as
select
  m.aprendiz_id,
  p.nombres || ' ' || p.apellidos                       as aprendiz,
  m.ficha_id,
  f.numero                                              as ficha_numero,
  count(a.id)                                           as total_registros,
  count(a.id) filter (where a.estado = 'presente')      as presentes,
  count(a.id) filter (where a.estado = 'ausente')       as ausencias,
  count(a.id) filter (where a.estado = 'justificada')   as justificadas,
  round(coalesce(count(a.id) filter (where a.estado <> 'ausente') * 100.0 / nullif(count(a.id), 0), 0), 2) as porcentaje_asistencia,
  round(coalesce(count(a.id) filter (where a.estado = 'ausente')  * 100.0 / nullif(count(a.id), 0), 0), 2) as porcentaje_inasistencia
from public.matriculas m
join public.perfiles p on p.id = m.aprendiz_id
join public.fichas f   on f.id = m.ficha_id
left join public.sesiones s    on s.ficha_id = m.ficha_id
left join public.asistencias a on a.sesion_id = s.id and a.aprendiz_id = m.aprendiz_id
group by m.aprendiz_id, p.nombres, p.apellidos, m.ficha_id, f.numero;

-- RF15 · HU04.3 — Comparación por competencia (por aprendiz)
create or replace view public.v_asistencia_aprendiz_competencia
with (security_invoker = true) as
select
  a.aprendiz_id,
  s.ficha_id,
  s.competencia_id,
  c.nombre                                              as competencia,
  count(a.id)                                           as total_registros,
  count(a.id) filter (where a.estado = 'presente')      as presentes,
  count(a.id) filter (where a.estado = 'ausente')       as ausencias,
  count(a.id) filter (where a.estado = 'justificada')   as justificadas,
  round(count(a.id) filter (where a.estado <> 'ausente') * 100.0 / nullif(count(a.id), 0), 2) as porcentaje_asistencia,
  round(count(a.id) filter (where a.estado = 'ausente')  * 100.0 / nullif(count(a.id), 0), 2) as porcentaje_inasistencia
from public.asistencias a
join public.sesiones s     on s.id = a.sesion_id
join public.competencias c on c.id = s.competencia_id
group by a.aprendiz_id, s.ficha_id, s.competencia_id, c.nombre;

-- RF15 — Comparación por competencia (ficha completa)
create or replace view public.v_asistencia_competencia
with (security_invoker = true) as
select
  s.ficha_id,
  s.competencia_id,
  c.nombre                                              as competencia,
  count(distinct s.id)                                  as sesiones,
  count(a.id)                                           as total_registros,
  round(count(a.id) filter (where a.estado <> 'ausente') * 100.0 / nullif(count(a.id), 0), 2) as porcentaje_asistencia,
  round(count(a.id) filter (where a.estado = 'ausente')  * 100.0 / nullif(count(a.id), 0), 2) as porcentaje_inasistencia
from public.sesiones s
join public.competencias c     on c.id = s.competencia_id
left join public.asistencias a on a.sesion_id = s.id
group by s.ficha_id, s.competencia_id, c.nombre;

-- RF14 · HU04.1 · RF04/RF05 — Resumen por ficha (alimenta listado, dashboard y filtros)
create or replace view public.v_fichas_resumen
with (security_invoker = true) as
with stats as (
  select
    s.ficha_id,
    count(a.id)                                      as total_registros,
    count(a.id) filter (where a.estado = 'ausente')  as ausencias,
    count(a.id) filter (where a.estado <> 'ausente') as asistencias_validas
  from public.sesiones s
  join public.asistencias a on a.sesion_id = s.id
  group by s.ficha_id
),
aprendices as (
  select ficha_id, count(*) as aprendices_activos
  from public.matriculas
  where estado = 'matriculado'
  group by ficha_id
)
select
  f.id,
  f.numero,
  f.estado,
  f.jornada,
  f.modalidad,
  f.fecha_inicio,
  f.fecha_fin,
  f.programa_id,
  pr.nombre                                   as programa,
  pr.nivel,
  pr.area_id,
  ar.nombre                                   as area,
  f.sede_id,
  se.nombre                                   as sede,
  f.ambiente_id,
  am.nombre                                   as ambiente,
  f.instructor_lider_id,
  li.nombres || ' ' || li.apellidos           as instructor_lider,
  coalesce(ap.aprendices_activos, 0)          as aprendices_activos,
  coalesce(st.total_registros, 0)             as total_registros,
  round(st.asistencias_validas * 100.0 / nullif(st.total_registros, 0), 2) as porcentaje_asistencia,
  round(st.ausencias * 100.0 / nullif(st.total_registros, 0), 2)           as porcentaje_inasistencia,
  -- Nivel de riesgo = umbral más alto alcanzado (null si no alcanza ninguno)
  (select u.prioridad from public.umbrales_alerta u
    where u.activo and u.porcentaje_inasistencia <= round(st.ausencias * 100.0 / nullif(st.total_registros, 0), 2)
    order by u.porcentaje_inasistencia desc limit 1) as nivel_riesgo
from public.fichas f
join public.programas pr     on pr.id = f.programa_id
join public.areas ar         on ar.id = pr.area_id
join public.sedes se         on se.id = f.sede_id
left join public.ambientes am on am.id = f.ambiente_id
left join public.perfiles li on li.id = f.instructor_lider_id
left join aprendices ap      on ap.ficha_id = f.id
left join stats st           on st.ficha_id = f.id;

-- HU12.2 · HU12.4 — Cumplimiento de instructores (sesiones ejecutadas / programadas)
create or replace view public.v_cumplimiento_instructor
with (security_invoker = true) as
select
  i.id                                                     as instructor_id,
  p.nombres || ' ' || p.apellidos                          as instructor,
  p.sede_id,
  i.area_id,
  s.ficha_id,
  count(s.id) filter (where s.estado <> 'cancelada')       as sesiones_planificadas,
  count(s.id) filter (where s.estado = 'ejecutada')        as sesiones_ejecutadas,
  round(count(s.id) filter (where s.estado = 'ejecutada') * 100.0
        / nullif(count(s.id) filter (where s.estado <> 'cancelada' and s.fecha <= current_date), 0), 2) as porcentaje_cumplimiento
from public.instructores i
join public.perfiles p on p.id = i.id
left join public.sesiones s on s.instructor_id = i.id
group by i.id, p.nombres, p.apellidos, p.sede_id, i.area_id, s.ficha_id;
