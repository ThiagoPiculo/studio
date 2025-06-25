
import type { Timestamp } from 'firebase/firestore';
import type { Icon as LucideIconType, LucideProps } from 'lucide-react';
import { PartyPopper, Crown, GraduationCap, HeartHandshake, ShoppingBag } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

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
  ownerId: string; // UID of the Usuário Master who created it
  inviteCode: string; // 6-digit code for invitation
  createdAt: Timestamp;
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


export interface Mission {
  id:string; // Document ID
  childId: string;
  ownerId: string; // UID of the Usuário Master (for security rules)
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
