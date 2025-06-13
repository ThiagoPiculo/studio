
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './config';
import type { ChildProfile, Family, FamilyMembership, Task, Reward, Dream, UserProfile } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs if needed client-side. Firebase auto-IDs are preferred.

// --- User Profile ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};

// --- Child Profile ---
export const addChildProfile = async (ownerId: string, childData: Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'accessCode' | 'stars' | 'xp' | 'level'>): Promise<ChildProfile> => {
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
  const newChildRef = doc(collection(db, 'children')); // Auto-generate ID
  const newChild: ChildProfile = {
    id: newChildRef.id,
    ownerId,
    ...childData,
    stars: 0,
    xp: 0,
    level: 1,
    accessCode,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newChildRef, newChild);
  return newChild;
};

export const getChildProfilesByOwner = async (ownerId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('ownerId', '==', ownerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
};

export const getChildProfilesByFamily = async (familyId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('familyId', '==', familyId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
};

// --- Family ---
export const createFamily = async (ownerId: string, familyName: string): Promise<Family> => {
  const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
  const newFamilyRef = doc(collection(db, 'families'));
  const newFamily: Family = {
    id: newFamilyRef.id,
    name: familyName,
    ownerId,
    inviteCode,
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newFamilyRef, newFamily);
  
  // Automatically add the owner as a family member (AdminMaster role)
  const newMembershipRef = doc(collection(db, 'familyMemberships'));
  const ownerMembership: FamilyMembership = {
    id: newMembershipRef.id,
    familyId: newFamily.id,
    userId: ownerId,
    role: 'AdminMaster',
    joinedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newMembershipRef, ownerMembership);

  return newFamily;
};

export const joinFamilyByInviteCode = async (userId: string, inviteCode: string): Promise<FamilyMembership | null> => {
  const familyQuery = query(collection(db, 'families'), where('inviteCode', '==', inviteCode));
  const familySnapshot = await getDocs(familyQuery);

  if (familySnapshot.empty) {
    console.error('Invalid invite code');
    return null; // Or throw error
  }
  const familyDoc = familySnapshot.docs[0];
  const family = { id: familyDoc.id, ...familyDoc.data() } as Family;

  // Check if user is already a member
  const existingMembershipQuery = query(collection(db, 'familyMemberships'), 
    where('familyId', '==', family.id),
    where('userId', '==', userId)
  );
  const existingMembershipSnapshot = await getDocs(existingMembershipQuery);
  if (!existingMembershipSnapshot.empty) {
    console.log('User is already a member of this family.');
    return existingMembershipSnapshot.docs[0].data() as FamilyMembership;
  }

  const newMembershipRef = doc(collection(db, 'familyMemberships'));
  const newMembership: FamilyMembership = {
    id: newMembershipRef.id,
    familyId: family.id,
    userId,
    role: 'Collaborator',
    joinedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newMembershipRef, newMembership);

  // Add familyId to children owned by the joining user IF they are the owner of the family being joined (edge case)
  // Or if a policy allows collaborators to add their children to a family (more complex)
  // For now, only update children if the joining user is also the family owner (which means they created it, handled in createFamily)
  // This part needs careful consideration of permissions and data structure.
  // If children are to be associated with the family, update their familyId field.
  // Example: If joining user wants their children to be part of this family
  const childrenToUpdateQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', null)); // only update children not already in a family
  const childrenSnapshot = await getDocs(childrenToUpdateQuery);
  const batch = writeBatch(db);
  childrenSnapshot.forEach(childDoc => {
    batch.update(doc(db, 'children', childDoc.id), { familyId: family.id });
  });
  await batch.commit();

  return newMembership;
};

export const getFamilyMembers = async (familyId: string): Promise<UserProfile[]> => {
  const membershipsQuery = query(collection(db, 'familyMemberships'), where('familyId', '==', familyId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  const memberUserIds = membershipsSnapshot.docs.map(doc => (doc.data() as FamilyMembership).userId);

  if (memberUserIds.length === 0) return [];

  const usersQuery = query(collection(db, 'users'), where('uid', 'in', memberUserIds));
  const usersSnapshot = await getDocs(usersQuery);
  return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
};


// --- Tasks, Rewards, Dreams (Example for Tasks) ---
export const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'isCompleted'>): Promise<Task> => {
  const newTaskRef = doc(collection(db, 'tasks'));
  const newTask: Task = {
    id: newTaskRef.id,
    ...taskData,
    isCompleted: false,
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newTaskRef, newTask);
  return newTask;
};

// Add similar functions for getTasks, updateTask, deleteTask
// And for Rewards and Dreams

// Helper to find a child by access code (used by backend function ideally)
export const findChildByAccessCode = async (accessCode: string): Promise<ChildProfile | null> => {
  const q = query(collection(db, 'children'), where('accessCode', '==', accessCode));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  