

'use server';

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
} from 'firebase/firestore';
import { db, storage } from './config';
import { ref, uploadBytes, getDownloadURL, getMetadata, deleteObject } from "firebase/storage";

import type { ChildProfile, Family, FamilyMembership, MissionTemplate, RewardTemplate, ChildRewardInstance, Dream, UserProfile, FamilyInvitation, MissionInstance, RecurrenceRule, Notification, NotificationType, SchoolScheduleEntry, Weekday, FamilyRole } from '@/lib/types';
import { boyColors, girlColors, heroColors } from '../hero-colors';
import { startOfDay, isSameDay, subDays, format as formatDateFns, addDays, differenceInDays, eachDayOfInterval, isBefore, parse, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { allBadgesMap } from '../badges';
import { isMissionCompletedForDate, isMissionScheduledForDate, getDateObject } from '../calendar-utils';
import { predefinedRewardGroups } from '../predefined-reward-ideas';
import { auth } from './config';

const editableRoles: FamilyRole[] = ['Owner', 'Co-Owner', 'Guardian'];

// Helper to convert Firestore Timestamps in an object to strings
const convertTimestampsInObject = (obj: any): any => {
    if (!obj) return obj;

    // Handle array of objects
    if (Array.isArray(obj)) {
        return obj.map(item => convertTimestampsInObject(item));
    }
    
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value instanceof Timestamp) {
                newObj[key] = value.toDate().toISOString();
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                newObj[key] = convertTimestampsInObject(value);
            } else {
                newObj[key] = value;
            }
        }
    }
    return newObj;
};


// --- Notifications ---
export const addNotification = async (
  notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
): Promise<void> => {
  await addDoc(collection(db, 'notifications'), {
    ...notificationData,
    isRead: false,
    createdAt: serverTimestamp(),
  });
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as Notification);
};

export const markNotificationsAsRead = async (userId: string, notificationIds: string[]): Promise<void> => {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  notificationIds.forEach(id => {
    const notificationRef = doc(db, 'notifications', id);
    batch.update(notificationRef, { isRead: true });
  });
  await batch.commit();
};


// --- Notifications Helper ---
const createAndDispatchNotifications = async (
  childId: string,
  notificationPayload: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId'>,
  actor?: { id: string; name: string | null } | UserProfile
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
  
  const actorId = actor ? ('uid' in actor ? actor.uid : actor.id) : null;
  const actorName = actor?.name || null;


  const notificationPromises = userIdsToNotify
    .map(userId => {
    return addNotification({
      ...notificationPayload,
      userId,
      relatedContextId: child.familyId || null,
      actorId: actorId,
      actorName: actorName
    });
  });

  await Promise.all(notificationPromises);
};

const createAllianceNotification = async (
    familyId: string,
    actor: UserProfile,
    notificationPayload: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId' | 'relatedContextId' | 'actorId' | 'actorName'>
) => {
    const members = await getFamilyMembers(familyId);
    const notificationPromises = members
        .map(member => addNotification({
            ...notificationPayload,
            userId: member.uid,
            relatedContextId: familyId,
            actorId: actor.uid,
            actorName: actor.name || 'Um responsável',
        }));
    await Promise.all(notificationPromises);
};


// --- User Profile ---
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return convertTimestampsInObject({ uid: docSnap.id, ...docSnap.data() }) as UserProfile;
};

export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const usersQuery = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(usersQuery);
  if (querySnapshot.empty) {
    return null;
  }
  const userDoc = querySnapshot.docs[0];
  const docData = userDoc.data();
  return convertTimestampsInObject({ uid: userDoc.id, ...docData }) as UserProfile;
};


export const uploadUserAvatarAndUpdateProfile = async (userId: string, file: Blob): Promise<{ newUrl: string }> => {
  const filePath = `user_avatars/${userId}/avatar.png`;
  const fileRef = ref(storage, filePath);
  
  await uploadBytes(fileRef, file);

  const resizedFilePath = `user_avatars/${userId}/avatar_200x200.png`;
  const resizedFileRef = ref(storage, resizedFilePath);
  let newUrl = '';
  const maxAttempts = 10;
  let attempt = 0;

  while(attempt < maxAttempts) {
    try {
      await getMetadata(resizedFileRef);
      newUrl = await getDownloadURL(resizedFileRef);
      break;
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new Error("Timeout waiting for resized image.");
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }

  if (newUrl) {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { avatarUrl: newUrl });
  } else {
    throw new Error("Failed to get resized image URL.");
  }
  
  return { newUrl };
};

export const updateChildAvatarUrl = async (childId: string, avatarUrl: string): Promise<void> => {
    const childRef = doc(db, 'children', childId);
    await updateDoc(childRef, {
        avatar: avatarUrl,
        updatedAt: serverTimestamp(),
    });
};

export const deleteAvatar = async (profileId: string, userId: string, isUserAvatar = false): Promise<void> => {
    if (!profileId || !userId) throw new Error("Profile and User IDs are required.");

    const basePath = isUserAvatar ? `user_avatars/${profileId}` : `avatars/${userId}/${profileId}`;
    const originalPath = `${basePath}/avatar.png`;
    const resizedPath = `${basePath}/avatar_200x200.png`;

    const docRef = doc(db, isUserAvatar ? 'users' : 'children', profileId);
    await updateDoc(docRef, {
        avatarUrl: deleteField(),
        avatar: deleteField(),
        updatedAt: serverTimestamp(),
    });

    const originalRef = ref(storage, originalPath);
    const resizedRef = ref(storage, resizedPath);
    try { await deleteObject(originalRef); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.error(e); }
    try { await deleteObject(resizedRef); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.error(e); }
};

// --- Child Profile ---
export const addChildProfile = async (
    ownerId: string,
    childData: Omit<ChildProfile, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'accessCode' | 'stars' | 'totalStars' | 'level' | 'familyId' | 'avatar' | 'color' | 'birthDate'> & { name: string, birthDate: string, gender: 'boy' | 'girl' | 'not-informed' },
    contextId: string
): Promise<ChildProfile> => {
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  const familyId = contextId && contextId !== 'my-space' ? contextId : null;
  
  const existingChildren = familyId ? await getChildProfilesByFamily(familyId) : await getChildProfilesByOwner(ownerId);
  const usedColors = new Set(existingChildren.map(child => child.color));

  let colorPalette;
  if (childData.gender === 'boy') {
    colorPalette = boyColors;
  } else if (childData.gender === 'girl') {
    colorPalette = girlColors;
  } else {
    colorPalette = heroColors;
  }

  const availableColor = colorPalette.find(color => !usedColors.has(color)) || heroColors.find(color => !usedColors.has(color)) || heroColors[Math.floor(Math.random() * heroColors.length)];

  const newChildRef = doc(collection(db, 'children'));
  const now = serverTimestamp();
  
  const birthDateAsTimestamp = Timestamp.fromDate(parse(childData.birthDate, 'yyyy-MM-dd', new Date()));

  const newChildData = {
    ownerId,
    name: childData.name,
    birthDate: birthDateAsTimestamp,
    gender: childData.gender,
    schoolShift: childData.schoolShift || 'not_applicable',
    schoolShiftStart: childData.schoolShiftStart || '',
    schoolShiftEnd: childData.schoolShiftEnd || '',
    avatar: '',
    stars: 0,
    totalStars: 0,
    level: 1,
    accessCode,
    color: availableColor,
    createdAt: now,
    updatedAt: now,
    familyId: familyId,
  };
  await setDoc(newChildRef, newChildData);
  const finalProfile = { id: newChildRef.id, ...newChildData };
  return convertTimestampsInObject(finalProfile) as ChildProfile;
};

export const getChildProfileById = async (childId: string): Promise<ChildProfile | null> => {
  const docRef = doc(db, 'children', childId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return convertTimestampsInObject({ id: docSnap.id, ...docSnap.data() }) as ChildProfile;
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
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildProfile);
};

export const getChildProfilesByFamily = async (familyId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('familyId', '==', familyId), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildProfile);
};

export const getChildProfilesForAttribution = async (userId: string, contextId: 'my-space' | string): Promise<ChildProfile[]> => {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }
  
  let q;
  if (contextId === 'my-space') {
    q = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', null));
  } else {
    q = query(collection(db, 'children'), where('familyId', '==', contextId));
  }
  
  const snapshot = await getDocs(q);
  const children = snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildProfile);
  return children.sort((a, b) => a.name.localeCompare(b.name));
};


export const getUnassignedChildProfilesByOwner = async (ownerId: string): Promise<ChildProfile[]> => {
  const q = query(collection(db, 'children'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildProfile);
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


export const updateChildProfile = async (childId: string, updates: Partial<ChildProfile>, actor?: UserProfile): Promise<void> => {
  const childRef = doc(db, 'children', childId);
  const dataToUpdate: { [key: string]: any } = { ...updates };

  if (dataToUpdate.birthDate) {
    const dateObject = getDateObject(dataToUpdate.birthDate);
    if (dateObject) {
      dataToUpdate.birthDate = Timestamp.fromDate(dateObject);
    } else {
      delete dataToUpdate.birthDate;
    }
  }

  const childSnap = await getDoc(childRef);
  const childBeforeUpdate = childSnap.data() as ChildProfile;
  const newName = (updates.name && updates.name !== childBeforeUpdate.name) ? updates.name : childBeforeUpdate.name;


  await updateDoc(childRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });

  if (actor) {
    await createAndDispatchNotifications(
      childId,
      {
        type: 'template_updated',
        title: 'Perfil de Herói Atualizado',
        description: `${actor.name} atualizou o perfil de ${newName}.`,
        href: `/dashboard/mural?childId=${childId}&tab=edit`,
        relatedChildId: childId,
      },
      actor
    );
  }
};

export const regenerateChildAccessCode = async (childId: string, actor: UserProfile): Promise<string> => {
  const newAccessCode = Math.floor(100000 + Math.random() * 900000).toString();
  const childRef = doc(db, 'children', childId);
  await updateDoc(childRef, {
    accessCode: newAccessCode,
    updatedAt: serverTimestamp()
  });

  const child = await getChildProfileById(childId);
  if (child) {
      await createAndDispatchNotifications(
          childId,
          {
              type: 'template_updated',
              title: 'Acesso do Herói Alterado',
              description: `O código de acesso de ${child.name} foi alterado.`,
              href: `/dashboard/mural?childId=${childId}&tab=edit`,
              relatedChildId: childId,
          },
          actor
      );
  }

  return newAccessCode;
};

export const deleteChildProfile = async (childId: string, actor?: UserProfile): Promise<void> => {
  const childRef = doc(db, 'children', childId);
  const childSnap = await getDoc(childRef);
  if (!childSnap.exists()) return;
  const childData = childSnap.data() as ChildProfile;
  
  if (actor) {
    await createAndDispatchNotifications(
        childId,
        {
            type: 'template_deleted',
            title: 'Perfil Removido',
            description: `O perfil de ${childData.name} foi removido por ${actor.name}.`,
            href: '/dashboard/heroes',
            relatedChildId: childId,
        },
        actor
    );
  }

  const batch = writeBatch(db);

  const rewardInstancesQuery = query(collection(db, "childRewardInstances"), where("childId", "==", childId));
  const rewardInstancesSnapshot = await getDocs(rewardInstancesQuery);
  rewardInstancesSnapshot.forEach(doc => batch.delete(doc.ref));

  const missionInstancesQuery = query(collection(db, "missionInstances"), where("childId", "==", childId));
  const missionInstancesSnapshot = await getDocs(missionInstancesQuery);
  missionInstancesSnapshot.forEach(doc => batch.delete(doc.ref));
  
  batch.delete(childRef);

  await batch.commit();
};

export const resetChildProgress = async (actor: UserProfile, childId: string): Promise<void> => {
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);

    if (!childSnap.exists()) {
        throw new Error("Criança não encontrada");
    }

    if (childSnap.data().ownerId !== actor.uid) {
        throw new Error("Permissão negada: você só pode redefinir o progresso de crianças que você cadastrou.");
    }
  
    const batch = writeBatch(db);

    batch.update(childRef, {
      stars: 0,
      totalStars: 0,
      level: 1,
      earnedBadgeIds: [],
      updatedAt: serverTimestamp(),
    });

    const missionInstancesQuery = query(collection(db, "missionInstances"), where("childId", "==", childId));
    const missionInstancesSnapshot = await getDocs(missionInstancesQuery);
    missionInstancesSnapshot.forEach(missionDoc => {
      batch.update(missionDoc.ref, {
        status: 'pending',
        completionCount: 0,
        completionLog: {},
      });
    });

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
    
    const child = await getChildProfileById(childId);
    if(child) {
         await createAndDispatchNotifications(
            childId,
            {
                type: 'template_deleted',
                title: 'Progresso Zerado!',
                description: `O progresso de ${child.name} foi zerado por ${actor.name}.`,
                href: `/dashboard/mural?childId=${childId}&tab=edit`,
                relatedChildId: childId,
            },
            actor
        );
    }
};

export const resetSelectedChildrenProgress = async (actor: UserProfile, childIds: string[]): Promise<void> => {
  if (childIds.length === 0) {
    return;
  }
  const resetPromises = childIds.map(childId => resetChildProgress(actor, childId));
  await Promise.all(resetPromises);
};

export const resetSchedulesForChildren = async (currentUserId: string, childIds: string[]): Promise<void> => {
  if (childIds.length === 0) return;

  for (const childId of childIds) {
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);
    if (!childSnap.exists() || childSnap.data().ownerId !== currentUserId) {
      throw new Error(`Permissão negada para o heroi com ID ${childId}. Você não é o proprietário.`);
    }
  }

  const batch = writeBatch(db);

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

export const moveChildToNewContext = async (childId: string, newFamilyId: string | null, actor: UserProfile): Promise<void> => {
  const childRef = doc(db, 'children', childId);
  
  const childSnap = await getDoc(childRef);
  if (!childSnap.exists()) {
    throw new Error("Perfil do Mini Heroi não encontrado.");
  }
  if (childSnap.data().ownerId !== actor.uid) {
    throw new Error("Apenas o proprietário do perfil pode movê-lo.");
  }

  const oldFamilyId = childSnap.data().familyId || 'my-space';
  
  const batch = writeBatch(db);

  batch.update(childRef, { familyId: newFamilyId, updatedAt: serverTimestamp() });

  const missionQuery = query(collection(db, 'missionInstances'), where('childId', '==', childId));
  const missionSnapshot = await getDocs(missionQuery);
  missionSnapshot.forEach(doc => {
    batch.update(doc.ref, { familyId: newFamilyId, updatedAt: serverTimestamp() });
  });

  const rewardQuery = query(collection(db, 'childRewardInstances'), where('childId', '==', childId));
  const rewardSnapshot = await getDocs(rewardQuery);
  rewardSnapshot.forEach(doc => {
    batch.update(doc.ref, { familyId: newFamilyId, updatedAt: serverTimestamp() });
  });

  const scheduleQuery = query(collection(db, 'schoolSchedules'), where('childId', '==', childId));
  const scheduleSnapshot = await getDocs(scheduleQuery);
  scheduleSnapshot.forEach(doc => {
    batch.update(doc.ref, { familyId: newFamilyId, updatedAt: serverTimestamp() });
  });

  await batch.commit();

  const childName = childSnap.data().name;
  if (oldFamilyId !== 'my-space') {
      await createAllianceNotification(oldFamilyId, actor, {
          type: 'instance_unassigned',
          title: 'Herói Movido',
          description: `${actor.name} moveu ${childName} para fora desta aliança.`,
          href: '/dashboard/heroes',
      });
  }
  if (newFamilyId) {
      await createAllianceNotification(newFamilyId, actor, {
          type: 'instance_assigned',
          title: 'Novo Herói na Aliança!',
          description: `${actor.name} moveu ${childName} para esta aliança.`,
          href: `/dashboard/mural?childId=${childId}`,
          relatedChildId: childId,
      });
  }
};


// --- Family ---
export const createFamily = async (ownerId: string, familyName: string): Promise<Family> => {
  const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();
  const newFamilyRef = doc(collection(db, 'families'));
  const newFamily: Omit<Family, 'id'> = {
    name: familyName,
    ownerId,
    inviteCode,
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newFamilyRef, { ...newFamily, id: newFamilyRef.id });

  const newMembershipRef = doc(db, 'familyMemberships', `${ownerId}_${newFamilyRef.id}`);
  const ownerMembership: Omit<FamilyMembership, 'id'> = {
    familyId: newFamilyRef.id,
    userId: ownerId,
    role: 'Owner',
    joinedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newMembershipRef, ownerMembership);

  const childrenToUpdateQuery = query(collection(db, 'children'), where('ownerId', '==', ownerId), where('familyId', '==', null));
  const childrenSnapshot = await getDocs(childrenToUpdateQuery);
  const batch = writeBatch(db);
  childrenSnapshot.forEach(childDoc => {
    batch.update(doc(db, 'children', childDoc.id), { familyId: newFamilyRef.id, updatedAt: serverTimestamp() });
  });
  await batch.commit();

  return convertTimestampsInObject({ id: newFamilyRef.id, ...newFamily }) as Family;
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

  const existingMembershipRef = doc(db, 'familyMemberships', `${invitee.uid}_${family.id}`);
  const existingMembershipSnapshot = await getDoc(existingMembershipRef);
  if (existingMembershipSnapshot.exists()) {
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
    inviteeEmail: inviteeEmail,
    status: 'pending',
    type: 'invite',
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(newInvitationRef, newInvitation);
  
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


  const existingMembershipRef = doc(db, 'familyMemberships', `${userId}_${family.id}`);
  const existingMembershipSnapshot = await getDoc(existingMembershipRef);
  if (existingMembershipSnapshot.exists()) {
    console.log('User is already a member of this family.');
    return;
  }

  const newMembershipRef = doc(db, 'familyMemberships', `${userId}_${family.id}`);
  const newMembership: Omit<FamilyMembership, 'id'> = {
    familyId: family.id,
    userId,
    role: 'Guardian',
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

  const existingMembers = await getFamilyMembers(family.id);
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

export const getFamilyMemberships = async (familyId: string): Promise<FamilyMembership[]> => {
  const membershipsQuery = query(collection(db, 'familyMemberships'), where('familyId', '==', familyId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  return membershipsSnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as FamilyMembership);
};

export const getFamilyMembers = async (familyId: string): Promise<UserProfile[]> => {
  const membershipsQuery = query(collection(db, 'familyMemberships'), where('familyId', '==', familyId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  const memberUserIds = membershipsSnapshot.docs.map(doc => (doc.data() as FamilyMembership).userId);

  if (memberUserIds.length === 0) return [];

  const usersQuery = query(collection(db, 'users'), where('__name__', 'in', memberUserIds));
  const usersSnapshot = await getDocs(usersQuery);
  const users = usersSnapshot.docs.map(doc => convertTimestampsInObject({ uid: doc.id, ...doc.data() }) as UserProfile);
  return users.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
};

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const docRef = doc(db, 'families', familyId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (convertTimestampsInObject({ id: docSnap.id, ...docSnap.data() }) as Family) : null;
};

export const leaveFamily = async (userId: string, familyId: string): Promise<void> => {
  const batch = writeBatch(db);

  const membershipRef = doc(db, 'familyMemberships', `${userId}_${familyId}`);
  batch.delete(membershipRef);

  const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', familyId));
  const childrenSnapshot = await getDocs(childrenQuery);
  childrenSnapshot.forEach(childDoc => {
    batch.update(childDoc.ref, { familyId: null, updatedAt: serverTimestamp() });
  });

  await batch.commit();
};

export const deleteFamily = async (familyId: string): Promise<void> => {
  const batch = writeBatch(db);

  const familyRef = doc(db, 'families', familyId);
  batch.delete(familyRef);

  const membershipsQuery = query(collection(db, 'familyMemberships'), where('familyId', '==', familyId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  membershipsSnapshot.forEach(membershipDoc => {
    batch.delete(membershipDoc.ref);
  });

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

export const removeFamilyMember = async (familyId: string, userIdToRemove: string, ownerId: string): Promise<void> => {
    const familyRef = doc(db, 'families', familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists() || familySnap.data().ownerId !== ownerId) {
        throw new Error("Apenas o proprietário pode remover membros.");
    }
    if (userIdToRemove === ownerId) {
        throw new Error("O proprietário não pode remover a si mesmo.");
    }

    const batch = writeBatch(db);

    const membershipRef = doc(db, 'familyMemberships', `${userIdToRemove}_${familyId}`);
    batch.delete(membershipRef);


    const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', userIdToRemove), where('familyId', '==', familyId));
    const childrenSnapshot = await getDocs(childrenQuery);
    
    childrenSnapshot.forEach(childDoc => {
        batch.update(childDoc.ref, { 
            ownerId: ownerId,
            updatedAt: serverTimestamp() 
        });
    });

    await batch.commit();
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

export const transferFamilyOwnership = async (familyId: string, currentOwnerId: string, newOwnerId: string): Promise<void> => {
  return runTransaction(db, async (transaction) => {
    const familyRef = doc(db, 'families', familyId);
    const familySnap = await transaction.get(familyRef);

    if (!familySnap.exists() || familySnap.data().ownerId !== currentOwnerId) {
      throw new Error("Apenas o proprietário atual pode transferir a propriedade.");
    }

    const oldOwnerMembershipRef = doc(db, 'familyMemberships', `${currentOwnerId}_${familyId}`);
    const newOwnerMembershipRef = doc(db, 'familyMemberships', `${newOwnerId}_${familyId}`);

    const newOwnerMembershipSnap = await transaction.get(newOwnerMembershipRef);
    if (!newOwnerMembershipSnap.exists()) {
        throw new Error("O usuário alvo precisa ser um membro da aliança para se tornar proprietário.");
    }

    transaction.update(familyRef, { ownerId: newOwnerId });
    transaction.update(newOwnerMembershipRef, { role: 'Owner' });
    transaction.update(oldOwnerMembershipRef, { role: 'Co-Owner' });
  });
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
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as FamilyInvitation);
};

export const getPendingInvitationsForFamily = async (familyId: string): Promise<FamilyInvitation[]> => {
    const q = query(
        collection(db, 'familyInvitations'),
        where('familyId', '==', familyId),
        where('type', '==', 'invite'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as FamilyInvitation);
};

export const cancelFamilyInvitation = async (invitationId: string): Promise<void> => {
    const invitationRef = doc(db, 'familyInvitations', invitationId);
    await deleteDoc(invitationRef);
};

export const resendFamilyInvitationNotification = async (invitationId: string): Promise<void> => {
    const invitationRef = doc(db, 'familyInvitations', invitationId);
    const invitationSnap = await getDoc(invitationRef);

    if (!invitationSnap.exists() || invitationSnap.data().status !== 'pending') {
        throw new Error("Convite inválido ou já processado.");
    }

    const invite = invitationSnap.data() as FamilyInvitation;
    await updateDoc(invitationRef, { createdAt: serverTimestamp() });
    
    await addNotification({
      userId: invite.inviteeId,
      type: 'alliance_join_request',
      title: `Lembrete de Convite`,
      description: `${invite.inviterName} está aguardando você na aliança "${invite.familyName}".`,
      href: '/dashboard/family',
      relatedContextId: invite.familyId,
    });
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
  
  batch.update(invitationRef, { status: 'accepted' });

  const newMembershipRef = doc(db, 'familyMemberships', `${userId}_${familyId}`);
  const newMembership: Omit<FamilyMembership, 'id'> = {
    familyId: familyId,
    userId: userId,
    role: 'Guardian',
    joinedAt: serverTimestamp() as Timestamp,
  };
  batch.set(newMembershipRef, newMembership);

  const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', userId), where('familyId', '==', null));
  const childrenSnapshot = await getDocs(childrenQuery);
  childrenSnapshot.forEach(childDoc => {
    batch.update(doc(db, 'children', childDoc.id), { familyId: familyId, updatedAt: serverTimestamp() });
  });
  
  await batch.commit();

  const newMemberProfile = await getUserProfile(userId);
  const existingMembers = await getFamilyMembers(familyId);
  const notificationPromises = existingMembers
      .filter(member => member.uid !== userId)
      .map(member => {
          return addNotification({
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
    return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as FamilyInvitation);
};


export const approveJoinRequest = async (invitationId: string, approverId: string): Promise<void> => {
  const invitationRef = doc(db, 'familyInvitations', invitationId);
  const invitationData = (await getDoc(invitationRef)).data();

  if (!invitationData) throw new Error("Pedido não encontrado.");

  const { familyId, inviteeId } = invitationData;

  await runTransaction(db, async (transaction) => {
    const invitationSnap = await transaction.get(invitationRef);
    if (!invitationSnap.exists() || invitationSnap.data().type !== 'request' || invitationSnap.data().status !== 'pending') {
      throw new Error("Pedido de entrada inválido ou já processado.");
    }
    const invitation = invitationSnap.data() as FamilyInvitation;
    if (invitation.inviterId !== approverId) {
      throw new Error("Apenas o proprietário da aliança pode aprovar pedidos.");
    }

    const newMembershipRef = doc(db, 'familyMemberships', `${inviteeId}_${familyId}`);
    const newMembership: Omit<FamilyMembership, 'id'> = {
      familyId: familyId,
      userId: inviteeId,
      role: 'Guardian',
      joinedAt: serverTimestamp() as Timestamp,
    };
    transaction.set(newMembershipRef, newMembership);

    const childrenQuery = query(collection(db, 'children'), where('ownerId', '==', inviteeId), where('familyId', '==', null));
    const childrenSnapshot = await getDocs(childrenQuery);
    childrenSnapshot.forEach(childDoc => {
      transaction.update(childDoc.ref, { familyId: familyId, updatedAt: serverTimestamp() });
    });
    
    transaction.update(invitationRef, { status: 'accepted' });
  });

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
    userId: request.inviterId,
    type: 'alliance_join_request',
    title: 'Lembrete: Pedido de Entrada',
    description: `${request.inviterName} ainda aguarda sua aprovação para entrar na aliança "${request.familyName}".`,
    href: '/dashboard/family',
    relatedContextId: request.familyId,
  });
};

export const updateFamilyMemberRole = async (familyId: string, userId: string, newRole: FamilyRole, currentUserId: string): Promise<void> => {
    const membershipRef = doc(db, 'familyMemberships', `${userId}_${familyId}`);
    
    const family = await getFamilyById(familyId);
    if(family?.ownerId !== currentUserId) {
        throw new Error("Apenas o proprietário da aliança pode alterar papéis.");
    }

    await updateDoc(membershipRef, { role: newRole });
};

export const requestAllianceOwnership = async (familyId: string, requesterId: string): Promise<void> => {
    const family = await getFamilyById(familyId);
    if (!family || !family.ownerId) {
        throw new Error("Aliança ou proprietário não encontrado.");
    }
    if (family.ownerId === requesterId) {
        throw new Error("Você já é o proprietário.");
    }
    const requesterProfile = await getUserProfile(requesterId);
    if (!requesterProfile) {
        throw new Error("Perfil do solicitante não encontrado.");
    }

    await addNotification({
        userId: family.ownerId,
        type: 'alliance_ownership_request',
        title: 'Pedido de Transferência de Propriedade',
        description: `${requesterProfile.name} está solicitando a propriedade da aliança "${family.name}".`,
        href: `/dashboard/family`,
        relatedContextId: familyId,
    });
};

// --- Feature Votes ---
export const getFeatureVoteCount = async (featureId: string): Promise<number> => {
    const docRef = doc(db, 'featureVotes', featureId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data().count || 0;
    }
    return 0;
};

export const getUserFeatureVote = async (userId: string, featureId: string): Promise<boolean> => {
    const docRef = doc(db, 'featureVotes', featureId, 'votes', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
};

export const toggleUserFeatureVote = async (userId: string, featureId: string): Promise<void> => {
    const voteDocRef = doc(db, 'featureVotes', featureId, 'votes', userId);
    const featureDocRef = doc(db, 'featureVotes', featureId);

    await runTransaction(db, async (transaction) => {
        const voteDoc = await transaction.get(voteDocRef);
        const featureDoc = await transaction.get(featureDocRef);

        let newCount = (featureDoc.data()?.count || 0) as number;

        if (voteDoc.exists()) {
            // User has voted, so we remove the vote
            transaction.delete(voteDocRef);
            newCount = Math.max(0, newCount - 1);
        } else {
            // User has not voted, so we add the vote
            transaction.set(voteDocRef, { votedAt: serverTimestamp() });
            newCount += 1;
        }

        transaction.set(featureDocRef, { count: newCount }, { merge: true });
    });
};


// --- Reward Templates (Catálogo de Recompensas) ---
export const addRewardTemplate = async (actor: UserProfile, templateData: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<RewardTemplate> => {
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

  if (templateData.familyId) {
    await createAllianceNotification(templateData.familyId, actor, {
      type: 'template_created',
      title: 'Nova Recompensa no Catálogo!',
      description: `${actor.name} adicionou a recompensa: "${newTemplate.title}".`,
      href: '/dashboard/rewards',
    });
  }

  return convertTimestampsInObject(newTemplate);
};

export const getRewardTemplateById = async (templateId: string): Promise<RewardTemplate | null> => {
  const docRef = doc(db, 'rewardTemplates', templateId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return convertTimestampsInObject({ id: docSnap.id, ...docSnap.data() }) as RewardTemplate;
  }
  return null;
};

export const updateRewardTemplate = async (actor: UserProfile, templateId: string, updates: Partial<Omit<RewardTemplate, 'id' | 'createdAt' | 'ownerId' | 'familyId'>>): Promise<void> => {
  const templateRef = doc(db, 'rewardTemplates', templateId);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) throw new Error("Template not found");
  const familyId = templateSnap.data().familyId;

  await updateDoc(templateRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });

  if (familyId) {
    await createAllianceNotification(familyId, actor, {
      type: 'template_updated',
      title: 'Recompensa Atualizada',
      description: `${actor.name} atualizou a recompensa: "${updates.title || templateSnap.data().title}".`,
      href: `/dashboard/rewards/edit-template/${templateId}`,
    });
  }
};



export const deleteRewardTemplate = async (actor: UserProfile, template: RewardTemplate): Promise<void> => {
  const templateRef = doc(db, 'rewardTemplates', template.id);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) return;
  const templateData = templateSnap.data();
  
  await deleteDoc(templateRef);

   if (templateData.familyId) {
    await createAllianceNotification(templateData.familyId, actor, {
      type: 'template_deleted',
      title: 'Recompensa Removida do Baú',
      description: `${actor.name} removeu a recompensa: "${templateData.title}".`,
      href: '/dashboard/rewards',
    });
  }
};

export const getRewardTemplatesByOwnerOrFamily = async (ownerId: string, familyId?: string | null): Promise<RewardTemplate[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'rewardTemplates'), where('familyId', '==', familyId));
  } else {
    q = query(collection(db, 'rewardTemplates'), where('ownerId', '==', ownerId), where('familyId', '==', null));
  }

  const querySnapshot = await getDocs(q);
  const templates = querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as RewardTemplate);
  
  return templates.sort((a, b) => {
    const timeA = new Date(a.createdAt as string).getTime();
    const timeB = new Date(b.createdAt as string).getTime();
    return timeB - timeA;
  });
};



// --- Child Reward Instances (Recompensas Atribuídas) ---
export const addChildRewardInstance = async (
  actor: UserProfile,
  instanceData: Omit<ChildRewardInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'isRedeemed' | 'redeemedAt' | 'title' | 'description' | 'category' | 'starsCost' | 'isMaterial' | 'actorId'>,
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

  if (newInstance.familyId) {
    const child = await getChildProfileById(newInstance.childId);
    await createAllianceNotification(newInstance.familyId, actor, {
        type: 'instance_assigned',
        title: 'Recompensa Atribuída',
        description: `${actor.name} atribuiu "${newInstance.title}" para ${child?.name || 'um herói'}.`,
        href: `/dashboard/mural?childId=${newInstance.childId}&tab=rewards`,
        relatedChildId: newInstance.childId
    });
  }

  return convertTimestampsInObject(newInstance);
};


export const getActiveChildRewardInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<ChildRewardInstance[]> => {
  const q = query(
    collection(db, 'childRewardInstances'),
    where('templateId', '==', templateId),
    where('childId', '==', childId),
    where('status', '==', 'active')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildRewardInstance);
};


export const getChildRewardInstanceById = async (instanceId: string): Promise<ChildRewardInstance | null> => {
  const docRef = doc(db, 'childRewardInstances', instanceId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return convertTimestampsInObject({ id: docSnap.id, ...docSnap.data() }) as ChildRewardInstance;
};

export const getChildRewardInstancesByChild = async (childId: string): Promise<ChildRewardInstance[]> => {
  const q = query(collection(db, 'childRewardInstances'), where('childId', '==', childId), orderBy('assignedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildRewardInstance);
};

export const getChildRewardInstancesForContext = async (ownerId: string, familyId: string | null): Promise<ChildRewardInstance[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'childRewardInstances'), where('familyId', '==', familyId), orderBy('assignedAt', 'desc'));
  } else {
    q = query(collection(db, 'childRewardInstances'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('assignedAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as ChildRewardInstance);
};


export const updateChildRewardInstance = async (instanceId: string, updates: Partial<Omit<ChildRewardInstance, 'id' | 'templateId' | 'childId' | 'ownerId' | 'familyId' | 'assignedAt' | 'title' | 'description' | 'category' | 'starsCost' | 'isMaterial'>>): Promise<void> => {
  const instanceRef = doc(db, 'childRewardInstances', instanceId);
  await updateDoc(instanceRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

export const redeemChildRewardInstance = async (
  rewardTemplate: RewardTemplate,
  childId: string,
  actor: { id: string; name: string | null }
): Promise<void> => {
  const childRef = doc(db, 'children', childId);

  await runTransaction(db, async (transaction) => {
    const childSnap = await transaction.get(childRef);
    if (!childSnap.exists()) {
      throw new Error("Perfil da criança não encontrado.");
    }
    const childData = childSnap.data() as ChildProfile;

    if (childData.stars < rewardTemplate.starsCost) {
      throw new Error("Estrelas insuficientes para resgatar esta recompensa.");
    }
    
    transaction.update(childRef, {
      stars: childData.stars - rewardTemplate.starsCost,
      updatedAt: serverTimestamp(),
    });

    const newInstanceRef = doc(collection(db, 'childRewardInstances'));
    const newInstance: Omit<ChildRewardInstance, 'id'> = {
      templateId: rewardTemplate.id,
      childId: childId,
      ownerId: childData.ownerId,
      familyId: childData.familyId || null,
      title: rewardTemplate.title,
      description: rewardTemplate.description,
      category: rewardTemplate.category,
      starsCost: rewardTemplate.starsCost,
      isMaterial: rewardTemplate.isMaterial,
      status: 'redeemed',
      isRedeemed: true,
      redeemedAt: serverTimestamp() as Timestamp,
      assignedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      actorId: actor.id,
    };
    transaction.set(newInstanceRef, newInstance);
  });
  
  const childData = (await getDoc(childRef)).data() as ChildProfile;
  const description = actor.id === childId 
      ? `${childData.name} resgatou: "${rewardTemplate.title}".` 
      : `${actor.name || 'Um responsável'} confirmou o resgate de "${rewardTemplate.title}" para ${childData.name}.`;

  await createAndDispatchNotifications(
    childId, 
    {
      type: 'reward_redeemed',
      title: 'Recompensa Resgatada!',
      description: description,
      href: `/dashboard/mural?childId=${childId}&tab=rewards`,
      relatedChildId: childId,
    },
    actor
  );
};


export const deleteChildRewardInstance = async (actor: UserProfile, instanceId: string): Promise<void> => {
  const instanceRef = doc(db, 'childRewardInstances', instanceId);
  const instanceSnap = await getDoc(instanceRef);
  if (!instanceSnap.exists()) return;
  const instanceData = instanceSnap.data() as ChildRewardInstance;

  await deleteDoc(instanceRef);

  if (instanceData.familyId) {
    const child = await getChildProfileById(instanceData.childId);
    await createAllianceNotification(instanceData.familyId, actor, {
        type: 'instance_unassigned',
        title: 'Recompensa Desatribuída',
        description: `${actor.name} removeu a atribuição de "${instanceData.title}" para ${child?.name || 'um herói'}.`,
        href: `/dashboard/mural?childId=${instanceData.childId}&tab=rewards`,
        relatedChildId: instanceData.childId
    });
  }
};

export const deleteChildRewardInstancesByTemplateAndChild = async (actor: UserProfile, templateId: string, childId: string): Promise<void> => {
  const q = query(
    collection(db, "childRewardInstances"),
    where("templateId", "==", templateId),
    where("childId", "==", childId),
    where("status", "==", "active") // Only delete active ones
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  querySnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  const child = await getChildProfileById(childId);
  if (child?.familyId) {
    const template = await getRewardTemplateById(templateId);
    await createAllianceNotification(child.familyId, actor, {
      type: "instance_unassigned",
      title: "Recompensa Desatribuída",
      description: `${actor.name} removeu a recompensa "${template?.title}" de ${child.name}.`,
      href: `/dashboard/mural?childId=${childId}&tab=rewards`,
      relatedChildId: childId,
    });
  }
};



// --- Mission Templates (Catálogo de Missões) ---
export const addMissionTemplate = async (actor: UserProfile, templateData: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<MissionTemplate> => {
  const newTemplateRef = doc(collection(db, 'missionTemplates'));
  const now = serverTimestamp();

  // Convert dates from ISO strings to Timestamps before saving
  const newTemplate: Omit<MissionTemplate, 'id'> = {
    ...templateData,
    startDate: templateData.startDate ? Timestamp.fromDate(new Date(templateData.startDate as string)) : null,
    dueDate: templateData.dueDate ? Timestamp.fromDate(new Date(templateData.dueDate as string)) : null,
    status: 'active',
    createdAt: now as Timestamp,
    updatedAt: now as Timestamp,
  };

  await setDoc(newTemplateRef, newTemplate);

  if (templateData.familyId) {
    await createAllianceNotification(templateData.familyId, actor, {
        type: 'template_created',
        title: 'Nova Missão no Catálogo!',
        description: `${actor.name} adicionou a missão: "${newTemplate.title}".`,
        href: '/dashboard/missions',
    });
  }

  // Return the created template with ID, converting Timestamps to ISO strings for client use
  return convertTimestampsInObject({ id: newTemplateRef.id, ...newTemplate });
};

export const getMissionTemplateById = async (templateId: string): Promise<MissionTemplate | null> => {
  const docRef = doc(db, 'missionTemplates', templateId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return convertTimestampsInObject({ id: docSnap.id, ...docSnap.data() }) as MissionTemplate;
  }
  return null;
};

export const updateMissionTemplate = async (actor: UserProfile, templateId: string, updates: Partial<Omit<MissionTemplate, 'id' | 'createdAt' | 'ownerId' | 'familyId'>>): Promise<void> => {
  const templateRef = doc(db, 'missionTemplates', templateId);
  
  await runTransaction(db, async (transaction) => {
    const templateSnap = await transaction.get(templateRef);
    if (!templateSnap.exists()) {
      throw new Error("Template de missão não encontrado.");
    }
    
    transaction.update(templateRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    const instancesQuery = query(
      collection(db, 'missionInstances'),
      where('templateId', '==', templateId),
      where('status', '==', 'pending')
    );
    const instancesSnapshot = await getDocs(instancesQuery);
    
    instancesSnapshot.forEach(docSnap => {
      const instance = docSnap.data() as MissionInstance;
      if (instance.isRecurring) {
        const instanceUpdates: any = {
          updatedAt: serverTimestamp(),
        };
        if (updates.title !== undefined) instanceUpdates.title = updates.title;
        if (updates.description !== undefined) instanceUpdates.description = updates.description;
        if (updates.emoji !== undefined) instanceUpdates.emoji = updates.emoji;
        if (updates.category !== undefined) instanceUpdates.category = updates.category;
        if (updates.starsReward !== undefined) instanceUpdates.starsReward = updates.starsReward;
        
        transaction.update(docSnap.ref, instanceUpdates);
      }
    });
  });

  const finalTemplateSnap = await getDoc(templateRef);
  if (!finalTemplateSnap.exists()) return;
  const finalTemplateData = finalTemplateSnap.data();

  if (finalTemplateData.familyId) {
    await createAllianceNotification(finalTemplateData.familyId, actor, {
      type: 'template_updated',
      title: 'Missão Atualizada',
      description: `${actor.name} atualizou a missão: "${updates.title || finalTemplateData.title}". As agendas recorrentes foram sincronizadas.`,
      href: `/dashboard/missions/edit/${templateId}`,
    });
  }
};



export const deleteMissionTemplate = async (actor: UserProfile, template: MissionTemplate): Promise<void> => {
  const templateRef = doc(db, 'missionTemplates', template.id);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) return;
  const templateData = templateSnap.data();
  
  await deleteDoc(templateRef);
  
   if (templateData.familyId) {
    await createAllianceNotification(templateData.familyId, actor, {
      type: 'template_deleted',
      title: 'Missão Removida do Catálogo',
      description: `${actor.name} removeu a missão: "${templateData.title}".`,
      href: '/dashboard/missions',
    });
  }
};

export const deleteMissionTemplateAndInstances = async (actor: UserProfile, templateId: string): Promise<void> => {
  const templateRef = doc(db, 'missionTemplates', templateId);
  const templateSnap = await getDoc(templateRef);
  if (!templateSnap.exists()) return;
  const templateData = templateSnap.data();

  const batch = writeBatch(db);
  batch.delete(templateRef);

  const instancesQuery = query(collection(db, 'missionInstances'), where('templateId', '==', templateId));
  const instancesSnapshot = await getDocs(instancesQuery);
  instancesSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();

   if (templateData.familyId) {
    await createAllianceNotification(templateData.familyId, actor, {
      type: 'template_deleted',
      title: 'Missão e Agendamentos Removidos',
      description: `${actor.name} removeu a missão "${templateData.title}" e todos os seus agendamentos do catálogo e da agenda dos heróis.`,
      href: '/dashboard/missions',
    });
  }
};


export const getMissionTemplatesByOwnerOrFamily = async (ownerId: string, familyId?: string | null): Promise<MissionTemplate[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'missionTemplates'), where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'missionTemplates'), where('ownerId', '==', ownerId), where('familyId', '==', null), orderBy('createdAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionTemplate);
};

// --- Mission Instances (Missões Atribuídas) ---
export const getMissionInstancesForContext = async (userId: string, contextId: 'my-space' | string): Promise<MissionInstance[]> => {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  let q;
  if (contextId === 'my-space') {
    q = query(collection(db, 'missionInstances'), where('ownerId', '==', userId), where('familyId', '==', null));
  } else {
    q = query(collection(db, 'missionInstances'), where('familyId', '==', contextId));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
};


export const addMissionInstance = async (
  actor: UserProfile,
  instanceData: Omit<MissionInstance, 'id' | 'assignedAt' | 'updatedAt' | 'status' | 'dueDate' | 'startDate' | 'title' | 'description' | 'category' | 'starsReward' | 'isRecurring' | 'recurrenceRule' | 'completionCount' | 'completionLog' | 'exceptionDates' | 'emoji'>,
  templateSnapshot: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'ownerId' | 'familyId'>
): Promise<MissionInstance> => {
  const newInstanceRef = doc(collection(db, 'missionInstances'));
  const now = serverTimestamp();

  // Convert date strings back to Timestamps before saving
  const newInstance: Omit<MissionInstance, 'id'> = {
    templateId: instanceData.templateId,
    childId: instanceData.childId,
    ownerId: instanceData.ownerId,
    familyId: instanceData.familyId || null,
    title: templateSnapshot.title,
    description: templateSnapshot.description || '',
    emoji: templateSnapshot.emoji || '',
    category: templateSnapshot.category,
    starsReward: templateSnapshot.starsReward,
    status: 'pending',
    assignedAt: now as Timestamp,
    updatedAt: now as Timestamp,
    dueDate: templateSnapshot.dueDate ? Timestamp.fromDate(new Date(templateSnapshot.dueDate as string)) : null,
    startDate: templateSnapshot.startDate ? Timestamp.fromDate(new Date(templateSnapshot.startDate as string)) : null,
    isRecurring: !!templateSnapshot.isRecurring,
    recurrenceRule: templateSnapshot.recurrenceRule || null,
    completionCount: 0,
    completionLog: {},
    exceptionDates: {},
  };
  await setDoc(newInstanceRef, newInstance);

  if (newInstance.familyId) {
    const child = await getChildProfileById(newInstance.childId);
    await createAllianceNotification(newInstance.familyId, actor, {
        type: 'instance_assigned',
        title: 'Missão Atribuída',
        description: `${actor.name} atribuiu "${newInstance.title}" para ${child?.name || 'um herói'}.`,
        href: `/dashboard/agenda?childId=${newInstance.childId}`,
        relatedChildId: newInstance.childId
    });
  }

  return convertTimestampsInObject({ id: newInstanceRef.id, ...newInstance });
};

export const getActiveChildMissionInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<MissionInstance[]> => {
  const q = query(
    collection(db, 'missionInstances'),
    where('templateId', '==', templateId),
    where('childId', '==', childId),
    where('status', '==', 'pending')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
};

export const getActiveMissionInstancesByTemplate = async (userId: string, templateId: string, contextId: string | 'my-space'): Promise<MissionInstance[]> => {
    let q;
    const constraints = [
      where('templateId', '==', templateId),
      where('status', '==', 'pending')
    ];

    if (contextId === 'my-space') {
      if (!userId) throw new Error("Usuário não autenticado.");
      constraints.push(where('ownerId', '==', userId));
      constraints.push(where('familyId', '==', null));
    } else {
      constraints.push(where('familyId', '==', contextId));
    }

    q = query(collection(db, 'missionInstances'), ...constraints);
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
};

export const getMissionInstancesByChild = async (childId: string): Promise<MissionInstance[]> => {
  const q = query(collection(db, 'missionInstances'), where('childId', '==', childId), orderBy('assignedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as MissionInstance);
};

export const updateMissionInstance = async (instanceId: string, updates: Partial<Omit<MissionInstance, 'id' | 'templateId' | 'childId' | 'ownerId' | 'familyId' | 'assignedAt' | 'title' | 'description' | 'category' | 'starsReward' | 'emoji'>>): Promise<void> => {
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
        return;
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


export const deleteMissionInstance = async (actor: UserProfile, instanceId: string): Promise<void> => {
    const instanceRef = doc(db, 'missionInstances', instanceId);
    const instanceSnap = await getDoc(instanceRef);
    if (!instanceSnap.exists()) return;
    const instanceData = instanceSnap.data() as MissionInstance;
    
    await deleteDoc(instanceRef);

    if (instanceData.familyId) {
        const child = await getChildProfileById(instanceData.childId);
        await createAllianceNotification(instanceData.familyId, actor, {
            type: 'instance_unassigned',
            title: 'Missão Desatribuída',
            description: `${actor.name} removeu a missão "${instanceData.title}" de ${child?.name || 'um herói'}.`,
            href: `/dashboard/mural?childId=${instanceData.childId}&tab=missions`,
            relatedChildId: instanceData.childId,
        });
    }
};

export const deleteFutureOccurrences = async (instanceId: string, fromDate: Date): Promise<void> => {
  const instanceRef = doc(db, 'missionInstances', instanceId);

  await runTransaction(db, async (transaction) => {
    const instanceSnap = await transaction.get(instanceRef);
    if (!instanceSnap.exists()) {
      throw new Error("Missão não encontrada para editar.");
    }
    const instanceData = instanceSnap.data() as MissionInstance;

    if (!instanceData.isRecurring) {
      transaction.delete(instanceRef);
      return;
    }
    
    // Set the end date to the end of the previous day
    const newEndDate = endOfDay(subDays(startOfDay(fromDate), 1));
    const startDate = getDateObject(instanceData.startDate);
    
    // If the new end date is before the series even started,
    // it's safe to just delete the whole series instance.
    if (startDate && isBefore(newEndDate, startOfDay(startDate))) {
      transaction.delete(instanceRef);
    } else {
      // Otherwise, update the recurrence rule to end on the day before.
      const rule = instanceData.recurrenceRule || { freq: 'DAILY', interval: 1 };
      transaction.update(instanceRef, {
        recurrenceRule: { ...rule, endDate: Timestamp.fromDate(newEndDate), count: null },
        updatedAt: serverTimestamp(),
      });
    }
  });
};


export const deleteMissionInstancesByTemplateAndChild = async (actor: UserProfile, templateId: string, childId: string): Promise<void> => {
    const q = query(
        collection(db, 'missionInstances'),
        where('templateId', '==', templateId),
        where('childId', '==', childId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return;
    }

    const instanceData = querySnapshot.docs[0].data() as MissionInstance;
    const familyId = instanceData.familyId;

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    
    if (familyId) {
        const child = await getChildProfileById(childId);
        await createAllianceNotification(familyId, actor, {
            type: 'instance_unassigned',
            title: 'Missão Desatribuída',
            description: `${actor.name} removeu a missão "${instanceData.title}" de ${child?.name || 'um herói'}.`,
            href: `/dashboard/mural?childId=${instanceData.childId}&tab=missions`,
            relatedChildId: instanceData.childId,
        });
    }
};

export const recalculateAndSyncBadges = async (childId: string): Promise<void> => {
    const childRef = doc(db, 'children', childId);
    const childSnap = await getDoc(childRef);

    if (!childSnap.exists()) return;

    const childProfile = { id: childSnap.id, ...childSnap.data() } as ChildProfile;
    const currentBadgeIds = new Set(childProfile.earnedBadgeIds || []);
    const finalBadgeSet = new Set<string>();

    if (childProfile.level >= 5) finalBadgeSet.add('heroi_ascensao');
    if (childProfile.level >= 10) finalBadgeSet.add('campeao_herois');
    if (childProfile.level >= 15) finalBadgeSet.add('arquiteto_sonhos');
    if (childProfile.level >= 20) finalBadgeSet.add('heroi_lendario');
    if (childProfile.totalStars >= 100) finalBadgeSet.add('cacador_estrelas');
    if (childProfile.totalStars >= 500) finalBadgeSet.add('colecionador_tesouros');
    if (childProfile.totalStars >= 1000) finalBadgeSet.add('lenda_estelar');

    const allInstancesQuery = query(collection(db, 'missionInstances'), where('childId', '==', childId));
    const allInstancesSnapshot = await getDocs(allInstancesQuery);
    const allInstances = allInstancesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MissionInstance));

    const totalCompletions = allInstances.reduce((sum, inst) => sum + Object.keys(inst.completionLog || {}).length, 0);
    if (totalCompletions > 0) {
        finalBadgeSet.add('hero_novato');
    }

    const completedCategories = new Set<string>();
    let hasCompletedSocialOrEnv = false;
    let hasCompletedSports = false;

    for (const instance of allInstances) {
        const completions = Object.keys(instance.completionLog || {});
        if (completions.length > 0) {
            completedCategories.add(instance.category);
            const missionTitle = instance.title.toLowerCase().trim();
            if (missionTitle === 'escovar os dentes') finalBadgeSet.add('defensor_sorriso');
            if (missionTitle === 'arrumar a cama') finalBadgeSet.add('guardiao_descanso');
            if (missionTitle === 'fazer lição de casa') finalBadgeSet.add('mente_brilhante');
            if (missionTitle.includes('ajudar a p')) finalBadgeSet.add('maozinha_amiga');
            if (instance.category === 'social' || instance.category === 'environmental') hasCompletedSocialOrEnv = true;
            if (instance.category === 'sports') hasCompletedSports = true;
        }
    }

    if (completedCategories.size >= 3) finalBadgeSet.add('heroi_versatil');
    if (completedCategories.size >= 5) finalBadgeSet.add('explorador_talentos');
    if (hasCompletedSocialOrEnv) finalBadgeSet.add('aventureiro_nato');
    if (hasCompletedSports) finalBadgeSet.add('atleta_dedicado');

    const rewardInstancesQuery = query(collection(db, 'childRewardInstances'), where('childId', '==', childId), where('status', '==', 'redeemed'));
    const redeemedRewardsSnap = await getDocs(rewardInstancesQuery);
    if (!redeemedRewardsSnap.empty) {
        finalBadgeSet.add('conquistador_recompensas');
    }

    let longestStreakForAnyMission = 0;
    for (const instance of allInstances) {
        const completionDates = Object.keys(instance.completionLog || {}).map(dateStr => startOfDay(new Date(dateStr))).sort((a,b) => a.getTime() - b.getTime());
        if (completionDates.length > 1) {
            let currentMissionLongestStreak = 1;
            let currentStreak = 1;
            for (let i = 1; i < completionDates.length; i++) {
                if (differenceInDays(completionDates[i], completionDates[i-1]) === 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
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

    if (longestStreakForAnyMission >= 2) finalBadgeSet.add('guardiao_rotina_bronze');
    if (longestStreakForAnyMission >= 4) finalBadgeSet.add('guardiao_rotina_prata');
    if (longestStreakForAnyMission >= 6) finalBadgeSet.add('guardiao_rotina_ouro');

    if (longestStreakForAnyMission >= 30) finalBadgeSet.add('mestre_persistencia_bronze');
    if (longestStreakForAnyMission >= 45) finalBadgeSet.add('mestre_persistencia_prata');
    if (longestStreakForAnyMission >= 60) finalBadgeSet.add('mestre_persistencia_ouro');
    
    let longestPerfectStreak = 0;
    let currentPerfectStreak = 0;
    const allCompletionDates = new Set(allInstances.flatMap(inst => Object.keys(inst.completionLog || {})).map(d => startOfDay(new Date(d))));
    if (allCompletionDates.size > 0) {
        const sortedDates = Array.from(allCompletionDates).sort((a, b) => a.getTime() - b.getTime());
        const firstDate = sortedDates[0];
        const daysInInterval = eachDayOfInterval({ start: firstDate, end: startOfDay(new Date()) });
        
        for (const checkDate of daysInInterval) {
            const scheduledMissions = allInstances.filter(inst => isMissionScheduledForDate(inst, checkDate));
            if (scheduledMissions.length > 0) {
                const isDayPerfect = scheduledMissions.every(inst => isMissionCompletedForDate(inst, checkDate));
                if (isDayPerfect) {
                    currentPerfectStreak++;
                } else {
                    if (currentPerfectStreak > longestPerfectStreak) longestPerfectStreak = currentPerfectStreak;
                    currentPerfectStreak = 0;
                }
            }
        }
    }
    if (currentPerfectStreak > longestPerfectStreak) longestPerfectStreak = currentPerfectStreak;

    
    if (longestPerfectStreak >= 7) finalBadgeSet.add('semana_perfeita_bronze');
    if (longestPerfectStreak >= 15) finalBadgeSet.add('semana_perfeita_prata');
    if (longestPerfectStreak >= 21) finalBadgeSet.add('semana_perfeita_ouro');
    
    const newlyAwardedBadges = [...finalBadgeSet].filter(badgeId => !currentBadgeIds.has(badgeId));
    const finalBadgeArray = Array.from(finalBadgeSet);
    
    if (finalBadgeArray.length !== currentBadgeIds.size || newlyAwardedBadges.length > 0) {
        await updateDoc(childRef, { earnedBadgeIds: finalBadgeArray });
    }

    for (const badgeId of newlyAwardedBadges) {
        const badge = allBadgesMap.get(badgeId);
        if (badge) {
            await createAndDispatchNotifications(childId, {
                type: 'new_badge',
                title: 'Nova Medalha Desbloqueada!',
                description: `${childProfile.name} ganhou a medalha: "${badge.title}"!`,
                href: `/dashboard/mural?childId=${childId}&tab=badges`,
                relatedChildId: childId,
            });
        }
    }
};

export const completeMissionInstance = async (
  missionInstanceId: string,
  completionDate: Date,
  actor: { id: string; name: string | null }
): Promise<ChildProfile | null> => {
    const missionRef = doc(db, 'missionInstances', missionInstanceId);
    
    const calculateLevelDetails = (totalStars: number): { level: number, starsForNextLevel: number } => {
        let level = 1;
        let starsNeededForNext = 100;
        let cumulativeStars = 0;

        while (totalStars >= cumulativeStars + starsNeededForNext) {
            cumulativeStars += starsNeededForNext;
            level++;
            starsNeededForNext = 100 + (level - 1) * 50;
        }
        return { level, starsForNextLevel: cumulativeStars + starsNeededForNext };
    };

    const updatedChildProfile = await runTransaction(db, async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists()) {
            throw new Error("Mission instance not found.");
        }
        
        const missionData = missionSnap.data() as MissionInstance;
        const completionDateKey = formatDateFns(completionDate, 'yyyy-MM-dd');
        
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
        
        const newStars = childData.stars + missionData.starsReward;
        const newTotalStars = (childData.totalStars || 0) + missionData.starsReward;
        const { level: newLevel } = calculateLevelDetails(newTotalStars);

        transaction.update(childRef, {
            stars: newStars,
            totalStars: newTotalStars,
            level: newLevel,
            updatedAt: serverTimestamp(),
        });

        const newCompletionCount = Object.keys(missionData.completionLog || {}).length + 1;
        const isFullyCompleted = (!missionData.isRecurring && newCompletionCount >= 1) || (missionData.isRecurring && missionData.recurrenceRule?.count && newCompletionCount >= missionData.recurrenceRule.count);


        const missionUpdates: any = {
            completionCount: newCompletionCount,
            [`completionLog.${completionDateKey}`]: {
              completedAt: Timestamp.now(),
              stars: missionData.starsReward,
              actorId: actor.id || null,
              actorName: actor.name || null,
            },
            updatedAt: serverTimestamp(),
        };

        if (isFullyCompleted) {
            missionUpdates.status = 'completed';
        }
        transaction.update(missionRef, missionUpdates);
        
        return {
            ...childData,
            ...{ stars: newStars, totalStars: newTotalStars, level: newLevel },
            id: childSnap.id,
            didLevelUp: newLevel > originalLevel,
        } as ChildProfile & { didLevelUp: boolean };
    });

    if (updatedChildProfile) {
      const missionData = (await getDoc(missionRef)).data() as MissionInstance;
      
      const description = actor.name ? `${actor.name} marcou "${missionData.title}" como concluída para ${updatedChildProfile.name} (ref. a ${formatDateFns(completionDate, 'dd/MM/yyyy')}).` : `A missão "${missionData.title}" foi concluída para ${updatedChildProfile.name} (ref. a ${formatDateFns(completionDate, 'dd/MM/yyyy')}).`;


      await createAndDispatchNotifications(
          missionData.childId,
          {
              type: 'mission_completed',
              title: `Missão Cumprida!`,
              description: description,
              href: `/dashboard/mural?childId=${missionData.childId}&tab=missions`,
              relatedChildId: missionData.childId
          },
          actor
      );

      if ((updatedChildProfile as any).didLevelUp) {
           await createAndDispatchNotifications(missionData.childId, {
              type: 'new_level',
              title: 'Subiu de Nível!',
              description: `${updatedChildProfile.name} alcançou o nível ${updatedChildProfile.level}!`,
              href: `/dashboard/mural?childId=${missionData.childId}`,
              relatedChildId: missionData.childId
          });
      }
      
      await recalculateAndSyncBadges(updatedChildProfile.id);
    }
    return convertTimestampsInObject(updatedChildProfile);
};

export const reactivateMissionInstance = async (
  missionInstanceId: string,
  dateToUndo: Date,
  actor: { id: string; name: string | null }
): Promise<ChildProfile | null> => {
    const missionRef = doc(db, 'missionInstances', missionInstanceId);

    const calculateLevelDetails = (totalStars: number): { level: number } => {
        let level = 1;
        let starsNeededForNext = 100;
        let cumulativeStars = 0;
        while (totalStars >= cumulativeStars + starsNeededForNext) {
            cumulativeStars += starsNeededForNext;
            level++;
            starsNeededForNext = 100 + (level - 1) * 50;
        }
        return { level };
    };

    const updatedChildProfile = await runTransaction(db, async (transaction) => {
        const missionSnap = await transaction.get(missionRef);
        if (!missionSnap.exists()) {
            throw new Error("Mission instance not found.");
        }
        
        const missionData = missionSnap.data() as MissionInstance;
        
        const completionDateKey = formatDateFns(dateToUndo, 'yyyy-MM-dd');
        const completionLogEntry = missionData.completionLog ? missionData.completionLog[completionDateKey] : undefined;

        if (!completionLogEntry) {
            console.warn("No completion found for this date to undo.");
            return null;
        }

        const childRef = doc(db, 'children', missionData.childId);
        const childSnap = await transaction.get(childRef);
        
        if (!childSnap.exists()) {
            throw new Error("Child profile associated with the mission not found.");
        }
        const childData = childSnap.data() as ChildProfile;

        const starsToSubtract = completionLogEntry.stars || missionData.starsReward;
        const newTotalStars = Math.max(0, (childData.totalStars || 0) - starsToSubtract);
        const { level: newLevel } = calculateLevelDetails(newTotalStars);

        const finalChildUpdates: any = { 
            stars: Math.max(0, childData.stars - starsToSubtract),
            totalStars: newTotalStars,
            level: newLevel,
            updatedAt: serverTimestamp() 
        };
        transaction.update(childRef, finalChildUpdates);
        
        const missionUpdates: any = {
            status: 'pending',
            updatedAt: serverTimestamp(),
            [`completionLog.${completionDateKey}`]: deleteField(),
            completionCount: Math.max(0, Object.keys(missionData.completionLog || {}).length - 1),
        };
        
        transaction.update(missionRef, missionUpdates);

        return {
            ...childData,
            ...{ stars: finalChildUpdates.stars, totalStars: finalChildUpdates.totalStars },
            id: childSnap.id
        } as ChildProfile;
    });

    if (updatedChildProfile) {
        const missionData = (await getDoc(missionRef)).data() as MissionInstance;
        const description = `${actor.name || 'Alguém'} desfez a conclusão da missão "${missionData.title}" para ${updatedChildProfile.name} (ref. a ${formatDateFns(dateToUndo, 'dd/MM/yyyy')}).`;
        
        await createAndDispatchNotifications(
            missionData.childId,
            {
                type: 'mission_completion_undone',
                title: 'Ação Desfeita',
                description,
                href: `/dashboard/mural?childId=${missionData.childId}&tab=missions`,
                relatedChildId: missionData.childId,
            },
            actor
        );
        
        await recalculateAndSyncBadges(updatedChildProfile.id);
    }

    return convertTimestampsInObject(updatedChildProfile);
};


// --- Child Login ---
export const findChildByAccessCode = async (accessCode: string): Promise<ChildProfile | null> => {
  const q = query(collection(db, 'children'), where('accessCode', '==', accessCode));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const childDoc = querySnapshot.docs[0];
  return convertTimestampsInObject({ id: childDoc.id, ...childDoc.data() }) as ChildProfile;
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
    
    const scheduleUpdates: any = {
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
      scheduleUpdates.exceptionDates = {};
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
      delete (newOneOffInstanceData as any).id;
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


// --- School Schedule ---

export const getSchoolScheduleForContext = async (ownerId: string, familyId: string | null): Promise<SchoolScheduleEntry[]> => {
  let q;
  if (familyId && familyId !== 'my-space') {
    q = query(collection(db, 'schoolSchedules'), where('familyId', '==', familyId));
  } else {
    q = query(collection(db, 'schoolSchedules'), where('ownerId', '==', ownerId), where('familyId', '==', null));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as SchoolScheduleEntry);
};

export const getSchoolScheduleForChild = async (childId: string): Promise<SchoolScheduleEntry[]> => {
    const q = query(collection(db, 'schoolSchedules'), where('childId', '==', childId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertTimestampsInObject({ id: doc.id, ...doc.data() }) as SchoolScheduleEntry);
}

export const addSchoolScheduleEntry = async (entryData: Omit<SchoolScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>, actor: UserProfile): Promise<SchoolScheduleEntry> => {
  const newEntryRef = doc(collection(db, 'schoolSchedules'));
  const now = serverTimestamp() as Timestamp;

  const newEntry: Omit<SchoolScheduleEntry, 'id'> = {
    ...entryData,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newEntryRef, newEntry);

  if (newEntry.familyId) {
    const child = await getChildProfileById(newEntry.childId);
    await createAllianceNotification(newEntry.familyId, actor, {
        type: 'school_schedule_entry_created',
        title: 'Aula Adicionada à Agenda',
        description: `${actor.name} adicionou "${newEntry.subject}" para ${child?.name}.`,
        href: `/dashboard/school-schedule`,
        relatedChildId: newEntry.childId,
    });
  }

  return convertTimestampsInObject({ id: newEntryRef.id, ...newEntry }) as SchoolScheduleEntry;
};


export const addRecurringSchoolEntry = async (
    baseEntry: Omit<SchoolScheduleEntry, 'id' | 'createdAt' | 'updatedAt' | 'dayOfWeek'>, 
    days: Weekday[],
    actor: UserProfile
): Promise<SchoolScheduleEntry[]> => {
    const child = await getChildProfileById(baseEntry.childId);
    if (!child) throw new Error("Criança não encontrada.");

    if (child.ownerId !== actor.uid) {
        const membershipRef = doc(db, "familyMemberships", `${actor.uid}_${child.familyId}`);
        const membershipSnap = await getDoc(membershipRef);
        if (!membershipSnap.exists()) {
            throw new Error("Você não é membro desta aliança.");
        }
    }

    const batch = writeBatch(db);
    const now = serverTimestamp() as Timestamp;
    const newEntries: SchoolScheduleEntry[] = [];

    days.forEach(day => {
        const newEntryRef = doc(collection(db, 'schoolSchedules'));
        const newEntry: SchoolScheduleEntry = {
            id: newEntryRef.id,
            ...baseEntry,
            dayOfWeek: day,
            createdAt: now,
            updatedAt: now,
        };
        batch.set(newEntryRef, newEntry);
        newEntries.push(newEntry);
    });

    await batch.commit();

    if (baseEntry.familyId) {
        await createAllianceNotification(baseEntry.familyId, actor, {
            type: 'school_schedule_entry_created',
            title: 'Intervalo Adicionado',
            description: `${actor.name || 'Um responsável'} adicionou o intervalo de ${baseEntry.startTime} às ${baseEntry.endTime} para ${child.name}.`,
            href: `/dashboard/school-schedule`,
            relatedChildId: baseEntry.childId
        });
    }

    return convertTimestampsInObject(newEntries);
}

export const updateSchoolScheduleEntry = async (
    entryId: string, 
    updates: Partial<Omit<SchoolScheduleEntry, 'id' | 'createdAt' | 'ownerId' | 'childId' | 'familyId'>>, 
    actor: UserProfile
): Promise<SchoolScheduleEntry> => {
  const entryRef = doc(db, 'schoolSchedules', entryId);
  
  const originalSnap = await getDoc(entryRef);
  if (!originalSnap.exists()) {
    throw new Error("Entrada da agenda não encontrada.");
  }
  const originalData = originalSnap.data() as SchoolScheduleEntry;

  await updateDoc(entryRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const updatedEntry = { ...originalData, ...updates, id: entryId };

  if (originalData.familyId) {
    const child = await getChildProfileById(originalData.childId);
    await createAllianceNotification(originalData.familyId, actor, {
        type: 'school_schedule_entry_updated',
        title: 'Aula Atualizada',
        description: `${actor.name} atualizou a aula de "${updates.subject || originalData.subject}" para ${child?.name}.`,
        href: `/dashboard/school-schedule`,
        relatedChildId: originalData.childId
    });
  }

  return convertTimestampsInObject(updatedEntry);
};

export const deleteSchoolScheduleEntry = async (entryId: string, actor: UserProfile): Promise<void> => {
  const entryRef = doc(db, 'schoolSchedules', entryId);
  const originalSnap = await getDoc(entryRef);
  if (!originalSnap.exists()) return;
  const originalData = originalSnap.data() as SchoolScheduleEntry;
  
  await deleteDoc(entryRef);

  if (originalData.familyId) {
    const child = await getChildProfileById(originalData.childId);
    await createAllianceNotification(originalData.familyId, actor, {
        type: 'school_schedule_entry_deleted',
        title: 'Aula Removida',
        description: `${actor.name} removeu a aula de "${originalData.subject}" do horário de ${child?.name}.`,
        href: `/dashboard/school-schedule`,
        relatedChildId: originalData.childId
    });
  }
};

/**
 * Populates the initial set of reward templates for a new user if the collection is empty.
 * This runs on user login to ensure a fresh start or to set up a new account.
 */
export const populateInitialRewardTemplates = async (userId: string, familyId: string | null = null): Promise<void> => {
  const now = serverTimestamp();
  
  const allPredefinedRewards = predefinedRewardGroups.flatMap(group => group.items);

  const templatesCollectionRef = collection(db, 'rewardTemplates');
  const q = query(
    templatesCollectionRef,
    where('ownerId', '==', userId),
    where('familyId', '==', familyId)
  );

  const existingTemplatesSnapshot = await getDocs(q);

  // ONLY run this if the user has NO predefined rewards in this context.
  if (!existingTemplatesSnapshot.empty) {
      // Check if any of the existing ones are predefined. If so, assume population already ran.
      const hasPredefined = existingTemplatesSnapshot.docs.some(doc => doc.data().source === 'predefined');
      if (hasPredefined) {
        console.log("Reward templates already exist for this context. Skipping population.");
        return;
      }
  }

  console.log("No predefined reward templates found. Populating for the first time...");

  const batch = writeBatch(db);

  for (const idea of allPredefinedRewards) {
    const newTemplateRef = doc(templatesCollectionRef);
    const templateData = {
      ownerId: userId,
      familyId: familyId,
      title: idea.title,
      description: idea.description || '',
      category: idea.suggestedAppCategory,
      starsCost: idea.starsCost || 50,
      isMaterial: idea.isMaterialSuggestion || false,
      isUnique: false,
      status: 'active',
      source: 'predefined',
      justification: idea.justification || '',
      tip: idea.tip || '',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(newTemplateRef, templateData);
  }

  await batch.commit();
};

    

    