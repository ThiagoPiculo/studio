"use client";
import type { ReactNode } from 'react';

// Este layout de grupo agora serve apenas como um wrapper estrutural.
// A lógica de proteção de rota foi centralizada no layout filho 
// para evitar loops de redirecionamento durante a inicialização do estado de autenticação.
export default function ChildRouteGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
