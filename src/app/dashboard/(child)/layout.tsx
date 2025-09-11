
import type { ReactNode } from 'react';

// Minimalist layout for the child's authenticated area.
// It ensures no parent-facing navigation or sidebars are rendered.
export default function ChildDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
        {children}
    </>
  );
}
