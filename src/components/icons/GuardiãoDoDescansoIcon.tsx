
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
        <path d="M2 18v-2a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v2" />
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
        <path d="M12 7V5" />
        <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M16 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  );
}
