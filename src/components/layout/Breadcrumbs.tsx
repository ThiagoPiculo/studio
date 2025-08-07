
"use client";

import { useEffect, useState } from 'react';
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
  dashboard: 'Painel de Progressos',
  heroes: 'Resumo do Dia',
  mural: 'Mural Completo',
  agenda: 'Rotina de Missões',
  family: 'Aliança de Herois',
  missions: 'Quadro de Missões',
  rewards: 'Quadro de Recompensas',
  achievements: 'Quadro de Medalhas',
  profile: 'Meu Perfil',
  settings: 'Configurações',
  onboarding: 'Novo Mini Herói',
  new: 'Criar',
  edit: 'Editar',
  'edit-template': 'Editar Catálogo',
  ideas: 'Ideias',
  suggest: 'Sugerir com IA',
  tasks: 'Tarefas',
  'school-schedule': 'Rotina Escolar',
};

const nonClickableStaticSegments = ['edit', 'new', 'edit-template'];

const titleCase = (str: string) => {
    return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const paramsString = JSON.stringify(useParams());
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      const currentParams = JSON.parse(paramsString);
      const pathSegments = pathname.split('/').filter(Boolean);
      
      const relevantSegments = pathSegments[0] === 'dashboard' ? pathSegments.slice(1) : pathSegments;

      if (pathname === '/dashboard') {
          setBreadcrumbs([{ label: 'Visão Geral', href: '/dashboard' }]);
          return;
      }

      const crumbPromises = relevantSegments.map(async (segment, index) => {
        const href = `/dashboard/${relevantSegments.slice(0, index + 1).join('/')}`;
        let label = pathTranslations[segment] || titleCase(segment);
        const isLoading = false;
        
        if (currentParams.childId && segment === currentParams.childId) {
            const child = await getChildProfileById(segment);
            return { label: child?.name || "Herói", href, isLoading: !child };
        }
        if (currentParams.missionId && segment === currentParams.missionId) {
             const mission = await getMissionTemplateById(segment);
             return { label: mission?.title || "Missão", href, isLoading: !mission };
        }
        if (currentParams.templateId && segment === currentParams.templateId) {
             const template = await getRewardTemplateById(segment);
             return { label: template?.title || "Recompensa", href, isLoading: !template };
        }
        if (currentParams.rewardId && segment === currentParams.rewardId) {
             const template = await getRewardTemplateById(segment);
             return { label: template?.title || "Recompensa", href, isLoading: !template };
        }

        return { label, href, isLoading };
      });
      
      const resolvedCrumbs = (await Promise.all(crumbPromises)).filter(Boolean) as Breadcrumb[];
      setBreadcrumbs(resolvedCrumbs);
    };

    if (pathname.startsWith('/dashboard')) {
        generateBreadcrumbs();
    }
  }, [pathname, paramsString]);

  if (!pathname.startsWith('/dashboard') || breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="breadcrumb" className="hidden md:block text-sm text-muted-foreground">
      <ol className="flex items-center space-x-1.5">
        {breadcrumbs.map((crumb, index) => {
           if (!crumb || !crumb.href) return null;

           const isLast = index === breadcrumbs.length - 1;
           
           const lastSegmentOfCrumb = crumb.href.split('/').pop() || '';
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
