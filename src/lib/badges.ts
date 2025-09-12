

import { Award, BedDouble, Compass, Crown, Gem, Puzzle, Repeat, Smile, Sparkles, Star, Stars, TrendingUp, Trophy, type LucideIcon, HandHelping, BrainCircuit, ShieldCheck, TowerControl, Bike, Leaf } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { LucideProps } from 'lucide-react';
import { GuardiaoDoDescansoIcon } from '@/components/icons/GuardiãoDoDescansoIcon';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  color: string;
  goal?: number;
  progressType?: 'singleMissionStreak' | 'perfectStreak' | 'stars' | 'level';
}

export interface BadgeCategory {
    title: string;
    items: Badge[];
}

export const predefinedBadgeCategories: BadgeCategory[] = [
    {
        title: "Iniciação e Primeiros Passos",
        items: [
            { id: 'hero_novato', title: 'Heroi Novato', description: 'Conclua sua primeira missão de qualquer tipo.', icon: Sparkles, color: '#FFD700' },
            { id: 'defensor_sorriso', title: 'Defensor do Sorriso', description: 'Complete a missão "Escovar os dentes".', icon: Smile, color: '#60a5fa' },
            { id: 'guardiao_descanso', title: 'Guardião do Descanso', description: 'Complete a missão "Arrumar a cama".', icon: GuardiaoDoDescansoIcon, color: '#a78bfa' },
            { id: 'maozinha_amiga', title: 'Mãozinha Amiga', description: 'Ajude a pôr ou tirar a mesa pela primeira vez.', icon: HandHelping, color: '#34d399' },
            { id: 'mente_brilhante', title: 'Mente Brilhante', description: 'Complete a missão "Fazer lição de casa" pela primeira vez.', icon: BrainCircuit, color: '#60a5fa' },
        ]
    },
    {
        title: "Consistência e Hábitos",
        items: [
            { id: 'guardiao_rotina_bronze', title: 'Guardião da Rotina (Bronze)', description: 'Complete a mesma missão por 2 dias seguidos.', icon: Repeat, color: '#CD7F32', goal: 2, progressType: 'singleMissionStreak' },
            { id: 'guardiao_rotina_prata', title: 'Guardião da Rotina (Prata)', description: 'Complete a mesma missão por 4 dias seguidos.', icon: Repeat, color: '#C0C0C0', goal: 4, progressType: 'singleMissionStreak' },
            { id: 'guardiao_rotina_ouro', title: 'Guardião da Rotina (Ouro)', description: 'Complete a mesma missão por 6 dias seguidos.', icon: Repeat, color: '#FFD700', goal: 6, progressType: 'singleMissionStreak' },
            { id: 'semana_perfeita_bronze', title: 'Semana Perfeita (Bronze)', description: 'Complete todas as missões por 7 dias consecutivos.', icon: Trophy, color: '#CD7F32', goal: 7, progressType: 'perfectStreak' },
            { id: 'semana_perfeita_prata', title: 'Semana Perfeita (Prata)', description: 'Complete todas as missões por 15 dias consecutivos.', icon: Trophy, color: '#C0C0C0', goal: 15, progressType: 'perfectStreak' },
            { id: 'semana_perfeita_ouro', title: 'Semana Perfeita (Ouro)', description: 'Complete todas as missões por 21 dias consecutivos.', icon: Trophy, color: '#FFD700', goal: 21, progressType: 'perfectStreak' },
            { id: 'mestre_persistencia_bronze', title: 'Mestre da Persistência (Bronze)', description: 'Complete a mesma missão por 30 dias seguidos.', icon: Gem, color: '#CD7F32', goal: 30, progressType: 'singleMissionStreak' },
            { id: 'mestre_persistencia_prata', title: 'Mestre da Persistência (Prata)', description: 'Complete a mesma missão por 45 dias seguidos.', icon: Gem, color: '#C0C0C0', goal: 45, progressType: 'singleMissionStreak' },
            { id: 'mestre_persistencia_ouro', title: 'Mestre da Persistência (Ouro)', description: 'Complete a mesma missão por 60 dias seguidos.', icon: Gem, color: '#FFD700', goal: 60, progressType: 'singleMissionStreak' },
        ]
    },
    {
        title: "Maestria e Progresso",
        items: [
            { id: 'cacador_estrelas', title: 'Caçador de Estrelas', description: 'Acumule 100 estrelas.', icon: Star, color: '#facc15', goal: 100, progressType: 'stars' },
            { id: 'colecionador_tesouros', title: 'Colecionador de Tesouros', description: 'Acumule 500 estrelas.', icon: Stars, color: '#f97316', goal: 500, progressType: 'stars' },
            { id: 'lenda_estelar', title: 'Lenda Estelar', description: 'Acumule 1.000 estrelas.', icon: Crown, color: '#ec4899', goal: 1000, progressType: 'stars' },
            { id: 'heroi_ascensao', title: 'Heroi em Ascensão', description: 'Alcance o Nível 5.', icon: TrendingUp, color: '#22c55e', goal: 5, progressType: 'level' },
            { id: 'campeao_herois', title: 'Campeão dos Herois', description: 'Alcance o Nível 10.', icon: Award, color: '#8b5cf6', goal: 10, progressType: 'level' },
            { id: 'arquiteto_sonhos', title: 'Arquiteto de Sonhos', description: 'Alcance o Nível 15.', icon: TowerControl, color: '#a78bfa', goal: 15, progressType: 'level' },
            { id: 'heroi_lendario', title: 'Herói Lendário', description: 'Alcance o Nível 20.', icon: ShieldCheck, color: '#facc15', goal: 20, progressType: 'level' },
            { id: 'conquistador_recompensas', title: 'Conquistador de Recompensas', description: 'Resgate sua primeira recompensa na lojinha.', icon: Gem, color: '#ec4899' },
        ]
    },
    {
        title: "Exploração e Diversidade",
        items: [
            { id: 'aventureiro_nato', title: 'Aventureiro Nato', description: 'Conclua uma missão Social ou Ambiental.', icon: Leaf, color: '#a16207' },
            { id: 'atleta_dedicado', title: 'Atleta Dedicado', description: 'Conclua uma missão da categoria "Esportes".', icon: Bike, color: '#ef4444' },
            { id: 'heroi_versatil', title: 'Heroi Versátil', description: 'Complete missões de 3 categorias diferentes.', icon: Puzzle, color: '#14b8a6' },
            { id: 'explorador_talentos', title: 'Explorador de Talentos', description: 'Complete missões de 5 categorias diferentes.', icon: Compass, color: '#3b82f6' },
        ]
    }
];

export const allBadgesMap = new Map(predefinedBadgeCategories.flatMap(category => category.items).map(badge => [badge.id, badge]));
