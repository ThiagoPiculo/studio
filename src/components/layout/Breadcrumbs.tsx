
"use client";

import { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getChildProfileById, getMissionTemplateById, getRewardTemplateById } from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFamily } from '@/contexts/FamilyContext';

interface Breadcrumb {
  label: string;
  href: string;
  isLoading?: boolean;
}

const pathTranslations: { [key: string]: string } = {
  dashboard: 'Painel',
  agenda: 'Agenda',
  manage: 'Gerenciar',
  family: 'Aliança',
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

const nonClickableStaticSegments = ['edit', 'manage', 'new', 'edit-template'];
const structuralSegmentsToSkip = ['child'];

const titleCase = (str: string) => {
    return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  const { currentContext, availableContexts, isLoading: isFamilyLoading } = useFamily();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      const pathSegments = pathname.split('/').filter(Boolean);

      let initialCrumbs: Breadcrumb[] = [];

      // 1. Determine the root breadcrumb based on context
      if (isFamilyLoading) {
        initialCrumbs.push({ label: '...', href: '#', isLoading: true });
      } else {
        const contextData = availableContexts.find(c => c.id === currentContext);
        if (contextData) {
          if (contextData.id === 'my-space') {
            initialCrumbs.push({ label: 'Meu Espaço', href: '/dashboard', isLoading: false });
          } else {
            initialCrumbs.push({ label: `Aliança: ${contextData.name}`, href: '/dashboard/family', isLoading: false });
          }
        } else {
          initialCrumbs.push({ label: '...', href: '#', isLoading: true });
        }
      }

      // If we are at a root page, we're done.
      if (pathname === '/dashboard' || (pathname === '/dashboard/family' && currentContext !== 'my-space')) {
        setBreadcrumbs(initialCrumbs);
        return;
      }
      
      // 2. Build the rest of the breadcrumbs
      const remainingSegments = pathSegments.slice(1);
      const promises = remainingSegments.map(async (segment, index) => {
        if (structuralSegmentsToSkip.includes(segment)) return null;

        if (segment === 'family' && currentContext !== 'my-space') {
          return null;
        }

        const currentCrumbPath = `/${pathSegments.slice(0, index + 2).join('/')}`;
        let label = pathTranslations[segment] || titleCase(segment);
        const crumb: Breadcrumb = { label, href: currentCrumbPath, isLoading: false };
        
        if (params.childId && segment === params.childId) {
          crumb.isLoading = true;
          const child = await getChildProfileById(segment);
          crumb.label = child?.name || 'Herói';
          crumb.href = `/dashboard/child/${segment}/manage`;
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
        } else if (params.rewardId && segment === params.rewardId) { 
          crumb.isLoading = true;
          const template = await getRewardTemplateById(segment);
          crumb.label = template?.title || 'Recompensa';
          crumb.isLoading = false;
        }

        return crumb;
      });
      
      const resolvedCrumbs = (await Promise.all(promises)).filter(Boolean) as Breadcrumb[];
      setBreadcrumbs([...initialCrumbs, ...resolvedCrumbs]);
    };

    generateBreadcrumbs();
  }, [pathname, params, currentContext, availableContexts, isFamilyLoading]);

  return (
    <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
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
