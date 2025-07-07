

import { Award, BedDouble, Compass, Crown, Gem, Puzzle, Repeat, Smile, Sparkles, Star, Stars, TrendingUp, Trophy, type LucideIcon } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { LucideProps } from 'lucide-react';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  color: string;
}

export interface BadgeCategory {
    title: string;
    items: Badge[];
}

export const predefinedBadgeCategories: BadgeCategory[] = [
    {
        title: "Iniciação e Primeiros Passos",
        items: [
            { id: 'hero_novato', title: 'Heroi Novato', description: 'Conclua sua primeira missão de qualquer tipo para celebrar o início da sua jornada.', icon: Sparkles, color: '#4ade80' },
            { id: 'defensor_sorriso', title: 'Defensor do Sorriso', description: 'Complete a missão "Escovar os dentes" pela primeira vez.', icon: Smile, color: '#60a5fa' },
            { id: 'guardiao_descanso', title: 'Guardião do Descanso', description: 'Complete a missão "Arrumar a cama" pela primeira vez para mostrar sua responsabilidade.', icon: BedDouble, color: '#a78bfa' },
        ]
    },
    {
        title: "Consistência e Hábitos",
        items: [
            { id: 'guardiao_rotina_bronze', title: 'Guardião da Rotina (Bronze)', description: 'Complete a mesma missão por 2 dias seguidos.', icon: Repeat, color: '#CD7F32' },
            { id: 'guardiao_rotina_prata', title: 'Guardião da Rotina (Prata)', description: 'Complete a mesma missão por 4 dias seguidos.', icon: Repeat, color: '#C0C0C0' },
            { id: 'guardiao_rotina_ouro', title: 'Guardião da Rotina (Ouro)', description: 'Complete a mesma missão por 6 dias seguidos.', icon: Repeat, color: '#FFD700' },
            { id: 'semana_perfeita_bronze', title: 'Semana Perfeita (Bronze)', description: 'Complete todas as missões agendadas por 7 dias consecutivos.', icon: Trophy, color: '#CD7F32' },
            { id: 'semana_perfeita_prata', title: 'Semana Perfeita (Prata)', description: 'Complete todas as missões agendadas por 15 dias consecutivos.', icon: Trophy, color: '#C0C0C0' },
            { id: 'semana_perfeita_ouro', title: 'Semana Perfeita (Ouro)', description: 'Complete todas as missões agendadas por 21 dias consecutivos.', icon: Trophy, color: '#FFD700' },
            { id: 'mestre_persistencia_bronze', title: 'Mestre da Persistência (Bronze)', description: 'Complete a mesma missão por 30 dias seguidos.', icon: Gem, color: '#CD7F32' },
            { id: 'mestre_persistencia_prata', title: 'Mestre da Persistência (Prata)', description: 'Complete a mesma missão por 45 dias seguidos.', icon: Gem, color: '#C0C0C0' },
            { id: 'mestre_persistencia_ouro', title: 'Mestre da Persistência (Ouro)', description: 'Complete a mesma missão por 60 dias seguidos.', icon: Gem, color: '#FFD700' },
        ]
    },
    {
        title: "Maestria e Progresso",
        items: [
            { id: 'cacador_estrelas', title: 'Caçador de Estrelas', description: 'Acumule um total de 100 estrelas.', icon: Star, color: '#facc15' },
            { id: 'colecionador_tesouros', title: 'Colecionador de Tesouros', description: 'Acumule um total de 500 estrelas. Um grande avanço!', icon: Stars, color: '#f97316' },
            { id: 'lenda_estelar', title: 'Lenda Estelar', description: 'Uma conquista épica! Acumule um total de 1.000 estrelas.', icon: Crown, color: '#ec4899' },
            { id: 'heroi_ascensao', title: 'Heroi em Ascensão', description: 'Alcance o Nível 5 de XP para reconhecer seu progresso.', icon: TrendingUp, color: '#22c55e' },
            { id: 'campeao_herois', title: 'Campeão dos Herois', description: 'Um símbolo de grande experiência! Alcance o Nível 10 de XP.', icon: Award, color: '#8b5cf6' },
        ]
    },
    {
        title: "Exploração e Diversidade",
        items: [
            { id: 'heroi_versatil', title: 'Heroi Versátil', description: 'Conclua pelo menos uma missão de 3 categorias diferentes (ex: Casa, Escola, Saúde).', icon: Puzzle, color: '#14b8a6' },
            { id: 'aventureiro_nato', title: 'Aventureiro Nato', description: 'Conclua uma missão da categoria Social ou Ambiental pela primeira vez.', icon: Compass, color: '#a16207' },
        ]
    }
];

export const allBadgesMap = new Map(predefinedBadgeCategories.flatMap(category => category.items).map(badge => [badge.id, badge]));

    