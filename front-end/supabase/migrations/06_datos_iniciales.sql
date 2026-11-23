-- =====================================================================
-- PuntualiX — 06. Datos iniciales (catálogos)
-- Valores tomados de las listas de VersionAntigua y Prototipo.
-- Los códigos de programa distintos de ADSO son de EJEMPLO: reemplazar
-- por los códigos oficiales del catálogo SENA antes de producción.
-- =====================================================================

insert into public.sedes (nombre) values
  ('Casa de la Convención'),
  ('CIAA');

insert into public.areas (nombre) values
  ('Sistemas'), ('Diseño'), ('Administrativa'), ('Electromecánica');

insert into public.ambientes (sede_id, nombre, capacidad)
select s.id, a.nombre, a.capacidad
from public.sedes s
cross join (values ('Ambiente 101', 30), ('Ambiente 102', 30), ('Laboratorio de software', 25)) as a(nombre, capacidad);

insert into public.programas (codigo, nombre, nivel, area_id)
select v.codigo, v.nombre, v.nivel::public.nivel_formacion, ar.id
from (values
  ('228118',   'Análisis y Desarrollo de Software', 'tecnologo', 'Sistemas'),
  ('EJ-0002',  'Redes y Telecomunicaciones',        'tecnico',   'Sistemas'),
  ('EJ-0003',  'Gestión Administrativa',            'tecnico',   'Administrativa'),
  ('EJ-0004',  'Gestión Empresarial',               'tecnologo', 'Administrativa'),
  ('EJ-0005',  'Mercadeo Digital',                  'tecnico',   'Diseño'),
  ('EJ-0006',  'Diseño y Programación',             'tecnico',   'Diseño'),
  ('EJ-0007',  'Electromecánica',                   'tecnico',   'Electromecánica'),
  ('EJ-0008',  'Automatización Industrial',         'tecnologo', 'Electromecánica')
) as v(codigo, nombre, nivel, area)
join public.areas ar on ar.nombre = v.area;

-- Competencias de ADSO (de las pantallas de asistencia e historial del aprendiz)
insert into public.competencias (programa_id, codigo, nombre)
select p.id, v.codigo, v.nombre
from public.programas p
cross join (values
  ('C01', 'Análisis y diseño de sistemas de información'),
  ('C02', 'Construcción de bases de datos'),
  ('C03', 'Desarrollo de software en entorno web'),
  ('C04', 'Algoritmos'),
  ('C05', 'Front-End'),
  ('C06', 'Back-End'),
  ('C07', 'Inglés'),
  ('C08', 'Calidad de software')
) as v(codigo, nombre)
where p.codigo = '228118';

insert into public.resultados_aprendizaje (competencia_id, codigo, descripcion)
select c.id, v.codigo, v.descripcion
from public.competencias c
join (values
  ('C02', 'RA01', 'Diseña modelos de datos para sistemas de información'),
  ('C02', 'RA02', 'Implementa bases de datos relacionales')
) as v(comp, codigo, descripcion) on v.comp = c.codigo
join public.programas p on p.id = c.programa_id and p.codigo = '228118';

-- Umbrales de alerta (RF17). Límite crítico institucional del 30 % usado en VersionAntigua.
insert into public.umbrales_alerta (prioridad, porcentaje_inasistencia, descripcion) values
  ('baja',  10, 'Tendencia al alza de inasistencias'),
  ('media', 20, 'Cerca del límite de inasistencias'),
  ('alta',  30, 'Límite crítico institucional superado');
