/**
 * Pruebas de reglas de negocio y seguridad (RLS) de la base de PuntualiX.
 * Ejecuta todas las migraciones en una base local en memoria y verifica cada regla por rol.
 * Uso: npm run test:db
 */
import { crearBaseLocal } from '../scripts/base-local.mjs'

const db = await crearBaseLocal(process.argv[2] ?? 'supabase/migrations')

const q = async (sql) => (await db.query(sql)).rows
const id = async (email) => (await q(`select id from auth.users where email='${email}'`))[0].id
const ADMIN = await id('admin@puntualix.com'), INSTR = await id('carlos.perez@puntualix.com'),
      APR = await id('juan.perez@puntualix.com'), OTRO = await id('otro.instructor@puntualix.com')
await db.exec(`update public.perfiles set rol='instructor' where id='${OTRO}'`)

async function como(uid, sql) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try { return { ok: true, rows: (await db.query(sql)).rows } }
  catch (e) { return { ok: false, err: e.message } }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
let fallos = 0
const check = (nombre, cond, extra = '') => { console.log(cond ? '  ✔' : '  ✘', nombre, cond ? '' : extra); if (!cond) fallos++ }

console.log('\n--- Datos demo y triggers ---')
const perf = await q(`select correo, rol from public.perfiles order by correo`)
check('perfiles creados por trigger con rol correcto', perf.find(p => p.correo === 'admin@puntualix.com').rol === 'administrador', JSON.stringify(perf))
check('fila instructores sincronizada', (await q(`select count(*)::int n from public.instructores`))[0].n === 2)
const al = await q(`select tipo, prioridad, porcentaje from public.alertas order by id`)
check('alerta automática aprendiz alta (40%)', al.some(a => a.tipo === 'inasistencia_aprendiz' && a.prioridad === 'alta'), JSON.stringify(al))
check('alerta de ficha (HU09.3)', al.some(a => a.tipo === 'riesgo_ficha'), JSON.stringify(al))
check('notificaciones generadas', (await q(`select count(*)::int n from public.notificaciones`))[0].n >= 3)
check('sesiones marcadas ejecutadas', (await q(`select count(*)::int n from public.sesiones where estado='ejecutada'`))[0].n === 5)
check('bitácora registra cambios', (await q(`select count(*)::int n from public.bitacora`))[0].n > 10)
const vr = await q(`select * from public.v_fichas_resumen`)
check('vista v_fichas_resumen', vr[0]?.porcentaje_inasistencia == 40 && vr[0]?.nivel_riesgo === 'alta', JSON.stringify(vr[0]))
const vc = await q(`select * from public.v_cumplimiento_instructor where sesiones_planificadas > 0`)
check('vista cumplimiento instructor 100%', vc[0]?.porcentaje_cumplimiento == 100, JSON.stringify(vc))
check('vista asistencia aprendiz', (await q(`select porcentaje_asistencia from public.v_asistencia_aprendiz`))[0].porcentaje_asistencia == 60)

console.log('\n--- RLS por rol ---')
let r = await como(APR, `select count(*)::int n from public.fichas`)
check('aprendiz ve su ficha', r.ok && r.rows[0].n === 1, JSON.stringify(r))
r = await como(OTRO, `select count(*)::int n from public.fichas`)
check('instructor no asignado NO ve la ficha', r.ok && r.rows[0].n === 0, JSON.stringify(r))
r = await como(OTRO, `select count(*)::int n from public.asistencias`)
check('instructor no asignado NO ve asistencias', r.ok && r.rows[0].n === 0, JSON.stringify(r))
r = await como(APR, `update public.perfiles set rol='administrador' where id='${APR}'`)
check('aprendiz NO puede auto-asignarse admin', !r.ok, JSON.stringify(r))
r = await como(APR, `update public.perfiles set telefono='3001234567' where id='${APR}'`)
check('aprendiz puede editar su teléfono', r.ok, JSON.stringify(r))
r = await como(APR, `select count(*)::int n from public.bitacora`)
check('aprendiz NO ve bitácora', r.ok && r.rows[0].n === 0)
r = await como(APR, `insert into public.asistencias (sesion_id, aprendiz_id, estado) select id, '${APR}', 'presente' from public.sesiones limit 1`)
check('aprendiz NO registra asistencia', !r.ok)
r = await como(INSTR, `update public.perfiles set estado='inactivo' where id='${APR}' returning id`)
check('instructor desactiva aprendiz de su ficha (HU02.4)', r.ok && r.rows.length === 1, JSON.stringify(r))
await db.exec(`update public.perfiles set estado='activo' where id='${APR}'`)
r = await como(OTRO, `update public.perfiles set estado='inactivo' where id='${APR}' returning id`)
check('otro instructor NO desactiva aprendiz ajeno', !r.ok || r.rows.length === 0, JSON.stringify(r))

console.log('\n--- Flujo de justificación (RF10-RF12) ---')
const aus = (await q(`select id from public.asistencias where estado='ausente' order by id limit 1`))[0].id
const pres = (await q(`select id from public.asistencias where estado='presente' order by id limit 1`))[0].id
r = await como(APR, `insert into public.justificaciones (asistencia_id, aprendiz_id, documento_path) values (${pres}, '${APR}', '${APR}/x.pdf')`)
check('no se justifica una asistencia "presente"', !r.ok)
r = await como(APR, `insert into public.justificaciones (asistencia_id, aprendiz_id, documento_path, estado) values (${aus}, '${APR}', '${APR}/cita.pdf', 'aprobada') returning id, estado`)
check('aprendiz registra justificación y nace pendiente', r.ok && r.rows[0].estado === 'pendiente', JSON.stringify(r))
const jid = r.rows?.[0]?.id
r = await como(APR, `update public.justificaciones set comentario='corrijo' where id=${jid} returning id`)
check('aprendiz corrige mientras está pendiente (HU08.2)', r.ok && r.rows.length === 1, JSON.stringify(r))
r = await como(APR, `update public.justificaciones set estado='aprobada' where id=${jid}`)
check('aprendiz NO puede aprobar', !r.ok)
r = await como(INSTR, `update public.justificaciones set estado='aprobada', observacion_revision='Soporte válido' where id=${jid} returning revisado_por`)
check('instructor aprueba (RF11)', r.ok && r.rows[0].revisado_por === INSTR, JSON.stringify(r))
check('asistencia pasa a justificada', (await q(`select estado from public.asistencias where id=${aus}`))[0].estado === 'justificada')
check('historial con 2 estados (RF12)', (await q(`select count(*)::int n from public.justificacion_historial where justificacion_id=${jid}`))[0].n === 2)
check('aprendiz notificado (HU09.4)', (await q(`select count(*)::int n from public.notificaciones where usuario_id='${APR}' and titulo like 'Justificación%'`))[0].n === 1)
r = await como(APR, `update public.justificaciones set comentario='otra' where id=${jid}`)
check('aprendiz NO edita tras revisión', !r.ok)
r = await como(APR, `select count(*)::int n from public.justificacion_historial`)
check('aprendiz ve el historial de su justificación', r.ok && r.rows[0].n === 2, JSON.stringify(r))

console.log('\n--- Bitácora inmutable y eventos ---')
const antes = (await q(`select count(*)::int n from public.bitacora`))[0].n
r = await como(ADMIN, `delete from public.bitacora`)
check('ni el admin borra la bitácora', (await q(`select count(*)::int n from public.bitacora`))[0].n === antes)
let e2; try { await db.exec(`delete from public.bitacora`) } catch (e) { e2 = e }
check('el trigger bloquea el borrado incluso sin RLS (superusuario)', !!e2)
r = await como(INSTR, `select public.fn_registrar_evento('autenticacion', 'acceso', 'Inicio de sesión')`)
check('registro de evento de acceso por RPC', r.ok, JSON.stringify(r))
r = await como(INSTR, `select public.fn_registrar_evento('asistencias', 'eliminacion', 'falso')`)
check('RPC rechaza acciones que no son acceso/consulta/descarga', !r.ok)
r = await como(INSTR, `select count(*)::int n from public.bitacora where usuario_id <> '${INSTR}'`)
check('instructor solo ve su bitácora', r.ok && r.rows[0].n === 0)

console.log('\n--- Storage ---')
r = await como(APR, `insert into storage.objects (bucket_id, name) values ('justificaciones', '${APR}/cita.pdf')`)
check('aprendiz sube a su carpeta', r.ok, JSON.stringify(r))
r = await como(APR, `insert into storage.objects (bucket_id, name) values ('justificaciones', '${INSTR}/cita.pdf')`)
check('aprendiz NO sube a carpeta ajena', !r.ok)
r = await como(INSTR, `select count(*)::int n from storage.objects where bucket_id='justificaciones'`)
check('instructor de la ficha lee el soporte', r.ok && r.rows[0].n === 1, JSON.stringify(r))
r = await como(OTRO, `select count(*)::int n from storage.objects where bucket_id='justificaciones'`)
check('instructor ajeno NO lee el soporte', r.ok && r.rows[0].n === 0, JSON.stringify(r))

console.log(fallos ? `\n${fallos} PRUEBA(S) FALLIDA(S)` : '\nTODAS LAS PRUEBAS PASARON')
process.exit(fallos ? 1 : 0)
