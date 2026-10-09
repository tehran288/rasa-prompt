import {
  Briefcase,
  Clapperboard,
  Code2,
  GraduationCap,
  Megaphone,
  Palette,
  PenLine,
  Workflow,
} from "lucide-react";
import type { CategoryIcon as Key } from "@/lib/catalog-types";

const MAP = {
  megaphone: Megaphone,
  pen: PenLine,
  palette: Palette,
  clapper: Clapperboard,
  code: Code2,
  workflow: Workflow,
  briefcase: Briefcase,
  graduation: GraduationCap,
} as const;

export function CategoryIcon({ icon, size = 20 }: { icon: Key; size?: number }) {
  const I = MAP[icon] ?? PenLine;
  return <I size={size} aria-hidden="true" strokeWidth={1.8} />;
}
