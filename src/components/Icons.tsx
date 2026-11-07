import { BookOpen, ChartLineUp, GlobeHemisphereEast, Lightning, MapPin, Plant, Star, Waves } from '@phosphor-icons/react'
import { SectionId } from '../store'

const ICONS = { home: Star, explorer: GlobeHemisphereEast, ocean: Waves, monitor: Plant, events: Lightning, observatory: ChartLineUp, region: MapPin, sources: BookOpen }

export default function Icon({ id, size = 22 }: { id: SectionId; size?: number }) {
  const I = ICONS[id]
  return <I size={size} weight="light" aria-hidden="true" />
}
