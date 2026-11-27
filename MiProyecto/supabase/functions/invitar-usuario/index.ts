// =====================================================================
// PuntualiX — Edge Function "invitar-usuario" (HU02.1, HU02.2, HU02.3)
//
// Crea la cuenta de un instructor, aprendiz o administrador y le envía una
// INVITACIÓN POR CORREO para que elija su propia contraseña (decisión del
// equipo: el administrador nunca conoce contraseñas).
//
// Por qué una Edge Function: crear usuarios y fijar su rol en app_metadata
// exige la llave service_role, que NUNCA puede estar en el navegador. Esta
// función corre en los servidores de Supabase, donde la llave ya está
// disponible como variable de entorno.
//
// Seguridad:
//   1. Solo responde a un usuario autenticado cuyo perfil sea administrador ACTIVO, o
//      instructor ACTIVO (HU02.2) que registra un APRENDIZ en una ficha activa suya
//      (líder o asignado); en ese caso la función también crea la matrícula.
//   2. Valida todos los campos y que el correo y el documento no existan.
//   3. Si algún paso falla después de crear la cuenta, la elimina (no deja cuentas a medias).
//
// Despliegue (una sola vez, ver supabase/README.md → "Edge Function"):
//   npx supabase login
//   npx supabase functions deploy invitar-usuario --project-ref <ID_PROYECTO>
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.119.2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ROLES = ['administrador', 'instructor', 'aprendiz'] as const
const DOCUMENTOS = ['CC', 'TI', 'CE', 'PPT'] as const

type Rol = (typeof ROLES)[number]

interface Solicitud {
  rol: Rol
  nombres: string
  apellidos: string
  tipoDocumento: (typeof DOCUMENTOS)[number]
  numeroDocumento: string
  correo: string
  telefono?: string | null
  sedeId?: number | null
  /** URL a la que vuelve el usuario desde el correo (pantalla "Crea tu contraseña") */
  redirigirA: string
  instructor?: { areaId?: number | null; especialidad?: string | null; fechaIngreso?: string | null }
  /** HU02.2 — Ficha en la que se matricula el aprendiz (obligatoria si invita un instructor) */
  fichaId?: number | null
}

function responder(estado: number, cuerpo: Record<string, unknown>) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
const error = (estado: number, mensaje: string) => responder(estado, { ok: false, mensaje })

/** Validación del cuerpo: mismas reglas que el formulario (zod) del front-end */
function validar(d: Partial<Solicitud>): string | null {
  const texto = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max
  if (!ROLES.includes(d.rol as Rol)) return 'El rol no es válido.'
  if (!texto(d.nombres, 2, 100) || !texto(d.apellidos, 2, 100)) return 'Nombres y apellidos deben tener entre 2 y 100 caracteres.'
  if (!DOCUMENTOS.includes(d.tipoDocumento as (typeof DOCUMENTOS)[number])) return 'El tipo de documento no es válido.'
  if (typeof d.numeroDocumento !== 'string' || !/^\d{5,20}$/.test(d.numeroDocumento.trim())) return 'El número de documento debe tener entre 5 y 20 dígitos.'
  if (typeof d.correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim()) || d.correo.length > 150) return 'El correo electrónico no es válido.'
  if (d.telefono && !/^\+?[0-9\s]{7,20}$/.test(d.telefono)) return 'El teléfono no es válido.'
  if (typeof d.redirigirA !== 'string' || !/^https?:\/\//.test(d.redirigirA)) return 'Falta la dirección de retorno de la invitación.'
  if (d.instructor?.fechaIngreso && !/^\d{4}-\d{2}-\d{2}$/.test(d.instructor.fechaIngreso)) return 'La fecha de ingreso no es válida.'
  if (d.fichaId != null && (!Number.isInteger(d.fichaId) || d.rol !== 'aprendiz')) return 'La ficha no es válida.'
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return error(405, 'Método no permitido.')

  const url = Deno.env.get('SUPABASE_URL')!
  const llaveServicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, llaveServicio, { auth: { persistSession: false, autoRefreshToken: false } })

  // 1. ¿Quién llama? Administrador activo, o instructor activo (solo aprendices de sus fichas)
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return error(401, 'Debe iniciar sesión.')
  const { data: llamador, error: errorLlamador } = await admin.auth.getUser(token)
  if (errorLlamador || !llamador.user) return error(401, 'La sesión no es válida. Inicie sesión de nuevo.')
  const { data: perfilLlamador } = await admin.from('perfiles').select('rol, estado').eq('id', llamador.user.id).maybeSingle()
  const rolLlamador = perfilLlamador?.rol as Rol | undefined
  if ((rolLlamador !== 'administrador' && rolLlamador !== 'instructor') || perfilLlamador?.estado !== 'activo') {
    return error(403, 'Solo un administrador o instructor activo puede registrar usuarios.')
  }

  // 2. Validación de los datos
  let d: Solicitud
  try {
    d = await req.json()
  } catch {
    return error(400, 'La solicitud no tiene un formato válido.')
  }
  const invalido = validar(d)
  if (invalido) return error(400, invalido)
  const correo = d.correo.trim().toLowerCase()
  const documento = d.numeroDocumento.trim()

  // 2b. HU02.2 — El instructor solo registra aprendices en una ficha activa a su cargo
  let sedeFicha: number | null = null
  if (rolLlamador === 'instructor') {
    if (d.rol !== 'aprendiz') return error(403, 'El instructor solo puede registrar aprendices.')
    if (d.fichaId == null) return error(400, 'Seleccione la ficha en la que se registrará el aprendiz.')
  }
  if (d.fichaId != null) {
    const { data: ficha } = await admin.from('fichas').select('id, estado, sede_id, instructor_lider_id').eq('id', d.fichaId).maybeSingle()
    if (!ficha) return error(400, 'La ficha seleccionada no existe.')
    if (ficha.estado !== 'activa') return error(409, 'Solo se pueden registrar aprendices en fichas activas.')
    if (rolLlamador === 'instructor' && ficha.instructor_lider_id !== llamador.user.id) {
      const { count } = await admin
        .from('ficha_instructores')
        .select('id', { count: 'exact', head: true })
        .eq('ficha_id', ficha.id)
        .eq('instructor_id', llamador.user.id)
      if (!count) return error(403, 'Solo puede registrar aprendices en las fichas a su cargo.')
    }
    sedeFicha = ficha.sede_id
  }

  // 3. Unicidad de correo y documento (mensaje claro en lugar del error del trigger)
  const { data: existentes } = await admin
    .from('perfiles')
    .select('correo, tipo_documento, numero_documento')
    .or(`correo.eq."${correo}",and(tipo_documento.eq.${d.tipoDocumento},numero_documento.eq.${documento})`)
  if (existentes?.some((p) => p.correo === correo)) return error(409, 'Ya existe un usuario registrado con ese correo electrónico.')
  if (existentes?.length) return error(409, 'Ya existe un usuario registrado con ese tipo y número de documento.')

  // 4. Invitación: crea la cuenta y envía el correo para que elija su contraseña.
  //    Los datos personales viajan en user_metadata; el trigger fn_crear_perfil_nuevo_usuario crea el perfil.
  const { data: invitado, error: errorInvitacion } = await admin.auth.admin.inviteUserByEmail(correo, {
    redirectTo: d.redirigirA,
    data: {
      nombres: d.nombres.trim(),
      apellidos: d.apellidos.trim(),
      tipo_documento: d.tipoDocumento,
      numero_documento: documento,
      telefono: d.telefono?.trim() || null,
    },
  })
  if (errorInvitacion || !invitado.user) {
    const limite = errorInvitacion?.message?.toLowerCase().includes('rate')
    return error(
      limite ? 429 : 500,
      limite
        ? 'Se alcanzó el límite de correos de Supabase. Espere unos minutos o configure un servidor SMTP propio.'
        : `No fue posible enviar la invitación: ${errorInvitacion?.message ?? 'error desconocido'}`,
    )
  }
  const id = invitado.user.id

  // 5. Rol (app_metadata + perfil), sede y datos de instructor. Si algo falla, se deshace la cuenta.
  try {
    const { error: e1 } = await admin.auth.admin.updateUserById(id, { app_metadata: { rol: d.rol } })
    if (e1) throw e1
    const { error: e2 } = await admin.from('perfiles').update({ rol: d.rol, sede_id: rolLlamador === 'instructor' ? sedeFicha : (d.sedeId ?? sedeFicha) }).eq('id', id)
    if (e2) throw e2
    if (d.rol === 'instructor') {
      // La fila en "instructores" la crea el trigger fn_sincronizar_instructor al fijar el rol
      const { error: e3 } = await admin
        .from('instructores')
        .update({
          area_id: d.instructor?.areaId ?? null,
          especialidad: d.instructor?.especialidad?.trim() || null,
          fecha_ingreso: d.instructor?.fechaIngreso || null,
        })
        .eq('id', id)
      if (e3) throw e3
    }
    if (d.fichaId != null) {
      const { error: e4 } = await admin.from('matriculas').insert({ ficha_id: d.fichaId, aprendiz_id: id })
      if (e4) throw e4
    }
  } catch (e) {
    await admin.auth.admin.deleteUser(id)
    return error(500, `No fue posible completar el registro y se deshizo la cuenta: ${(e as Error).message}`)
  }

  // 6. Bitácora (RF19): quién invitó a quién
  await admin.from('bitacora').insert({
    usuario_id: llamador.user.id,
    rol: rolLlamador,
    modulo: 'usuarios',
    accion: 'registro',
    tabla: 'perfiles',
    registro_id: id,
    detalle: `Invitó a ${d.nombres.trim()} ${d.apellidos.trim()} (${correo}) con el rol ${d.rol}${d.fichaId != null ? ` y lo matriculó en la ficha ${d.fichaId}` : ''}`,
    resultado: 'exito',
  })

  return responder(200, { ok: true, id, correo })
})
