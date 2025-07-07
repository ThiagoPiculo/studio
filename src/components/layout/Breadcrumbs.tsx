
"use client";

import { useEffect, useState, useMemo } from 'react';
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
  heroes: 'Mini Herois',
  agenda: 'Agenda dos Herois',
  manage: 'Gerenciar',
  family: 'Aliança',
  missions: 'Central de Missões',
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
  'school-schedule': 'Agenda Escolar',
  child: 'child' // placeholder for logic
};

const nonClickableStaticSegments = ['edit', 'manage', 'new', 'edit-template'];

const titleCase = (str: string) => {
    return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  // We stringify the params object to create a stable dependency for useEffect.
  // This prevents the "params are being enumerated" error with Next.js App Router's proxy object.
  const paramsString = useMemo(() => JSON.stringify(params), [params]);

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      // We parse the stringified params back into an object for use.
      const currentParams = JSON.parse(paramsString);

      const pathSegments = pathname.split('/').filter(Boolean);
      
      const crumbPromises = pathSegments.map(async (segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
        let label = pathTranslations[segment] || titleCase(segment);
        const isLoading = false;
        
        // This is a dynamic segment, so we fetch data
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

        // Skip structural segments like 'child' from appearing
        if (segment === 'child') {
            return null;
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

  if (!pathname.startsWith('/dashboard')) return null;

  return (
    <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        {breadcrumbs.map((crumb, index) => {
           if (!crumb || !crumb.href) return null;

           const isLast = index === breadcrumbs.length - 1;
           
           // A segment is non-clickable if it's the last one, or if it's a static "action" word.
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
