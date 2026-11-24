-- =====================================================================
-- PuntualiX — Datos de DEMOSTRACIÓN adicionales: 10 fichas para comparar
-- (estadísticas, reportes y el módulo Instructor). NO es una migración y no
-- cambia el esquema: solo inserta filas. No usar en producción.
--
-- Uso: Supabase > SQL Editor > pegar todo este archivo > Run.
-- Requisito: haber aplicado las migraciones 01–08 (usuarios demo incluidos).
-- Es seguro ejecutarlo dos veces: si la ficha 2901101 ya existe, no hace nada.
--
-- Qué crea:
--   · 21 competencias de ejemplo para los programas distintos de ADSO.
--   · 6 instructores demo (correos ficticios @puntualix.com, sin contraseña:
--     no pueden iniciar sesión; solo alimentan las estadísticas).
--   · 10 fichas en las 2 sedes, 8 programas y las 4 jornadas, con niveles de
--     asistencia distintos (de ≈69 % a ≈92 %) y cumplimiento docente distinto.
--   · 182 aprendices demo (sin contraseña) con matrículas, voceros, desertores,
--     retirados y un aplazado repartidos en los cortes 2026-I y 2026-II.
--   · Sesiones martes y jueves desde el inicio de cada ficha hasta el
--     11-dic-2026: las pasadas registradas, sin registrar o canceladas; las
--     futuras quedan programadas. Al final se evalúan las alertas automáticas.
--   · La ficha 2901910 queda sin instructor líder (genera su alerta).
--
-- Para BORRAR estos datos (en el SQL Editor):
--   delete from public.fichas where numero like '2901%';
--   delete from auth.users where raw_user_meta_data ->> 'demo' = 'fichas';
--   delete from public.competencias where codigo ~ '^[RAEMDTU]0[1-3]$';
-- =====================================================================

do $$
declare
  v_col text;
begin
  if exists (select 1 from public.fichas where numero = '2901101') then
    raise notice 'Los datos demo de fichas ya existen: no se hizo ningún cambio.';
    return;
  end if;
  if not exists (select 1 from public.perfiles where correo = 'carlos.perez@puntualix.com') then
    raise exception 'Primero aplique las migraciones 01–08 (falta el instructor carlos.perez@puntualix.com).';
  end if;

  perform setseed(0.3267541);  -- mismos datos cada vez que se ejecute en una base limpia

  -- Mientras se cargan miles de filas no se escribe una entrada de bitácora por fila ni se
  -- evalúan alertas en cada registro (se evalúan una sola vez al final).
  alter table public.perfiles           disable trigger trg_bit_perfiles;
  alter table public.instructores       disable trigger trg_bit_instructores;
  alter table public.fichas             disable trigger trg_bit_fichas;
  alter table public.ficha_instructores disable trigger trg_bit_ficha_instr;
  alter table public.matriculas         disable trigger trg_bit_matriculas;
  alter table public.matriculas         disable trigger trg_matriculas_updated;
  alter table public.sesiones           disable trigger trg_bit_sesiones;
  alter table public.asistencias        disable trigger trg_bit_asistencias;
  alter table public.asistencias        disable trigger trg_asistencias_alertas;

  -- -------------------------------------------------------------------
  -- 1. Competencias de ejemplo para los demás programas
  -- -------------------------------------------------------------------
  insert into public.competencias (programa_id, codigo, nombre)
  select p.id, v.codigo, v.nombre
  from (values
    ('EJ-0002', 'R01', 'Configuración de redes LAN'),
    ('EJ-0002', 'R02', 'Administración de servidores'),
    ('EJ-0002', 'R03', 'Seguridad de redes'),
    ('EJ-0003', 'A01', 'Gestión documental'),
    ('EJ-0003', 'A02', 'Atención al cliente'),
    ('EJ-0003', 'A03', 'Contabilidad básica'),
    ('EJ-0004', 'E01', 'Planeación estratégica'),
    ('EJ-0004', 'E02', 'Gestión del talento humano'),
    ('EJ-0004', 'E03', 'Finanzas empresariales'),
    ('EJ-0005', 'M01', 'Marketing en redes sociales'),
    ('EJ-0005', 'M02', 'Analítica web'),
    ('EJ-0005', 'M03', 'Diseño de campañas digitales'),
    ('EJ-0006', 'D01', 'Diseño de interfaces'),
    ('EJ-0006', 'D02', 'Programación de aplicaciones'),
    ('EJ-0006', 'D03', 'Animación digital'),
    ('EJ-0007', 'T01', 'Mantenimiento eléctrico'),
    ('EJ-0007', 'T02', 'Mantenimiento mecánico'),
    ('EJ-0007', 'T03', 'Dibujo técnico'),
    ('EJ-0008', 'U01', 'Control de procesos'),
    ('EJ-0008', 'U02', 'Programación de PLC'),
    ('EJ-0008', 'U03', 'Instrumentación industrial')
  ) as v(programa, codigo, nombre)
  join public.programas p on p.codigo = v.programa
  on conflict (programa_id, codigo) do nothing;

  -- -------------------------------------------------------------------
  -- 2. Instructores demo (el trigger de auth.users crea perfil e instructor)
  -- -------------------------------------------------------------------
  create temp table tmp_instructores (correo text, nombres text, apellidos text, documento text,
    area text, especialidad text, sede text, ingreso date) on commit drop;
  insert into tmp_instructores values
    ('laura.gomez@puntualix.com',    'Laura',   'Gómez Ríos',     '1000000101', 'Sistemas',        'Desarrollo de Software',      'Casa de la Convención', '2024-02-01'),
    ('andres.torres@puntualix.com',  'Andrés',  'Torres Vega',    '1000000102', 'Sistemas',        'Redes y Telecomunicaciones',  'Casa de la Convención', '2023-08-14'),
    ('marcela.rios@puntualix.com',   'Marcela', 'Ríos Pardo',     '1000000103', 'Administrativa',  'Gestión Administrativa',      'CIAA',                  '2022-03-07'),
    ('natalia.vargas@puntualix.com', 'Natalia', 'Vargas Peña',    '1000000104', 'Administrativa',  'Gestión Empresarial',         'Casa de la Convención', '2025-01-20'),
    ('diana.castro@puntualix.com',   'Diana',   'Castro Mejía',   '1000000105', 'Diseño',          'Diseño Digital',              'CIAA',                  '2024-07-15'),
    ('jorge.mendez@puntualix.com',   'Jorge',   'Méndez Rincón',  '1000000106', 'Electromecánica', 'Automatización Industrial',   'CIAA',                  '2021-09-01');

  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  select gen_random_uuid(), t.correo, jsonb_build_object('rol', 'instructor'),
         jsonb_build_object('nombres', t.nombres, 'apellidos', t.apellidos, 'numero_documento', t.documento, 'demo', 'fichas')
  from tmp_instructores t
  where not exists (select 1 from auth.users u where u.email = t.correo);

  update public.perfiles p set sede_id = s.id
  from tmp_instructores t join public.sedes s on s.nombre = t.sede
  where p.correo = t.correo;

  update public.instructores i set area_id = a.id, especialidad = t.especialidad, fecha_ingreso = t.ingreso
  from tmp_instructores t
  join public.perfiles p on p.correo = t.correo
  join public.areas a on a.nombre = t.area
  where i.id = p.id;

  -- -------------------------------------------------------------------
  -- 3. Fichas (p = asistencia esperada; r = proporción de sesiones que registra cada instructor)
  -- -------------------------------------------------------------------
  create temp table tmp_fichas (orden int, numero text, programa text, sede text, ambiente text,
    jornada public.jornada, modalidad public.modalidad, inicio date, fin date,
    lider text, comp_lider text, r_lider numeric, segundo text, comp_segundo text, r_segundo numeric,
    p numeric, aprendices int) on commit drop;
  insert into tmp_fichas values
    (1,  '2901101', '228118',  'Casa de la Convención', 'Ambiente 101',            'manana', 'presencial', '2026-02-02', '2027-06-30', 'laura.gomez',    'C03', 0.97, 'carlos.perez',   'C05', 0.93, 0.94, 18),
    (2,  '2901102', '228118',  'CIAA',                  'Laboratorio de software', 'tarde',  'presencial', '2026-02-09', '2027-07-15', 'carlos.perez',   'C01', 0.90, 'laura.gomez',    'C04', 0.95, 0.86, 20),
    (3,  '2901203', 'EJ-0002', 'Casa de la Convención', 'Ambiente 102',            'noche',  'presencial', '2026-03-02', '2027-03-01', 'andres.torres',  'R01', 0.72, 'carlos.perez',   'R03', 0.88, 0.62, 16),
    (4,  '2901304', 'EJ-0003', 'CIAA',                  'Ambiente 101',            'manana', 'presencial', '2026-02-16', '2027-02-15', 'marcela.rios',   'A01', 0.96, 'natalia.vargas', 'A02', 0.85, 0.90, 22),
    (5,  '2901405', 'EJ-0004', 'Casa de la Convención', 'Ambiente 101',            'tarde',  'hibrida',    '2026-07-13', '2027-12-10', 'natalia.vargas', 'E01', 0.88, 'marcela.rios',   'E02', 0.90, 0.79, 19),
    (6,  '2901506', 'EJ-0005', 'CIAA',                  'Ambiente 102',            'mixta',  'virtual',    '2026-07-20', '2027-07-19', 'diana.castro',   'M01', 0.64, 'natalia.vargas', 'M02', 0.78, 0.55, 15),
    (7,  '2901607', 'EJ-0006', 'Casa de la Convención', 'Laboratorio de software', 'manana', 'presencial', '2026-02-23', '2027-02-22', 'diana.castro',   'D01', 0.90, 'laura.gomez',    'D02', 0.97, 0.88, 17),
    (8,  '2901708', 'EJ-0007', 'CIAA',                  'Laboratorio de software', 'manana', 'presencial', '2026-03-09', '2027-03-08', 'jorge.mendez',   'T01', 0.82, 'andres.torres',  'T03', 0.75, 0.69, 21),
    (9,  '2901809', 'EJ-0008', 'Casa de la Convención', 'Ambiente 102',            'tarde',  'presencial', '2026-07-27', '2027-07-26', 'jorge.mendez',   'U02', 0.94, 'andres.torres',  'U01', 0.90, 0.92, 14),
    (10, '2901910', '228118',  'CIAA',                  'Ambiente 102',            'noche',  'presencial', '2026-11-09', '2028-05-08', null,             null,  null, null,             null,  null, null, 20);

  insert into public.fichas (numero, programa_id, sede_id, ambiente_id, jornada, modalidad, fecha_inicio, fecha_fin, instructor_lider_id)
  select t.numero, pr.id, se.id, am.id, t.jornada, t.modalidad, t.inicio, t.fin, li.id
  from tmp_fichas t
  join public.programas pr on pr.codigo = t.programa
  join public.sedes se on se.nombre = t.sede
  join public.ambientes am on am.sede_id = se.id and am.nombre = t.ambiente
  left join public.perfiles li on li.correo = t.lider || '@puntualix.com'
  order by t.orden;

  insert into public.ficha_instructores (ficha_id, instructor_id, competencia_id, fecha_inicio, fecha_fin)
  select f.id, p.id, c.id, t.inicio, t.fin
  from tmp_fichas t
  join public.fichas f on f.numero = t.numero
  cross join lateral (values (t.lider, t.comp_lider), (t.segundo, t.comp_segundo)) as a(correo, comp)
  join public.perfiles p on p.correo = a.correo || '@puntualix.com'
  join public.competencias c on c.programa_id = f.programa_id and c.codigo = a.comp;

  -- -------------------------------------------------------------------
  -- 4. Aprendices demo y matrículas
  -- salida = fecha en que deja de asistir (desertor / retirado / aplazado)
  -- -------------------------------------------------------------------
  create temp table tmp_aprendices (numero text, i int, correo text, nombres text, apellidos text,
    documento text, ajuste numeric, estado_final public.estado_matricula, salida date) on commit drop;
  insert into tmp_aprendices
  select t.numero, g.i,
         format('aprendiz%s.%s@puntualix.com', t.numero, lpad(g.i::text, 2, '0')),
         (array['Valentina','Santiago','Mariana','Sebastián','Isabella','Mateo','Camila','Nicolás','Sofía','Samuel',
                'Daniela','Alejandro','Gabriela','David','Juliana','Felipe','Laura','Tomás','Paula','Esteban',
                'Natalia','Julián','Manuela','Andrés','Sara','Miguel','Luisa','Kevin','Angie','Brayan',
                'Karen','Cristian','Lina','Jhon','Melissa','Óscar','Yuliana','Diego','Tatiana','Duván'])[1 + (t.orden * 7 + g.i * 3) % 40],
         (array['García','Rodríguez','Martínez','López','González','Hernández','Pérez','Sánchez','Ramírez','Torres',
                'Flórez','Rivera','Gómez','Díaz','Moreno','Muñoz','Rojas','Ortiz','Castro','Vargas',
                'Jiménez','Suárez','Romero','Herrera','Medina','Aguilar','Cárdenas','Quintero','Ospina','Restrepo'])[1 + (t.orden * 5 + g.i * 7) % 30]
           || ' ' ||
         (array['Acosta','Benítez','Cabrera','Duarte','Escobar','Franco','Guerrero','Ibarra','Lozano','Mejía',
                'Navarro','Orozco','Parra','Quiroga','Salazar','Trujillo','Uribe','Valencia','Zapata','Arango'])[1 + (t.orden * 3 + g.i * 11) % 20],
         '11' || t.numero || lpad(g.i::text, 2, '0'),
         case when g.i % 7 = 0 then -0.30 else round((random() * 0.20 - 0.12)::numeric, 3) end,
         'matriculado', null
  from tmp_fichas t
  cross join lateral generate_series(1, t.aprendices) as g(i);

  -- Novedades de matrícula (alimentan la tasa de deserción de cada corte)
  update tmp_aprendices a set estado_final = v.estado::public.estado_matricula, salida = v.salida::date
  from (values
    ('2901101', 18, 'desertor',  '2026-05-14'),
    ('2901102', 20, 'desertor',  '2026-04-23'),
    ('2901102', 19, 'retirado',  '2026-09-17'),
    ('2901203', 16, 'desertor',  '2026-05-07'),
    ('2901203', 15, 'desertor',  '2026-08-27'),
    ('2901203', 14, 'retirado',  '2026-10-08'),
    ('2901304', 22, 'aplazado',  '2026-08-20'),
    ('2901405', 19, 'desertor',  '2026-10-15'),
    ('2901506', 15, 'desertor',  '2026-09-03'),
    ('2901506', 14, 'retirado',  '2026-09-24'),
    ('2901506', 13, 'desertor',  '2026-10-29'),
    ('2901607', 17, 'retirado',  '2026-06-04'),
    ('2901708', 21, 'desertor',  '2026-04-16'),
    ('2901708', 20, 'desertor',  '2026-10-22')
  ) as v(numero, i, estado, salida)
  where a.numero = v.numero and a.i = v.i;

  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  select gen_random_uuid(), a.correo, jsonb_build_object('rol', 'aprendiz'),
         jsonb_build_object('nombres', a.nombres, 'apellidos', a.apellidos, 'numero_documento', a.documento, 'demo', 'fichas')
  from tmp_aprendices a
  where not exists (select 1 from auth.users u where u.email = a.correo);

  update public.perfiles p set sede_id = f.sede_id
  from tmp_aprendices a join public.fichas f on f.numero = a.numero
  where p.correo = a.correo;

  insert into public.matriculas (ficha_id, aprendiz_id, fecha_matricula, vocero)
  select f.id, p.id, f.fecha_inicio,
         (case a.i when 1 then 'titular' when 2 then 'suplente' else 'ninguno' end)::public.tipo_vocero
  from tmp_aprendices a
  join public.fichas f on f.numero = a.numero
  join public.perfiles p on p.correo = a.correo;

  -- -------------------------------------------------------------------
  -- 5. Sesiones: martes (competencia del líder) y jueves (segundo instructor)
  -- Receso de mitad de año del 22-jun al 5-jul. Hasta el 11-dic-2026.
  -- -------------------------------------------------------------------
  create temp table tmp_sesiones (id bigint, ficha text, fecha date, registrada boolean) on commit drop;

  with nuevas as (
    insert into public.sesiones (ficha_id, competencia_id, instructor_id, fecha, hora_inicio, hora_fin, estado)
    select f.id, c.id, p.id, d.fecha,
           (case t.jornada when 'manana' then '07:00' when 'tarde' then '13:00' when 'noche' then '18:00' else '08:00' end)::time,
           (case t.jornada when 'manana' then '12:00' when 'tarde' then '18:00' when 'noche' then '22:00' else '12:00' end)::time,
           (case when d.fecha <= current_date and random() < 0.03 then 'cancelada' else 'programada' end)::public.estado_sesion
    from tmp_fichas t
    join public.fichas f on f.numero = t.numero
    cross join lateral (
      select g::date as fecha from generate_series(t.inicio, least(t.fin, date '2026-12-11'), interval '1 day') as g
      where extract(isodow from g) in (2, 4) and not (g::date between date '2026-06-22' and date '2026-07-05')
    ) as d
    join public.perfiles p on p.correo = (case when extract(isodow from d.fecha) = 2 then t.lider else t.segundo end) || '@puntualix.com'
    join public.competencias c on c.programa_id = f.programa_id
      and c.codigo = case when extract(isodow from d.fecha) = 2 then t.comp_lider else t.comp_segundo end
    where t.lider is not null
    returning id, ficha_id, fecha, estado, instructor_id
  )
  insert into tmp_sesiones
  select n.id, f.numero, n.fecha,
         n.estado = 'programada' and n.fecha <= current_date
           and random() < case when n.instructor_id = li.id then t.r_lider else t.r_segundo end
  from nuevas n
  join public.fichas f on f.id = n.ficha_id
  join tmp_fichas t on t.numero = f.numero
  join public.perfiles li on li.correo = t.lider || '@puntualix.com';

  -- -------------------------------------------------------------------
  -- 6. Asistencia de las sesiones registradas (la sesión pasa a "ejecutada" por trigger)
  -- -------------------------------------------------------------------
  insert into public.asistencias (sesion_id, aprendiz_id, estado)
  select s.id, p.id,
         (case
            when random() < greatest(0.25, least(0.995, t.p + a.ajuste + 0.03 * sin(extract(month from s.fecha)::double precision)))
              then 'presente'
            when random() < 0.35 then 'justificada'
            else 'ausente'
          end)::public.estado_asistencia
  from tmp_sesiones s
  join tmp_fichas t on t.numero = s.ficha
  join tmp_aprendices a on a.numero = s.ficha and (a.salida is null or s.fecha < a.salida)
  join public.perfiles p on p.correo = a.correo
  where s.registrada;

  -- Novedades de matrícula con su fecha real (sin el trigger de updated_at)
  update public.matriculas m set estado = a.estado_final, updated_at = a.salida::timestamptz + interval '10 hours'
  from tmp_aprendices a join public.perfiles p on p.correo = a.correo
  where m.aprendiz_id = p.id and a.estado_final <> 'matriculado';

  -- -------------------------------------------------------------------
  -- 7. Reactivar triggers y evaluar alertas una sola vez
  -- -------------------------------------------------------------------
  alter table public.perfiles           enable trigger trg_bit_perfiles;
  alter table public.instructores       enable trigger trg_bit_instructores;
  alter table public.fichas             enable trigger trg_bit_fichas;
  alter table public.ficha_instructores enable trigger trg_bit_ficha_instr;
  alter table public.matriculas         enable trigger trg_bit_matriculas;
  alter table public.matriculas         enable trigger trg_matriculas_updated;
  alter table public.sesiones           enable trigger trg_bit_sesiones;
  alter table public.asistencias        enable trigger trg_bit_asistencias;
  alter table public.asistencias        enable trigger trg_asistencias_alertas;

  perform public.fn_evaluar_alerta_aprendiz(m.aprendiz_id, m.ficha_id)
  from public.matriculas m join public.fichas f on f.id = m.ficha_id
  where f.numero like '2901%' and m.estado = 'matriculado';

  perform public.fn_evaluar_alerta_ficha(f.id) from public.fichas f where f.numero like '2901%';

  -- Supabase Auth no acepta tokens en NULL al leer usuarios: se dejan vacíos en los usuarios demo
  foreach v_col in array array['confirmation_token', 'recovery_token', 'email_change_token_new',
                               'email_change_token_current', 'email_change', 'phone_change',
                               'phone_change_token', 'reauthentication_token'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'auth' and table_name = 'users' and column_name = v_col) then
      execute format('update auth.users set %1$I = coalesce(%1$I, '''') where raw_user_meta_data ->> ''demo'' = ''fichas''', v_col);
    end if;
  end loop;
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users' and column_name = 'aud') then
    execute $q$update auth.users
               set instance_id = '00000000-0000-0000-0000-000000000000', aud = 'authenticated', role = 'authenticated',
                   created_at = coalesce(created_at, now()), updated_at = coalesce(updated_at, now())
               where raw_user_meta_data ->> 'demo' = 'fichas'$q$;
  end if;

  raise notice 'Datos demo creados: % fichas, % aprendices, % sesiones, % registros de asistencia.',
    (select count(*) from public.fichas where numero like '2901%'),
    (select count(*) from tmp_aprendices),
    (select count(*) from tmp_sesiones),
    (select count(*) from public.asistencias a join public.sesiones s on s.id = a.sesion_id
       join public.fichas f on f.id = s.ficha_id where f.numero like '2901%');
end;
$$;
