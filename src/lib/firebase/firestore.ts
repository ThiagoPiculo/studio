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
  setDoc,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import type { ChildProfile, Family, FamilyMembership, Task, RewardTemplate, ChildRewardInstance, Dream, UserProfile } from '@/lib/types';

// --- User Profile ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};

// --- Child Profile ---
export const addChildProfile = async (ownerId: string, childData: Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'accessCode' | 'stars' | 'xp' | 'level' | 'familyId'>): Promise<ChildProfile> => {
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
  const newChildRef = doc(collection(db, 'children'));
  const now = serverTimestamp() as Timestamp;
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
    createdAt: now,
    updatedAt: now,
    familyId: childData.familyId || null,
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

// Helper para buscar crianças elegíveis para atribuição de recompensa ou filtro
export const getChildProfilesForAttribution = async (currentUserId: string, currentContextId: 'my-space' | string): Promise<ChildProfile[]> => {
  let profilesQuery;
  if (currentContextId === 'my-space') {
     profilesQuery = query(collection(db, 'children'), where('ownerId', '==', currentUserId), where('familyId', '==', null));
  } else {
    // Se for um contexto de família, buscamos todas as crianças daquela família,
    // independentemente de quem é o ownerId individual (já que são parte da família).
    profilesQuery = query(collection(db, 'children'), where('familyId', '==', currentContextId));
  }
  const querySnapshot = await getDocs(profilesQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
};


export const updateChildProfile = async (childId: string, updates: Partial<Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'accessCode' | 'familyId' | 'updatedAt'>>) => {
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
  const rewardInstancesQuery = query(collection(db, "childRewardInstances"), where("childId", "==", childId));
  const rewardInstancesSnapshot = await getDocs(rewardInstancesQuery);
  const batch = writeBatch(db);
  rewardInstancesSnapshot.forEach(doc => batch.delete(doc.ref));
  batch.delete(childRef);
  await batch.commit();
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
    role: 'MasterUser',
    joinedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newMembershipRef, ownerMembership);

  const childrenToUpdateQuery = query(collection(db, 'children'), where('ownerId', '==', ownerId), where('familyId', '==', null));
  const childrenSnapshot = await getDocs(childrenToUpdateQuery);
  const batch = writeBatch(db);
  childrenSnapshot.forEach(childDoc => {
    batch.update(doc(db, 'children', childDoc.id), { familyId: newFamily.id, updatedAt: serverTimestamp() });
  });
  await batch.commit();

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
    batch.update(doc(db, 'children', childDoc.id), { familyId: family.id, updatedAt: serverTimestamp() });
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


// --- Reward Templates (Catálogo de Recompensas) ---
export const addRewardTemplate = async (templateData: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<RewardTemplate> => {
  const newTemplateRef = doc(collection(db, 'rewardTemplates'));
  const now = serverTimestamp() as Timestamp;
  const newTemplate: RewardTemplate = {
    id: newTemplateRef.id,
    ...templateData,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newTemplateRef, newTemplate);
  return newTemplate;
};

export const getRewardTemplateById = async (templateId: string): Promise<RewardTemplate | null> => {
  const docRef = doc(db, 'rewardTemplates', templateId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as RewardTemplate;
  }
  return null;
};

export const updateRewardTemplate = async (templateId: string, updates: Partial<Omit<RewardTemplate, 'id' | 'createdAt' | 'ownerId' | 'familyId'>>): Promise<void> => {
  const templateRef = doc(db, 'rewardTemplates', templateId);
  await updateDoc(templateRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

export const deleteRewardTemplate = async (templateId: string): Promise<void> => {
  const templateRef = doc(db, 'rewardTemplates', templateId);
  await deleteDoc(templateRef);
};

export const getRewardTemplatesByOwnerOrFamily = async (ownerId: string, familyId?: string | null): Promise<RewardTemplate[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'rewardTemplates'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'rewardTemplates'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('createdAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RewardTemplate));
};


// --- Child Reward Instances (Recompensas Atribuídas) ---
export const addChildRewardInstance = async (
  instanceData: Omit<ChildRewardInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'isRedeemed' | 'redeemedAt' | 'title' | 'description' | 'category' | 'starsCost' | 'isMaterial'>,
  templateSnapshot: RewardTemplate
): Promise<ChildRewardInstance> => {
  const newInstanceRef = doc(collection(db, 'childRewardInstances'));
  const now = serverTimestamp() as Timestamp;

  const newInstance: ChildRewardInstance = {
    id: newInstanceRef.id,
    templateId: instanceData.templateId,
    childId: instanceData.childId,
    ownerId: instanceData.ownerId,
    familyId: instanceData.familyId || null,
    title: templateSnapshot.title,
    description: templateSnapshot.description || '',
    category: templateSnapshot.category,
    starsCost: templateSnapshot.starsCost,
    isMaterial: templateSnapshot.isMaterial,
    status: 'active',
    isRedeemed: false,
    assignedAt: now,
    updatedAt: now,
  };
  await setDoc(newInstanceRef, newInstance);
  return newInstance;
};


export const getActiveChildRewardInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<ChildRewardInstance[]> => {
  const q = query(
    collection(db, 'childRewardInstances'),
    where('templateId', '==', templateId),
    where('childId', '==', childId),
    where('status', '==', 'active')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ChildRewardInstance);
};


export const getChildRewardInstanceById = async (instanceId: string): Promise<ChildRewardInstance | null> => {
  const docRef = doc(db, 'childRewardInstances', instanceId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ChildRewardInstance : null;
};

export const getChildRewardInstancesByChild = async (childId: string): Promise<ChildRewardInstance[]> => {
  const q = query(collection(db, 'childRewardInstances'), where('childId', '==', childId), orderBy('assignedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildRewardInstance));
};

export const getChildRewardInstancesForContext = async (ownerId: string, familyId: string | null): Promise<ChildRewardInstance[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    // Se um familyId é fornecido, buscamos todas as instâncias dessa família
    q = query(collection(db, 'childRewardInstances'), where('familyId', '==', familyId), orderBy('assignedAt', 'desc'));
  } else {
    // Se for 'my-space' (ou familyId é null), buscamos instâncias do ownerId que não estão em nenhuma família
    q = query(collection(db, 'childRewardInstances'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('assignedAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ChildRewardInstance);
};


export const updateChildRewardInstance = async (instanceId: string, updates: Partial<Omit<ChildRewardInstance, 'id' | 'templateId' | 'childId' | 'ownerId' | 'familyId' | 'assignedAt' | 'title' | 'description' | 'category' | 'starsCost' | 'isMaterial'>>): Promise<void> => {
  const instanceRef = doc(db, 'childRewardInstances', instanceId);
  await updateDoc(instanceRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

export const deleteChildRewardInstance = async (instanceId: string): Promise<void> => {
  const instanceRef = doc(db, 'childRewardInstances', instanceId);
  await deleteDoc(instanceRef);
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

// --- Tasks (Stubs for now) ---
// export const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'isCompleted'>): Promise<Task> => {
//   const newTaskRef = doc(collection(db, 'tasks'));
//   const newTask: Task = {
//     id: newTaskRef.id,
//     ...taskData,
//     isCompleted: false,
//     createdAt: serverTimestamp() as Timestamp,
//   };
//   await setDoc(newTaskRef, newTask);
//   return newTask;
// };
