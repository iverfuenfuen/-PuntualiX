import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Mail, Send, UserCheck, UserPlus } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Card, CardBody, CardHeader, clasesBoton, EstadoError, Input, Select, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { buscarAprendiz, listarFichas, type AprendizEncontrado } from '@/features/fichas/servicioFichas'
import { esquemaRegistroAprendiz, type FormularioRegistroAprendiz } from '@/features/usuarios/esquemas'
import { invitarUsuario } from '@/features/usuarios/servicioUsuarios'
import { useCarga } from '@/lib/useCarga'
import { ETIQUETA_TIPO_DOCUMENTO } from '@/types/dominio'

const TIPOS = (['CC', 'TI'] as const).map((t) => ({ valor: t, etiqueta: `${ETIQUETA_TIPO_DOCUMENTO[t]} (${t})` }))
const VACIO: FormularioRegistroAprendiz = { tipoDocumento: 'CC', numeroDocumento: '', nombres: '', apellidos: '', correo: '', telefono: '', fichaId: '' }

/**
 * HU02.2 — Registrar aprendiz (VersionAntigua: Instructor/fichas/registrarAprendiz.html).
 * "Datos del aprendiz" + "Asignación a ficha". La cuenta se crea por invitación (Edge Function invitar-usuario) y queda
 * matriculada en la ficha elegida. Flujo alterno: si el documento ya está registrado se muestra "Aprendiz ya registrado".
 */
export function PaginaRegistrarAprendiz() {
  const navegar = useNavigate()
  const [parametros] = useSearchParams()
  const fichas = useCarga(listarFichas, [])
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [existente, setExistente] = useState<{ aprendiz: AprendizEncontrado; fichaId: number } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormularioRegistroAprendiz>({
    resolver: zodResolver(esquemaRegistroAprendiz),
    defaultValues: { ...VACIO, fichaId: parametros.get('ficha') ?? '' },
  })

  // Solo fichas activas: la Edge Function no matricula en fichas inactivas
  const activas = useMemo(() => (fichas.datos ?? []).filter((f) => f.estado === 'activa'), [fichas.datos])
  const fichaId = useWatch({ control, name: 'fichaId' })
  const fichaElegida = activas.find((f) => String(f.id) === fichaId)

  async function registrar(v: FormularioRegistroAprendiz) {
    setErrorServidor(null)
    setExistente(null)
    const id = Number(v.fichaId)
    const busqueda = await buscarAprendiz(v.tipoDocumento, v.numeroDocumento, id)
    if (!busqueda.ok) return setErrorServidor(busqueda.mensaje)
    if (busqueda.datos) return setExistente({ aprendiz: busqueda.datos, fichaId: id })

    const r = await invitarUsuario({
      rol: 'aprendiz',
      nombres: v.nombres,
      apellidos: v.apellidos,
      tipoDocumento: v.tipoDocumento,
      numeroDocumento: v.numeroDocumento,
      correo: v.correo,
      telefono: v.telefono || null,
      sedeId: null,
      fichaId: id,
    })
    if (!r.ok) return setErrorServidor(r.mensaje)
    navegar(`/instructor/fichas/${id}?pestana=aprendices`, {
      state: { aviso: `${v.nombres.trim()} ${v.apellidos.trim()} quedó registrado y matriculado en la ficha ${fichaElegida?.numero ?? ''}. Recibirá una invitación por correo para crear su contraseña.` },
    })
  }

  const destinoExistente = existente
    ? existente.aprendiz.fichaActiva && activas.some((f) => f.id === existente.aprendiz.fichaActiva?.id)
      ? `/instructor/fichas/${existente.aprendiz.fichaActiva.id}/aprendices/${existente.aprendiz.id}`
      : `/instructor/fichas/${existente.fichaId}?pestana=aprendices`
    : ''

  return (
    <>
      <Breadcrumbs
        migas={[
          { etiqueta: 'Inicio', ruta: '/instructor' },
          { etiqueta: 'Fichas', ruta: '/instructor/fichas' },
          { etiqueta: 'Registrar aprendiz' },
        ]}
      />
      <PageHeader titulo="Registrar aprendiz" icono={UserPlus} descripcion="Registre un nuevo aprendiz y asígnelo a una de sus fichas de formación." />

      {fichas.error ? (
        <Card>
          <EstadoError mensaje={fichas.error} onReintentar={fichas.recargar} />
        </Card>
      ) : fichas.cargando || !fichas.datos ? (
        <Card>
          <Spinner texto="Cargando fichas…" />
        </Card>
      ) : (
        <form noValidate onSubmit={handleSubmit(registrar)} className="space-y-6">
          {errorServidor && <Aviso tipo="error">{errorServidor}</Aviso>}

          {existente && (
            <Card>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 size-5 shrink-0 text-informacion" aria-hidden />
                  <div>
                    <p className="font-titulos font-semibold text-texto-principal">Aprendiz ya registrado</p>
                    <p className="text-sm text-texto-apoyo">
                      El aprendiz que intenta registrar ya se encuentra registrado en el sistema ({existente.aprendiz.nombres} {existente.aprendiz.apellidos}).
                      {!existente.aprendiz.fichaActiva && ' Puede matricularlo desde la pestaña Aprendices de la ficha.'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link to={destinoExistente} className={clasesBoton('primario')}>
                    Ver aprendiz
                  </Link>
                  <Button variante="secundario" onClick={() => setExistente(null)}>
                    Cerrar
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader titulo="Datos del aprendiz" descripcion="Completa los campos para registrar un nuevo aprendiz en el sistema." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Select etiqueta="Tipo de documento" requerido opciones={TIPOS} error={errors.tipoDocumento?.message} {...register('tipoDocumento')} />
              <Input etiqueta="Número de documento" requerido inputMode="numeric" placeholder="Ej: 1005234567" error={errors.numeroDocumento?.message} {...register('numeroDocumento')} />
              <Input etiqueta="Nombres" requerido autoComplete="off" placeholder="Nombres completos" error={errors.nombres?.message} {...register('nombres')} />
              <Input etiqueta="Apellidos" requerido autoComplete="off" placeholder="Apellidos completos" error={errors.apellidos?.message} {...register('apellidos')} />
              <Input
                etiqueta="Correo electrónico"
                requerido
                type="email"
                autoComplete="off"
                placeholder="correo@ejemplo.com"
                iconoIzquierda={<Mail className="size-4" />}
                ayuda="A este correo llegará la invitación para crear su contraseña."
                error={errors.correo?.message}
                {...register('correo')}
              />
              <Input etiqueta="Teléfono" type="tel" placeholder="Ej: 3001234567" error={errors.telefono?.message} {...register('telefono')} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader titulo="Asignación a ficha" descripcion="Selecciona la ficha a la que será asignado el aprendiz." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Select
                etiqueta="Ficha"
                requerido
                placeholder="Seleccionar ficha"
                opciones={activas.map((f) => ({ valor: String(f.id), etiqueta: `${f.numero} — ${f.programa}` }))}
                error={errors.fichaId?.message}
                ayuda={activas.length === 0 ? 'No tiene fichas activas a su cargo.' : undefined}
                {...register('fichaId')}
              />
              {/* El programa sale de la ficha: se muestra, no se elige aparte (un solo lugar por dato) */}
              <Input etiqueta="Programa" value={fichaElegida?.programa ?? ''} placeholder="Se toma de la ficha seleccionada" readOnly />
            </CardBody>
          </Card>

          <p className="flex items-start gap-2 rounded-xl border border-informacion/25 bg-informacion/5 p-4 text-sm text-texto-apoyo">
            <Info className="mt-0.5 size-4 shrink-0 text-informacion" aria-hidden />
            Verifica que los datos sean correctos antes de registrar. El aprendiz recibirá un correo de confirmación para crear su contraseña y activar su cuenta.
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variante="secundario"
              disabled={isSubmitting}
              onClick={() => {
                reset(VACIO)
                setErrorServidor(null)
                setExistente(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" cargando={isSubmitting} icono={<Send className="size-4" aria-hidden />} disabled={activas.length === 0}>
              Registrar aprendiz
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
