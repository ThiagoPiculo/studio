
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
import type { ChildProfile, Family, FamilyMembership, MissionTemplate, RewardTemplate, ChildRewardInstance, Dream, UserProfile, FamilyInvitation } from '@/lib/types';

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

export const getUnassignedChildProfilesByOwner = async (ownerId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('ownerId', '==', ownerId), where('familyId', '==', null));
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
  return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
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


// --- Mission Templates (Catálogo de Missões) ---
export const addMissionTemplate = async (templateData: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<MissionTemplate> => {
  const newTemplateRef = doc(collection(db, 'missionTemplates'));
  const now = serverTimestamp() as Timestamp;
  const newTemplate: MissionTemplate = {
    id: newTemplateRef.id,
    ...templateData,
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
