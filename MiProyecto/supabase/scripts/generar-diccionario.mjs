/**
 * Genera supabase/DICCIONARIO_DATOS.md directamente desde el esquema SQL.
 * Fuente de las descripciones: los COMMENT ON de 07_comentarios.sql.
 * Uso: npm run docs:diccionario
 */
import { writeFileSync } from 'node:fs'
import { crearBaseLocal } from './base-local.mjs'

const db = await crearBaseLocal('supabase/migrations', { demo: false, log: false })
const q = async (sql) => (await db.query(sql)).rows

const objetos = await q(`
  select c.relname as nombre, c.relkind as tipo, obj_description(c.oid, 'pg_class') as descripcion
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'v')
  order by c.relkind, c.oid`)

const columnas = await q(`
  select c.table_name as tabla, c.column_name as columna, c.ordinal_position as pos,
         case when c.data_type = 'USER-DEFINED' then c.udt_name
              when c.character_maximum_length is not null then c.data_type || '(' || c.character_maximum_length || ')'
              when c.data_type = 'numeric' and c.numeric_precision is not null then 'numeric(' || c.numeric_precision || ',' || c.numeric_scale || ')'
              else c.data_type end as tipo,
         c.is_nullable = 'YES' as nulo,
         c.column_default as defecto, c.is_identity = 'YES' as identidad,
         col_description(format('public.%I', c.table_name)::regclass, c.ordinal_position) as descripcion
  from information_schema.columns c
  where c.table_schema = 'public'
  order by c.table_name, c.ordinal_position`)

const restricciones = await q(`
  select cl.relname as tabla, con.conname as nombre, con.contype as tipo,
         pg_get_constraintdef(con.oid) as definicion,
         array(select a.attname from unnest(con.conkey) k join pg_attribute a
               on a.attrelid = con.conrelid and a.attnum = k)::text[] as columnas,
         fcl.relname as tabla_ref
  from pg_constraint con
  join pg_class cl on cl.oid = con.conrelid
  join pg_namespace n on n.oid = cl.relnamespace
  left join pg_class fcl on fcl.oid = con.confrelid
  where n.nspname = 'public'`)

const enums = await q(`
  select t.typname as nombre, string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valores
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' group by t.typname order by t.typname`)

const indicesUnicos = await q(`
  select tablename as tabla, indexname as nombre, indexdef as definicion
  from pg_indexes where schemaname = 'public' and indexdef ilike 'create unique index%'
    and indexname not in (select conname from pg_constraint)`)

const sinDescripcion = []
const esc = (s) => (s ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')

const llavesDe = (tabla, columna) => {
  const marcas = []
  for (const r of restricciones.filter((x) => x.tabla === tabla && x.columnas.includes(columna))) {
    if (r.tipo === 'p') marcas.push('PK')
    if (r.tipo === 'f') marcas.push(`FK → ${r.tabla_ref}`)
    if (r.tipo === 'u') marcas.push(r.columnas.length === 1 ? 'UQ' : `UQ (${r.columnas.join(', ')})`)
  }
  return marcas.join(', ')
}

let md = `# Diccionario de Datos — PuntualiX

> **Documento generado automáticamente** desde \`supabase/migrations\` con \`npm run docs:diccionario\`.
> No editar a mano: para cambiar una descripción, modifica \`07_comentarios.sql\` y vuelve a generar.
> Motor: PostgreSQL (Supabase) · Esquema: \`public\` · Generado: ${new Date().toISOString().slice(0, 10)}

**Convenciones:** PK = llave primaria · FK = llave foránea · UQ = valor único ·
"Nulo: No" = obligatorio · \`auth.uid()\` = usuario con sesión iniciada · identidad = número autoincremental.

## Índice

`
const tablas = objetos.filter((o) => o.tipo === 'r')
const vistas = objetos.filter((o) => o.tipo === 'v')
md += '**Tablas:** ' + tablas.map((t) => `[${t.nombre}](#${t.nombre.replaceAll('_', '_')})`).join(' · ') + '\n\n'
md += '**Vistas:** ' + vistas.map((t) => `[${t.nombre}](#${t.nombre})`).join(' · ') + '\n\n'
md += `**Otros:** [Tipos enumerados](#tipos-enumerados) · [Relaciones](#relaciones)\n\n`

md += '## Tablas\n\n'
for (const t of tablas) {
  if (!t.descripcion) sinDescripcion.push(t.nombre)
  md += `### ${t.nombre}\n\n${t.descripcion ?? '_Sin descripción_'}\n\n`
  md += '| Columna | Tipo | Nulo | Por defecto | Llaves | Descripción |\n|---|---|---|---|---|---|\n'
  for (const c of columnas.filter((x) => x.tabla === t.nombre)) {
    if (!c.descripcion) sinDescripcion.push(`${t.nombre}.${c.columna}`)
    const defecto = c.identidad ? 'identidad' : (c.defecto ?? '').replace(/::[a-z_ ."]+/g, '')
    md += `| \`${c.columna}\` | ${c.tipo} | ${c.nulo ? 'Sí' : 'No'} | ${esc(defecto)} | ${llavesDe(t.nombre, c.columna)} | ${esc(c.descripcion)} |\n`
  }
  const checks = restricciones.filter((r) => r.tabla === t.nombre && r.tipo === 'c')
  const unicos = indicesUnicos.filter((i) => i.tabla === t.nombre)
  if (checks.length || unicos.length) {
    md += '\n**Reglas de integridad:**\n\n'
    for (const r of checks) md += `- \`${r.nombre}\`: \`${esc(r.definicion)}\`\n`
    for (const i of unicos) md += `- \`${i.nombre}\`: \`${esc(i.definicion.replace(/ USING btree/, '').replace(/public\./g, ''))}\`\n`
  }
  md += '\n'
}

md += '## Vistas\n\nTodas usan `security_invoker`: respetan los permisos (RLS) de quien consulta.\n\n'
for (const v of vistas) {
  md += `### ${v.nombre}\n\n${v.descripcion ?? '_Sin descripción_'}\n\n| Columna | Tipo |\n|---|---|\n`
  for (const c of columnas.filter((x) => x.tabla === v.nombre)) md += `| \`${c.columna}\` | ${c.tipo} |\n`
  md += '\n'
}

md += '## Tipos enumerados\n\n| Tipo | Valores permitidos |\n|---|---|\n'
for (const e of enums) md += `| \`${e.nombre}\` | ${e.valores} |\n`

md += '\n## Relaciones\n\n| Tabla origen | Columna(s) | Tabla destino | Regla |\n|---|---|---|---|\n'
for (const r of restricciones.filter((x) => x.tipo === 'f').sort((a, b) => a.tabla.localeCompare(b.tabla))) {
  const regla = /ON DELETE (CASCADE|SET NULL|RESTRICT)/.exec(r.definicion)?.[1] ?? 'NO ACTION'
  md += `| ${r.tabla} | ${r.columnas.join(', ')} | ${r.tabla_ref} | al borrar: ${regla} |\n`
}

writeFileSync('supabase/DICCIONARIO_DATOS.md', md)
console.log(`Diccionario generado: ${tablas.length} tablas, ${vistas.length} vistas, ${enums.length} tipos.`)
if (sinDescripcion.length) {
  console.warn(`AVISO: ${sinDescripcion.length} elemento(s) sin descripción:\n  ` + sinDescripcion.join('\n  '))
  process.exit(1)
}
