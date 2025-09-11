
"use client";
import type { ReactNode } from 'react';
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { FamilyProvider } from '@/contexts/FamilyContext';

// This is the root layout for the entire /dashboard section.
// It should not contain any visible UI elements itself.
// Its purpose is to provide context and allow child layouts
// (like from route groups) to define the actual UI.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <FamilyProvider>
        {children}
    </FamilyProvider>
  );
}
