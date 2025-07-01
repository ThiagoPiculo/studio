

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
  orderBy,
  runTransaction,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import type { ChildProfile, Family, FamilyMembership, MissionTemplate, RewardTemplate, ChildRewardInstance, Dream, UserProfile, FamilyInvitation, MissionInstance, RecurrenceRule } from '@/lib/types';
import { heroColors } from '../hero-colors';
import { startOfDay, isSameDay, subDays } from 'date-fns';

// --- User Profile ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};

export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const usersQuery = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(usersQuery);
  if (querySnapshot.empty) {
    return null;
  }
  const userData = querySnapshot.docs[0].data();
  return {
    uid: querySnapshot.docs[0].id,
    ...userData
  } as UserProfile;
};

// --- Child Profile ---
export const addChildProfile = async (ownerId: string, childData: Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'accessCode' | 'stars' | 'xp' | 'level' | 'familyId' | 'avatar' | 'color'>): Promise<ChildProfile> => {
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
  const randomColor = heroColors[Math.floor(Math.random() * heroColors.length)];
  const newChildRef = doc(collection(db, 'children'));
  const now = serverTimestamp() as Timestamp;
  const newChild: ChildProfile = {
    id: newChildRef.id,
    ownerId,
    name: childData.name,
    birthDate: childData.birthDate,
    gender: childData.gender,
    avatar: '',
    stars: 0,
    xp: 0,
    level: 1,
    accessCode,
    color: randomColor,
    createdAt: now,
    updatedAt: now,
    familyId: null,
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
  const q = query(collection(db, 'children'), where('ownerId', '==', ownerId), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
};

export const getChildProfilesByFamily = async (familyId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('familyId', '==', familyId), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
};

// Helper para buscar crianças elegíveis para atribuição de recompensa ou filtro
export const getChildProfilesForAttribution = async (currentUserId: string, currentContextId: 'my-space' | string): Promise<ChildProfile[]> => {
  // If we are in "My Space", we ONLY see personal, unassigned children.
  if (currentContextId === 'my-space') {
    const personalQuery = query(collection(db, 'children'), where('ownerId', '==', currentUserId), where('familyId', '==', null));
    const personalSnapshot = await getDocs(personalQuery);
    const children = personalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
    return children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // If we are in a family context, we see BOTH family children AND the user's personal, unassigned children.
  const allProfiles: { [id: string]: ChildProfile } = {};

  // 1. Fetch children from the current family context
  const familyQuery = query(collection(db, 'children'), where('familyId', '==', currentContextId));
  const familySnapshot = await getDocs(familyQuery);
  familySnapshot.forEach(doc => {
    allProfiles[doc.id] = { id: doc.id, ...doc.data() } as ChildProfile;
  });

  // 2. Fetch children from the user's personal space (owned by them, no family)
  const personalQuery = query(collection(db, 'children'), where('ownerId', '==', currentUserId), where('familyId', '==', null));
  const personalSnapshot = await getDocs(personalQuery);
  personalSnapshot.forEach(doc => {
    // This will add personal children, and won't create duplicates since keys are unique.
    allProfiles[doc.id] = { id: doc.id, ...doc.data() } as ChildProfile;
  });

  // Return a sorted array of profiles
  return Object.values(allProfiles).sort((a, b) => a.name.localeCompare(b.name));
};


export const getUnassignedChildProfilesByOwner = async (ownerId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
};

export const assignChildrenToFamily = async (childIds: string[], familyId: string): Promise<void> => {
  const batch = writeBatch(db);
  childIds.forEach(childId => {
    const childRef = doc(db, 'children', childId);
    batch.update(childRef, { familyId: familyId, updatedAt: serverTimestamp() });
  });
  await batch.commit();
};

export const removeChildFromFamily = async (childId: string): Promise<void> => {
  const childRef = doc(db, 'children', childId);
  await updateDoc(childRef, {
    familyId: null,
    updatedAt: serverTimestamp()
  });
};


export const updateChildProfile = async (childId: string, updates: Partial<ChildProfile>) => {
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
  
  const batch = writeBatch(db);

  // Delete associated reward instances
  const rewardInstancesQuery = query(collection(db, "childRewardInstances"), where("childId", "==", childId));
  const rewardInstancesSnapshot = await getDocs(rewardInstancesQuery);
  rewardInstancesSnapshot.forEach(doc => batch.delete(doc.ref));

  // Delete associated mission instances
  const missionInstancesQuery = query(collection(db, "missionInstances"), where("childId", "==", childId));
  const missionInstancesSnapshot = await getDocs(missionInstancesQuery);
  missionInstancesSnapshot.forEach(doc => batch.delete(doc.ref));
  
  // Delete the child profile itself
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

export const createFamilyInvitation = async (familyId: string, inviterId: string, inviterName: string, inviteeEmail: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family) {
    throw new Error("Família não encontrada.");
  }

  const invitee = await findUserByEmail(inviteeEmail);
  if (!invitee) {
    throw new Error("Nenhum usuário encontrado com este e-mail.");
  }
  
  if (invitee.uid === family.ownerId || invitee.uid === inviterId) {
    throw new Error("Você não pode convidar a si mesmo ou o proprietário da família.");
  }

  const existingMembershipQuery = query(collection(db, 'familyMemberships'),
    where('familyId', '==', family.id),
    where('userId', '==', invitee.uid)
  );
  const existingMembershipSnapshot = await getDocs(existingMembershipQuery);
  if (!existingMembershipSnapshot.empty) {
    throw new Error("Este usuário já é um membro da família.");
  }
  
  const pendingInvitationQuery = query(collection(db, 'familyInvitations'),
    where('familyId', '==', familyId),
    where('inviteeId', '==', invitee.uid),
    where('status', '==', 'pending')
  );
  const pendingInvitationSnapshot = await getDocs(pendingInvitationQuery);
  if (!pendingInvitationSnapshot.empty) {
    throw new Error("Já existe um convite pendente para este usuário.");
  }

  const newInvitationRef = doc(collection(db, 'familyInvitations'));
  const newInvitation: FamilyInvitation = {
    id: newInvitationRef.id,
    familyId: family.id,
    familyName: family.name,
    inviterId: inviterId,
    inviterName: inviterName,
    inviteeId: invitee.uid,
    inviteeEmail: invitee.email!,
    status: 'pending',
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newInvitationRef, newInvitation);
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

  const usersQuery = query(collection(db, 'users'), where('__name__', 'in', memberUserIds));
  const usersSnapshot = await getDocs(usersQuery);
  const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
  return users.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
};

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const docRef = doc(db, 'families', familyId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Family) : null;
};

export const leaveFamily = async (userId: string, familyId: string): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Find and delete the user's membership document
  const membershipQuery = query(collection(db, 'familyMemberships'), where('userId', '==', userId), where('familyId', '==', familyId));
  const membershipSnapshot = await getDocs(membershipQuery);
  if (!membershipSnapshot.empty) {
    const membershipDocRef = membershipSnapshot.docs[0].ref;
    batch.delete(membershipDocRef);
  } else {
    throw new Error("Membership not found.");
  }

  // 2. Find all children owned by this user within this family and reset their familyId
  const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', familyId));
  const childrenSnapshot = await getDocs(childrenQuery);
  childrenSnapshot.forEach(childDoc => {
    batch.update(childDoc.ref, { familyId: null, updatedAt: serverTimestamp() });
  });

  // Commit all batched writes
  await batch.commit();
};

export const deleteFamily = async (familyId: string): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Delete the family document itself
  const familyRef = doc(db, 'families', familyId);
  batch.delete(familyRef);

  // 2. Find and delete all memberships for this family
  const membershipsQuery = query(collection(db, 'familyMemberships'), where('familyId', '==', familyId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  membershipsSnapshot.forEach(membershipDoc => {
    batch.delete(membershipDoc.ref);
  });

  // 3. Find all children in this family and reset their familyId
  const childrenQuery = query(collection(db, 'children'), where('familyId', '==', familyId));
  const childrenSnapshot = await getDocs(childrenQuery);
  childrenSnapshot.forEach(childDoc => {
    batch.update(childDoc.ref, { familyId: null, updatedAt: serverTimestamp() });
  });
  
  await batch.commit();
};

export const updateFamilyName = async (familyId: string, ownerId: string, newName: string): Promise<void> => {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists() || familySnap.data().ownerId !== ownerId) {
    throw new Error("Apenas o proprietário pode editar o nome da família.");
  }
  await updateDoc(familyRef, {
    name: newName,
    updatedAt: serverTimestamp(),
  });
};

export const removeFamilyMember = async (familyId: string, userIdToRemove: string, currentUserId: string): Promise<void> => {
    const familyRef = doc(db, 'families', familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists() || familySnap.data().ownerId !== currentUserId) {
        throw new Error("Apenas o proprietário pode remover membros.");
    }
    if (userIdToRemove === currentUserId) {
        throw new Error("O proprietário não pode remover a si mesmo.");
    }

    await leaveFamily(userIdToRemove, familyId);
};

export const regenerateFamilyInviteCode = async (familyId: string, currentUserId: string): Promise<string> => {
    const familyRef = doc(db, 'families', familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists() || familySnap.data().ownerId !== currentUserId) {
        throw new Error("Apenas o proprietário pode regenerar o código.");
    }
    const newInviteCode = Math.floor(100000 + Math.random() * 900000).toString();
    await updateDoc(familyRef, { inviteCode: newInviteCode });
    return newInviteCode;
};


// --- Family Invitations ---

export const getPendingInvitationsForUser = async (userId: string): Promise<FamilyInvitation[]> => {
  const q = query(
    collection(db, 'familyInvitations'),
    where('inviteeId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyInvitation));
};

export const acceptFamilyInvitation = async (invitationId: string, userId: string): Promise<Family> => {
  const invitationRef = doc(db, 'familyInvitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  if (!invitationSnap.exists() || invitationSnap.data().inviteeId !== userId || invitationSnap.data().status !== 'pending') {
    throw new Error("Convite inválido ou já processado.");
  }
  
  const invitation = invitationSnap.data() as FamilyInvitation;
  const familyId = invitation.familyId;
  const family = await getFamilyById(familyId);
  if (!family) {
    throw new Error("Família associada ao convite não encontrada.");
  }

  const batch = writeBatch(db);
  
  // 1. Update invitation status
  batch.update(invitationRef, { status: 'accepted' });

  // 2. Create new membership
  const newMembershipRef = doc(collection(db, 'familyMemberships'));
  const newMembership: FamilyMembership = {
    id: newMembershipRef.id,
    familyId: familyId,
    userId: userId,
    role: 'Collaborator',
    joinedAt: serverTimestamp() as Timestamp,
  };
  batch.set(newMembershipRef, newMembership);

  // 3. Update children's familyId
  const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', null));
  const childrenSnapshot = await getDocs(childrenQuery);
  childrenSnapshot.forEach(childDoc => {
    batch.update(childDoc.ref, { familyId: familyId, updatedAt: serverTimestamp() });
  });
  
  await batch.commit();
  return family;
};

export const declineFamilyInvitation = async (invitationId: string): Promise<void> => {
  const invitationRef = doc(db, 'familyInvitations', invitationId);
  const invitationSnap = await getDoc(invitationRef);
  if (!invitationSnap.exists() || invitationSnap.data().status !== 'pending') {
    throw new Error("Convite inválido ou já processado.");
  }
  await updateDoc(invitationRef, { status: 'declined' });
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
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildRewardInstance));
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

export const deleteChildRewardInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<void> => {
    const q = query(
        collection(db, 'childRewardInstances'),
        where('templateId', '==', templateId),
        where('childId', '==', childId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return; // Nothing to delete
    }
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};


// --- Mission Templates (Catálogo de Missões) ---
export const addMissionTemplate = async (templateData: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<MissionTemplate> => {
  const newTemplateRef = doc(collection(db, 'missionTemplates'));
  const now = serverTimestamp() as Timestamp;
  const newTemplate: MissionTemplate = {
    id: newTemplateRef.id,
    ...templateData,
    isRecurring: !!templateData.isRecurring,
    recurrenceRule: templateData.recurrenceRule || null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newTemplateRef, newTemplate);
  return newTemplate;
};

export const getMissionTemplateById = async (templateId: string): Promise<MissionTemplate | null> => {
  const docRef = doc(db, 'missionTemplates', templateId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as MissionTemplate;
  }
  return null;
};

export const updateMissionTemplate = async (templateId: string, updates: Partial<Omit<MissionTemplate, 'id' | 'createdAt' | 'ownerId' | 'familyId'>>): Promise<void> => {
  const templateRef = doc(db, 'missionTemplates', templateId);
  await updateDoc(templateRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

export const deleteMissionTemplate = async (templateId: string): Promise<void> => {
  const templateRef = doc(db, 'missionTemplates', templateId);
  await deleteDoc(templateRef);
};

export const getMissionTemplatesByOwnerOrFamily = async (ownerId: string, familyId?: string | null): Promise<MissionTemplate[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'missionTemplates'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'missionTemplates'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('createdAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionTemplate));
};

// --- Mission Instances (Missões Atribuídas) ---

export const getMissionInstancesForContext = async (ownerId: string, familyId: string | null): Promise<MissionInstance[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'missionInstances'), where('familyId', '==', familyId));
  } else {
    q = query(collection(db, 'missionInstances'), where('ownerId', '==', ownerId), where('familyId', '==', null));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionInstance));
};

export const addMissionInstance = async (
  instanceData: Omit<MissionInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'completedAt' | 'dueDate' | 'startDate' | 'title' | 'description' | 'category' | 'starsReward' | 'xpReward' | 'isRecurring' | 'recurrenceRule' | 'completionCount' | 'completedDates' | 'exceptionDates'>,
  templateSnapshot: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'ownerId' | 'familyId'>
): Promise<MissionInstance> => {
  const newInstanceRef = doc(collection(db, 'missionInstances'));
  const now = serverTimestamp() as Timestamp;

  const newInstance: MissionInstance = {
    id: newInstanceRef.id,
    templateId: instanceData.templateId,
    childId: instanceData.childId,
    ownerId: instanceData.ownerId,
    familyId: instanceData.familyId || null,
    title: templateSnapshot.title,
    description: templateSnapshot.description || '',
    category: templateSnapshot.category,
    starsReward: templateSnapshot.starsReward,
    xpReward: templateSnapshot.xpReward,
    status: 'pending',
    assignedAt: now,
    updatedAt: now,
    dueDate: templateSnapshot.dueDate || null,
    startDate: templateSnapshot.startDate || null,
    isRecurring: !!templateSnapshot.isRecurring,
    recurrenceRule: templateSnapshot.recurrenceRule || null,
    completionCount: 0,
    completedDates: [],
    exceptionDates: [],
  };
  await setDoc(newInstanceRef, newInstance);
  return newInstance;
};

export const getActiveChildMissionInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<MissionInstance[]> => {
  const q = query(
    collection(db, 'missionInstances'),
    where('templateId', '==', templateId),
    where('childId', '==', childId),
    where('status', '==', 'pending')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as MissionInstance);
};

export const getMissionInstancesByChild = async (childId: string): Promise<MissionInstance[]> => {
  const q = query(collection(db, 'missionInstances'), where('childId', '==', childId), orderBy('assignedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionInstance));
};

export const updateMissionInstance = async (instanceId: string, updates: Partial<Omit<MissionInstance, 'id' | 'templateId' | 'childId' | 'ownerId' | 'familyId' | 'assignedAt' | 'title' | 'description' | 'category' | 'starsReward' | 'xpReward'>>): Promise<void> => {
  const instanceRef = doc(db, 'missionInstances', instanceId);
  await updateDoc(instanceRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const updateMissionInstancesByTemplateAndChild = async (
  templateId: string,
  childId: string,
  templateWithUpdates: MissionTemplate
): Promise<void> => {
    const q = query(
        collection(db, 'missionInstances'),
        where('templateId', '==', templateId),
        where('childId', '==', childId),
        where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return; // Nothing to update
    }
    
    const batch = writeBatch(db);
    const updates = {
        isRecurring: templateWithUpdates.isRecurring,
        startDate: templateWithUpdates.startDate,
        dueDate: templateWithUpdates.dueDate,
        recurrenceRule: templateWithUpdates.recurrenceRule,
        updatedAt: serverTimestamp(),
    };

    querySnapshot.forEach(doc => {
        batch.update(doc.ref, updates);
    });

    await batch.commit();
};


export const deleteMissionInstance = async (instanceId: string): Promise<void> => {
    const instanceRef = doc(db, 'missionInstances', instanceId);
    await deleteDoc(instanceRef);
};

export const deleteMissionInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<void> => {
    const q = query(
        collection(db, 'missionInstances'),
        where('templateId', '==', templateId),
        where('childId', '==', childId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return; // Nothing to delete
    }
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

export const completeMissionInstance = async (missionInstanceId: string, completionDate?: Date): Promise<ChildProfile> => {
    const missionRef = doc(db, 'missionInstances', missionInstanceId);
    
    const calculateXpForNextLevel = (level: number): number => {
        let xpForCurrentLevel = 0;
        for (let i = 1; i < level; i++) {
            xpForCurrentLevel += 100 + (i - 1) * 50;
        }
        return xpForCurrentLevel + (100 + (level - 1) * 50);
    };

    return await runTransaction(db, async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists()) {
            throw new Error("Missão não encontrada ou já foi concluída.");
        }
        
        const missionData = missionSnap.data() as MissionInstance;
        
        // Prevent re-completing for the same day
        if (completionDate && (missionData.completedDates || []).some(ts => isSameDay(ts.toDate(), completionDate))) {
            throw new Error("Esta missão já foi concluída para esta data.");
        }

        const childRef = doc(db, 'children', missionData.childId);
        const childSnap = await transaction.get(childRef);
        
        if (!childSnap.exists()) {
            throw new Error("Perfil da criança associado à missão não foi encontrado.");
        }
        
        const childData = childSnap.data() as ChildProfile;
        
        // --- Child Stats Update ---
        const currentStars = childData.stars;
        const currentXp = childData.xp;
        const newStars = currentStars + missionData.starsReward;
        const newXp = currentXp + missionData.xpReward;
        let newLevel = childData.level;

        let xpForNextLevel = calculateXpForNextLevel(childData.level);
        while (newXp >= xpForNextLevel) {
            newLevel++;
            xpForNextLevel = calculateXpForNextLevel(newLevel);
        }

        const finalChildUpdates: any = {
            stars: newStars,
            xp: newXp,
            level: newLevel,
            updatedAt: serverTimestamp(),
        };
        transaction.update(childRef, finalChildUpdates);

        // --- Mission Instance Update ---
        const completionTimestamp = completionDate ? Timestamp.fromDate(completionDate) : Timestamp.now();
        const serverUpdateTime = serverTimestamp();

        if (!missionData.isRecurring) {
            transaction.update(missionRef, {
                status: 'completed',
                completedAt: completionTimestamp,
                updatedAt: serverUpdateTime,
                completionCount: 1,
                completedDates: arrayUnion(completionTimestamp)
            });
        } else {
            const newCompletionCount = (missionData.completionCount || 0) + 1;
            const isFullyCompleted = missionData.recurrenceRule?.count && newCompletionCount >= missionData.recurrenceRule.count;

            const missionUpdates: any = {
                completionCount: newCompletionCount,
                completedDates: arrayUnion(completionTimestamp),
                updatedAt: serverUpdateTime,
            };

            if (isFullyCompleted) {
                missionUpdates.status = 'completed';
                missionUpdates.completedAt = completionTimestamp;
            }
            transaction.update(missionRef, missionUpdates);
        }
        
        return {
            ...childData,
            ...{ stars: newStars, xp: newXp, level: newLevel },
            id: childSnap.id
        } as ChildProfile;
    });
};

export const reactivateMissionInstance = async (missionInstanceId: string, dateToUndo?: Date): Promise<ChildProfile> => {
    const missionRef = doc(db, 'missionInstances', missionInstanceId);

    return await runTransaction(db, async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists()) {
            throw new Error("Missão não encontrada.");
        }
        
        const missionData = missionSnap.data() as MissionInstance;
        const completionDates = missionData.completedDates || [];
        
        if (completionDates.length === 0) {
            throw new Error("A missão não possui conclusões para serem desfeitas.");
        }
        
        let completionToRemove: Timestamp | null = null;
        if (dateToUndo) {
            completionToRemove = completionDates.find(ts => isSameDay(ts.toDate(), dateToUndo)) || null;
            if (!completionToRemove) {
                throw new Error("Não há conclusão para esta data para ser desfeita.");
            }
        } else {
            // If no date is given (from older flows like manage page), remove the most recent one.
            completionToRemove = completionDates.sort((a, b) => b.toMillis() - a.toMillis())[0];
        }

        const childRef = doc(db, 'children', missionData.childId);
        const childSnap = await transaction.get(childRef);
        
        if (!childSnap.exists()) {
            throw new Error("Perfil da criança associado à missão não foi encontrado.");
        }
        const childData = childSnap.data() as ChildProfile;

        // Revert rewards for the child
        const finalChildUpdates: any = { 
            stars: Math.max(0, childData.stars - missionData.starsReward),
            xp: Math.max(0, childData.xp - missionData.xpReward),
            updatedAt: serverTimestamp() 
        };
        // We will not de-level the child for simplicity.
        transaction.update(childRef, finalChildUpdates);
        
        // Revert mission status
        const missionUpdates: any = {
            status: 'pending',
            completedAt: null, // Always reset final completion when undoing
            updatedAt: serverTimestamp(),
            completionCount: Math.max(0, (missionData.completionCount || 0) - 1),
            completedDates: arrayRemove(completionToRemove),
        };
        
        transaction.update(missionRef, missionUpdates);

        return {
            ...childData,
            ...{ stars: finalChildUpdates.stars, xp: finalChildUpdates.xp },
            id: childSnap.id
        } as ChildProfile;
    });
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

export const updateRecurringMissionInstance = async (
  originalInstanceId: string,
  editMode: 'single' | 'forward' | 'all',
  newSchedule: {
    isRecurring: boolean;
    startDate: Date | null;
    dueDate: Date | null;
    recurrenceRule: RecurrenceRule | null;
  },
  occurrenceDate: Date
): Promise<void> => {
  const originalInstanceRef = doc(db, 'missionInstances', originalInstanceId);

  return runTransaction(db, async (transaction) => {
    const originalInstanceSnap = await transaction.get(originalInstanceRef);
    if (!originalInstanceSnap.exists()) {
      throw new Error("Missão original não encontrada para edição.");
    }
    const originalInstance = { id: originalInstanceSnap.id, ...originalInstanceSnap.data() } as MissionInstance;
    
    const scheduleUpdates = {
      isRecurring: newSchedule.isRecurring,
      startDate: newSchedule.startDate ? Timestamp.fromDate(newSchedule.startDate) : null,
      dueDate: newSchedule.dueDate ? Timestamp.fromDate(newSchedule.dueDate) : null,
      recurrenceRule: newSchedule.recurrenceRule ? {
        ...newSchedule.recurrenceRule,
        endDate: newSchedule.recurrenceRule.endDate ? Timestamp.fromMillis((newSchedule.recurrenceRule.endDate as any).getTime()) : null,
      } : null,
      updatedAt: serverTimestamp(),
    };

    if (editMode === 'all') {
      transaction.update(originalInstanceRef, scheduleUpdates);
    } 
    else if (editMode === 'single') {
      transaction.update(originalInstanceRef, {
        exceptionDates: arrayUnion(Timestamp.fromDate(startOfDay(occurrenceDate)))
      });
      
      const newInstanceRef = doc(collection(db, 'missionInstances'));
      const newOneOffInstanceData = {
          ...originalInstance,
          isRecurring: false,
          recurrenceRule: null,
          startDate: null,
          dueDate: scheduleUpdates.dueDate || Timestamp.fromDate(occurrenceDate),
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'pending',
          completionCount: 0,
          completedDates: [],
          exceptionDates: [],
      };
      delete newOneOffInstanceData.id; // Firestore generates ID
      transaction.set(newInstanceRef, newOneOffInstanceData);

    } 
    else if (editMode === 'forward') {
      const originalRule = originalInstance.recurrenceRule || { freq: 'DAILY', interval: 1 };
      const newEndDate = subDays(startOfDay(occurrenceDate), 1);
      transaction.update(originalInstanceRef, {
        recurrenceRule: { ...originalRule, endDate: Timestamp.fromDate(newEndDate) }
      });
      
      const newInstanceRef = doc(collection(db, 'missionInstances'));
      const newForwardInstanceData = {
          ...originalInstance,
          startDate: Timestamp.fromDate(occurrenceDate),
          assignedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'pending',
          completionCount: 0,
          completedDates: [],
          exceptionDates: [],
          isRecurring: scheduleUpdates.isRecurring,
          dueDate: scheduleUpdates.dueDate,
          recurrenceRule: scheduleUpdates.recurrenceRule,
      };
      delete newForwardInstanceData.id;
      transaction.set(newInstanceRef, newForwardInstanceData);
    }
  });
};
