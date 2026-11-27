/**
 * Base de datos local en memoria (PGlite = PostgreSQL compilado a WebAssembly)
 * con un simulador mínimo de los esquemas "auth" y "storage" de Supabase.
 * Permite ejecutar y probar las migraciones sin conexión ni Docker.
 * Uso: import { crearBaseLocal } from './base-local.mjs'
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SIMULADOR_SUPABASE = `
create role anon; create role authenticated;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique,
  raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant usage on schema public, auth, storage to authenticated, anon;
grant execute on function auth.uid() to authenticated;
`

/**
 * @param {string} carpetaMigraciones ruta a supabase/migrations
 * @param {{ demo?: boolean, log?: boolean }} opciones demo: ejecutar 08_usuarios_demo.sql
 */
export async function crearBaseLocal(carpetaMigraciones, { demo = true, log = true } = {}) {
  const db = new PGlite()
  await db.exec(SIMULADOR_SUPABASE)

  const archivos = readdirSync(carpetaMigraciones).filter((f) => f.endsWith('.sql')).sort()
  for (const archivo of archivos) {
    const esDemo = archivo.includes('demo')
    if (esDemo && !demo) continue
    if (esDemo) {
      // Equivale a crear los usuarios en Authentication > Users (paso previo del script demo)
      await db.exec(`insert into auth.users (email) values
        ('admin@puntualix.com'), ('carlos.perez@puntualix.com'), ('juan.perez@puntualix.com'),
        ('otro.instructor@puntualix.com');`)
    }
    try {
      await db.exec(readFileSync(join(carpetaMigraciones, archivo), 'utf8'))
      if (log) console.log('OK  ', archivo)
    } catch (e) {
      console.error('FAIL', archivo, '→', e.message)
      process.exit(1)
    }
  }

  // En Supabase estos permisos ya existen; RLS decide qué filas se ven.
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;`)
  return db
}
