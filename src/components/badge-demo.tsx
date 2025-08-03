import { Badge } from "@/components/ui/badge"

export function BadgeDefault() {
  return <Badge>Label</Badge>
}

export function BadgeSecondary() {
  return <Badge variant="secondary">New</Badge>
}

export function BadgeOutline() {
  return <Badge variant="outline">Deprecated</Badge>
}

export function BadgeDestructive() {
  return <Badge variant="destructive">Error</Badge>
}
