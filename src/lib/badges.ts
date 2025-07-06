
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
            { id: 'guardiao_descanso', title: 'Guardião do Descanso', description: 'Complete a missão "Arrumar a cama" pela primeira vez para mostrar sua responsabilidade.', icon: BedDouble, color: '#c084fc' },
        ]
    },
    {
        title: "Consistência e Hábitos",
        items: [
            { id: 'guardiao_rotina', title: 'Guardião da Rotina', description: 'Complete a mesma missão por 7 dias seguidos para valorizar sua persistência.', icon: Repeat, color: '#2dd4bf' },
            { id: 'semana_perfeita', title: 'Semana Perfeita', description: 'Complete todas as missões agendadas por 7 dias consecutivos. Uma prova de total dedicação!', icon: Trophy, color: '#facc15' },
            { id: 'mestre_persistencia', title: 'Mestre da Persistência', description: 'Uma medalha rara! Complete a mesma missão por 30 dias seguidos.', icon: Gem, color: '#f472b6' },
        ]
    },
    {
        title: "Maestria e Progresso",
        items: [
            { id: 'cacador_estrelas', title: 'Caçador de Estrelas', description: 'Acumule um total de 100 estrelas.', icon: Star, color: '#f59e0b' },
            { id: 'colecionador_tesouros', title: 'Colecionador de Tesouros', description: 'Acumule um total de 500 estrelas. Um grande avanço!', icon: Stars, color: '#f59e0b' },
            { id: 'lenda_estelar', title: 'Lenda Estelar', description: 'Uma conquista épica! Acumule um total de 1.000 estrelas.', icon: Crown, color: '#f59e0b' },
            { id: 'heroi_ascensao', title: 'Heroi em Ascensão', description: 'Alcance o Nível 5 de XP para reconhecer seu progresso.', icon: TrendingUp, color: '#818cf8' },
            { id: 'campeao_herois', title: 'Campeão dos Herois', description: 'Um símbolo de grande experiência! Alcance o Nível 10 de XP.', icon: Award, color: '#a78bfa' },
        ]
    },
    {
        title: "Exploração e Diversidade",
        items: [
            { id: 'heroi_versatil', title: 'Heroi Versátil', description: 'Conclua pelo menos uma missão de 3 categorias diferentes (ex: Casa, Escola, Saúde).', icon: Puzzle, color: '#fb923c' },
            { id: 'aventureiro_nato', title: 'Aventureiro Nato', description: 'Conclua uma missão da categoria Social ou Ambiental pela primeira vez.', icon: Compass, color: '#34d399' },
        ]
    }
];

export const allBadgesMap = new Map(predefinedBadgeCategories.flatMap(category => category.items).map(badge => [badge.id, badge]));

    
