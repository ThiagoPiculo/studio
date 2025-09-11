
"use client";
import type { ReactNode } from 'react';
import { FamilyProvider } from '@/contexts/FamilyContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // This layout now serves only as a provider wrapper for all dashboard routes.
  // The UI-specific layouts are handled by the route groups ((parent) and (child)).
  return (
    <FamilyProvider>
      {children}
    </FamilyProvider>
  );
}
