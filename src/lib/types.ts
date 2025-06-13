
import type { Timestamp } from 'firebase/firestore';

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
  gender?: 'boy' | 'girl' | 'not-informed'; // Novo campo
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

export interface Reward {
  id: string; // Document ID
  childId: string;
  ownerId: string;
  title: string;
  description?: string;
  starsCost: number;
  isRedeemed: boolean;
  createdAt: Timestamp;
  redeemedAt?: Timestamp;
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
  setChildAuthenticatedState: (profile: ChildProfile) => void; // Add this line
  // Add other auth methods as needed, e.g., email/password login/signup
};

