/**
 * Aplica las migraciones al proyecto Supabase REAL y deja la app conectada.
 * Lee credenciales de .env.supabase.local (nunca las imprime).
 *
 * Uso:  npm run db:aplicar            (migraciones 01–07 + usuarios y datos demo)
 *       npm run db:aplicar -- --sin-demo
 *
 * Es seguro ejecutarlo varias veces: registra cada archivo aplicado en
 * privado.migraciones y no lo vuelve a ejecutar.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const CARPETA = 'supabase/migrations'
const conDemo = !process.argv.includes('--sin-demo')
const { SUPABASE_DB_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD } = process.env
let { SUPABASE_URL } = process.env

// Si falta la Project URL, se deduce del usuario de la conexión: "postgres.<ref>" → https://<ref>.supabase.co
if (!SUPABASE_URL || SUPABASE_URL.includes('XXXX')) {
  const ref = /postgres\.([a-z0-9]{15,30})[:@]/.exec(SUPABASE_DB_URL ?? '')?.[1]
  if (ref) {
    SUPABASE_URL = `https://${ref}.supabase.co`
    console.log(`→ Project URL deducida de la conexión: ${SUPABASE_URL}`)
  }
}

// ---------- 1. Validar credenciales (sin mostrarlas) ----------
const faltantes = Object.entries({ SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY })
  .filter(([, v]) => !v || /XXXX|YOUR-PASSWORD|pega-aqui/.test(v))
  .map(([k]) => k)
if (faltantes.length) {
  console.error('✘ Completa en .env.supabase.local:', faltantes.join(', '))
  process.exit(1)
}
const host = (() => { try { return new URL(SUPABASE_DB_URL).host } catch { return '?' } })()
console.log(`→ Conectando a la base (${host})…`)

const db = new pg.Client({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
try {
  await db.connect()
} catch (e) {
  console.error('✘ No se pudo conectar a la base:', e.message)
  console.error('  Revisa SUPABASE_DB_URL (Session pooler) y que la contraseña no tenga [ ] alrededor.')
  process.exit(1)
}
console.log('✔ Conectado')

// ---------- 2. Control de migraciones aplicadas ----------
await db.query(`create schema if not exists privado;
  create table if not exists privado.migraciones (archivo text primary key, aplicado_en timestamptz not null default now());
  revoke all on schema privado from anon, authenticated;`)
// Si algún archivo se ejecutó a mano en el SQL Editor, se detecta por un objeto que crea
// y se marca como aplicado (evita errores "already exists").
// "requiere": tabla que debe existir antes de ejecutar la consulta (si no existe → no aplicada).
const MARCADORES = {
  '01_tipos_y_tablas.sql':       { sql: `select to_regclass('public.bitacora') is not null` },
  '02_funciones_y_triggers.sql': { sql: `select to_regprocedure('public.fn_registrar_evento(public.modulo_sistema,public.accion_bitacora,text,public.resultado_bitacora)') is not null` },
  '03_vistas.sql':               { sql: `select to_regclass('public.v_cumplimiento_instructor') is not null` },
  '04_seguridad_rls.sql':        { sql: `select exists (select 1 from pg_policies where schemaname = 'public' and policyname = 'bitacora_ver')` },
  '05_storage.sql':              { sql: `select exists (select 1 from storage.buckets where id = 'avatares')` },
  '06_datos_iniciales.sql':      { requiere: 'public.umbrales_alerta', sql: `select exists (select 1 from public.umbrales_alerta)` },
  '07_comentarios.sql':          { requiere: 'public.bitacora', sql: `select obj_description('public.bitacora'::regclass, 'pg_class') is not null` },
  '08_usuarios_demo.sql':        { requiere: 'public.fichas', sql: `select exists (select 1 from public.fichas where numero = '301002')` },
}
const yaRegistradas = new Set((await db.query('select archivo from privado.migraciones')).rows.map((r) => r.archivo))
for (const [archivo, { requiere, sql }] of Object.entries(MARCADORES)) {
  if (yaRegistradas.has(archivo)) continue
  if (requiere && !(await db.query('select to_regclass($1) is not null as ok', [requiere])).rows[0].ok) continue
  const { rows } = await db.query(sql)
  if (Object.values(rows[0])[0] === true) {
    await db.query('insert into privado.migraciones (archivo) values ($1)', [archivo])
    console.log(`  · ${archivo} detectada (ejecutada a mano antes)`)
  }
}
const aplicadas = new Set((await db.query('select archivo from privado.migraciones')).rows.map((r) => r.archivo))

async function aplicar(archivo) {
  if (aplicadas.has(archivo)) { console.log(`  · ${archivo} (ya aplicada)`); return }
  const sql = readFileSync(join(CARPETA, archivo), 'utf8')
  try {
    await db.query('begin')
    await db.query(sql)
    await db.query('insert into privado.migraciones (archivo) values ($1)', [archivo])
    await db.query('commit')
    console.log(`  ✔ ${archivo}`)
  } catch (e) {
    await db.query('rollback')
    console.error(`  ✘ ${archivo} → ${e.message}`)
    console.error('    No se aplicó ningún cambio de este archivo. Corrige y vuelve a ejecutar.')
    await db.end()
    process.exit(1)
  }
}

console.log('→ Aplicando migraciones')
const archivos = readdirSync(CARPETA).filter((f) => f.endsWith('.sql')).sort()
for (const archivo of archivos.filter((f) => !f.includes('demo'))) await aplicar(archivo)

// ---------- 3. Usuarios y datos de demostración ----------
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const DEMO = [
  { email: 'admin@puntualix.com', rol: 'administrador', nombres: 'Andres', apellidos: 'Ramirez' },
  { email: 'carlos.perez@puntualix.com', rol: 'instructor', nombres: 'Carlos', apellidos: 'Perez' },
  { email: 'juan.perez@puntualix.com', rol: 'aprendiz', nombres: 'Juan', apellidos: 'Perez' },
]

if (conDemo) {
  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
    console.error('✘ DEMO_PASSWORD debe tener al menos 8 caracteres'); process.exit(1)
  }
  console.log('→ Usuarios de prueba')
  for (const u of DEMO) {
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      app_metadata: { rol: u.rol },
      user_metadata: { nombres: u.nombres, apellidos: u.apellidos },
    })
    if (!error) console.log(`  ✔ ${u.email} (${u.rol})`)
    else if (/already|registered|exists/i.test(error.message)) console.log(`  · ${u.email} (ya existía)`)
    else { console.error(`  ✘ ${u.email} → ${error.message}`); process.exit(1) }
  }
  for (const archivo of archivos.filter((f) => f.includes('demo'))) await aplicar(archivo)
}

// ---------- 4. Archivo .env.local para la app (solo llave pública) ----------
writeFileSync('.env.local',
  `# Generado por npm run db:aplicar — solo valores PÚBLICOS\nVITE_SUPABASE_URL=${SUPABASE_URL}\nVITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}\n`)
console.log('✔ .env.local creado para la app')

// ---------- 5. Verificación de punta a punta (como lo haría el navegador) ----------
console.log('→ Verificando')
const conteo = async (sql) => Number((await db.query(sql)).rows[0].n)
console.log(`  Tablas en public: ${await conteo(`select count(*) n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`)} (esperadas 21)`)
console.log(`  Buckets en Storage: ${await conteo(`select count(*) n from storage.buckets where id in ('justificaciones','materiales','reportes','avatares')`)} (esperados 4)`)
await db.end()

if (conDemo) {
  for (const u of DEMO) {
    const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const { error } = await cliente.auth.signInWithPassword({ email: u.email, password: DEMO_PASSWORD })
    if (error) { console.error(`  ✘ Login ${u.email}: ${error.message}`); continue }
    const { data: perfil } = await cliente.from('perfiles').select('rol').eq('correo', u.email).single()
    const { count } = await cliente.from('fichas').select('id', { count: 'exact', head: true })
    console.log(`  ✔ Login ${u.email} → rol ${perfil?.rol ?? '?'}, ve ${count ?? 0} ficha(s)`)
  }
}
console.log('\nListo. Ejecuta "npm run dev" y abre http://localhost:5173')
