import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, Search, Star, UserPlus } from 'lucide-react'
import { AvatarIniciales, Badge, Button, EstadoError, Input, Modal, Spinner } from '@/components/ui'
import { Aviso } from '@/features/auth/Aviso'
import { ETIQUETA_DOCUMENTO } from '@/features/perfil/servicioPerfil'
import { useCarga } from '@/lib/useCarga'
import { cn } from '@/lib/utilidades'
import { esquemaAsignacion, type FormularioAsignacion } from './esquemas'
import { asignarInstructor, listarInstructoresDisponibles, type DetalleFicha } from './servicioFichas'

interface PropsAsignar {
  detalle: DetalleFicha
  onCerrar: () => void
  onGuardado: () => void
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * HU10.4 — Asignar uno o varios instructores a la ficha, por competencia, y designar al líder.
 * Se monta solo mientras está abierto (así consulta la lista de instructores al abrir).
 */
export function ModalAsignarInstructor({ detalle, onCerrar, onGuardado }: PropsAsignar) {
  const { ficha, competencias, instructores: asignados } = detalle
  const idFormulario = useId()
  const [busqueda, setBusqueda] = useState('')
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const disponibles = useCarga(listarInstructoresDisponibles, [])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormularioAsignacion>({
    resolver: zodResolver(esquemaAsignacion),
    defaultValues: { instructorId: '', competenciaIds: [], esLider: !ficha.instructorLiderId, fechaInicio: ficha.fechaInicio, fechaFin: ficha.fechaFin },
  })
  const instructorId = useWatch({ control, name: 'instructorId' })
  const seleccionadas = useWatch({ control, name: 'competenciaIds' })

  const lista = (disponibles.datos ?? []).filter((i) => {
    const texto = normalizar(busqueda.trim())
    return !texto || [`${i.nombres} ${i.apellidos}`, i.numeroDocumento, i.especialidad ?? '', i.area ?? ''].some((c) => normalizar(c).includes(texto))
  })
  const horasSeleccionadas = competencias.filter((c) => seleccionadas?.includes(String(c.id))).reduce((t, c) => t + (c.horas ?? 0), 0)

  async function guardar(v: FormularioAsignacion) {
    setErrorServidor(null)
    const r = await asignarInstructor(
      {
        fichaId: ficha.id,
        instructorId: v.instructorId,
        competenciaIds: v.competenciaIds.map(Number),
        fechaInicio: v.fechaInicio || null,
        fechaFin: v.fechaFin || null,
        esLider: v.esLider,
      },
      asignados,
    )
    if (!r.ok) return setErrorServidor(r.mensaje)
    onGuardado()
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      tamano="xl"
      codigo={`HU10.4 · Ficha ${ficha.numero}`}
      titulo="Asignar instructor a la ficha"
      descripcion="Vincule instructores a la ficha y defina las competencias que tendrán a cargo."
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} cargando={isSubmitting} icono={<CircleCheck className="size-4" aria-hidden />} disabled={!disponibles.datos}>
            Confirmar asignación
          </Button>
        </>
      }
    >
      <form id={idFormulario} noValidate onSubmit={handleSubmit(guardar)} className="space-y-6">
        {errorServidor && <Aviso tipo="error">{errorServidor}</Aviso>}

        {/* 1. Instructor */}
        <fieldset className="space-y-3">
          <legend className="mb-3 font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">1. Instructor del centro</legend>
          <Input
            etiqueta="Buscar instructor"
            etiquetaOculta
            type="search"
            placeholder="Buscar por nombre, documento, especialidad o área…"
            iconoIzquierda={<Search className="size-4" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {errors.instructorId && (
            <p role="alert" className="text-xs font-semibold text-alerta-critica">
              {errors.instructorId.message}
            </p>
          )}
          {disponibles.cargando ? (
            <Spinner texto="Cargando instructores…" />
          ) : disponibles.error ? (
            <EstadoError mensaje={disponibles.error} onReintentar={disponibles.recargar} />
          ) : lista.length === 0 ? (
            <p className="rounded-lg bg-fondo-seccion-alterna px-4 py-6 text-center text-sm text-texto-secundario">
              {disponibles.datos?.length ? 'Ningún instructor coincide con la búsqueda.' : 'No hay instructores activos registrados. Regístrelos en el módulo de Instructores.'}
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1" role="radiogroup" aria-label="Instructores disponibles">
              {lista.map((i) => {
                const marcado = instructorId === i.id
                const yaAsignado = asignados.some((a) => a.instructorId === i.id)
                return (
                  <label
                    key={i.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-primario/30',
                      marcado ? 'border-primario bg-primario/5' : 'border-borde hover:bg-fondo-seccion-alterna',
                    )}
                  >
                    <input type="radio" value={i.id} className="size-4 accent-primario" {...register('instructorId')} />
                    <AvatarIniciales nombres={i.nombres} apellidos={i.apellidos} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-texto-principal">
                          {i.nombres} {i.apellidos}
                        </span>
                        <span className="text-xs text-texto-secundario">
                          {ETIQUETA_DOCUMENTO[i.tipoDocumento]} {i.numeroDocumento}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-texto-secundario">
                        {[i.especialidad, i.area, i.correo].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {ficha.instructorLiderId === i.id ? (
                      <Badge tono="oliva" icono={<Star className="size-3" aria-hidden />}>
                        Líder
                      </Badge>
                    ) : (
                      yaAsignado && <Badge tono="informacion">Ya asignado</Badge>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </fieldset>

        {/* 2. Competencias */}
        <fieldset>
          <legend className="mb-1 flex w-full flex-wrap items-center justify-between gap-2 font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">
            2. Competencias a cargo
          </legend>
          <p className="mb-3 text-xs text-texto-secundario">
            {seleccionadas?.length
              ? `${seleccionadas.length} seleccionada(s)${horasSeleccionadas ? ` · ${horasSeleccionadas} horas` : ''}`
              : 'Si no selecciona ninguna, el instructor queda vinculado a la ficha sin competencia específica.'}
          </p>
          {competencias.length === 0 ? (
            <p className="text-sm text-texto-secundario">El programa de esta ficha no tiene competencias registradas.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {competencias.map((c) => (
                <label key={c.id} className="flex cursor-pointer gap-3 rounded-xl border border-borde p-3 hover:bg-fondo-seccion-alterna has-checked:border-primario has-checked:bg-primario/5">
                  <input type="checkbox" value={String(c.id)} className="mt-0.5 size-4 accent-primario" {...register('competenciaIds')} />
                  <span className="text-sm">
                    <span className="block font-semibold text-texto-principal">
                      {c.codigo} · {c.nombre}
                    </span>
                    <span className="text-xs text-texto-secundario">
                      {c.horas ? `${c.horas} h · ` : ''}
                      {c.instructores.length ? `Asignada a: ${c.instructores.join(', ')}` : 'Sin instructor asignado'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {/* 3. Rol y vigencia */}
        <fieldset className="space-y-4">
          <legend className="mb-3 font-titulos text-sm font-semibold tracking-wide text-texto-principal uppercase">3. Rol y vigencia de la asignación</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-borde p-3 has-checked:border-estado-activo has-checked:bg-estado-activo/5">
            <input type="checkbox" className="mt-0.5 size-4 accent-primario" {...register('esLider')} />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-texto-principal">
                <Star className="size-4 text-estado-activo" aria-hidden /> Designar como instructor líder
              </span>
              <span className="text-xs text-texto-secundario">
                {ficha.instructorLider ? `Reemplaza al líder actual: ${ficha.instructorLider}.` : 'La ficha no tiene líder: se recomienda designarlo.'}
              </span>
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input etiqueta="Inicio de la asignación" type="date" {...register('fechaInicio')} />
            <Input etiqueta="Fin de la asignación" type="date" error={errors.fechaFin?.message} {...register('fechaFin')} />
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-informacion/5 px-3 py-2 text-xs text-texto-apoyo">
            <UserPlus className="mt-0.5 size-4 shrink-0 text-informacion" aria-hidden />
            Al confirmar, el instructor podrá consultar la ficha, registrar asistencia de sus aprendices y revisar justificaciones. La acción queda en la bitácora.
          </p>
        </fieldset>
      </form>
    </Modal>
  )
}
