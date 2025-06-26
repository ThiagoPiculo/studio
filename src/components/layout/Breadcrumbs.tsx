
"use client";

import { useEffect, useState, Fragment } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getChildProfileById, getMissionTemplateById, getRewardTemplateById } from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href: string;
  isLoading?: boolean;
}

const pathTranslations: { [key: string]: string } = {
  dashboard: 'Painel',
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

// Segments that should appear as text but not be clickable links
const nonClickableStaticSegments = ['edit', 'manage', 'new', 'edit-template'];
// Segments that are purely for folder structure and should be ignored completely
const structuralSegmentsToSkip = ['child'];

const titleCase = (str: string) => {
    return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      const pathSegments = pathname.split('/').filter(Boolean);

      if (pathSegments.length <= 1) {
          setBreadcrumbs([]);
          return;
      }
      
      const newCrumbs: Breadcrumb[] = [{ label: 'Painel', href: '/dashboard' }];
      let pathSoFar = '/dashboard';
      let crumbsToUpdate: Breadcrumb[] = [];

      const promises = pathSegments.map(async (segment, index) => {
        if (index === 0) return null; // Skip 'dashboard' segment

        pathSoFar += `/${segment}`;

        if (structuralSegmentsToSkip.includes(segment)) {
          return null;
        }

        let label = pathTranslations[segment] || titleCase(segment);
        const currentPath = pathSoFar;
        const crumb: Breadcrumb = { label, href: currentPath, isLoading: false };

        if (params.childId && segment === params.childId) {
          crumb.isLoading = true;
          const child = await getChildProfileById(segment);
          crumb.label = child?.name || 'Herói';
          crumb.isLoading = false;
        } else if (params.missionId && segment === params.missionId) {
          crumb.isLoading = true;
          const mission = await getMissionTemplateById(segment);
          crumb.label = mission?.title || 'Missão';
          crumb.isLoading = false;
        } else if (params.templateId && segment === params.templateId) {
          crumb.isLoading = true;
          const template = await getRewardTemplateById(segment);
          crumb.label = template?.title || 'Recompensa';
          crumb.isLoading = false;
        } else if (params.rewardId && segment === params.rewardId) { // Fallback for old route
          crumb.isLoading = true;
          const template = await getRewardTemplateById(segment);
          crumb.label = template?.title || 'Recompensa';
          crumb.isLoading = false;
        }

        return crumb;
      });

      // Set initial loading state
      const initialCrumbs = [
        { label: 'Painel', href: '/dashboard' },
        ...pathSegments.slice(1)
          .filter(seg => !structuralSegmentsToSkip.includes(seg))
          .map(seg => ({ label: '...', href: '#', isLoading: true }))
      ];
      setBreadcrumbs(initialCrumbs);
      
      const resolvedCrumbs = (await Promise.all(promises)).filter(Boolean) as Breadcrumb[];
      setBreadcrumbs([{ label: 'Painel', href: '/dashboard' }, ...resolvedCrumbs]);
    };

    generateBreadcrumbs();
  }, [pathname, params]);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className="mb-6 text-sm text-muted-foreground">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        {breadcrumbs.map((crumb, index) => {
           if (!crumb || !crumb.href) return null;

           const isLast = index === breadcrumbs.length - 1;
           const segments = crumb.href.split('/');
           const lastSegmentOfCrumb = segments[segments.length - 1];
           
           const shouldBeLink = !isLast && !nonClickableStaticSegments.includes(lastSegmentOfCrumb);

           return (
              <li key={crumb.href + index} className="flex items-center space-x-1.5">
                {crumb.isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : shouldBeLink ? (
                  <Link href={crumb.href} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {crumb.label}
                  </span>
                )}

                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </li>
           )
        })}
      </ol>
    </nav>
  );
}
