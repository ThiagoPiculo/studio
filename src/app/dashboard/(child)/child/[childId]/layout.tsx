
'use client';

import { ChildBottomNavbar } from '@/components/dashboard/child/ChildBottomNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loading from './loading';

export default function ChildDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const { childProfile, isChildAuthenticated, loading: authLoading, logout } = useAuth();

  const childId = params.childId as string;

  useEffect(() => {
    // Aguarda o fim do carregamento da autenticação para evitar race conditions
    if (authLoading) {
      return;
    }

    // Se, após o carregamento, não for uma criança autenticada, desloga e redireciona.
    if (!isChildAuthenticated) {
      logout(); // Limpa a sessão
      router.replace('/dashboard/child-login');
      return;
    }

    // Se o perfil da criança autenticada não corresponder ao da URL, redireciona para a página correta.
    if (childProfile && childProfile.id !== childId) {
      router.replace(`/dashboard/child/${childProfile.id}`);
    }
    
  }, [childId, childProfile, isChildAuthenticated, authLoading, router, logout]);

  // Exibe a tela de carregamento enquanto a autenticação está sendo verificada
  // ou se o perfil da criança ainda não corresponde ao da URL.
  if (authLoading || (isChildAuthenticated && childProfile?.id !== childId)) {
    return <Loading />;
  }

  // Se o usuário não for uma criança autenticada após o carregamento, não renderiza o conteúdo
  if (!isChildAuthenticated) {
    return null;
  }

  return (
    <>
      <main className="flex-1">{children}</main>
      <ChildBottomNavbar childId={childId} />
    </>
  );
}
