
import type { Timestamp } from 'firebase/firestore';
import type { LucideIcon, Icon as LucideIconType } from 'lucide-react'; // Import LucideIcon
import { PartyPopper, Clock, Crown, GraduationCap, Award, HeartHandshake, ShoppingBag } from 'lucide-react';

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  createdAt: Timestamp;
}

export interface ChildProfile {
  id: string; // Document ID
  ownerId: string; // UID of the Admin Master
  familyId?: string; // Optional, ID of the family if shared
  name: string;
  age: number;
  gender?: 'boy' | 'girl' | 'not-informed';
  stars: number;
  xp: number;
  level: number;
  accessCode: string; // 6-digit code for child login
  avatar?: string; // URL to avatar image
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Family {
  id: string; // Document ID
  name: string;
  ownerId: string; // UID of the Admin Master who created it
  inviteCode: string; // 6-digit code for invitation
  createdAt: Timestamp;
}

export interface FamilyMembership {
  id: string; // Document ID
  familyId: string;
  userId: string; // UID of the Collaborator
  role: 'Collaborator' | 'AdminMaster'; // Role in the family
  joinedAt: Timestamp;
}

export interface Task {
  id: string; // Document ID
  childId: string;
  ownerId: string; // UID of the Admin Master (for security rules)
  title: string;
  description?: string;
  starsReward: number;
  xpReward: number;
  isCompleted: boolean;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  category?: string; // e.g., Chores, Learning, Creative, Health
}

export const rewardCategories = [
  { id: 'experience', label: 'Experiências', colorClasses: 'bg-primary/10 text-primary border-primary/30', icon: PartyPopper as LucideIconType },
  { id: 'extra-time', label: 'Tempo Extra', colorClasses: 'bg-accent/10 text-accent border-accent/30', icon: Clock as LucideIconType },
  { id: 'privilege', label: 'Privilégios', colorClasses: 'bg-secondary/20 text-secondary-foreground border-secondary/30', icon: Crown as LucideIconType },
  { id: 'learning', label: 'Aprendizado', colorClasses: 'bg-yellow-400/10 text-yellow-600 border-yellow-400/30', icon: GraduationCap as LucideIconType },
  { id: 'recognition', label: 'Reconhecimento', colorClasses: 'bg-pink-400/10 text-pink-600 border-pink-400/30', icon: Award as LucideIconType },
  { id: 'social-impact', label: 'Impacto Social', colorClasses: 'bg-cyan-400/10 text-cyan-600 border-cyan-400/30', icon: HeartHandshake as LucideIconType },
  { id: 'material', label: 'Material', colorClasses: 'bg-muted text-muted-foreground border-border', icon: ShoppingBag as LucideIconType },
] as const;


export type RewardCategory = typeof rewardCategories[number]['id'];
export type RewardCategoryDetails = typeof rewardCategories[number];


export interface Reward {
  id: string; // Document ID
  childId: string; // Obrigatório, ID da criança específica
  ownerId: string; // UID do Admin Master (para contexto de criação/visualização)
  title: string;
  description?: string;
  category: RewardCategory;
  starsCost: number;
  isMaterial: boolean;
  createdAt: Timestamp;
  familyId?: string | null; // Contexto da família, se aplicável, para filtragem do admin

  // Campos de estado e rastreamento
  status: 'active' | 'redeemed' | 'disabled'; // Estado principal gerenciado pelo admin/sistema
  isRedeemed: boolean; // Indica se o ato de resgate ocorreu
  redeemedAt?: Timestamp; // Data do resgate
  updatedAt: Timestamp; // Última atualização de dados ou status
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

// Alteração para usar IconType de lucide-react se LucideIcon não for o tipo correto para elementos de ícone
export type IconType = LucideIconType;
