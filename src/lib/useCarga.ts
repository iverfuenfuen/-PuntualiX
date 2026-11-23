import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { MENSAJE_ERROR_GENERICO, type Resultado } from './resultado'

interface EstadoCarga<T> {
  datos: T | null
  /** Primera carga (sin datos todavía): mostrar Spinner */
  cargando: boolean
  /** Recarga en segundo plano tras guardar un cambio (los datos anteriores siguen visibles) */
  refrescando: boolean
  error: string | null
  recargar: () => void
}

/**
 * Ejecuta una consulta de un servicio y expone los estados de carga, error y datos (RNF: estados de cada pantalla).
 * Se vuelve a ejecutar cuando cambian las dependencias o al llamar a recargar().
 */
export function useCarga<T>(consultar: () => Promise<Resultado<T>>, dependencias: DependencyList): EstadoCarga<T> {
  const [estado, setEstado] = useState<{ datos: T | null; pendiente: boolean; error: string | null }>({ datos: null, pendiente: true, error: null })
  const [version, setVersion] = useState(0)
  const consultaActual = useRef(consultar)

  useEffect(() => {
    consultaActual.current = consultar
  })

  useEffect(() => {
    let vigente = true
    setEstado((e) => ({ ...e, pendiente: true, error: null }))
    consultaActual
      .current()
      .then((r) => {
        if (!vigente) return
        setEstado(r.ok ? { datos: r.datos, pendiente: false, error: null } : { datos: null, pendiente: false, error: r.mensaje })
      })
      .catch(() => {
        if (vigente) setEstado({ datos: null, pendiente: false, error: MENSAJE_ERROR_GENERICO })
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias las define quien llama
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  return {
    datos: estado.datos,
    cargando: estado.pendiente && estado.datos === null,
    refrescando: estado.pendiente && estado.datos !== null,
    error: estado.error,
    recargar,
  }
}
