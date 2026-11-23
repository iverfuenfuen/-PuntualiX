-- =====================================================================
-- PuntualiX — 04. Seguridad a nivel de fila (RLS) — RNF2 Seguridad
-- Sin una política que lo permita, la operación se niega por defecto.
-- Resumen:
--   administrador → todo
--   instructor    → fichas donde es líder o está asignado, y sus datos
--   aprendiz      → solo su información y la de su ficha
-- =====================================================================

-- Activar RLS en todas las tablas
alter table public.sedes                   enable row level security;
alter table public.areas                   enable row level security;
alter table public.ambientes               enable row level security;
alter table public.programas               enable row level security;
alter table public.competencias            enable row level security;
alter table public.resultados_aprendizaje  enable row level security;
alter table public.perfiles                enable row level security;
alter table public.instructores            enable row level security;
alter table public.fichas                  enable row level security;
alter table public.ficha_instructores      enable row level security;
alter table public.matriculas              enable row level security;
alter table public.sesiones                enable row level security;
alter table public.asistencias             enable row level security;
alter table public.justificaciones         enable row level security;
alter table public.justificacion_historial enable row level security;
alter table public.umbrales_alerta         enable row level security;
alter table public.alertas                 enable row level security;
alter table public.notificaciones          enable row level security;
alter table public.reportes                enable row level security;
alter table public.materiales              enable row level security;
alter table public.bitacora                enable row level security;

-- ---------------------------------------------------------------------
-- CATÁLOGOS: lectura para cualquier usuario autenticado, escritura solo admin
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sedes', 'areas', 'ambientes', 'programas', 'competencias', 'resultados_aprendizaje', 'umbrales_alerta']
  loop
    execute format('create policy "%1$s_lectura" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s_admin_escribe" on public.%1$I for all to authenticated using (public.fn_es_admin()) with check (public.fn_es_admin())', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- PERFILES
-- ---------------------------------------------------------------------
create policy "perfiles_ver" on public.perfiles for select to authenticated using (
  id = auth.uid()
  or public.fn_es_admin()
  or public.fn_rol_actual() = 'instructor'                   -- instructores consultan aprendices y colegas
  or (public.fn_rol_actual() = 'aprendiz' and rol <> 'aprendiz') -- aprendiz ve nombres de instructores/admin
  or exists (select 1 from public.matriculas m                -- y compañeros de su ficha
             where m.aprendiz_id = perfiles.id and public.fn_es_aprendiz_de_ficha(m.ficha_id))
);
-- Cada uno edita sus datos de contacto; el trigger fn_proteger_campos_perfil bloquea rol/estado/documento.
-- El instructor solo edita (p. ej. desactiva, HU02.4) aprendices de sus fichas.
create policy "perfiles_editar" on public.perfiles for update to authenticated
  using (
    id = auth.uid() or public.fn_es_admin()
    or exists (select 1 from public.matriculas m
               where m.aprendiz_id = perfiles.id and public.fn_es_instructor_de_ficha(m.ficha_id))
  )
  with check (
    id = auth.uid() or public.fn_es_admin()
    or exists (select 1 from public.matriculas m
               where m.aprendiz_id = perfiles.id and public.fn_es_instructor_de_ficha(m.ficha_id))
  );
create policy "perfiles_admin_borra" on public.perfiles for delete to authenticated using (public.fn_es_admin());
-- INSERT: lo hace el trigger de Auth (security definer); no hay política de inserción directa.

-- ---------------------------------------------------------------------
-- INSTRUCTORES
-- ---------------------------------------------------------------------
create policy "instructores_ver" on public.instructores for select to authenticated using (true);
create policy "instructores_admin" on public.instructores for all to authenticated
  using (public.fn_es_admin()) with check (public.fn_es_admin());

-- ---------------------------------------------------------------------
-- FICHAS y ASIGNACIONES
-- ---------------------------------------------------------------------
create policy "fichas_ver" on public.fichas for select to authenticated using (
  public.fn_es_admin() or public.fn_es_instructor_de_ficha(id) or public.fn_es_aprendiz_de_ficha(id)
);
create policy "fichas_admin" on public.fichas for all to authenticated
  using (public.fn_es_admin()) with check (public.fn_es_admin());

create policy "ficha_instructores_ver" on public.ficha_instructores for select to authenticated using (
  public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id) or public.fn_es_aprendiz_de_ficha(ficha_id)
);
create policy "ficha_instructores_admin" on public.ficha_instructores for all to authenticated
  using (public.fn_es_admin()) with check (public.fn_es_admin());

-- ---------------------------------------------------------------------
-- MATRÍCULAS (HU02.2: el instructor matricula aprendices en sus fichas)
-- ---------------------------------------------------------------------
create policy "matriculas_ver" on public.matriculas for select to authenticated using (
  public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id) or aprendiz_id = auth.uid()
  or public.fn_es_aprendiz_de_ficha(ficha_id)
);
create policy "matriculas_gestionar" on public.matriculas for all to authenticated
  using (public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id))
  with check (public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id));

-- ---------------------------------------------------------------------
-- SESIONES Y ASISTENCIAS (RF08)
-- ---------------------------------------------------------------------
create policy "sesiones_ver" on public.sesiones for select to authenticated using (
  public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id) or public.fn_es_aprendiz_de_ficha(ficha_id)
);
create policy "sesiones_gestionar" on public.sesiones for all to authenticated
  using (public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id))
  with check (public.fn_es_admin() or (public.fn_es_instructor_de_ficha(ficha_id) and instructor_id = auth.uid()));

create policy "asistencias_ver" on public.asistencias for select to authenticated using (
  aprendiz_id = auth.uid() or public.fn_es_admin()
  or public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(sesion_id))
);
create policy "asistencias_registrar" on public.asistencias for insert to authenticated
  with check (public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(sesion_id)) or public.fn_es_admin());
create policy "asistencias_modificar" on public.asistencias for update to authenticated
  using (public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(sesion_id)) or public.fn_es_admin())
  with check (public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(sesion_id)) or public.fn_es_admin());
create policy "asistencias_admin_borra" on public.asistencias for delete to authenticated using (public.fn_es_admin());

-- ---------------------------------------------------------------------
-- JUSTIFICACIONES (RF10, RF11) — reglas finas en fn_validar_justificacion
-- ---------------------------------------------------------------------
create policy "justificaciones_ver" on public.justificaciones for select to authenticated using (
  aprendiz_id = auth.uid() or public.fn_es_admin()
  or exists (select 1 from public.asistencias a
             where a.id = asistencia_id and public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(a.sesion_id)))
);
create policy "justificaciones_registrar" on public.justificaciones for insert to authenticated
  with check (aprendiz_id = auth.uid() and public.fn_rol_actual() = 'aprendiz');
create policy "justificaciones_modificar" on public.justificaciones for update to authenticated
  using (
    aprendiz_id = auth.uid() or public.fn_es_admin()
    or exists (select 1 from public.asistencias a
               where a.id = asistencia_id and public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(a.sesion_id)))
  );

create policy "justificacion_historial_ver" on public.justificacion_historial for select to authenticated using (
  exists (select 1 from public.justificaciones j where j.id = justificacion_id)  -- hereda la RLS de justificaciones
);

-- ---------------------------------------------------------------------
-- ALERTAS Y NOTIFICACIONES (RF16)
-- ---------------------------------------------------------------------
create policy "alertas_ver" on public.alertas for select to authenticated using (
  public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id) or aprendiz_id = auth.uid()
);
create policy "alertas_gestionar" on public.alertas for update to authenticated
  using (public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id))
  with check (public.fn_es_admin() or public.fn_es_instructor_de_ficha(ficha_id));

create policy "notificaciones_propias" on public.notificaciones for select to authenticated using (usuario_id = auth.uid());
create policy "notificaciones_marcar_leida" on public.notificaciones for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------
-- REPORTES (RF18, HU05.3 historial según rol)
-- ---------------------------------------------------------------------
create policy "reportes_ver" on public.reportes for select to authenticated using (
  public.fn_es_admin() or generado_por = auth.uid() or aprendiz_id = auth.uid() or instructor_id = auth.uid()
  or (ficha_id is not null and public.fn_es_instructor_de_ficha(ficha_id))
);
create policy "reportes_generar" on public.reportes for insert to authenticated
  with check (generado_por = auth.uid());
create policy "reportes_actualizar_propios" on public.reportes for update to authenticated
  using (generado_por = auth.uid()) with check (generado_por = auth.uid());

-- ---------------------------------------------------------------------
-- MATERIAL DE APOYO (CU07)
-- ---------------------------------------------------------------------
create policy "materiales_ver" on public.materiales for select to authenticated using (
  public.fn_es_admin() or subido_por = auth.uid()
  or (ficha_id is not null and public.fn_es_instructor_de_ficha(ficha_id))
  or (estado = 'publicado' and ficha_id is not null and public.fn_es_aprendiz_de_ficha(ficha_id))
);
create policy "materiales_subir" on public.materiales for insert to authenticated
  with check (
    subido_por = auth.uid()
    and (public.fn_es_admin() or (public.fn_rol_actual() = 'instructor' and (ficha_id is null or public.fn_es_instructor_de_ficha(ficha_id))))
  );
create policy "materiales_editar" on public.materiales for update to authenticated
  using (subido_por = auth.uid() or public.fn_es_admin())
  with check (subido_por = auth.uid() or public.fn_es_admin());
create policy "materiales_borrar" on public.materiales for delete to authenticated
  using (subido_por = auth.uid() or public.fn_es_admin());

-- ---------------------------------------------------------------------
-- BITÁCORA (RF19) — lectura: admin todo, instructor sus propias operaciones.
-- Sin políticas de escritura: solo escriben los triggers y fn_registrar_evento.
-- ---------------------------------------------------------------------
create policy "bitacora_ver" on public.bitacora for select to authenticated using (
  public.fn_es_admin() or (public.fn_rol_actual() = 'instructor' and usuario_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- PERMISOS DE EJECUCIÓN DE FUNCIONES
-- ---------------------------------------------------------------------
revoke execute on function public.fn_registrar_evento(public.modulo_sistema, public.accion_bitacora, text, public.resultado_bitacora) from public, anon;
grant  execute on function public.fn_registrar_evento(public.modulo_sistema, public.accion_bitacora, text, public.resultado_bitacora) to authenticated;
revoke execute on function public.fn_evaluar_alerta_aprendiz(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.fn_evaluar_alerta_ficha(bigint) from public, anon, authenticated;
