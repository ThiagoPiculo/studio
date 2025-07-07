

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
  deleteField,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import type { ChildProfile, Family, FamilyMembership, MissionTemplate, RewardTemplate, ChildRewardInstance, Dream, UserProfile, FamilyInvitation, MissionInstance, RecurrenceRule, Notification, NotificationType } from '@/lib/types';
import { heroColors } from '../hero-colors';
import { startOfDay, isSameDay, subDays, format as formatDateFns, addDays, differenceInDays, eachDayOfInterval, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { allBadgesMap } from '../badges';
import { isMissionScheduledForDate } from '../calendar-utils';

// --- Notifications Helper ---
const createAndDispatchNotifications = async (
  childId: string,
  notificationPayload: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId'>
): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) return;

  let userIdsToNotify: string[] = [];

  if (child.familyId) {
    const members = await getFamilyMembers(child.familyId);
    userIdsToNotify = members.map(m => m.uid);
  } else {
    userIdsToNotify = [child.ownerId];
  }

  const notificationPromises = userIdsToNotify.map(userId => {
    return addNotification({
      ...notificationPayload,
      userId,
      relatedContextId: child.familyId || null,
    });
  });

  await Promise.all(notificationPromises);
};


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

export const getChildProfilesByOwner = async (ownerId: string, unassignedOnly = false): Promise<ChildProfile[]> => {
  const constraints = [where('ownerId', '==', ownerId)];
  if (unassignedOnly) {
    constraints.push(where('familyId', '==', null));
  }
  const q = query(collection(db, 'children'), ...constraints, orderBy('name', 'asc'));
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
  let q;
  // If we are in "My Space", we ONLY see personal, unassigned children.
  if (currentContextId === 'my-space') {
    q = query(collection(db, 'children'), where('ownerId', '==', currentUserId), where('familyId', '==', null));
  } else {
  // If we are in a family context, we ONLY see children from that family.
    q = query(collection(db, 'children'), where('familyId', '==', currentContextId));
  }
  
  const snapshot = await getDocs(q);
  const children = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChildProfile));
  return children.sort((a, b) => a.name.localeCompare(b.name));
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

export const resetChildProgress = async (currentUserId: string, childId: string): Promise<void> => {
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);

    if (!childSnap.exists() || childSnap.data().ownerId !== currentUserId) {
        throw new Error("Permissão negada: você só pode redefinir o progresso de crianças que você cadastrou.");
    }
  
    const batch = writeBatch(db);

    // 1. Reset the child's main profile stats
    batch.update(childRef, {
      stars: 0,
      xp: 0,
      level: 1,
      earnedBadgeIds: [],
      updatedAt: serverTimestamp(),
    });

    // 2. Find and reset all mission instances for this child
    const missionInstancesQuery = query(collection(db, "missionInstances"), where("childId", "==", childId));
    const missionInstancesSnapshot = await getDocs(missionInstancesQuery);
    missionInstancesSnapshot.forEach(missionDoc => {
      batch.update(missionDoc.ref, {
        status: 'pending',
        completionCount: 0,
        completionLog: {},
      });
    });

    // 3. Find and reset all redeemed reward instances for this child
    const rewardInstancesQuery = query(
      collection(db, "childRewardInstances"),
      where("childId", "==", childId),
      where("status", "==", "redeemed")
    );
    const rewardInstancesSnapshot = await getDocs(rewardInstancesQuery);
    rewardInstancesSnapshot.forEach(rewardDoc => {
      batch.update(rewardDoc.ref, {
        status: 'active',
        isRedeemed: false,
        redeemedAt: deleteField(),
      });
    });

    await batch.commit();
};

export const resetSelectedChildrenProgress = async (currentUserId: string, childIds: string[]): Promise<void> => {
  if (childIds.length === 0) {
    return;
  }
  const resetPromises = childIds.map(childId => resetChildProgress(currentUserId, childId));
  await Promise.all(resetPromises);
};

export const resetSchedulesForChildren = async (currentUserId: string, childIds: string[]): Promise<void> => {
  if (childIds.length === 0) return;

  // Verify ownership before proceeding
  for (const childId of childIds) {
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);
    if (!childSnap.exists() || childSnap.data().ownerId !== currentUserId) {
      throw new Error(`Permissão negada para o herói com ID ${childId}. Você não é o proprietário.`);
    }
  }

  const batch = writeBatch(db);

  // Firestore 'in' queries are limited to 30 items in the array for the web SDK.
  // We chunk the childIds array to handle more than 30 children if needed.
  const chunks = [];
  for (let i = 0; i < childIds.length; i += 30) {
    chunks.push(childIds.slice(i, i + 30));
  }
  
  for (const chunk of chunks) {
    const q = query(collection(db, 'missionInstances'), where('childId', 'in', chunk));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
  }

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
    throw new Error("Aliança não encontrada.");
  }

  const invitee = await findUserByEmail(inviteeEmail);
  if (!invitee) {
    throw new Error("Nenhum usuário encontrado com este e-mail.");
  }
  
  if (invitee.uid === family.ownerId || invitee.uid === inviterId) {
    throw new Error("Você não pode convidar a si mesmo ou o proprietário da aliança.");
  }

  const existingMembershipQuery = query(collection(db, 'familyMemberships'),
    where('familyId', '==', family.id),
    where('userId', '==', invitee.uid)
  );
  const existingMembershipSnapshot = await getDocs(existingMembershipQuery);
  if (!existingMembershipSnapshot.empty) {
    throw new Error("Este usuário já é um membro da aliança.");
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
    type: 'invite',
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newInvitationRef, newInvitation);
  
  // Notify the invitee
  await addNotification({
    userId: invitee.uid,
    type: 'alliance_join_request',
    title: 'Você foi convidado!',
    description: `${inviterName} convidou você para se juntar à aliança "${family.name}".`,
    href: '/dashboard/family',
    relatedContextId: family.id,
  });
};

export const joinFamilyByInviteCode = async (userId: string, inviteCode: string): Promise<void> => {
  const familyQuery = query(collection(db, 'families'), where('inviteCode', '==', inviteCode));
  const familySnapshot = await getDocs(familyQuery);

  if (familySnapshot.empty) {
    throw new Error("Código de convite inválido.");
  }
  const familyDoc = familySnapshot.docs[0];
  const family = { id: familyDoc.id, ...familyDoc.data() } as Family;
  
  const ownerProfile = await getUserProfile(family.ownerId);
  const joiningUserProfile = await getUserProfile(userId);
  if (!joiningUserProfile) {
    throw new Error("Perfil do usuário que está tentando entrar não foi encontrado.");
  }

  if (ownerProfile?.settings?.notifications?.['alliance_join_request'] !== false) {
    const existingRequestQuery = query(collection(db, 'familyInvitations'),
      where('familyId', '==', family.id),
      where('inviteeId', '==', userId),
      where('type', '==', 'request'),
      where('status', '==', 'pending')
    );
    const existingRequestSnapshot = await getDocs(existingRequestQuery);
    if (!existingRequestSnapshot.empty) {
        throw new Error("APPROVAL_PENDING");
    }

    const newRequestRef = doc(collection(db, 'familyInvitations'));
    const newRequest: FamilyInvitation = {
      id: newRequestRef.id,
      familyId: family.id,
      familyName: family.name,
      inviterId: family.ownerId, 
      inviterName: joiningUserProfile.name || 'Usuário sem nome', 
      inviteeId: userId, 
      inviteeEmail: joiningUserProfile.email || '',
      status: 'pending',
      type: 'request',
      createdAt: serverTimestamp() as Timestamp,
    };
    await setDoc(newRequestRef, newRequest);

    await addNotification({
      userId: family.ownerId,
      type: 'alliance_join_request',
      title: 'Pedido para entrar na Aliança',
      description: `${joiningUserProfile.name || 'Um usuário'} deseja entrar na sua aliança "${family.name}".`,
      href: '/dashboard/family',
      relatedContextId: family.id,
    });

    throw new Error("APPROVAL_PENDING");
  }


  const existingMembershipQuery = query(collection(db, 'familyMemberships'),
    where('familyId', '==', family.id),
    where('userId', '==', userId)
  );
  const existingMembershipSnapshot = await getDocs(existingMembershipQuery);
  if (!existingMembershipSnapshot.empty) {
    console.log('User is already a member of this family.');
    return;
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

  // Notify existing members
  const existingMembers = await getFamilyMembers(family.id); // This will include the new member
  const notificationPromises = existingMembers
      .filter(member => member.uid !== userId)
      .map(member => {
          return addNotification({
              userId: member.uid,
              type: 'alliance_join_approved',
              title: 'Novo membro na Aliança!',
              description: `${joiningUserProfile?.name || 'Um novo heroi'} juntou-se à aliança via código.`,
              href: '/dashboard/family',
              relatedContextId: family.id,
          });
      });
  await Promise.all(notificationPromises);
};

export const getFamilyMembers = async (familyId: string): Promise<UserProfile[]> => {
  const membershipsQuery = query(collection(db, 'familyMemberships'), where('familyId', '==', familyId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  const memberUserIds = membershipsSnapshot.docs.map(doc => (doc.data() as FamilyMembership).userId);

  if (memberUserIds.length === 0) return [];

  const usersQuery = query(collection(db, 'users'), where('__name__', 'in', memberUserIds));
  const usersSnapshot = await getDocs(usersQuery);
  const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
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
    throw new Error("Apenas o proprietário pode editar o nome da aliança.");
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

export const getPendingActionsForUser = async (userId: string): Promise<FamilyInvitation[]> => {
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
    throw new Error("Aliança associada ao convite não encontrada.");
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

  // Notify existing members
  const newMemberProfile = await getUserProfile(userId);
  const existingMembers = await getFamilyMembers(familyId); // This will include the new member
  const notificationPromises = existingMembers
      .filter(member => member.uid !== userId) // Don't notify the new member
      .map(member => {
          return addNotification({ // Using the simpler addNotification here
              userId: member.uid,
              type: 'alliance_join_approved',
              title: 'Novo membro na Aliança!',
              description: `${newMemberProfile?.name || 'Um novo heroi'} juntou-se à aliança ${family.name}.`,
              href: '/dashboard/family',
              relatedContextId: family.id,
          });
      });
  await Promise.all(notificationPromises);

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

export const getPendingJoinRequestsForFamily = async (familyId: string): Promise<FamilyInvitation[]> => {
    const q = query(collection(db, 'familyInvitations'),
        where('familyId', '==', familyId),
        where('type', '==', 'request'),
        where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyInvitation));
};


export const approveJoinRequest = async (invitationId: string, approverId: string): Promise<void> => {
  const invitationRef = doc(db, 'familyInvitations', invitationId);
  const familyId = (await getDoc(invitationRef)).data()?.familyId;
  const userId = (await getDoc(invitationRef)).data()?.inviteeId;

  await runTransaction(db, async (transaction) => {
    const invitationSnap = await transaction.get(invitationRef);
    if (!invitationSnap.exists() || invitationSnap.data().type !== 'request' || invitationSnap.data().status !== 'pending') {
      throw new Error("Pedido de entrada inválido ou já processado.");
    }
    const invitation = invitationSnap.data() as FamilyInvitation;
    if (invitation.inviterId !== approverId) {
      throw new Error("Apenas o proprietário da aliança pode aprovar pedidos.");
    }

    // Add membership
    const newMembershipRef = doc(collection(db, 'familyMemberships'));
    const newMembership: FamilyMembership = {
      id: newMembershipRef.id,
      familyId: familyId,
      userId: userId,
      role: 'Collaborator',
      joinedAt: serverTimestamp() as Timestamp,
    };
    transaction.set(newMembershipRef, newMembership);

    // Update children's familyId
    const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', null));
    const childrenSnapshot = await getDocs(childrenQuery);
    childrenSnapshot.forEach(childDoc => {
      transaction.update(childDoc.ref, { familyId: familyId, updatedAt: serverTimestamp() });
    });
    
    // Update invitation status
    transaction.update(invitationRef, { status: 'accepted' });
  });

  // Send notification to the newly added member
  const updatedInvitation = (await getDoc(invitationRef)).data() as FamilyInvitation;
  await addNotification({
      userId: updatedInvitation.inviteeId,
      type: 'alliance_join_approved',
      title: 'Você entrou na Aliança!',
      description: `Seu pedido para entrar na aliança "${updatedInvitation.familyName}" foi aprovado.`,
      href: '/dashboard/family',
      relatedContextId: updatedInvitation.familyId,
  });
};

export const declineJoinRequest = async (invitationId: string, declinerId: string): Promise<void> => {
    const invitationRef = doc(db, 'familyInvitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);
    if (!invitationSnap.exists() || invitationSnap.data().type !== 'request' || invitationSnap.data().status !== 'pending') {
      throw new Error("Pedido de entrada inválido ou já processado.");
    }
    if (invitationSnap.data().inviterId !== declinerId) {
      throw new Error("Apenas o proprietário da aliança pode recusar pedidos.");
    }
    await updateDoc(invitationRef, { status: 'declined' });
};

export const resendJoinRequestNotification = async (requestId: string): Promise<void> => {
  const requestRef = doc(db, 'familyInvitations', requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
    throw new Error("Pedido inválido ou já processado.");
  }
  const request = requestSnap.data() as FamilyInvitation;
  await addNotification({
    userId: request.inviterId, // The owner who needs to approve
    type: 'alliance_join_request',
    title: 'Lembrete: Pedido de Entrada',
    description: `${request.inviterName} ainda aguarda sua aprovação para entrar na aliança "${request.familyName}".`,
    href: '/dashboard/family',
    relatedContextId: request.familyId,
  });
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

export const redeemChildRewardInstance = async (instanceId: string, childId: string): Promise<void> => {
  const instanceRef = doc(db, 'childRewardInstances', instanceId);
  const childRef = doc(db, 'children', childId);

  await runTransaction(db, async (transaction) => {
      const instanceSnap = await transaction.get(instanceRef);
      const childSnap = await transaction.get(childRef);

      if (!instanceSnap.exists() || !childSnap.exists()) {
          throw new Error("Recompensa ou perfil da criança não encontrado.");
      }

      const instanceData = instanceSnap.data() as ChildRewardInstance;
      const childData = childSnap.data() as ChildProfile;

      if (childData.stars < instanceData.starsCost) {
          throw new Error("Estrelas insuficientes para resgatar esta recompensa.");
      }
      if (instanceData.status === 'redeemed') {
          throw new Error("Esta recompensa já foi resgatada.");
      }

      // Update child's stars
      transaction.update(childRef, {
          stars: childData.stars - instanceData.starsCost,
          updatedAt: serverTimestamp(),
      });

      // Update reward instance
      transaction.update(instanceRef, {
          status: 'redeemed',
          isRedeemed: true,
          redeemedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
      });
  });
  
  // After transaction, send notification
  const finalInstanceSnap = await getDoc(instanceRef);
  const finalChildSnap = await getDoc(childRef);
  if (!finalInstanceSnap.exists() || !finalChildSnap.exists()) return;

  const instanceData = finalInstanceSnap.data() as ChildRewardInstance;
  const childData = finalChildSnap.data() as ChildProfile;

  await createAndDispatchNotifications(childId, {
      type: 'reward_redeemed',
      title: 'Recompensa Resgatada!',
      description: `${childData.name} resgatou: "${instanceData.title}".`,
      href: `/dashboard/child/${childId}/manage`,
      relatedChildId: childId,
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
  instanceData: Omit<MissionInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'dueDate' | 'startDate' | 'title' | 'description' | 'category' | 'starsReward' | 'xpReward' | 'isRecurring' | 'recurrenceRule' | 'completionCount' | 'completionLog' | 'exceptionDates'>,
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
    completionLog: {},
    exceptionDates: {},
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

export const excludeMissionInstanceOccurrence = async (instanceId: string, dateToExclude: Date): Promise<void> => {
  const instanceRef = doc(db, 'missionInstances', instanceId);
  const dateKey = formatDateFns(startOfDay(dateToExclude), 'yyyy-MM-dd');
  await updateDoc(instanceRef, {
    [`exceptionDates.${dateKey}`]: true,
    updatedAt: serverTimestamp()
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

export const deleteFutureOccurrences = async (instanceId: string, fromDate: Date): Promise<void> => {
  const instanceRef = doc(db, 'missionInstances', instanceId);
  const newEndDate = subDays(startOfDay(fromDate), 1);

  await runTransaction(db, async (transaction) => {
    const instanceSnap = await transaction.get(instanceRef);
    if (!instanceSnap.exists()) {
      throw new Error("Missão não encontrada.");
    }
    const instanceData = instanceSnap.data() as MissionInstance;
    const rule = instanceData.recurrenceRule || { freq: 'DAILY', interval: 1 };
    
    const startDate = instanceData.startDate?.toDate();
    if (startDate && isBefore(newEndDate, startOfDay(startDate))) {
      transaction.delete(instanceRef);
    } else {
      transaction.update(instanceRef, {
        recurrenceRule: { ...rule, endDate: Timestamp.fromDate(newEndDate) },
        updatedAt: serverTimestamp(),
      });
    }
  });
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

export const recalculateAndSyncBadges = async (childId: string): Promise<void> => {
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);

    if (!childSnap.exists()) return;

    const childProfile = { id: childSnap.id, ...childSnap.data() } as ChildProfile;
    const currentBadgeIds = new Set(childProfile.earnedBadgeIds || []);
    const finalBadgeSet = new Set<string>();

    // 1. Progress-based badges (Stars & Level)
    if (childProfile.level >= 5) finalBadgeSet.add('heroi_ascensao');
    if (childProfile.level >= 10) finalBadgeSet.add('campeao_herois');
    if (childProfile.stars >= 100) finalBadgeSet.add('cacador_estrelas');
    if (childProfile.stars >= 500) finalBadgeSet.add('colecionador_tesouros');
    if (childProfile.stars >= 1000) finalBadgeSet.add('lenda_estelar');

    // 2. Completion-based badges
    const allInstancesQuery = query(collection(db, 'missionInstances'), where('childId', '==', childId));
    const allInstancesSnapshot = await getDocs(allInstancesQuery);
    const allInstances = allInstancesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionInstance));

    const totalCompletions = allInstances.reduce((sum, inst) => sum + Object.keys(inst.completionLog || {}).length, 0);
    if (totalCompletions > 0) {
        finalBadgeSet.add('hero_novato');
    }

    const completedCategories = new Set<string>();
    let hasCompletedSocialOrEnv = false;

    // Check for specific missions and categories
    for (const instance of allInstances) {
        const completions = Object.keys(instance.completionLog || {});
        if (completions.length > 0) {
            completedCategories.add(instance.category);
            const missionTitle = instance.title.toLowerCase().trim();
            if (missionTitle === 'escovar os dentes') finalBadgeSet.add('defensor_sorriso');
            if (missionTitle === 'arrumar a cama') finalBadgeSet.add('guardiao_descanso');
            if (instance.category === 'social' || instance.category === 'environmental') {
                hasCompletedSocialOrEnv = true;
            }
        }
    }

    if (completedCategories.size >= 3) {
        finalBadgeSet.add('heroi_versatil');
    }
    if (hasCompletedSocialOrEnv) {
        finalBadgeSet.add('aventureiro_nato');
    }

    // Check for single-mission streaks
    let longestStreakForAnyMission = 0;
    for (const instance of allInstances) {
        const completionDates = Object.keys(instance.completionLog || {}).map(dateStr => startOfDay(new Date(dateStr))).sort((a,b) => a.getTime() - b.getTime());
        if (completionDates.length > 1) { // Need at least 2 for a streak
            let currentMissionLongestStreak = 1;
            let currentStreak = 1;
            for (let i = 1; i < completionDates.length; i++) {
                if (differenceInDays(completionDates[i], completionDates[i-1]) === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1; // Reset streak
                }
                if (currentStreak > currentMissionLongestStreak) {
                    currentMissionLongestStreak = currentStreak;
                }
            }
            if (currentMissionLongestStreak > longestStreakForAnyMission) {
                longestStreakForAnyMission = currentMissionLongestStreak;
            }
        }
    }

    // Guardião da Rotina
    if (longestStreakForAnyMission >= 2) finalBadgeSet.add('guardiao_rotina_bronze');
    if (longestStreakForAnyMission >= 4) finalBadgeSet.add('guardiao_rotina_prata');
    if (longestStreakForAnyMission >= 6) finalBadgeSet.add('guardiao_rotina_ouro');

    // Mestre da Persistência
    if (longestStreakForAnyMission >= 30) finalBadgeSet.add('mestre_persistencia_bronze');
    if (longestStreakForAnyMission >= 45) finalBadgeSet.add('mestre_persistencia_prata');
    if (longestStreakForAnyMission >= 60) finalBadgeSet.add('mestre_persistencia_ouro');
    
    // Check for "Semana Perfeita"
    let longestPerfectStreak = 0;
    let currentPerfectStreak = 0;
    let missionsInCurrentStreak = 0;
    const today = startOfDay(new Date());

    for (let i = 0; i < 60; i++) {
        const checkDate = subDays(today, i);
        const scheduledMissions = allInstances.filter(inst => isMissionScheduledForDate(inst, checkDate));
        
        let isDayPerfect = true;
        if (scheduledMissions.length > 0) {
            missionsInCurrentStreak++;
            const allCompleted = scheduledMissions.every(inst => {
                const dateKey = formatDateFns(checkDate, 'yyyy-MM-dd');
                return inst.completionLog && inst.completionLog[dateKey];
            });
            if (!allCompleted) {
                isDayPerfect = false;
            }
        }

        if (isDayPerfect) {
            currentPerfectStreak++;
        } else {
            if (missionsInCurrentStreak > 0 && currentPerfectStreak > longestPerfectStreak) {
                longestPerfectStreak = currentPerfectStreak;
            }
            currentPerfectStreak = 0;
            missionsInCurrentStreak = 0;
        }
    }

    if (missionsInCurrentStreak > 0 && currentPerfectStreak > longestPerfectStreak) {
        longestPerfectStreak = currentPerfectStreak;
    }
    
    if (longestPerfectStreak >= 7) finalBadgeSet.add('semana_perfeita_bronze');
    if (longestPerfectStreak >= 15) finalBadgeSet.add('semana_perfeita_prata');
    if (longestPerfectStreak >= 21) finalBadgeSet.add('semana_perfeita_ouro');

    // 3. Compare and update
    const newlyAwardedBadges = [...finalBadgeSet].filter(badgeId => !currentBadgeIds.has(badgeId));
    const finalBadgeArray = Array.from(finalBadgeSet);
    
    // Only write to DB if there's a change
    if (finalBadgeArray.length !== currentBadgeIds.size || newlyAwardedBadges.length > 0) {
        await updateDoc(childRef, { earnedBadgeIds: finalBadgeArray });
    }

    // 4. Send notifications for newly awarded badges
    for (const badgeId of newlyAwardedBadges) {
        const badge = allBadgesMap.get(badgeId);
        if (badge) {
            await createAndDispatchNotifications(childId, {
                type: 'new_badge',
                title: 'Nova Conquista Desbloqueada!',
                description: `${childProfile.name} ganhou a conquista: "${badge.title}"!`,
                href: `/dashboard/child/${childId}/manage`,
                relatedChildId: childId,
            });
        }
    }
};

export const completeMissionInstance = async (missionInstanceId: string, completionDate: Date): Promise<ChildProfile | null> => {
    const missionRef = doc(db, 'missionInstances', missionInstanceId);
    
    const calculateXpForNextLevel = (level: number): number => {
        let xpForCurrentLevel = 0;
        for (let i = 1; i < level; i++) {
            xpForCurrentLevel += 100 + (i - 1) * 50;
        }
        return xpForCurrentLevel + (100 + (level - 1) * 50);
    };

    const updatedChildProfile = await runTransaction(db, async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists()) {
            throw new Error("Mission instance not found.");
        }
        
        const missionData = missionSnap.data() as MissionInstance;
        const completionDateKey = formatDateFns(completionDate, 'yyyy-MM-dd');
        
        // Prevent re-completing for the same day
        if (missionData.completionLog && missionData.completionLog[completionDateKey]) {
            console.warn("Mission already completed for this date.");
            return null;
        }

        const childRef = doc(db, 'children', missionData.childId);
        const childSnap = await transaction.get(childRef);
        
        if (!childSnap.exists()) {
             throw new Error("Child profile associated with the mission not found.");
        }
        
        const childData = childSnap.data() as ChildProfile;
        const originalLevel = childData.level;
        
        // --- Child Stats Update ---
        const newStars = childData.stars + missionData.starsReward;
        const newXp = childData.xp + missionData.xpReward;
        let newLevel = childData.level;

        let xpForNextLevel = calculateXpForNextLevel(childData.level);
        while (newXp >= xpForNextLevel) {
            newLevel++;
            xpForNextLevel = calculateXpForNextLevel(newLevel);
        }

        transaction.update(childRef, {
            stars: newStars,
            xp: newXp,
            level: newLevel,
            updatedAt: serverTimestamp(),
        });

        // --- Mission Instance Update ---
        const newCompletionCount = Object.keys(missionData.completionLog || {}).length + 1;
        const isFullyCompleted = missionData.recurrenceRule?.count && newCompletionCount >= missionData.recurrenceRule.count;

        const missionUpdates: any = {
            completionCount: newCompletionCount,
            [`completionLog.${completionDateKey}`]: Timestamp.now(),
            updatedAt: serverTimestamp(),
        };

        if (isFullyCompleted) {
            missionUpdates.status = 'completed';
        }
        transaction.update(missionRef, missionUpdates);
        
        return {
            ...childData,
            ...{ stars: newStars, xp: newXp, level: newLevel },
            id: childSnap.id,
            didLevelUp: newLevel > originalLevel, // Pass this info out
        } as ChildProfile & { didLevelUp: boolean };
    });

    if (updatedChildProfile) {
      const missionData = (await getDoc(missionRef)).data() as MissionInstance;
      
      // Notification for mission completion
      await createAndDispatchNotifications(missionData.childId, {
          type: 'mission_completed',
          title: `Missão Cumprida!`,
          description: `${updatedChildProfile.name} concluiu: "${missionData.title}" (ref. a ${formatDateFns(completionDate, 'dd/MM/yyyy')}).`,
          href: `/dashboard/child/${missionData.childId}/manage`,
          relatedChildId: missionData.childId
      });

      // Notification for level up
      if ((updatedChildProfile as any).didLevelUp) {
           await createAndDispatchNotifications(missionData.childId, {
              type: 'new_level',
              title: 'Subiu de Nível!',
              description: `${updatedChildProfile.name} alcançou o nível ${updatedChildProfile.level}!`,
              href: `/dashboard/child/${missionData.childId}/manage`,
              relatedChildId: missionData.childId
          });
      }
      
      await recalculateAndSyncBadges(updatedChildProfile.id);
    }
    return updatedChildProfile;
};

export const reactivateMissionInstance = async (missionInstanceId: string, dateToUndo?: Date): Promise<ChildProfile | null> => {
    const missionRef = doc(db, 'missionInstances', missionInstanceId);

    const updatedChildProfile = await runTransaction(db, async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists()) {
            throw new Error("Mission instance not found.");
        }
        
        const missionData = missionSnap.data() as MissionInstance;
        
        if (dateToUndo) {
             const completionDateKey = formatDateFns(dateToUndo, 'yyyy-MM-dd');
             if (!missionData.completionLog || !missionData.completionLog[completionDateKey]) {
                console.warn("No completion found for this date to undo.");
                return null;
             }
        } else {
             if (missionData.status !== 'completed') {
                console.warn("Mission is not completed, cannot reactivate.");
                return null;
            }
        }

        const childRef = doc(db, 'children', missionData.childId);
        const childSnap = await transaction.get(childRef);
        
        if (!childSnap.exists()) {
            throw new Error("Child profile associated with the mission not found.");
        }
        const childData = childSnap.data() as ChildProfile;

        // Revert rewards for the child
        const finalChildUpdates: any = { 
            stars: Math.max(0, childData.stars - missionData.starsReward),
            xp: Math.max(0, childData.xp - missionData.xpReward),
            updatedAt: serverTimestamp() 
        };
        transaction.update(childRef, finalChildUpdates);
        
        // Revert mission status
        const missionUpdates: any = {
            status: 'pending',
            updatedAt: serverTimestamp(),
        };

        if (dateToUndo) {
            const completionDateKey = formatDateFns(dateToUndo, 'yyyy-MM-dd');
            missionUpdates[`completionLog.${completionDateKey}`] = deleteField();
            missionUpdates.completionCount = Math.max(0, Object.keys(missionData.completionLog || {}).length - 1);
        } else {
            // Legacy undo
             missionUpdates.completionCount = 0;
             missionUpdates.completionLog = {};
        }
        
        transaction.update(missionRef, missionUpdates);

        return {
            ...childData,
            ...{ stars: finalChildUpdates.stars, xp: finalChildUpdates.xp },
            id: childSnap.id
        } as ChildProfile;
    });

    if (updatedChildProfile) {
        const missionData = (await getDoc(missionRef)).data() as MissionInstance;
        const description = dateToUndo 
            ? `A conclusão da missão "${missionData.title}" para ${updatedChildProfile.name} (ref. a ${formatDateFns(dateToUndo, 'dd/MM/yyyy')}) foi revertida.`
            : `A conclusão da missão "${missionData.title}" para ${updatedChildProfile.name} foi revertida.`;
        
        await createAndDispatchNotifications(missionData.childId, {
            type: 'mission_completion_undone',
            title: 'Ação Desfeita',
            description,
            href: `/dashboard/child/${missionData.childId}/manage`,
            relatedChildId: missionData.childId,
        });
        
        await recalculateAndSyncBadges(updatedChildProfile.id);
    }

    return updatedChildProfile;
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
      const dateKey = formatDateFns(startOfDay(occurrenceDate), 'yyyy-MM-dd');
      transaction.update(originalInstanceRef, {
        [`exceptionDates.${dateKey}`]: true,
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
          completionLog: {},
          exceptionDates: {},
      };
      delete (newOneOffInstanceData as any).id; // Firestore generates ID
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
          completionLog: {},
          exceptionDates: {},
          isRecurring: scheduleUpdates.isRecurring,
          dueDate: scheduleUpdates.dueDate,
          recurrenceRule: scheduleUpdates.recurrenceRule,
      };
      delete (newForwardInstanceData as any).id;
      transaction.set(newInstanceRef, newForwardInstanceData);
    }
  });
};


// --- Feature Votes ---

// This function gets the vote count.
export const getFeatureVoteCount = async (featureId: string): Promise<number> => {
  try {
    const docRef = doc(db, 'feature_votes', featureId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().likeCount || 0;
    }
    return 0;
  } catch (error) {
    console.error(`Error getting vote count for ${featureId}:`, error);
    return 0; // Fail gracefully
  }
};

// This function checks if a specific user has voted for a feature.
export const getUserFeatureVote = async (userId: string, featureId: string): Promise<boolean> => {
  try {
    const voteRef = doc(db, `feature_votes/${featureId}/voters/${userId}`);
    const voteSnap = await getDoc(voteRef);
    return voteSnap.exists();
  } catch (error) {
    console.error(`Error getting user vote for ${featureId}:`, error);
    return false; // Fail gracefully
  }
};

// This function toggles a user's vote for a feature in a single transaction.
export const toggleUserFeatureVote = async (userId: string, featureId: string): Promise<void> => {
  const featureVoteRef = doc(db, 'feature_votes', featureId);
  const userVoteRef = doc(db, `feature_votes/${featureId}/voters/${userId}`);

  await runTransaction(db, async (transaction) => {
    const userVoteSnap = await transaction.get(userVoteRef);
    const featureVoteSnap = await getDoc(featureVoteRef);
    
    const currentCount = featureVoteSnap.data()?.likeCount || 0;

    if (userVoteSnap.exists()) {
      // User has already voted, so we're un-voting.
      transaction.delete(userVoteRef);
      transaction.update(featureVoteRef, { likeCount: Math.max(0, currentCount - 1) });
    } else {
      // User has not voted, so we're adding a vote.
      transaction.set(userVoteRef, { votedAt: serverTimestamp() });
      if (featureVoteSnap.exists()) {
        transaction.update(featureVoteRef, { likeCount: currentCount + 1 });
      } else {
        transaction.set(featureVoteRef, { likeCount: 1 });
      }
    }
  });
};

// --- Notifications ---
export const addNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<void> => {
    const userProfile = await getUserProfile(notificationData.userId);
    const shouldNotify = userProfile?.settings?.notifications?.[notificationData.type] !== false;

    if (!shouldNotify) {
        return;
    }

    const newNotificationRef = doc(collection(db, 'notifications'));
    const newNotification: Omit<Notification, 'id'> = {
        ...notificationData,
        isRead: false,
        createdAt: serverTimestamp() as Timestamp,
    };
    await setDoc(newNotificationRef, newNotification);
};

export const getUserNotifications = (
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): (() => void) => { // Returns an unsubscribe function
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Notification
    );
    onUpdate(notifications);
  }, (error) => {
    console.error("Error listening to notifications:", error);
    onUpdate([]);
  });

  return unsubscribe;
};

export const markNotificationsAsRead = async (userId: string, notificationIds: string[]): Promise<void> => {
    if (notificationIds.length === 0) return;
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
        const notifRef = doc(db, 'notifications', id);
        batch.update(notifRef, { isRead: true });
    });
    await batch.commit();
};

    