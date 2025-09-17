

import type { Timestamp } from 'firebase/firestore';
import type { Icon as LucideIconType, LucideProps } from 'lucide-react';
import { PartyPopper, Crown, GraduationCap, HeartHandshake, ShoppingBag, Home, NotebookPen, HeartPulse, Smile, Users, Coins, Leaf, Bike, PlusCircle, Edit3, Trash2, UserCheck, UserX, Palette, Languages, ListChecks, CakeSlice, Utensils, FerrisWheel, Trees, Plane } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { HeroColor } from './hero-colors';

export type InitialPage = 'dashboard' | 'heroes' | 'agenda' | 'missions' | 'rewards' | 'family' | 'mural' | 'school-schedule' | 'achievements';
export type RewardMode = 'automatic' | 'manual';

export type NotificationType = 
    | 'new_level' 
    | 'new_badge' 
    | 'alliance_join_request' 
    | 'alliance_join_approved' 
    | 'mission_assigned' 
    | 'reward_redeemed' 
    | 'mission_completed' 
    | 'mission_completion_undone' 
    | 'alliance_ownership_request'
    | 'template_created'
    | 'template_updated'
    | 'template_deleted'
    | 'instance_assigned'
    | 'instance_unassigned'
    | 'school_schedule_entry_created'
    | 'school_schedule_entry_updated'
    | 'school_schedule_entry_deleted';

export type NotificationPreferences = {
  [key in NotificationType]?: boolean;
};

export interface UserSettings {
  initialContext?: string;
  notifications?: Partial<NotificationPreferences>;
  rewardMode?: RewardMode;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  avatarUrl?: string | null;
  createdAt: Timestamp;
  settings?: Partial<UserSettings>;
}

export const schoolShifts = [
  { id: 'morning', label: 'Manhã' },
  { id: 'afternoon', label: 'Tarde' },
  { id: 'full_time', label: 'Integral' },
  { id: 'not_applicable', label: 'Não estuda ainda' },
] as const;

export type SchoolShift = typeof schoolShifts[number]['id'];

export interface ChildProfile {
  id: string; // Document ID
  ownerId: string; // UID of the Usuário Master
  familyId?: string | null; // Optional, ID of the family if shared
  name: string;
  birthDate: Timestamp;
  gender?: 'boy' | 'girl' | 'not-informed';
  schoolShift?: SchoolShift;
  schoolShiftStart?: string; // "HH:mm" format
  schoolShiftEnd?: string;   // "HH:mm" format
  avatar?: string; // URL to avatar image
  color: HeroColor;
  stars: number; // Spendable currency
  totalStars: number; // Lifetime earned stars for level calculation
  level: number;
  accessCode: string; // 6-digit code for child login
  earnedBadgeIds?: string[];
  favoriteRewardIds?: string[];
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

export const familyRoles = [
    { id: 'Owner', label: 'Proprietário', description: 'Controle total. Convida e remove membros, muda papéis e gerencia a aliança.'},
    { id: 'Co-Owner', label: 'Co-Proprietário', description: 'Pode gerenciar membros (exceto o proprietário) e solicitar a propriedade da aliança.' },
    { id: 'Guardian', label: 'Guardião', description: 'Gerencia missões e o progresso dos heróis. Ideal para pais e avós.' },
    { id: 'Mentor', label: 'Mentor', description: 'Acesso de visualização para incentivar, sem poder de edição. Ideal para irmãos mais velhos.' },
    { id: 'Specialist', label: 'Especialista', description: 'Acesso de leitura para acompanhamento profissional (ex: terapeutas).' },
] as const;

export type FamilyRole = typeof familyRoles[number]['id'];

export interface FamilyMembership {
  id: string; // Document ID
  familyId: string;
  userId: string; // UID of the Collaborator
  role: FamilyRole;
  joinedAt: Timestamp;
}

export interface FamilyInvitation {
  id: string; // Document ID
  familyId: string;
  familyName: string;
  inviterId: string; // For 'invite': who is inviting. For 'request': who is approving (owner).
  inviterName: string; // For 'invite': inviter's name. For 'request': requester's name.
  inviteeId: string; // For 'invite': who is being invited. For 'request': who is requesting.
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  type: 'invite' | 'request';
  createdAt: Timestamp;
}

export const missionCategories = [
  { id: 'essential_routines', label: 'Rotina Essencial', icon: ListChecks, color: 'hsl(217 91% 60%)', colorClasses: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { id: 'home', label: 'Ajudar em Casa', icon: Home, color: 'hsl(217 91% 60%)', colorClasses: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { id: 'school', label: 'Atividades da Escola', icon: NotebookPen, color: 'hsl(142 71% 45%)', colorClasses: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { id: 'health', label: 'Saúde e Bem-Estar', icon: HeartPulse, color: 'hsl(0 84% 60%)', colorClasses: 'bg-red-500/10 text-red-700 border-red-500/30' },
  { id: 'sports', label: 'Prática de Esportes', icon: Bike, color: 'hsl(22 83% 53%)', colorClasses: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  { id: 'hobbies', label: 'Prática de Artes', icon: Palette, color: 'hsl(300 84% 60%)', colorClasses: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/30' },
  { id: 'languages', label: 'Prática de Idiomas', icon: Languages, color: 'hsl(210 40% 96.1%)', colorClasses: 'bg-sky-500/10 text-sky-700 border-sky-500/30' },
  { id: 'behavior', label: 'Comportamental', icon: Smile, color: 'hsl(48 96% 53%)', colorClasses: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  { id: 'social', label: 'Social', icon: Users, color: 'hsl(322 84% 60%)', colorClasses: 'bg-pink-500/10 text-pink-700 border-pink-500/30' },
  { id: 'financial', label: 'Financeiro', icon: Coins, color: 'hsl(262 88% 65%)', colorClasses: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/30' },
  { id: 'environmental', label: 'Ambiental', icon: Leaf, color: 'hsl(160 84% 39%)', colorClasses: 'bg-teal-500/10 text-teal-700 border-teal-500/30' },
] as const;

export type MissionCategory = typeof missionCategories[number]['id'];
export type MissionCategoryDetails = typeof missionCategories[number];

export const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export const allWeekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
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
  emoji?: string;
  category: MissionCategory;
  starsReward: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'archived';
  source?: 'custom' | 'predefined';
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
  emoji?: string;
  category: MissionCategory;
  starsReward: number;
  status: 'pending' | 'completed' | 'expired';
  assignedAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp | null;
  startDate?: Timestamp | null;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  completionCount?: number; // How many times it has been completed
  completionLog?: { [dateKey: string]: { completedAt: Timestamp, stars: number, actorId?: string, actorName?: string } };
  exceptionDates?: { [key: string]: boolean }; // Using a map for faster lookups
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
  isUnique: boolean; // Se a recompensa só pode ser resgatada uma vez
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'archived';
  source?: 'custom' | 'predefined';
  justification?: string;
  tip?: string;
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

  status: 'active' | 'pending_approval' | 'redeemed' | 'disabled';
  isRedeemed: boolean; // Pode ser usado para UI, mas 'status' é a fonte da verdade
  redeemedAt?: Timestamp; // Quando foi resgatada
  actorId?: string; // Who redeemed it
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

export const schoolSubjects = [
    { label: "Recreio/Intervalo", color: '#adb5bd' },
    { label: "Artes", color: '#f9a8d4' },
    { label: "Biologia", color: '#a7f3d0' },
    { label: "Ciências", color: '#81e6d9' },
    { label: "Educação Física", color: '#fca5a5' },
    { label: "Espanhol", color: '#fdba74' },
    { label: "Filosofia", color: '#c4b5fd' },
    { label: "Física", color: '#93c5fd' },
    { label: "Geografia", color: '#63b3ed' },
    { label: "História", color: '#d6bcfa' },
    { label: "Informática", color: '#a0aec0' },
    { label: "Inglês", color: '#fcd34d' },
    { label: "Japonês", color: '#fbb6ce' },
    { label: "Literatura", color: '#feb2b2' },
    { label: "Matemática", color: '#7f9cf5' },
    { label: "Música", color: '#f472b6' },
    { label: "Português", color: '#e57373' },
    { label: "Química", color: '#bbf7d0' },
    { label: "Redação", color: '#e53e3e' },
    { label: "Sociologia", color: '#d8b4fe' },
] as const;


export interface SchoolScheduleEntry {
  id: string;
  childId: string;
  ownerId: string;
  familyId: string | null;
  subject: string;
  dayOfWeek: Weekday;
  startTime: string; // "HH:mm" format
  endTime: string;   // "HH:mm" format
  color: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScheduleItem {
    activity: string;
    startTime: string;
    endTime: string;
    days: Weekday[];
    type: 'essential_routine' | 'extra_activity' | 'school_entry' | 'school_exit';
    emoji: string;
    category: MissionCategory;
    block?: string; // The UI block name this task belongs to.
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
  availableContexts: { id: string; name: string; role?: FamilyRole | 'Personal' }[];
  setAvailableContexts: (contexts: { id: string; name: string; role?: FamilyRole | 'Personal' }[]) => void;
  isLoading: boolean;
  currentRole: FamilyRole | 'Personal' | null;
  isContextSelected: boolean;
  selectedChildId: string | null;
  setSelectedChildId: (childId: string | null) => void;
  childrenInContext: ChildProfile[];
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

export interface Notification {
  id: string; // doc ID
  userId: string; // who this notification is for
  type: NotificationType;
  title: string;
  description: string;
  href: string; // link to the relevant page
  isRead: boolean;
  createdAt: string; // Changed from Timestamp to string
  relatedChildId?: string; // Optional, if it's about a specific child
  relatedContextId?: string | null;
  actorId?: string | null; // Optional, who performed the action
  actorName?: string | null; // Optional, name of the actor
}
