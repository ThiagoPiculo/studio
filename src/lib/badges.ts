

import { Award, BedDouble, Compass, Crown, Gem, Puzzle, Repeat, Smile, Sparkles, Star, Stars, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { LucideProps } from 'lucide-react';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  color: string;
  goal?: number;
  progressType?: 'singleMissionStreak' | 'perfectStreak';
}

export interface BadgeCategory {
    title: string;
    items: Badge[];
}

export const predefinedBadgeCategories: BadgeCategory[] = [
    {
        title: "Iniciação e Primeiros Passos",
        items: [
            { id: 'hero_novato', title: 'Heroi Novato', description: 'Conclua sua primeira missão de qualquer tipo.', icon: Sparkles, color: '#4ade80' },
            { id: 'defensor_sorriso', title: 'Defensor do Sorriso', description: 'Complete a missão "Escovar os dentes".', icon: Smile, color: '#60a5fa' },
            { id: 'guardiao_descanso', title: 'Guardião do Descanso', description: 'Complete a missão "Arrumar a cama".', icon: BedDouble, color: '#a78bfa' },
        ]
    },
    {
        title: "Consistência e Hábitos",
        items: [
            { id: 'guardiao_rotina_bronze', title: 'Guardião da Rotina (Bronze)', description: '2 dias seguidos.', icon: Repeat, color: '#CD7F32', goal: 2, progressType: 'singleMissionStreak' },
            { id: 'guardiao_rotina_prata', title: 'Guardião da Rotina (Prata)', description: '4 dias seguidos.', icon: Repeat, color: '#C0C0C0', goal: 4, progressType: 'singleMissionStreak' },
            { id: 'guardiao_rotina_ouro', title: 'Guardião da Rotina (Ouro)', description: '6 dias seguidos.', icon: Repeat, color: '#FFD700', goal: 6, progressType: 'singleMissionStreak' },
            { id: 'semana_perfeita_bronze', title: 'Semana Perfeita (Bronze)', description: '7 dias perfeitos.', icon: Trophy, color: '#CD7F32', goal: 7, progressType: 'perfectStreak' },
            { id: 'semana_perfeita_prata', title: 'Semana Perfeita (Prata)', description: '15 dias perfeitos.', icon: Trophy, color: '#C0C0C0', goal: 15, progressType: 'perfectStreak' },
            { id: 'semana_perfeita_ouro', title: 'Semana Perfeita (Ouro)', description: '21 dias perfeitos.', icon: Trophy, color: '#FFD700', goal: 21, progressType: 'perfectStreak' },
            { id: 'mestre_persistencia_bronze', title: 'Mestre da Persistência (Bronze)', description: '30 dias seguidos.', icon: Gem, color: '#CD7F32', goal: 30, progressType: 'singleMissionStreak' },
            { id: 'mestre_persistencia_prata', title: 'Mestre da Persistência (Prata)', description: '45 dias seguidos.', icon: Gem, color: '#C0C0C0', goal: 45, progressType: 'singleMissionStreak' },
            { id: 'mestre_persistencia_ouro', title: 'Mestre da Persistência (Ouro)', description: '60 dias seguidos.', icon: Gem, color: '#FFD700', goal: 60, progressType: 'singleMissionStreak' },
        ]
    },
    {
        title: "Maestria e Progresso",
        items: [
            { id: 'cacador_estrelas', title: 'Caçador de Estrelas', description: 'Acumule um total de 100 estrelas.', icon: Star, color: '#facc15' },
            { id: 'colecionador_tesouros', title: 'Colecionador de Tesouros', description: 'Acumule um total de 500 estrelas.', icon: Stars, color: '#f97316' },
            { id: 'lenda_estelar', title: 'Lenda Estelar', description: 'Acumule um total de 1.000 estrelas.', icon: Crown, color: '#ec4899' },
            { id: 'heroi_ascensao', title: 'Heroi em Ascensão', description: 'Alcance o Nível 5 de XP.', icon: TrendingUp, color: '#22c55e' },
            { id: 'campeao_herois', title: 'Campeão dos Herois', description: 'Alcance o Nível 10 de XP.', icon: Award, color: '#8b5cf6' },
        ]
    },
    {
        title: "Exploração e Diversidade",
        items: [
            { id: 'heroi_versatil', title: 'Heroi Versátil', description: 'Complete missões de 3 categorias diferentes.', icon: Puzzle, color: '#14b8a6' },
            { id: 'aventureiro_nato', title: 'Aventureiro Nato', description: 'Conclua uma missão Social ou Ambiental.', icon: Compass, color: '#a16207' },
        ]
    }
];

export const allBadgesMap = new Map(predefinedBadgeCategories.flatMap(category => category.items).map(badge => [badge.id, badge]));

    