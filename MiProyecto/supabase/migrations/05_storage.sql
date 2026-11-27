-- =====================================================================
-- PuntualiX — 05. Almacenamiento de archivos (Supabase Storage)
-- Convención de rutas: <bucket>/<id_usuario>/<nombre_archivo>
-- La primera carpeta de la ruta es SIEMPRE el uuid de quien sube el archivo.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('justificaciones', 'justificaciones', false, 5242880,   -- 5 MB
     array['application/pdf', 'image/jpeg', 'image/png']),
  ('materiales', 'materiales', false, 52428800,            -- 50 MB
     array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
           'application/vnd.openxmlformats-officedocument.presentationml.presentation',
           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'video/mp4', 'image/jpeg', 'image/png', 'application/zip']),
  ('reportes', 'reportes', false, 20971520,                -- 20 MB
     array['application/pdf', 'text/csv',
           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('avatares', 'avatares', true, 2097152,                  -- 2 MB, público (fotos de perfil)
     array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- JUSTIFICACIONES: el aprendiz sube a su carpeta; lo leen él, el admin y
-- los instructores de la ficha de esa inasistencia.
-- ---------------------------------------------------------------------
create policy "just_subir_propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'justificaciones' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "just_reemplazar_propia" on storage.objects for update to authenticated
  using (bucket_id = 'justificaciones' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "just_leer" on storage.objects for select to authenticated using (
  bucket_id = 'justificaciones' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.fn_es_admin()
    or exists (
      select 1 from public.justificaciones j
      join public.asistencias a on a.id = j.asistencia_id
      where j.documento_path = storage.objects.name
        and public.fn_es_instructor_de_ficha(public.fn_ficha_de_sesion(a.sesion_id))
    )
  )
);

-- ---------------------------------------------------------------------
-- MATERIALES: instructores/admin suben; lee quien pueda ver el registro en "materiales"
-- ---------------------------------------------------------------------
create policy "mat_subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'materiales' and (storage.foldername(name))[1] = auth.uid()::text
  and public.fn_rol_actual() in ('instructor', 'administrador')
);

create policy "mat_gestionar_propio" on storage.objects for update to authenticated
  using (bucket_id = 'materiales' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "mat_borrar_propio" on storage.objects for delete to authenticated
  using (bucket_id = 'materiales' and ((storage.foldername(name))[1] = auth.uid()::text or public.fn_es_admin()));

create policy "mat_leer" on storage.objects for select to authenticated using (
  bucket_id = 'materiales' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.fn_es_admin()
    or exists (select 1 from public.materiales m where m.archivo_path = storage.objects.name)  -- hereda RLS de materiales
  )
);

-- ---------------------------------------------------------------------
-- REPORTES: cada usuario guarda y lee los suyos; admin lee todos;
-- también se leen si el registro en "reportes" es visible para el usuario.
-- ---------------------------------------------------------------------
create policy "rep_subir_propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'reportes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "rep_leer" on storage.objects for select to authenticated using (
  bucket_id = 'reportes' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.fn_es_admin()
    or exists (select 1 from public.reportes r where r.archivo_path = storage.objects.name)
  )
);

-- ---------------------------------------------------------------------
-- AVATARES: lectura pública (bucket público); cada usuario gestiona el suyo
-- ---------------------------------------------------------------------
create policy "avatar_subir_propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_actualizar_propio" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_borrar_propio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
