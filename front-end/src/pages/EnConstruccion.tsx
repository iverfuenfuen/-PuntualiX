import type { LucideIcon } from 'lucide-react'
import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, EmptyState } from '@/components/ui'

interface PropsEnConstruccion {
  titulo: string
  icono: LucideIcon
  etapa: number
}

/** Marcador de las pantallas que aún no se han migrado. Indica en qué etapa del plan se construyen. */
export function EnConstruccion({ titulo, icono, etapa }: PropsEnConstruccion) {
  return (
    <>
      <PageHeader titulo={titulo} icono={icono} descripcion="Pantalla en proceso de migración desde VersionAntigua y el Prototipo." />
      <Card>
        <EmptyState
          icono={Hammer}
          titulo={`Se construye en la Etapa ${etapa}`}
          descripcion="La navegación, el encabezado y el pie ya son definitivos; el contenido de esta pantalla llegará en la etapa indicada."
        />
      </Card>
    </>
  )
}
