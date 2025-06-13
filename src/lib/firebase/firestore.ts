
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
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from './config';
import type { ChildProfile, Family, FamilyMembership, Task, Reward, Dream, UserProfile, RewardCategory } from '@/lib/types';

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
    name: childData.name,
    age: childData.age,
    gender: childData.gender,
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

export const getChildProfileById = async (childId: string): Promise<ChildProfile | null> => {
  const docRef = doc(db, 'children', childId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ChildProfile;
  }
  return null;
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

export const updateChildProfile = async (childId: string, updates: Partial<Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'accessCode' | 'stars' | 'xp' | 'level' | 'familyId' | 'updatedAt'>>) => {
  const childRef = doc(db, 'children', childId);
  await updateDoc(childRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const regenerateChildAccessCode = async (childId: string): Promise<string> => {
  const newAccessCode = Math.floor(100000 + Math.random() * 900000).toString();
  const childRef = doc(db, 'children', childId);
  await updateDoc(childRef, {
    accessCode: newAccessCode,
    updatedAt: serverTimestamp()
  });
  return newAccessCode;
};

export const deleteChildProfile = async (childId: string): Promise<void> => {
  const childRef = doc(db, 'children', childId);
  await deleteDoc(childRef);
  // TODO: Consider deleting associated tasks, rewards, dreams etc. if necessary (cascade delete).
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
    return null; 
  }
  const familyDoc = familySnapshot.docs[0];
  const family = { id: familyDoc.id, ...familyDoc.data() } as Family;

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

  const childrenToUpdateQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', null)); 
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


// --- Tasks ---
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

// --- Rewards ---
export const addReward = async (rewardData: Omit<Reward, 'id' | 'createdAt' | 'isRedeemed' | 'redeemedAt'>): Promise<Reward> => {
  const newRewardRef = doc(collection(db, 'rewards'));
  const newReward: Reward = {
    id: newRewardRef.id,
    ...rewardData,
    isRedeemed: false,
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newRewardRef, newReward);
  return newReward;
};

export const getRewardsByChild = async (childId: string): Promise<Reward[]> => {
  const q = query(collection(db, 'rewards'), where('childId', '==', childId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
};

export const getRewardsByOwner = async (ownerId: string): Promise<Reward[]> => {
  const q = query(collection(db, 'rewards'), where('ownerId', '==', ownerId), where('familyId', '==', null));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
};

export const getRewardsByFamily = async (familyId: string): Promise<Reward[]> => {
    const q = query(collection(db, 'rewards'), where('familyId', '==', familyId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
};


// --- Child Login ---
export const findChildByAccessCode = async (accessCode: string): Promise<ChildProfile | null> => {
  const q = query(collection(db, 'children'), where('accessCode', '==', accessCode));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const childDoc = querySnapshot.docs[0];
  return { id: childDoc.id, ...childDoc.data() } as ChildProfile;
};

