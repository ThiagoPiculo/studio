
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function GuardiaoDoDescansoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={cn("lucide lucide-guardiao-descanso", props.className)}
    >
      <g strokeWidth="1.5">
        {/* Cama */}
        <rect x="5" y="12" width="14" height="5" rx="1" fill="#4dd0e1" stroke="#26c6da" />
        <path d="M5 12V18" stroke="#26c6da" strokeLinecap="round" />
        <path d="M19 12V18" stroke="#26c6da" strokeLinecap="round" />

        {/* Colchão */}
        <rect x="5" y="14" width="14" height="2" fill="#f48fb1" stroke="none" />

        {/* Cobertor */}
        <path d="M5 14 Q 12 11, 19 14 V 12 H 5 Z" fill="#81d4fa" stroke="#4fc3f7" />

        {/* Cabeça */}
        <circle cx="9" cy="11" r="1.5" fill="#81d4fa" stroke="#4fc3f7" />

        {/* Zzz */}
        <path d="M11 9 L 12 9 L 11 10 L 12 10" stroke="#4fc3f7" fill="none" strokeLinecap="round" />
        <path d="M13 8 L 14 8 L 13 9 L 14 9" stroke="#4fc3f7" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
