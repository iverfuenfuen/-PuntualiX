-- =====================================================================
-- PuntualiX — 09. HU02.4: solo el instructor LÍDER activa o desactiva el acceso de un aprendiz
-- Decisión del usuario (2026-11-24). Antes bastaba con ser instructor asignado a la ficha
-- (fn_es_instructor_de_ficha). No cambia tablas ni políticas: solo la regla del trigger
-- trg_perfiles_proteger. El administrador sigue pudiendo hacerlo desde Gestión de usuarios.
-- =====================================================================

create or replace function public.fn_proteger_campos_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_lider_del_aprendiz boolean;
begin
  if auth.uid() is not null and not public.fn_es_admin() then
    -- El aprendiz debe estar (o haber estado) matriculado en una ficha cuyo líder es quien hace el cambio
    v_lider_del_aprendiz := old.rol = 'aprendiz' and public.fn_rol_actual() = 'instructor' and exists (
      select 1 from public.matriculas m
      join public.fichas f on f.id = m.ficha_id
      where m.aprendiz_id = old.id and f.instructor_lider_id = auth.uid()
    );
    if new.estado is distinct from old.estado and not v_lider_del_aprendiz then
      raise exception 'Solo el instructor líder de la ficha puede activar o desactivar el acceso del aprendiz' using errcode = '42501';
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
