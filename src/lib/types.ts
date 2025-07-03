
import type { Timestamp } from 'firebase/firestore';
import type { Icon as LucideIconType, LucideProps } from 'lucide-react';
import { PartyPopper, Crown, GraduationCap, HeartHandshake, ShoppingBag, Home, School, HeartPulse, Smile, Users, Banknote, Leaf, Bike } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { HeroColor } from './hero-colors';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  createdAt: Timestamp;
}

export interface ChildProfile {
  id: string; // Document ID
  ownerId: string; // UID of the Usuário Master
  familyId?: string | null; // Optional, ID of the family if shared
  name: string;
  birthDate: Timestamp;
  gender?: 'boy' | 'girl' | 'not-informed';
  stars: number;
  xp: number;
  level: number;
  accessCode: string; // 6-digit code for child login
  avatar?: string; // URL to avatar image
  color: HeroColor;
  earnedBadgeIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Family {
  id: string; // Document ID
  name: string;
  ownerId: string; // UID of the Usuário Master who created it
  inviteCode: string; // 6-digit code for invitation
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface FamilyMembership {
  id: string; // Document ID
  familyId: string;
  userId: string; // UID of the Collaborator
  role: 'Collaborator' | 'MasterUser'; // Role in the family
  joinedAt: Timestamp;
}

export interface FamilyInvitation {
  id: string; // Document ID
  familyId: string;
  familyName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
}

export const missionCategories = [
  { id: 'home', label: 'Casa', icon: Home, color: 'hsl(217 91% 60%)', colorClasses: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { id: 'school', label: 'Escola', icon: School, color: 'hsl(142 71% 45%)', colorClasses: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { id: 'health', label: 'Saúde', icon: HeartPulse, color: 'hsl(0 84% 60%)', colorClasses: 'bg-red-500/10 text-red-700 border-red-500/30' },
  { id: 'sports', label: 'Esportes', icon: Bike, color: 'hsl(22 83% 53%)', colorClasses: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  { id: 'behavior', label: 'Comportamento', icon: Smile, color: 'hsl(48 96% 53%)', colorClasses: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  { id: 'social', label: 'Social', icon: Users, color: 'hsl(322 84% 60%)', colorClasses: 'bg-pink-500/10 text-pink-700 border-pink-500/30' },
  { id: 'financial', label: 'Financeiro', icon: Banknote, color: 'hsl(262 88% 65%)', colorClasses: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30' },
  { id: 'environmental', label: 'Ambiental', icon: Leaf, color: 'hsl(160 84% 39%)', colorClasses: 'bg-teal-500/10 text-teal-700 border-teal-500/30' },
] as const;

export type MissionCategory = typeof missionCategories[number]['id'];
export type MissionCategoryDetails = typeof missionCategories[number];

export const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type Weekday = typeof weekdays[number];
export const weekdayLabels: Record<Weekday, { long: string, short: string }> = {
  SU: { long: 'Domingo', short: 'Dom' },
  MO: { long: 'Segunda-feira', short: 'Seg' },
  TU: { long: 'Terça-feira', short: 'Ter' },
  WE: { long: 'Quarta-feira', short: 'Qua' },
  TH: { long: 'Quinta-feira', short: 'Qui' },
  FR: { long: 'Sexta-feira', short: 'Sex' },
  SA: { long: 'Sábado', short: 'Sáb' },
};

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  interval: number;
  byDay?: Weekday[];
  endDate?: Timestamp | null;
  count?: number | null;
}

export interface MissionTemplate {
  id: string;
  ownerId: string;
  familyId?: string | null;
  title: string;
  description?: string;
  category: MissionCategory;
  starsReward: number;
  xpReward: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'archived';
  // Scheduling fields
  startDate?: Timestamp | null;
  dueDate?: Timestamp | null;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
}

export interface MissionInstance {
  id: string;
  templateId: string;
  childId: string;
  ownerId: string;
  familyId?: string | null;
  title: string;
  description?: string;
  category: MissionCategory;
  starsReward: number;
  xpReward: number;
  status: 'pending' | 'completed' | 'expired';
  assignedAt: Timestamp;
  completedAt?: Timestamp; // Now marks the FINAL completion time
  dueDate?: Timestamp | null;
  updatedAt: Timestamp;
  startDate?: Timestamp | null;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  completionCount?: number; // How many times it has been completed
  completedDates?: Timestamp[]; // Array of completion timestamps
  exceptionDates?: Timestamp[]; // Dates this recurrence should be skipped
}


export const rewardCategories = [
  {
    id: 'privileges',
    label: 'Privilégios',
    colorClasses: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
    icon: Crown as ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
  },
  {
    id: 'experiences',
    label: 'Experiências',
    colorClasses: 'bg-pink-500/10 text-pink-700 border-pink-500/30',
    icon: PartyPopper as ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
  },
  {
    id: 'material_items',
    label: 'Itens Materiais',
    colorClasses: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
    icon: ShoppingBag as ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
  },
  {
    id: 'personal_development',
    label: 'Desenvolvimento Pessoal',
    colorClasses: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
    icon: GraduationCap as ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
  },
  {
    id: 'impact_generosity',
    label: 'Impacto e Generosidade',
    colorClasses: 'bg-green-500/10 text-green-700 border-green-500/30',
    icon: HeartHandshake as ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
  },
] as const;


export type RewardCategory = typeof rewardCategories[number]['id'];
export type RewardCategoryDetails = typeof rewardCategories[number];


export interface RewardTemplate {
  id: string; 
  ownerId: string; 
  familyId?: string | null;
  title: string;
  description?: string;
  category: RewardCategory;
  starsCost: number;
  isMaterial: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'archived';
}

export interface ChildRewardInstance {
  id: string; // Document ID da instância
  templateId: string; // ID do RewardTemplate original
  childId: string; // ID da criança a quem esta instância pertence
  ownerId: string; // UID do Usuário Master do perfil da criança ou do contexto familiar
  familyId?: string | null; // ID da Família, se aplicável

  // Snapshot dos detalhes do template no momento da atribuição
  title: string;
  description?: string;
  category: RewardCategory;
  starsCost: number;
  isMaterial: boolean;

  status: 'active' | 'redeemed' | 'disabled'; // Status desta instância específica para esta criança
  isRedeemed: boolean; // Pode ser usado para UI, mas 'status' é a fonte da verdade
  redeemedAt?: Timestamp; // Quando foi resgatada
  assignedAt: Timestamp; // Quando foi atribuída à criança
  updatedAt: Timestamp; // Última atualização de status ou dados desta instância
}


export interface Dream {
  id: string; // Document ID
  childId: string;
  ownerId: string;
  title: string;
  description?: string;
  starsGoal: number;
  currentStarsSaved: number;
  isAchieved: boolean;
  imageUrl?: string;
  createdAt: Timestamp;
  achievedAt?: Timestamp;
}

// Context types
export type Theme = {
  id: string;
  label: string;
  color?: string;
  previewColors: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
};


export type ThemeContextType = {
  theme: Theme['id'];
  setTheme: (themeId: Theme['id']) => void;
  availableThemes: Theme[];
  isMounted: boolean;
};

export type FamilyContextType = {
  currentContext: 'my-space' | string; // 'my-space' or familyId
  setCurrentContext: (context: 'my-space' | string) => void;
  availableContexts: { id: string; name: string }[];
  setAvailableContexts: (contexts: { id: string; name: string }[]) => void;
  isLoading: boolean;
};

export type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  isChildAuthenticated: boolean; // To distinguish between admin and child login sessions
  childProfile: ChildProfile | null; // Store child profile if child is logged in
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setChildAuthenticatedState: (profile: ChildProfile) => void;
};

export type IconType = LucideIconType;
