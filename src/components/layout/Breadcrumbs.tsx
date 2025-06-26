
"use client";

import { useEffect, useState, Fragment } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getChildProfileById, getMissionTemplateById, getRewardTemplateById } from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface Breadcrumb {
  label: string;
  href: string;
  isLoading?: boolean;
}

const pathTranslations: { [key: string]: string } = {
  dashboard: 'Painel',
  child: 'Mini Herois',
  manage: 'Gerenciar',
  family: 'Família',
  missions: 'Missões',
  rewards: 'Recompensas',
  profile: 'Meu Perfil',
  settings: 'Configurações',
  onboarding: 'Adicionar Herói',
  new: 'Criar',
  edit: 'Editar',
  'edit-template': 'Editar Catálogo',
  ideas: 'Ideias',
  suggest: 'Sugerir com IA',
  tasks: 'Tarefas',
};

const titleCase = (str: string) => {
    return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean);

    const generateBreadcrumbs = async () => {
      const homeCrumb = { label: 'Painel', href: '/dashboard' };
      const newCrumbs: Breadcrumb[] = [homeCrumb];

      if (pathSegments.length <= 1) {
          setBreadcrumbs([]);
          return;
      }

      let currentPath = '';

      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        currentPath += `/${segment}`;
        
        if (segment === 'dashboard') continue;

        let label = pathTranslations[segment] || titleCase(segment);
        const tempCrumb = { label: '...', href: currentPath, isLoading: true };

        if (params.childId && segment === params.childId) {
          newCrumbs.push(tempCrumb);
          setBreadcrumbs([...newCrumbs]);
          const child = await getChildProfileById(params.childId as string);
          label = child?.name || 'Herói';
        } else if (params.missionId && segment === params.missionId) {
          newCrumbs.push(tempCrumb);
          setBreadcrumbs([...newCrumbs]);
          const mission = await getMissionTemplateById(params.missionId as string);
          label = mission?.title || 'Missão';
        } else if (params.templateId && segment === params.templateId) {
            newCrumbs.push(tempCrumb);
            setBreadcrumbs([...newCrumbs]);
            const template = await getRewardTemplateById(params.templateId as string);
            label = template?.title || 'Recompensa';
        } else if (params.rewardId && segment === params.rewardId) { // Fallback for old route
            newCrumbs.push(tempCrumb);
            setBreadcrumbs([...newCrumbs]);
            const template = await getRewardTemplateById(params.rewardId as string);
            label = template?.title || 'Recompensa';
        }

        const finalCrumb = { label, href: currentPath, isLoading: false };
        const existingCrumbIndex = newCrumbs.findIndex(c => c.href === currentPath);
        
        if (existingCrumbIndex !== -1) {
          newCrumbs[existingCrumbIndex] = finalCrumb;
        } else {
          newCrumbs.push(finalCrumb);
        }
        setBreadcrumbs([...newCrumbs]);
      }
    };

    generateBreadcrumbs();
  }, [pathname, params]);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className="mb-6 text-sm text-muted-foreground">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center space-x-1.5">
            {crumb.isLoading ? (
              <Skeleton className="h-5 w-24" />
            ) : index < breadcrumbs.length - 1 ? (
              <Link href={crumb.href} className="hover:text-primary transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            )}

            {index < breadcrumbs.length - 1 && (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
