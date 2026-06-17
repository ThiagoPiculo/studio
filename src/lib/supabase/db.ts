import { supabase } from './config';
import type {
  ChildProfile, Family, FamilyMembership, MissionTemplate, RewardTemplate,
  ChildRewardInstance, Dream, UserProfile, FamilyInvitation, MissionInstance,
  RecurrenceRule, Notification, SchoolScheduleEntry, Weekday, FamilyRole,
} from '@/lib/types';
import { boyColors, girlColors, heroColors } from '../hero-colors';
import { startOfDay, subDays, format as formatDateFns, differenceInDays, eachDayOfInterval, isBefore, parse, endOfDay } from 'date-fns';
import { allBadgesMap } from '../badges';
import { isMissionCompletedForDate, isMissionScheduledForDate, getDateObject } from '../calendar-utils';
import { predefinedRewardGroups } from '../predefined-reward-ideas';

const now = () => new Date().toISOString();

// ─── Row mappers ──────────────────────────────────────────────────────────────

const mapChild = (r: any): ChildProfile => ({
  id: r.id, ownerId: r.owner_id, familyId: r.family_id ?? null, name: r.name,
  birthDate: r.birth_date as any, gender: r.gender, schoolShift: r.school_shift,
  schoolShiftStart: r.school_shift_start, schoolShiftEnd: r.school_shift_end,
  avatar: r.avatar, color: r.color, stars: r.stars, totalStars: r.total_stars,
  level: r.level, accessCode: r.access_code,
  earnedBadgeIds: r.earned_badge_ids ?? [], favoriteRewardIds: r.favorite_reward_ids ?? [],
  createdAt: r.created_at as any, updatedAt: r.updated_at as any,
});

const mapFamily = (r: any): Family => ({
  id: r.id, name: r.name, ownerId: r.owner_id, inviteCode: r.invite_code,
  createdAt: r.created_at as any, updatedAt: r.updated_at as any,
});

const mapMembership = (r: any): FamilyMembership => ({
  id: r.id, familyId: r.family_id, userId: r.user_id, role: r.role, joinedAt: r.joined_at as any,
});

const mapInvitation = (r: any): FamilyInvitation => ({
  id: r.id, familyId: r.family_id, familyName: r.family_name,
  inviterId: r.inviter_id, inviterName: r.inviter_name,
  inviteeId: r.invitee_id, inviteeEmail: r.invitee_email,
  status: r.status, type: r.type, createdAt: r.created_at as any,
});

const mapMissionTemplate = (r: any): MissionTemplate => ({
  id: r.id, ownerId: r.owner_id, familyId: r.family_id ?? null, title: r.title,
  description: r.description, emoji: r.emoji, category: r.category,
  starsReward: r.stars_reward, status: r.status, source: r.source,
  startDate: r.start_date as any, dueDate: r.due_date as any,
  isRecurring: r.is_recurring, recurrenceRule: r.recurrence_rule ?? null,
  createdAt: r.created_at as any, updatedAt: r.updated_at as any,
});

const mapMissionInstance = (r: any): MissionInstance => ({
  id: r.id, templateId: r.template_id, childId: r.child_id, ownerId: r.owner_id,
  familyId: r.family_id ?? null, title: r.title, description: r.description,
  emoji: r.emoji, category: r.category, starsReward: r.stars_reward,
  status: r.status, assignedAt: r.assigned_at as any, updatedAt: r.updated_at as any,
  dueDate: r.due_date as any, startDate: r.start_date as any,
  isRecurring: r.is_recurring ?? false, recurrenceRule: r.recurrence_rule ?? null,
  completionCount: r.completion_count ?? 0,
  completionLog: r.completion_log ?? {}, exceptionDates: r.exception_dates ?? {},
});

const mapRewardTemplate = (r: any): RewardTemplate => ({
  id: r.id, ownerId: r.owner_id, familyId: r.family_id ?? null, title: r.title,
  description: r.description, category: r.category, starsCost: r.stars_cost,
  isMaterial: r.is_material, isUnique: r.is_unique, status: r.status, source: r.source,
  justification: r.justification, tip: r.tip,
  createdAt: r.created_at as any, updatedAt: r.updated_at as any,
});

const mapRewardInstance = (r: any): ChildRewardInstance => ({
  id: r.id, templateId: r.template_id, childId: r.child_id, ownerId: r.owner_id,
  familyId: r.family_id ?? null, title: r.title, description: r.description,
  category: r.category, starsCost: r.stars_cost, isMaterial: r.is_material,
  status: r.status, isRedeemed: r.is_redeemed, redeemedAt: r.redeemed_at as any,
  actorId: r.actor_id, assignedAt: r.assigned_at as any, updatedAt: r.updated_at as any,
});

const mapSchoolEntry = (r: any): SchoolScheduleEntry => ({
  id: r.id, childId: r.child_id, ownerId: r.owner_id, familyId: r.family_id ?? null,
  subject: r.subject, dayOfWeek: r.day_of_week, startTime: r.start_time,
  endTime: r.end_time, color: r.color, createdAt: r.created_at as any, updatedAt: r.updated_at as any,
});

const mapNotification = (r: any): Notification => ({
  id: r.id, userId: r.user_id, type: r.type, title: r.title, description: r.description,
  href: r.href, isRead: r.is_read, createdAt: r.created_at,
  relatedChildId: r.related_child_id, relatedContextId: r.related_context_id,
  actorId: r.actor_id, actorName: r.actor_name,
});

const mapUserProfile = (r: any): UserProfile => ({
  uid: r.uid, email: r.email, name: r.name, avatarUrl: r.avatar_url,
  createdAt: r.created_at as any, settings: r.settings ?? {},
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calculateLevel = (totalStars: number): number => {
  let level = 1, starsNeeded = 100, cumulative = 0;
  while (totalStars >= cumulative + starsNeeded) {
    cumulative += starsNeeded; level++;
    starsNeeded = 100 + (level - 1) * 50;
  }
  return level;
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const addNotification = async (
  data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
): Promise<void> => {
  await supabase.from('notifications').insert({
    user_id: data.userId, type: data.type, title: data.title,
    description: data.description, href: data.href, is_read: false,
    related_child_id: data.relatedChildId ?? null,
    related_context_id: data.relatedContextId ?? null,
    actor_id: data.actorId ?? null, actor_name: data.actorName ?? null,
  });
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase.from('notifications')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapNotification);
};

export const markNotificationsAsRead = async (_userId: string, ids: string[]): Promise<void> => {
  if (!ids.length) return;
  await supabase.from('notifications').update({ is_read: true }).in('id', ids);
};

const dispatchNotificationsForChild = async (
  childId: string,
  payload: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId'>,
  actor?: { id?: string; uid?: string; name: string | null } | null,
): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) return;

  let userIds: string[] = [];
  if (child.familyId) {
    const members = await getFamilyMembers(child.familyId);
    userIds = members.map(m => m.uid);
  } else {
    userIds = [child.ownerId];
  }

  const actorId = actor ? (('uid' in actor ? actor.uid : actor.id) ?? null) : null;
  await Promise.all(userIds.map(userId => addNotification({
    ...payload, userId, relatedContextId: child.familyId ?? null,
    actorId, actorName: actor?.name ?? null,
  })));
};

const dispatchAllianceNotifications = async (
  familyId: string,
  actor: UserProfile,
  payload: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId' | 'relatedContextId' | 'actorId' | 'actorName'>
): Promise<void> => {
  const members = await getFamilyMembers(familyId);
  await Promise.all(members.map(m => addNotification({
    ...payload, userId: m.uid, relatedContextId: familyId,
    actorId: actor.uid, actorName: actor.name ?? null,
  })));
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data } = await supabase.from('user_profiles').select('*').eq('uid', uid).single();
  return data ? mapUserProfile(data) : null;
};

export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const { data } = await supabase.from('user_profiles').select('*').eq('email', email).maybeSingle();
  return data ? mapUserProfile(data) : null;
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  await supabase.from('user_profiles').update({
    name: updates.name, avatar_url: updates.avatarUrl, settings: updates.settings,
  }).eq('uid', uid);
};

export const uploadUserAvatarAndUpdateProfile = async (userId: string, file: Blob): Promise<{ newUrl: string }> => {
  const path = `user_avatars/${userId}/avatar.png`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const newUrl = data.publicUrl;
  await supabase.from('user_profiles').update({ avatar_url: newUrl }).eq('uid', userId);
  return { newUrl };
};

export const updateChildAvatarUrl = async (childId: string, avatarUrl: string): Promise<void> => {
  await supabase.from('child_profiles').update({ avatar: avatarUrl, updated_at: now() }).eq('id', childId);
};

export const deleteAvatar = async (profileId: string, _userId: string, isUserAvatar = false): Promise<void> => {
  const bucket = 'avatars';
  const path = isUserAvatar
    ? `user_avatars/${profileId}/avatar.png`
    : `avatars/${profileId}/avatar.png`;
  await supabase.storage.from(bucket).remove([path]);
  if (isUserAvatar) {
    await supabase.from('user_profiles').update({ avatar_url: null }).eq('uid', profileId);
  } else {
    await supabase.from('child_profiles').update({ avatar: null, updated_at: now() }).eq('id', profileId);
  }
};

// ─── Child Profile ────────────────────────────────────────────────────────────

export const addChildProfile = async (
  ownerId: string,
  childData: any,
  contextId: string
): Promise<ChildProfile> => {
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
  const familyId = contextId && contextId !== 'my-space' ? contextId : null;

  const existing = familyId
    ? await getChildProfilesByFamily(familyId)
    : await getChildProfilesByOwner(ownerId);
  const usedColors = new Set(existing.map(c => c.color));

  const palette = childData.gender === 'boy' ? boyColors : childData.gender === 'girl' ? girlColors : heroColors;
  const color = palette.find(c => !usedColors.has(c)) ?? heroColors[Math.floor(Math.random() * heroColors.length)];

  const { data, error } = await supabase.from('child_profiles').insert({
    owner_id: ownerId, family_id: familyId, name: childData.name,
    birth_date: childData.birthDate, gender: childData.gender,
    school_shift: childData.schoolShift ?? 'not_applicable',
    school_shift_start: childData.schoolShiftStart ?? '',
    school_shift_end: childData.schoolShiftEnd ?? '',
    avatar: '', stars: 0, total_stars: 0, level: 1,
    access_code: accessCode, color,
  }).select().single();
  if (error) throw error;
  return mapChild(data);
};

export const getChildProfileById = async (childId: string): Promise<ChildProfile | null> => {
  const { data } = await supabase.from('child_profiles').select('*').eq('id', childId).maybeSingle();
  return data ? mapChild(data) : null;
};

export const getChildProfilesByOwner = async (ownerId: string, unassignedOnly = false): Promise<ChildProfile[]> => {
  let q = supabase.from('child_profiles').select('*').eq('owner_id', ownerId);
  if (unassignedOnly) q = q.is('family_id', null);
  const { data } = await q.order('name');
  return (data ?? []).map(mapChild);
};

export const getChildProfilesByFamily = async (familyId: string): Promise<ChildProfile[]> => {
  const { data } = await supabase.from('child_profiles').select('*').eq('family_id', familyId).order('name');
  return (data ?? []).map(mapChild);
};

export const getChildProfilesForAttribution = async (userId: string, contextId: string): Promise<ChildProfile[]> => {
  let q = supabase.from('child_profiles').select('*');
  if (contextId === 'my-space') {
    q = q.eq('owner_id', userId).is('family_id', null);
  } else {
    q = q.eq('family_id', contextId);
  }
  const { data } = await q;
  return (data ?? []).map(mapChild).sort((a, b) => a.name.localeCompare(b.name));
};

export const getUnassignedChildProfilesByOwner = async (ownerId: string): Promise<ChildProfile[]> => {
  const { data } = await supabase.from('child_profiles').select('*')
    .eq('owner_id', ownerId).is('family_id', null).order('name');
  return (data ?? []).map(mapChild);
};

export const assignChildrenToFamily = async (childIds: string[], familyId: string): Promise<void> => {
  await supabase.from('child_profiles').update({ family_id: familyId, updated_at: now() }).in('id', childIds);
};

export const removeChildFromFamily = async (childId: string): Promise<void> => {
  await supabase.from('child_profiles').update({ family_id: null, updated_at: now() }).eq('id', childId);
};

export const updateChildProfile = async (childId: string, updates: Partial<ChildProfile>, actor?: UserProfile): Promise<void> => {
  const dbUpdates: any = { updated_at: now() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.schoolShift !== undefined) dbUpdates.school_shift = updates.schoolShift;
  if (updates.schoolShiftStart !== undefined) dbUpdates.school_shift_start = updates.schoolShiftStart;
  if (updates.schoolShiftEnd !== undefined) dbUpdates.school_shift_end = updates.schoolShiftEnd;
  if (updates.color !== undefined) dbUpdates.color = updates.color;

  const { data: child } = await supabase.from('child_profiles').update(dbUpdates).eq('id', childId).select().single();

  if (actor && child) {
    await dispatchNotificationsForChild(childId, {
      type: 'template_updated', title: 'Perfil de Herói Atualizado',
      description: `${actor.name} atualizou o perfil de ${child.name}.`,
      href: `/dashboard/mural?childId=${childId}&tab=edit`, relatedChildId: childId,
    }, actor);
  }
};

export const regenerateChildAccessCode = async (childId: string, actor: UserProfile): Promise<string> => {
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  await supabase.from('child_profiles').update({ access_code: newCode, updated_at: now() }).eq('id', childId);
  const child = await getChildProfileById(childId);
  if (child) {
    await dispatchNotificationsForChild(childId, {
      type: 'template_updated', title: 'Acesso do Herói Alterado',
      description: `O código de acesso de ${child.name} foi alterado.`,
      href: `/dashboard/mural?childId=${childId}&tab=edit`, relatedChildId: childId,
    }, actor);
  }
  return newCode;
};

export const deleteChildProfile = async (childId: string, actor?: UserProfile): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) return;
  if (actor) {
    await dispatchNotificationsForChild(childId, {
      type: 'template_deleted', title: 'Perfil Removido',
      description: `O perfil de ${child.name} foi removido por ${actor.name}.`,
      href: '/dashboard/heroes', relatedChildId: childId,
    }, actor);
  }
  await supabase.from('child_reward_instances').delete().eq('child_id', childId);
  await supabase.from('mission_instances').delete().eq('child_id', childId);
  await supabase.from('child_profiles').delete().eq('id', childId);
};

export const resetChildProgress = async (actor: UserProfile, childId: string): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) throw new Error('Criança não encontrada');
  if (child.ownerId !== actor.uid) throw new Error('Permissão negada.');

  await supabase.from('child_profiles').update({
    stars: 0, total_stars: 0, level: 1, earned_badge_ids: [], updated_at: now(),
  }).eq('id', childId);

  await supabase.from('mission_instances').update({
    status: 'pending', completion_count: 0, completion_log: {},
  }).eq('child_id', childId);

  await supabase.from('child_reward_instances').update({
    status: 'active', is_redeemed: false, redeemed_at: null,
  }).eq('child_id', childId).eq('status', 'redeemed');

  await dispatchNotificationsForChild(childId, {
    type: 'template_deleted', title: 'Progresso Zerado!',
    description: `O progresso de ${child.name} foi zerado por ${actor.name}.`,
    href: `/dashboard/mural?childId=${childId}&tab=edit`, relatedChildId: childId,
  }, actor);
};

export const resetSelectedChildrenProgress = async (actor: UserProfile, childIds: string[]): Promise<void> => {
  await Promise.all(childIds.map(id => resetChildProgress(actor, id)));
};

export const resetSchedulesForChildren = async (currentUserId: string, childIds: string[]): Promise<void> => {
  if (!childIds.length) return;
  const children = await Promise.all(childIds.map(id => getChildProfileById(id)));
  for (const child of children) {
    if (!child || child.ownerId !== currentUserId) throw new Error('Permissão negada.');
  }
  await supabase.from('mission_instances').delete().in('child_id', childIds);
};

export const moveChildToNewContext = async (childId: string, newFamilyId: string | null, actor: UserProfile): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) throw new Error('Herói não encontrado.');
  if (child.ownerId !== actor.uid) throw new Error('Apenas o proprietário pode mover o herói.');

  const oldFamilyId = child.familyId;

  await supabase.from('child_profiles').update({ family_id: newFamilyId, updated_at: now() }).eq('id', childId);
  await supabase.from('mission_instances').update({ family_id: newFamilyId, updated_at: now() }).eq('child_id', childId);
  await supabase.from('child_reward_instances').update({ family_id: newFamilyId, updated_at: now() }).eq('child_id', childId);
  await supabase.from('school_schedule_entries').update({ family_id: newFamilyId, updated_at: now() }).eq('child_id', childId);

  if (oldFamilyId) {
    await dispatchAllianceNotifications(oldFamilyId, actor, {
      type: 'instance_unassigned', title: 'Herói Removido',
      description: `${actor.name} moveu ${child.name} para fora desta aliança.`,
      href: '/dashboard/heroes',
    });
  }
  if (newFamilyId) {
    await dispatchAllianceNotifications(newFamilyId, actor, {
      type: 'instance_assigned', title: 'Novo Herói na Aliança!',
      description: `${actor.name} moveu ${child.name} para esta aliança.`,
      href: `/dashboard/mural?childId=${childId}`, relatedChildId: childId,
    });
  }
};

// ─── Family ───────────────────────────────────────────────────────────────────

export const createFamily = async (ownerId: string, familyName: string): Promise<Family> => {
  const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();

  const { data: family, error } = await supabase.from('families').insert({
    name: familyName, owner_id: ownerId, invite_code: inviteCode,
  }).select().single();
  if (error) throw error;

  await supabase.from('family_memberships').insert({
    family_id: family.id, user_id: ownerId, role: 'Owner',
  });

  const { data: unassigned } = await supabase.from('child_profiles')
    .select('id').eq('owner_id', ownerId).is('family_id', null);
  if (unassigned?.length) {
    await supabase.from('child_profiles')
      .update({ family_id: family.id, updated_at: now() })
      .in('id', unassigned.map((c: any) => c.id));
  }

  return mapFamily(family);
};

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const { data } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle();
  return data ? mapFamily(data) : null;
};

export const getFamilyMemberships = async (familyId: string): Promise<FamilyMembership[]> => {
  const { data } = await supabase.from('family_memberships').select('*').eq('family_id', familyId);
  return (data ?? []).map(mapMembership);
};

export const getFamilyMembers = async (familyId: string): Promise<UserProfile[]> => {
  const { data: memberships } = await supabase.from('family_memberships').select('user_id').eq('family_id', familyId);
  if (!memberships?.length) return [];
  const ids = memberships.map((m: any) => m.user_id);
  const { data: users } = await supabase.from('user_profiles').select('*').in('uid', ids);
  return (users ?? []).map(mapUserProfile).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
};

export const updateFamilyName = async (familyId: string, ownerId: string, newName: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family || family.ownerId !== ownerId) throw new Error('Apenas o proprietário pode editar.');
  await supabase.from('families').update({ name: newName, updated_at: now() }).eq('id', familyId);
};

export const leaveFamily = async (userId: string, familyId: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family) throw new Error('Aliança não encontrada.');
  if (family.ownerId === userId) throw new Error('O proprietário não pode sair. Transfira a propriedade primeiro.');

  await supabase.from('family_memberships').delete().eq('family_id', familyId).eq('user_id', userId);
  await supabase.from('child_profiles').update({ family_id: null, updated_at: now() })
    .eq('owner_id', userId).eq('family_id', familyId);
};

export const deleteFamily = async (familyId: string, actor: UserProfile): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family || family.ownerId !== actor.uid) throw new Error('Apenas o proprietário pode excluir.');

  await supabase.from('child_profiles').update({ family_id: null, updated_at: now() }).eq('family_id', familyId);
  await supabase.from('family_memberships').delete().eq('family_id', familyId);
  await supabase.from('families').delete().eq('id', familyId);
};

export const removeFamilyMember = async (familyId: string, userIdToRemove: string, ownerId: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family || family.ownerId !== ownerId) throw new Error('Apenas o proprietário pode remover membros.');
  if (userIdToRemove === ownerId) throw new Error('O proprietário não pode remover a si mesmo.');

  await supabase.from('family_memberships').delete().eq('family_id', familyId).eq('user_id', userIdToRemove);
  await supabase.from('child_profiles').update({ owner_id: ownerId, updated_at: now() })
    .eq('owner_id', userIdToRemove).eq('family_id', familyId);
};

export const regenerateFamilyInviteCode = async (familyId: string, currentUserId: string): Promise<string> => {
  const family = await getFamilyById(familyId);
  if (!family || family.ownerId !== currentUserId) throw new Error('Apenas o proprietário pode regenerar o código.');
  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  await supabase.from('families').update({ invite_code: newCode }).eq('id', familyId);
  return newCode;
};

export const transferFamilyOwnership = async (familyId: string, currentOwnerId: string, newOwnerId: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family || family.ownerId !== currentOwnerId) throw new Error('Apenas o proprietário atual pode transferir.');

  await supabase.from('families').update({ owner_id: newOwnerId }).eq('id', familyId);
  await supabase.from('family_memberships').update({ role: 'Owner' }).eq('family_id', familyId).eq('user_id', newOwnerId);
  await supabase.from('family_memberships').update({ role: 'Co-Owner' }).eq('family_id', familyId).eq('user_id', currentOwnerId);
};

export const updateFamilyMemberRole = async (familyId: string, userId: string, newRole: FamilyRole, currentUserId: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (family?.ownerId !== currentUserId) throw new Error('Apenas o proprietário pode alterar papéis.');
  await supabase.from('family_memberships').update({ role: newRole }).eq('family_id', familyId).eq('user_id', userId);
};

export const requestAllianceOwnership = async (familyId: string, requesterId: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family) throw new Error('Aliança não encontrada.');
  if (family.ownerId === requesterId) throw new Error('Você já é o proprietário.');
  const requester = await getUserProfile(requesterId);
  if (!requester) throw new Error('Perfil não encontrado.');
  await addNotification({
    userId: family.ownerId, type: 'alliance_ownership_request',
    title: 'Pedido de Transferência de Propriedade',
    description: `${requester.name} está solicitando a propriedade da aliança "${family.name}".`,
    href: '/dashboard/family', relatedContextId: familyId,
  });
};

// ─── Family Invitations ───────────────────────────────────────────────────────

export const createFamilyInvitation = async (familyId: string, inviterId: string, inviterName: string, inviteeEmail: string): Promise<void> => {
  const family = await getFamilyById(familyId);
  if (!family) throw new Error('Aliança não encontrada.');
  const invitee = await findUserByEmail(inviteeEmail);
  if (!invitee) throw new Error('Nenhum usuário encontrado com este e-mail.');
  if (invitee.uid === inviterId) throw new Error('Você não pode convidar a si mesmo.');

  const { data: existing } = await supabase.from('family_memberships')
    .select('id').eq('family_id', familyId).eq('user_id', invitee.uid).maybeSingle();
  if (existing) throw new Error('Este usuário já é membro.');

  const { data: pending } = await supabase.from('family_invitations').select('id')
    .eq('family_id', familyId).eq('invitee_id', invitee.uid).eq('status', 'pending').maybeSingle();
  if (pending) throw new Error('Já existe um convite pendente.');

  await supabase.from('family_invitations').insert({
    family_id: familyId, family_name: family.name, inviter_id: inviterId,
    inviter_name: inviterName, invitee_id: invitee.uid, invitee_email: inviteeEmail,
    status: 'pending', type: 'invite',
  });

  await addNotification({
    userId: invitee.uid, type: 'alliance_join_request',
    title: 'Você foi convidado!',
    description: `${inviterName} convidou você para se juntar à aliança "${family.name}".`,
    href: '/dashboard/alliances', relatedContextId: familyId,
  });
};

export const joinFamilyByInviteCode = async (userId: string, inviteCode: string): Promise<void> => {
  const { data: familyRow } = await supabase.from('families').select('*').eq('invite_code', inviteCode).maybeSingle();
  if (!familyRow) throw new Error('Código de convite inválido.');
  const family = mapFamily(familyRow);

  const joiner = await getUserProfile(userId);
  if (!joiner) throw new Error('Perfil não encontrado.');

  const owner = await getUserProfile(family.ownerId);
  if (owner?.settings?.notifications?.['alliance_join_request'] !== false) {
    const { data: existingRequest } = await supabase.from('family_invitations').select('id')
      .eq('family_id', family.id).eq('invitee_id', userId).eq('type', 'request').eq('status', 'pending').maybeSingle();
    if (existingRequest) throw new Error('APPROVAL_PENDING');

    await supabase.from('family_invitations').insert({
      family_id: family.id, family_name: family.name,
      inviter_id: family.ownerId, inviter_name: joiner.name ?? '',
      invitee_id: userId, invitee_email: joiner.email ?? '',
      status: 'pending', type: 'request',
    });
    await addNotification({
      userId: family.ownerId, type: 'alliance_join_request',
      title: 'Pedido para entrar na Aliança',
      description: `${joiner.name ?? 'Um usuário'} deseja entrar na sua aliança "${family.name}".`,
      href: `/dashboard/alliances/${family.id}`, relatedContextId: family.id,
    });
    throw new Error('APPROVAL_PENDING');
  }

  const { data: existingMember } = await supabase.from('family_memberships').select('id')
    .eq('family_id', family.id).eq('user_id', userId).maybeSingle();
  if (existingMember) return;

  await supabase.from('family_memberships').insert({ family_id: family.id, user_id: userId, role: 'Guardian' });
  const { data: unassigned } = await supabase.from('child_profiles').select('id')
    .eq('owner_id', userId).is('family_id', null);
  if (unassigned?.length) {
    await supabase.from('child_profiles').update({ family_id: family.id, updated_at: now() })
      .in('id', unassigned.map((c: any) => c.id));
  }

  const members = await getFamilyMembers(family.id);
  await Promise.all(members.filter(m => m.uid !== userId).map(m => addNotification({
    userId: m.uid, type: 'alliance_join_approved', title: 'Novo membro na Aliança!',
    description: `${joiner.name ?? 'Um novo herói'} juntou-se à aliança via código.`,
    href: `/dashboard/alliances/${family.id}`, relatedContextId: family.id,
  })));
};

export const getPendingActionsForUser = async (userId: string): Promise<FamilyInvitation[]> => {
  const { data } = await supabase.from('family_invitations').select('*')
    .eq('invitee_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
  return (data ?? []).map(mapInvitation);
};

export const getPendingInvitationsForFamily = async (familyId: string): Promise<FamilyInvitation[]> => {
  const { data } = await supabase.from('family_invitations').select('*')
    .eq('family_id', familyId).eq('type', 'invite').eq('status', 'pending').order('created_at', { ascending: false });
  return (data ?? []).map(mapInvitation);
};

export const getPendingJoinRequestsForFamily = async (familyId: string): Promise<FamilyInvitation[]> => {
  const { data } = await supabase.from('family_invitations').select('*')
    .eq('family_id', familyId).eq('type', 'request').eq('status', 'pending');
  return (data ?? []).map(mapInvitation);
};

export const cancelFamilyInvitation = async (invitationId: string): Promise<void> => {
  await supabase.from('family_invitations').delete().eq('id', invitationId);
};

export const acceptFamilyInvitation = async (invitationId: string, userId: string): Promise<Family> => {
  const { data: inv } = await supabase.from('family_invitations').select('*')
    .eq('id', invitationId).eq('invitee_id', userId).eq('status', 'pending').single();
  if (!inv) throw new Error('Convite inválido ou já processado.');
  const invitation = mapInvitation(inv);
  const family = await getFamilyById(invitation.familyId);
  if (!family) throw new Error('Aliança não encontrada.');

  await supabase.from('family_invitations').update({ status: 'accepted' }).eq('id', invitationId);
  await supabase.from('family_memberships').insert({ family_id: family.id, user_id: userId, role: 'Guardian' });

  const { data: unassigned } = await supabase.from('child_profiles').select('id')
    .eq('owner_id', userId).is('family_id', null);
  if (unassigned?.length) {
    await supabase.from('child_profiles').update({ family_id: family.id, updated_at: now() })
      .in('id', unassigned.map((c: any) => c.id));
  }

  const newMember = await getUserProfile(userId);
  const members = await getFamilyMembers(family.id);
  await Promise.all(members.filter(m => m.uid !== userId).map(m => addNotification({
    userId: m.uid, type: 'alliance_join_approved', title: 'Novo membro na Aliança!',
    description: `${newMember?.name ?? 'Um novo herói'} juntou-se à aliança ${family.name}.`,
    href: `/dashboard/alliances/${family.id}`, relatedContextId: family.id,
  })));

  return family;
};

export const declineFamilyInvitation = async (invitationId: string): Promise<void> => {
  await supabase.from('family_invitations').update({ status: 'declined' }).eq('id', invitationId);
};

export const approveJoinRequest = async (invitationId: string, approverId: string): Promise<void> => {
  const { data: inv } = await supabase.from('family_invitations').select('*').eq('id', invitationId).single();
  if (!inv || inv.type !== 'request' || inv.status !== 'pending') throw new Error('Pedido inválido.');
  if (inv.inviter_id !== approverId) throw new Error('Apenas o proprietário pode aprovar.');

  await supabase.from('family_memberships').insert({ family_id: inv.family_id, user_id: inv.invitee_id, role: 'Guardian' });
  const { data: unassigned } = await supabase.from('child_profiles').select('id')
    .eq('owner_id', inv.invitee_id).is('family_id', null);
  if (unassigned?.length) {
    await supabase.from('child_profiles').update({ family_id: inv.family_id, updated_at: now() })
      .in('id', unassigned.map((c: any) => c.id));
  }
  await supabase.from('family_invitations').update({ status: 'accepted' }).eq('id', invitationId);
  await addNotification({
    userId: inv.invitee_id, type: 'alliance_join_approved',
    title: 'Você entrou na Aliança!',
    description: `Seu pedido para entrar na aliança "${inv.family_name}" foi aprovado.`,
    href: `/dashboard/alliances/${inv.family_id}`, relatedContextId: inv.family_id,
  });
};

export const declineJoinRequest = async (invitationId: string, declinerId: string): Promise<void> => {
  const { data: inv } = await supabase.from('family_invitations').select('*').eq('id', invitationId).single();
  if (!inv || inv.type !== 'request' || inv.status !== 'pending') throw new Error('Pedido inválido.');
  if (inv.inviter_id !== declinerId) throw new Error('Apenas o proprietário pode recusar.');
  await supabase.from('family_invitations').update({ status: 'declined' }).eq('id', invitationId);
};

export const resendFamilyInvitationNotification = async (invitationId: string): Promise<void> => {
  const { data: inv } = await supabase.from('family_invitations').select('*')
    .eq('id', invitationId).eq('status', 'pending').single();
  if (!inv) throw new Error('Convite inválido.');
  await addNotification({
    userId: inv.invitee_id, type: 'alliance_join_request',
    title: 'Lembrete de Convite',
    description: `${inv.inviter_name} está aguardando você na aliança "${inv.family_name}".`,
    href: '/dashboard/alliances', relatedContextId: inv.family_id,
  });
};

export const resendJoinRequestNotification = async (requestId: string): Promise<void> => {
  const { data: req } = await supabase.from('family_invitations').select('*')
    .eq('id', requestId).eq('status', 'pending').single();
  if (!req) throw new Error('Pedido inválido.');
  await addNotification({
    userId: req.inviter_id, type: 'alliance_join_request',
    title: 'Lembrete: Pedido de Entrada',
    description: `${req.inviter_name} ainda aguarda sua aprovação para entrar na aliança "${req.family_name}".`,
    href: `/dashboard/alliances/${req.family_id}`, relatedContextId: req.family_id,
  });
};

// ─── Reward Templates ─────────────────────────────────────────────────────────

export const addRewardTemplate = async (
  actor: UserProfile,
  templateData: Omit<RewardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'familyId'>,
  targetContexts?: string[] | null
): Promise<void> => {
  if (!targetContexts?.length) throw new Error('Selecione pelo menos um espaço.');
  await Promise.all(targetContexts.map(ctx =>
    supabase.from('reward_templates').insert({
      owner_id: templateData.ownerId, family_id: ctx === 'my-space' ? null : ctx,
      title: templateData.title, description: templateData.description ?? '',
      category: templateData.category, stars_cost: templateData.starsCost,
      is_material: templateData.isMaterial, is_unique: templateData.isUnique,
      status: 'active', source: templateData.source ?? 'custom',
      justification: templateData.justification ?? '', tip: templateData.tip ?? '',
    })
  ));
  const familyContexts = targetContexts.filter(id => id !== 'my-space');
  await Promise.all(familyContexts.map(familyId =>
    dispatchAllianceNotifications(familyId, actor, {
      type: 'template_created', title: 'Nova Recompensa no Catálogo!',
      description: `${actor.name} adicionou a recompensa: "${templateData.title}".`,
      href: '/dashboard/rewards',
    })
  ));
};

export const getRewardTemplateById = async (templateId: string): Promise<RewardTemplate | null> => {
  const { data } = await supabase.from('reward_templates').select('*').eq('id', templateId).maybeSingle();
  return data ? mapRewardTemplate(data) : null;
};

export const getRewardTemplatesByOwnerOrFamily = async (ownerId: string, familyId?: string | null): Promise<RewardTemplate[]> => {
  let q = supabase.from('reward_templates').select('*');
  if (familyId && familyId !== 'my-space') {
    q = q.eq('family_id', familyId);
  } else {
    q = q.eq('owner_id', ownerId).is('family_id', null);
  }
  const { data } = await q;
  return (data ?? []).map(mapRewardTemplate).sort((a, b) =>
    new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
  );
};

export const updateRewardTemplate = async (actor: UserProfile, templateId: string, updates: any): Promise<void> => {
  const template = await getRewardTemplateById(templateId);
  if (!template) throw new Error('Template não encontrado.');
  await supabase.from('reward_templates').update({
    title: updates.title, description: updates.description,
    category: updates.category, stars_cost: updates.starsCost,
    is_material: updates.isMaterial, is_unique: updates.isUnique,
    status: updates.status, updated_at: now(),
  }).eq('id', templateId);
  if (template.familyId) {
    await dispatchAllianceNotifications(template.familyId, actor, {
      type: 'template_updated', title: 'Recompensa Atualizada',
      description: `${actor.name} atualizou a recompensa: "${updates.title ?? template.title}".`,
      href: `/dashboard/rewards/edit-template/${templateId}`,
    });
  }
};

export const deleteRewardTemplate = async (actor: UserProfile, template: RewardTemplate): Promise<void> => {
  await supabase.from('reward_templates').delete().eq('id', template.id);
  if (template.familyId) {
    await dispatchAllianceNotifications(template.familyId, actor, {
      type: 'template_deleted', title: 'Recompensa Removida do Baú',
      description: `${actor.name} removeu a recompensa: "${template.title}".`,
      href: '/dashboard/rewards',
    });
  }
};

export const populateInitialRewardTemplates = async (userId: string, familyId: string | null = null): Promise<void> => {
  const { data: existing } = await supabase.from('reward_templates').select('id, source')
    .eq('owner_id', userId).is('family_id', familyId ? familyId : null).limit(1);
  if (existing?.some((r: any) => r.source === 'predefined')) return;

  const allPredefined = predefinedRewardGroups.flatMap(g => g.items);
  const rows = allPredefined.map((idea: any) => ({
    owner_id: userId, family_id: familyId ?? null,
    title: idea.title, description: idea.description ?? '',
    category: idea.suggestedAppCategory, stars_cost: idea.starsCost ?? 50,
    is_material: idea.isMaterialSuggestion ?? false, is_unique: false,
    status: 'active', source: 'predefined',
    justification: idea.justification ?? '', tip: idea.tip ?? '',
  }));
  await supabase.from('reward_templates').insert(rows);
};

// ─── Child Reward Instances ───────────────────────────────────────────────────

export const addChildRewardInstance = async (
  actor: UserProfile,
  instanceData: any,
  templateSnapshot: RewardTemplate
): Promise<ChildRewardInstance> => {
  const { data, error } = await supabase.from('child_reward_instances').insert({
    template_id: instanceData.templateId, child_id: instanceData.childId,
    owner_id: instanceData.ownerId, family_id: instanceData.familyId ?? null,
    title: templateSnapshot.title, description: templateSnapshot.description ?? '',
    category: templateSnapshot.category, stars_cost: templateSnapshot.starsCost,
    is_material: templateSnapshot.isMaterial, status: 'active', is_redeemed: false,
  }).select().single();
  if (error) throw error;
  if (data.family_id) {
    const child = await getChildProfileById(data.child_id);
    await dispatchAllianceNotifications(data.family_id, actor, {
      type: 'instance_assigned', title: 'Recompensa Atribuída',
      description: `${actor.name} atribuiu "${templateSnapshot.title}" para ${child?.name ?? 'um herói'}.`,
      href: `/dashboard/mural?childId=${data.child_id}&tab=rewards`, relatedChildId: data.child_id,
    });
  }
  return mapRewardInstance(data);
};

export const requestRewardRedemption = async (rewardTemplate: RewardTemplate, childId: string): Promise<ChildRewardInstance> => {
  const child = await getChildProfileById(childId);
  if (!child) throw new Error('Herói não encontrado.');
  if (child.stars < rewardTemplate.starsCost) throw new Error('Estrelas insuficientes.');

  const { data: existing } = await supabase.from('child_reward_instances').select('id')
    .eq('template_id', rewardTemplate.id).eq('child_id', childId).eq('status', 'pending_approval').maybeSingle();
  if (existing) throw new Error('Você já solicitou esta recompensa.');

  const { data, error } = await supabase.from('child_reward_instances').insert({
    template_id: rewardTemplate.id, child_id: childId, owner_id: child.ownerId,
    family_id: child.familyId ?? null, title: rewardTemplate.title,
    description: rewardTemplate.description ?? '', category: rewardTemplate.category,
    stars_cost: rewardTemplate.starsCost, is_material: rewardTemplate.isMaterial,
    status: 'pending_approval', is_redeemed: false,
  }).select().single();
  if (error) throw error;

  await dispatchNotificationsForChild(childId, {
    type: 'reward_redeemed', title: 'Pedido de Resgate de Recompensa!',
    description: `${child.name} quer resgatar a recompensa: "${rewardTemplate.title}".`,
    href: `/dashboard/mural?childId=${childId}&tab=rewards`, relatedChildId: childId,
  }, child as any);

  return mapRewardInstance(data);
};

export const getChildRewardInstancesByChild = async (childId: string): Promise<ChildRewardInstance[]> => {
  const { data } = await supabase.from('child_reward_instances').select('*')
    .eq('child_id', childId).order('assigned_at', { ascending: false });
  return (data ?? []).map(mapRewardInstance);
};

export const getChildRewardInstancesForContext = async (ownerId: string, familyId: string | null): Promise<ChildRewardInstance[]> => {
  let q = supabase.from('child_reward_instances').select('*');
  if (familyId && familyId !== 'my-space') {
    q = q.eq('family_id', familyId);
  } else {
    q = q.eq('owner_id', ownerId).is('family_id', null);
  }
  const { data } = await q.order('assigned_at', { ascending: false });
  return (data ?? []).map(mapRewardInstance);
};

export const getChildRewardInstanceById = async (instanceId: string): Promise<ChildRewardInstance | null> => {
  const { data } = await supabase.from('child_reward_instances').select('*').eq('id', instanceId).maybeSingle();
  return data ? mapRewardInstance(data) : null;
};

export const getPendingRewardInstancesByChild = async (childId: string): Promise<ChildRewardInstance[]> => {
  const { data } = await supabase.from('child_reward_instances').select('*')
    .eq('child_id', childId).eq('status', 'pending_approval');
  return (data ?? []).map(mapRewardInstance);
};

export const getActiveChildRewardInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<ChildRewardInstance[]> => {
  const { data } = await supabase.from('child_reward_instances').select('*')
    .eq('template_id', templateId).eq('child_id', childId).eq('status', 'active');
  return (data ?? []).map(mapRewardInstance);
};

export const updateChildRewardInstance = async (instanceId: string, updates: any): Promise<void> => {
  const dbUpdates: any = { updated_at: now() };
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.isRedeemed !== undefined) dbUpdates.is_redeemed = updates.isRedeemed;
  if (updates.redeemedAt !== undefined) dbUpdates.redeemed_at = updates.redeemedAt;
  if (updates.actorId !== undefined) dbUpdates.actor_id = updates.actorId;
  await supabase.from('child_reward_instances').update(dbUpdates).eq('id', instanceId);
};

export const redeemChildRewardInstance = async (
  rewardInstance: ChildRewardInstance,
  childId: string,
  actor: { id: string; name: string | null }
): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) throw new Error('Herói não encontrado.');
  if (child.stars < rewardInstance.starsCost) throw new Error('Estrelas insuficientes.');

  await supabase.from('child_profiles').update({
    stars: child.stars - rewardInstance.starsCost, updated_at: now(),
  }).eq('id', childId);

  await supabase.from('child_reward_instances').update({
    status: 'redeemed', is_redeemed: true, redeemed_at: now(), actor_id: actor.id, updated_at: now(),
  }).eq('id', rewardInstance.id);

  const updatedChild = await getChildProfileById(childId);
  await dispatchNotificationsForChild(childId, {
    type: 'reward_redeemed', title: 'Recompensa Resgatada!',
    description: `${actor.name ?? 'Um responsável'} confirmou o resgate de "${rewardInstance.title}" para ${updatedChild?.name}.`,
    href: `/dashboard/mural?childId=${childId}&tab=rewards`, relatedChildId: childId,
  }, actor as any);
};

export const undoRewardRedemption = async (instanceId: string, actor: UserProfile): Promise<ChildProfile> => {
  const instance = await getChildRewardInstanceById(instanceId);
  if (!instance) throw new Error('Instância não encontrada.');
  if (instance.status !== 'redeemed') throw new Error('Esta recompensa não foi resgatada.');

  const child = await getChildProfileById(instance.childId);
  if (!child) throw new Error('Herói não encontrado.');

  await supabase.from('child_profiles').update({
    stars: child.stars + instance.starsCost, updated_at: now(),
  }).eq('id', instance.childId);

  await supabase.from('child_reward_instances').update({
    status: 'active', is_redeemed: false, redeemed_at: null, actor_id: null, updated_at: now(),
  }).eq('id', instanceId);

  await dispatchNotificationsForChild(instance.childId, {
    type: 'mission_completion_undone', title: 'Resgate de Recompensa Desfeito',
    description: `${actor.name} desfez o resgate de "${instance.title}". As estrelas foram devolvidas.`,
    href: `/dashboard/mural?childId=${instance.childId}&tab=rewards`, relatedChildId: instance.childId,
  }, actor);

  return { ...child, stars: child.stars + instance.starsCost };
};

export const deleteChildRewardInstance = async (actor: UserProfile, instanceId: string): Promise<void> => {
  const instance = await getChildRewardInstanceById(instanceId);
  if (!instance) return;
  await supabase.from('child_reward_instances').delete().eq('id', instanceId);
  if (instance.familyId) {
    const child = await getChildProfileById(instance.childId);
    await dispatchAllianceNotifications(instance.familyId, actor, {
      type: 'instance_unassigned', title: 'Recompensa Desatribuída',
      description: `${actor.name} removeu a atribuição de "${instance.title}" para ${child?.name ?? 'um herói'}.`,
      href: `/dashboard/mural?childId=${instance.childId}&tab=rewards`, relatedChildId: instance.childId,
    });
  }
};

export const deleteChildRewardInstancesByTemplateAndChild = async (actor: UserProfile, templateId: string, childId: string): Promise<void> => {
  const { data } = await supabase.from('child_reward_instances').select('*')
    .eq('template_id', templateId).eq('child_id', childId).eq('status', 'active');
  if (!data?.length) return;
  const familyId = data[0].family_id;
  await supabase.from('child_reward_instances').delete()
    .eq('template_id', templateId).eq('child_id', childId).eq('status', 'active');
  if (familyId) {
    const child = await getChildProfileById(childId);
    const template = await getRewardTemplateById(templateId);
    await dispatchAllianceNotifications(familyId, actor, {
      type: 'instance_unassigned', title: 'Recompensa Desatribuída',
      description: `${actor.name} removeu a recompensa "${template?.title}" de ${child?.name}.`,
      href: `/dashboard/mural?childId=${childId}&tab=rewards`, relatedChildId: childId,
    });
  }
};

export const toggleFavoriteReward = async (childId: string, rewardTitle: string): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) throw new Error('Herói não encontrado.');
  const favorites: string[] = child.favoriteRewardIds as any ?? [];
  const newFavorites = favorites.includes(rewardTitle)
    ? favorites.filter(f => f !== rewardTitle)
    : [...favorites, rewardTitle];
  await supabase.from('child_profiles').update({ favorite_reward_ids: newFavorites }).eq('id', childId);
};

// ─── Mission Templates ────────────────────────────────────────────────────────

export const addMissionTemplate = async (
  actor: UserProfile,
  templateData: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'familyId'>,
  targetContexts?: string[] | null,
): Promise<MissionTemplate | null> => {
  if (!targetContexts?.length) throw new Error('Selecione pelo menos um espaço.');
  const currentCtx = actor.settings?.initialContext ?? 'my-space';
  let firstTemplate: MissionTemplate | null = null;

  await Promise.all(targetContexts.map(async ctx => {
    const { data } = await supabase.from('mission_templates').insert({
      owner_id: templateData.ownerId, family_id: ctx === 'my-space' ? null : ctx,
      title: templateData.title, description: templateData.description ?? '',
      emoji: templateData.emoji ?? '', category: templateData.category,
      stars_reward: templateData.starsReward, status: 'active',
      source: templateData.source ?? 'custom',
      start_date: templateData.startDate ? new Date(templateData.startDate as string).toISOString() : null,
      due_date: templateData.dueDate ? new Date(templateData.dueDate as string).toISOString() : null,
      is_recurring: templateData.isRecurring, recurrence_rule: templateData.recurrenceRule ?? null,
    }).select().single();
    if (data && (ctx === currentCtx || !firstTemplate)) firstTemplate = mapMissionTemplate(data);
  }));

  const familyContexts = targetContexts.filter(id => id !== 'my-space');
  await Promise.all(familyContexts.map(familyId =>
    dispatchAllianceNotifications(familyId, actor, {
      type: 'template_created', title: 'Nova Missão no Catálogo!',
      description: `${actor.name} adicionou a missão: "${templateData.title}".`,
      href: '/dashboard/missions',
    })
  ));
  return firstTemplate;
};

export const getMissionTemplateById = async (templateId: string): Promise<MissionTemplate | null> => {
  const { data } = await supabase.from('mission_templates').select('*').eq('id', templateId).maybeSingle();
  return data ? mapMissionTemplate(data) : null;
};

export const getMissionTemplatesByOwnerOrFamily = async (ownerId: string, familyId?: string | null): Promise<MissionTemplate[]> => {
  let q = supabase.from('mission_templates').select('*');
  if (familyId && familyId !== 'my-space') {
    q = q.eq('family_id', familyId);
  } else {
    q = q.eq('owner_id', ownerId).is('family_id', null);
  }
  const { data } = await q.order('created_at', { ascending: false });
  return (data ?? []).map(mapMissionTemplate);
};

export const updateMissionTemplate = async (actor: UserProfile, templateId: string, updates: any): Promise<void> => {
  const dbUpdates: any = { updated_at: now() };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.starsReward !== undefined) dbUpdates.stars_reward = updates.starsReward;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  await supabase.from('mission_templates').update(dbUpdates).eq('id', templateId);

  // Sync recurring instances
  const { data: instances } = await supabase.from('mission_instances').select('*')
    .eq('template_id', templateId).eq('status', 'pending').eq('is_recurring', true);
  if (instances?.length) {
    const instanceUpdates: any = { updated_at: now() };
    if (updates.title !== undefined) instanceUpdates.title = updates.title;
    if (updates.description !== undefined) instanceUpdates.description = updates.description;
    if (updates.emoji !== undefined) instanceUpdates.emoji = updates.emoji;
    if (updates.category !== undefined) instanceUpdates.category = updates.category;
    if (updates.starsReward !== undefined) instanceUpdates.stars_reward = updates.starsReward;
    await supabase.from('mission_instances').update(instanceUpdates)
      .in('id', instances.map((i: any) => i.id));
  }

  const template = await getMissionTemplateById(templateId);
  if (template?.familyId) {
    await dispatchAllianceNotifications(template.familyId, actor, {
      type: 'template_updated', title: 'Missão Atualizada',
      description: `${actor.name} atualizou a missão: "${updates.title ?? template.title}".`,
      href: `/dashboard/missions/edit/${templateId}`,
    });
  }
};

export const deleteMissionTemplate = async (actor: UserProfile, template: MissionTemplate): Promise<void> => {
  await supabase.from('mission_templates').delete().eq('id', template.id);
  if (template.familyId) {
    await dispatchAllianceNotifications(template.familyId, actor, {
      type: 'template_deleted', title: 'Missão Removida do Catálogo',
      description: `${actor.name} removeu a missão: "${template.title}".`,
      href: '/dashboard/missions',
    });
  }
};

export const deleteMissionTemplateAndInstances = async (actor: UserProfile, templateId: string): Promise<void> => {
  const template = await getMissionTemplateById(templateId);
  if (!template) return;
  await supabase.from('mission_instances').delete().eq('template_id', templateId);
  await supabase.from('mission_templates').delete().eq('id', templateId);
  if (template.familyId) {
    await dispatchAllianceNotifications(template.familyId, actor, {
      type: 'template_deleted', title: 'Missão e Agendamentos Removidos',
      description: `${actor.name} removeu a missão "${template.title}" e todos os seus agendamentos.`,
      href: '/dashboard/missions',
    });
  }
};

// ─── Mission Instances ────────────────────────────────────────────────────────

export const getMissionInstancesForContext = async (userId: string, contextId: string): Promise<MissionInstance[]> => {
  let q = supabase.from('mission_instances').select('*');
  if (contextId === 'my-space') {
    q = q.eq('owner_id', userId).is('family_id', null);
  } else {
    q = q.eq('family_id', contextId);
  }
  const { data } = await q;
  return (data ?? []).map(mapMissionInstance);
};

export const addMissionInstance = async (
  actor: UserProfile,
  instanceData: any,
  templateSnapshot: any
): Promise<MissionInstance> => {
  const { data, error } = await supabase.from('mission_instances').insert({
    template_id: instanceData.templateId, child_id: instanceData.childId,
    owner_id: instanceData.ownerId, family_id: instanceData.familyId ?? null,
    title: templateSnapshot.title, description: templateSnapshot.description ?? '',
    emoji: templateSnapshot.emoji ?? '', category: templateSnapshot.category,
    stars_reward: templateSnapshot.starsReward, status: 'pending',
    due_date: templateSnapshot.dueDate ? new Date(templateSnapshot.dueDate as string).toISOString() : null,
    start_date: templateSnapshot.startDate ? new Date(templateSnapshot.startDate as string).toISOString() : null,
    is_recurring: !!templateSnapshot.isRecurring,
    recurrence_rule: templateSnapshot.recurrenceRule ?? null,
    completion_count: 0, completion_log: {}, exception_dates: {},
  }).select().single();
  if (error) throw error;

  if (data.family_id) {
    const child = await getChildProfileById(data.child_id);
    await dispatchAllianceNotifications(data.family_id, actor, {
      type: 'instance_assigned', title: 'Missão Atribuída',
      description: `${actor.name} atribuiu "${templateSnapshot.title}" para ${child?.name ?? 'um herói'}.`,
      href: `/dashboard/agenda?childId=${data.child_id}`, relatedChildId: data.child_id,
    });
  }
  return mapMissionInstance(data);
};

export const getMissionInstancesByChild = async (childId: string): Promise<MissionInstance[]> => {
  const { data } = await supabase.from('mission_instances').select('*')
    .eq('child_id', childId).order('assigned_at', { ascending: false });
  return (data ?? []).map(mapMissionInstance);
};

export const getActiveChildMissionInstancesByTemplateAndChild = async (templateId: string, childId: string): Promise<MissionInstance[]> => {
  const { data } = await supabase.from('mission_instances').select('*')
    .eq('template_id', templateId).eq('child_id', childId).eq('status', 'pending');
  return (data ?? []).map(mapMissionInstance);
};

export const getActiveMissionInstancesByTemplate = async (userId: string, templateId: string, contextId: string): Promise<MissionInstance[]> => {
  let q = supabase.from('mission_instances').select('*').eq('template_id', templateId).eq('status', 'pending');
  if (contextId === 'my-space') {
    q = q.eq('owner_id', userId).is('family_id', null);
  } else {
    q = q.eq('family_id', contextId);
  }
  const { data } = await q;
  return (data ?? []).map(mapMissionInstance);
};

export const updateMissionInstance = async (instanceId: string, updates: any): Promise<void> => {
  const dbUpdates: any = { updated_at: now() };
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.completionCount !== undefined) dbUpdates.completion_count = updates.completionCount;
  if (updates.completionLog !== undefined) dbUpdates.completion_log = updates.completionLog;
  if (updates.exceptionDates !== undefined) dbUpdates.exception_dates = updates.exceptionDates;
  if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
  if (updates.recurrenceRule !== undefined) dbUpdates.recurrence_rule = updates.recurrenceRule;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  await supabase.from('mission_instances').update(dbUpdates).eq('id', instanceId);
};

export const excludeMissionInstanceOccurrence = async (instanceId: string, dateToExclude: Date): Promise<void> => {
  const dateKey = formatDateFns(startOfDay(dateToExclude), 'yyyy-MM-dd');
  const { data } = await supabase.from('mission_instances').select('exception_dates').eq('id', instanceId).single();
  const exceptions = { ...(data?.exception_dates ?? {}), [dateKey]: true };
  await supabase.from('mission_instances').update({ exception_dates: exceptions, updated_at: now() }).eq('id', instanceId);
};

export const updateMissionInstancesByTemplateAndChild = async (templateId: string, childId: string, templateWithUpdates: MissionTemplate): Promise<void> => {
  await supabase.from('mission_instances').update({
    is_recurring: templateWithUpdates.isRecurring,
    start_date: templateWithUpdates.startDate as any,
    due_date: templateWithUpdates.dueDate as any,
    recurrence_rule: templateWithUpdates.recurrenceRule ?? null,
    updated_at: now(),
  }).eq('template_id', templateId).eq('child_id', childId).eq('status', 'pending');
};

export const deleteMissionInstance = async (actor: UserProfile, instanceId: string): Promise<void> => {
  const { data } = await supabase.from('mission_instances').select('*').eq('id', instanceId).single();
  if (!data) return;
  await supabase.from('mission_instances').delete().eq('id', instanceId);
  if (data.family_id) {
    const child = await getChildProfileById(data.child_id);
    await dispatchAllianceNotifications(data.family_id, actor, {
      type: 'instance_unassigned', title: 'Missão Desatribuída',
      description: `${actor.name} removeu a missão "${data.title}" de ${child?.name ?? 'um herói'}.`,
      href: `/dashboard/mural?childId=${data.child_id}&tab=missions`, relatedChildId: data.child_id,
    });
  }
};

export const deleteFutureOccurrences = async (instanceId: string, fromDate: Date): Promise<void> => {
  const { data } = await supabase.from('mission_instances').select('*').eq('id', instanceId).single();
  if (!data) throw new Error('Missão não encontrada.');
  if (!data.is_recurring) {
    await supabase.from('mission_instances').delete().eq('id', instanceId);
    return;
  }
  const newEndDate = endOfDay(subDays(startOfDay(fromDate), 1));
  const startDate = getDateObject(data.start_date);
  if (startDate && isBefore(newEndDate, startOfDay(startDate))) {
    await supabase.from('mission_instances').delete().eq('id', instanceId);
  } else {
    const rule = data.recurrence_rule ?? { freq: 'DAILY', interval: 1 };
    await supabase.from('mission_instances').update({
      recurrence_rule: { ...rule, endDate: newEndDate.toISOString(), count: null },
      updated_at: now(),
    }).eq('id', instanceId);
  }
};

export const deleteMissionInstancesByTemplateAndChild = async (actor: UserProfile, templateId: string, childId: string): Promise<void> => {
  const { data } = await supabase.from('mission_instances').select('*')
    .eq('template_id', templateId).eq('child_id', childId).limit(1);
  if (!data?.length) return;
  const familyId = data[0].family_id;
  await supabase.from('mission_instances').delete().eq('template_id', templateId).eq('child_id', childId);
  if (familyId) {
    const child = await getChildProfileById(childId);
    const template = await getMissionTemplateById(templateId);
    await dispatchAllianceNotifications(familyId, actor, {
      type: 'instance_unassigned', title: 'Missão Desatribuída',
      description: `${actor.name} removeu a missão "${template?.title}" de ${child?.name}.`,
      href: `/dashboard/mural?childId=${childId}&tab=missions`, relatedChildId: childId,
    });
  }
};

export const updateRecurringMissionInstance = async (
  originalInstanceId: string,
  editMode: 'single' | 'forward' | 'all',
  newSchedule: { isRecurring: boolean; startDate: Date | null; dueDate: Date | null; recurrenceRule: RecurrenceRule | null },
  occurrenceDate: Date
): Promise<void> => {
  const { data: orig } = await supabase.from('mission_instances').select('*').eq('id', originalInstanceId).single();
  if (!orig) throw new Error('Missão não encontrada.');

  const scheduleUpdates = {
    is_recurring: newSchedule.isRecurring,
    start_date: newSchedule.startDate?.toISOString() ?? null,
    due_date: newSchedule.dueDate?.toISOString() ?? null,
    recurrence_rule: newSchedule.recurrenceRule ? {
      ...newSchedule.recurrenceRule,
      endDate: (newSchedule.recurrenceRule.endDate as any)?.toISOString?.() ?? newSchedule.recurrenceRule.endDate,
    } : null,
    updated_at: now(),
  };

  if (editMode === 'all') {
    await supabase.from('mission_instances').update({ ...scheduleUpdates, exception_dates: {} }).eq('id', originalInstanceId);
  } else if (editMode === 'single') {
    const dateKey = formatDateFns(startOfDay(occurrenceDate), 'yyyy-MM-dd');
    const exceptions = { ...(orig.exception_dates ?? {}), [dateKey]: true };
    await supabase.from('mission_instances').update({ exception_dates: exceptions }).eq('id', originalInstanceId);
    await supabase.from('mission_instances').insert({
      ...orig, id: undefined, is_recurring: false, recurrence_rule: null, start_date: null,
      due_date: scheduleUpdates.due_date ?? occurrenceDate.toISOString(),
      status: 'pending', completion_count: 0, completion_log: {}, exception_dates: {},
      assigned_at: now(), updated_at: now(),
    });
  } else if (editMode === 'forward') {
    const rule = orig.recurrence_rule ?? { freq: 'DAILY', interval: 1 };
    const newEnd = subDays(startOfDay(occurrenceDate), 1);
    await supabase.from('mission_instances').update({
      recurrence_rule: { ...rule, endDate: newEnd.toISOString() },
    }).eq('id', originalInstanceId);
    await supabase.from('mission_instances').insert({
      ...orig, id: undefined, start_date: occurrenceDate.toISOString(),
      ...scheduleUpdates, status: 'pending', completion_count: 0, completion_log: {},
      exception_dates: {}, assigned_at: now(),
    });
  }
};

export const completeMissionInstance = async (
  missionInstanceId: string,
  completionDate: Date,
  actor: { id: string; name: string | null }
): Promise<ChildProfile | null> => {
  const { data: mission } = await supabase.from('mission_instances').select('*').eq('id', missionInstanceId).single();
  if (!mission) throw new Error('Missão não encontrada.');

  const dateKey = formatDateFns(completionDate, 'yyyy-MM-dd');
  if (mission.completion_log?.[dateKey]) return null;

  const child = await getChildProfileById(mission.child_id);
  if (!child) throw new Error('Herói não encontrado.');

  const newStars = child.stars + mission.stars_reward;
  const newTotalStars = (child.totalStars ?? 0) + mission.stars_reward;
  const originalLevel = child.level;
  const newLevel = calculateLevel(newTotalStars);

  await supabase.from('child_profiles').update({
    stars: newStars, total_stars: newTotalStars, level: newLevel, updated_at: now(),
  }).eq('id', child.id);

  const newCompletionCount = Object.keys(mission.completion_log ?? {}).length + 1;
  const isFullyCompleted = (!mission.is_recurring && newCompletionCount >= 1) ||
    (mission.is_recurring && mission.recurrence_rule?.count && newCompletionCount >= mission.recurrence_rule.count);

  const newLog = {
    ...(mission.completion_log ?? {}),
    [dateKey]: { completedAt: now(), stars: mission.stars_reward, actorId: actor.id ?? null, actorName: actor.name ?? null },
  };
  await supabase.from('mission_instances').update({
    completion_count: newCompletionCount, completion_log: newLog,
    ...(isFullyCompleted ? { status: 'completed' } : {}),
    updated_at: now(),
  }).eq('id', missionInstanceId);

  const updatedChild = { ...child, stars: newStars, totalStars: newTotalStars, level: newLevel };

  await dispatchNotificationsForChild(mission.child_id, {
    type: 'mission_completed', title: 'Missão Cumprida!',
    description: actor.name
      ? `${actor.name} marcou "${mission.title}" como concluída para ${child.name} (ref. a ${formatDateFns(completionDate, 'dd/MM/yyyy')}).`
      : `A missão "${mission.title}" foi concluída para ${child.name}.`,
    href: `/dashboard/mural?childId=${mission.child_id}&tab=missions`, relatedChildId: mission.child_id,
  }, actor as any);

  if (newLevel > originalLevel) {
    await dispatchNotificationsForChild(mission.child_id, {
      type: 'new_level', title: 'Subiu de Nível!',
      description: `${child.name} alcançou o nível ${newLevel}!`,
      href: `/dashboard/mural?childId=${mission.child_id}`, relatedChildId: mission.child_id,
    });
  }

  await recalculateAndSyncBadges(child.id);
  return updatedChild;
};

export const reactivateMissionInstance = async (
  missionInstanceId: string,
  dateToUndo: Date,
  actor: { id: string; name: string | null }
): Promise<ChildProfile | null> => {
  const { data: mission } = await supabase.from('mission_instances').select('*').eq('id', missionInstanceId).single();
  if (!mission) throw new Error('Missão não encontrada.');

  const dateKey = formatDateFns(dateToUndo, 'yyyy-MM-dd');
  const logEntry = mission.completion_log?.[dateKey];
  if (!logEntry) return null;

  const child = await getChildProfileById(mission.child_id);
  if (!child) throw new Error('Herói não encontrado.');

  const starsToSubtract = logEntry.stars ?? mission.stars_reward;
  const newTotalStars = Math.max(0, (child.totalStars ?? 0) - starsToSubtract);
  const newStars = Math.max(0, child.stars - starsToSubtract);
  const newLevel = calculateLevel(newTotalStars);

  await supabase.from('child_profiles').update({
    stars: newStars, total_stars: newTotalStars, level: newLevel, updated_at: now(),
  }).eq('id', child.id);

  const newLog = { ...(mission.completion_log ?? {}) };
  delete newLog[dateKey];
  await supabase.from('mission_instances').update({
    status: 'pending', completion_log: newLog,
    completion_count: Math.max(0, Object.keys(mission.completion_log ?? {}).length - 1),
    updated_at: now(),
  }).eq('id', missionInstanceId);

  const updatedChild = { ...child, stars: newStars, totalStars: newTotalStars, level: newLevel };

  await dispatchNotificationsForChild(mission.child_id, {
    type: 'mission_completion_undone', title: 'Ação Desfeita',
    description: `${actor.name ?? 'Alguém'} desfez a conclusão da missão "${mission.title}" para ${child.name} (ref. a ${formatDateFns(dateToUndo, 'dd/MM/yyyy')}).`,
    href: `/dashboard/mural?childId=${mission.child_id}&tab=missions`, relatedChildId: mission.child_id,
  }, actor as any);

  await recalculateAndSyncBadges(child.id);
  return updatedChild;
};

export const findChildByAccessCode = async (accessCode: string): Promise<ChildProfile | null> => {
  const { data } = await supabase.from('child_profiles').select('*').eq('access_code', accessCode).maybeSingle();
  return data ? mapChild(data) : null;
};

// ─── Badges ───────────────────────────────────────────────────────────────────

export const recalculateAndSyncBadges = async (childId: string): Promise<void> => {
  const child = await getChildProfileById(childId);
  if (!child) return;
  const currentBadgeIds = new Set(child.earnedBadgeIds ?? []);
  const finalBadgeSet = new Set<string>();

  if (child.level >= 5) finalBadgeSet.add('heroi_ascensao');
  if (child.level >= 10) finalBadgeSet.add('campeao_herois');
  if (child.level >= 15) finalBadgeSet.add('arquiteto_sonhos');
  if (child.level >= 20) finalBadgeSet.add('heroi_lendario');
  if (child.totalStars >= 100) finalBadgeSet.add('cacador_estrelas');
  if (child.totalStars >= 500) finalBadgeSet.add('colecionador_tesouros');
  if (child.totalStars >= 1000) finalBadgeSet.add('lenda_estelar');

  const { data: allInstancesData } = await supabase.from('mission_instances').select('*').eq('child_id', childId);
  const allInstances = (allInstancesData ?? []).map(mapMissionInstance);

  const totalCompletions = allInstances.reduce((s, i) => s + Object.keys(i.completionLog ?? {}).length, 0);
  if (totalCompletions > 0) finalBadgeSet.add('hero_novato');

  const completedCategories = new Set<string>();
  let hasCompletedSocialOrEnv = false, hasCompletedSports = false;
  for (const instance of allInstances) {
    if (Object.keys(instance.completionLog ?? {}).length > 0) {
      completedCategories.add(instance.category);
      const t = instance.title.toLowerCase().trim();
      if (t.includes('escovar os dentes')) finalBadgeSet.add('defensor_sorriso');
      if (t.includes('arrumar a cama')) finalBadgeSet.add('guardiao_descanso');
      if (t.includes('fazer lição de casa')) finalBadgeSet.add('mente_brilhante');
      if (t.includes('ajudar a pôr') || t.includes('ajudar a tirar')) finalBadgeSet.add('maozinha_amiga');
      if (instance.category === 'social' || instance.category === 'environmental') hasCompletedSocialOrEnv = true;
      if (instance.category === 'sports') hasCompletedSports = true;
    }
  }
  if (completedCategories.size >= 3) finalBadgeSet.add('heroi_versatil');
  if (completedCategories.size >= 5) finalBadgeSet.add('explorador_talentos');
  if (hasCompletedSocialOrEnv) finalBadgeSet.add('aventureiro_nato');
  if (hasCompletedSports) finalBadgeSet.add('atleta_dedicado');

  const { data: redeemed } = await supabase.from('child_reward_instances').select('id')
    .eq('child_id', childId).eq('status', 'redeemed').limit(1);
  if (redeemed?.length) finalBadgeSet.add('conquistador_recompensas');

  let longestStreak = 0;
  for (const instance of allInstances) {
    const dates = Object.keys(instance.completionLog ?? {})
      .map(d => startOfDay(new Date(d))).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length > 1) {
      let cur = 1, longest = 1;
      for (let i = 1; i < dates.length; i++) {
        if (differenceInDays(dates[i], dates[i - 1]) === 1) { cur++; } else { cur = 1; }
        if (cur > longest) longest = cur;
      }
      if (longest > longestStreak) longestStreak = longest;
    }
  }
  if (longestStreak >= 2) finalBadgeSet.add('guardiao_rotina_bronze');
  if (longestStreak >= 4) finalBadgeSet.add('guardiao_rotina_prata');
  if (longestStreak >= 6) finalBadgeSet.add('guardiao_rotina_ouro');
  if (longestStreak >= 30) finalBadgeSet.add('mestre_persistencia_bronze');
  if (longestStreak >= 45) finalBadgeSet.add('mestre_persistencia_prata');
  if (longestStreak >= 60) finalBadgeSet.add('mestre_persistencia_ouro');

  let longestPerfect = 0, currentPerfect = 0;
  const allDates = new Set(allInstances.flatMap(i => Object.keys(i.completionLog ?? {})).map(d => startOfDay(new Date(d))));
  if (allDates.size > 0) {
    const sorted = Array.from(allDates).sort((a, b) => a.getTime() - b.getTime());
    for (const day of eachDayOfInterval({ start: sorted[0], end: startOfDay(new Date()) })) {
      const scheduled = allInstances.filter(i => isMissionScheduledForDate(i, day));
      if (scheduled.length > 0) {
        if (scheduled.every(i => isMissionCompletedForDate(i, day))) { currentPerfect++; }
        else { if (currentPerfect > longestPerfect) longestPerfect = currentPerfect; currentPerfect = 0; }
      }
    }
  }
  if (currentPerfect > longestPerfect) longestPerfect = currentPerfect;
  if (longestPerfect >= 7) finalBadgeSet.add('semana_perfeita_bronze');
  if (longestPerfect >= 15) finalBadgeSet.add('semana_perfeita_prata');
  if (longestPerfect >= 21) finalBadgeSet.add('semana_perfeita_ouro');

  const newlyAwarded = [...finalBadgeSet].filter(id => !currentBadgeIds.has(id));
  const finalArray = Array.from(finalBadgeSet);
  if (finalArray.length !== currentBadgeIds.size || newlyAwarded.length > 0) {
    await supabase.from('child_profiles').update({ earned_badge_ids: finalArray }).eq('id', childId);
  }
  for (const badgeId of newlyAwarded) {
    const badge = allBadgesMap.get(badgeId);
    if (badge) {
      await dispatchNotificationsForChild(childId, {
        type: 'new_badge', title: 'Nova Medalha Desbloqueada!',
        description: `${child.name} ganhou a medalha: "${badge.title}"!`,
        href: `/dashboard/mural?childId=${childId}&tab=badges`, relatedChildId: childId,
      });
    }
  }
};

// ─── School Schedule ──────────────────────────────────────────────────────────

export const getSchoolScheduleForContext = async (ownerId: string, familyId: string | null): Promise<SchoolScheduleEntry[]> => {
  let q = supabase.from('school_schedule_entries').select('*');
  if (familyId && familyId !== 'my-space') {
    q = q.eq('family_id', familyId);
  } else {
    q = q.eq('owner_id', ownerId).is('family_id', null);
  }
  const { data } = await q;
  return (data ?? []).map(mapSchoolEntry);
};

export const getSchoolScheduleForChild = async (childId: string): Promise<SchoolScheduleEntry[]> => {
  const { data } = await supabase.from('school_schedule_entries').select('*').eq('child_id', childId);
  return (data ?? []).map(mapSchoolEntry);
};

export const addSchoolScheduleEntry = async (entryData: Omit<SchoolScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>, actor: UserProfile): Promise<SchoolScheduleEntry> => {
  const { data, error } = await supabase.from('school_schedule_entries').insert({
    child_id: entryData.childId, owner_id: entryData.ownerId, family_id: entryData.familyId ?? null,
    subject: entryData.subject, day_of_week: entryData.dayOfWeek,
    start_time: entryData.startTime, end_time: entryData.endTime, color: entryData.color,
  }).select().single();
  if (error) throw error;
  if (entryData.familyId) {
    const child = await getChildProfileById(entryData.childId);
    await dispatchAllianceNotifications(entryData.familyId, actor, {
      type: 'school_schedule_entry_created', title: 'Aula Adicionada à Agenda',
      description: `${actor.name} adicionou "${entryData.subject}" para ${child?.name}.`,
      href: '/dashboard/school-schedule', relatedChildId: entryData.childId,
    });
  }
  return mapSchoolEntry(data);
};

export const addRecurringSchoolEntry = async (
  baseEntry: Omit<SchoolScheduleEntry, 'id' | 'createdAt' | 'updatedAt' | 'dayOfWeek'>,
  days: Weekday[],
  actor: UserProfile
): Promise<SchoolScheduleEntry[]> => {
  const child = await getChildProfileById(baseEntry.childId);
  if (!child) throw new Error('Criança não encontrada.');

  const rows = days.map(day => ({
    child_id: baseEntry.childId, owner_id: baseEntry.ownerId, family_id: baseEntry.familyId ?? null,
    subject: baseEntry.subject, day_of_week: day,
    start_time: baseEntry.startTime, end_time: baseEntry.endTime, color: baseEntry.color,
  }));
  const { data, error } = await supabase.from('school_schedule_entries').insert(rows).select();
  if (error) throw error;

  if (baseEntry.familyId) {
    await dispatchAllianceNotifications(baseEntry.familyId, actor, {
      type: 'school_schedule_entry_created', title: 'Intervalo Adicionado',
      description: `${actor.name ?? 'Um responsável'} adicionou o intervalo de ${baseEntry.startTime} às ${baseEntry.endTime} para ${child.name}.`,
      href: '/dashboard/school-schedule', relatedChildId: baseEntry.childId,
    });
  }
  return (data ?? []).map(mapSchoolEntry);
};

export const updateSchoolScheduleEntry = async (entryId: string, updates: any, actor: UserProfile): Promise<SchoolScheduleEntry> => {
  const { data: original } = await supabase.from('school_schedule_entries').select('*').eq('id', entryId).single();
  if (!original) throw new Error('Entrada não encontrada.');
  const { data, error } = await supabase.from('school_schedule_entries').update({
    subject: updates.subject, day_of_week: updates.dayOfWeek,
    start_time: updates.startTime, end_time: updates.endTime,
    color: updates.color, updated_at: now(),
  }).eq('id', entryId).select().single();
  if (error) throw error;
  if (original.family_id) {
    const child = await getChildProfileById(original.child_id);
    await dispatchAllianceNotifications(original.family_id, actor, {
      type: 'school_schedule_entry_updated', title: 'Aula Atualizada',
      description: `${actor.name} atualizou a aula de "${updates.subject ?? original.subject}" para ${child?.name}.`,
      href: '/dashboard/school-schedule', relatedChildId: original.child_id,
    });
  }
  return mapSchoolEntry(data);
};

export const deleteSchoolScheduleEntry = async (entryId: string, actor: UserProfile): Promise<void> => {
  const { data } = await supabase.from('school_schedule_entries').select('*').eq('id', entryId).single();
  if (!data) return;
  await supabase.from('school_schedule_entries').delete().eq('id', entryId);
  if (data.family_id) {
    const child = await getChildProfileById(data.child_id);
    await dispatchAllianceNotifications(data.family_id, actor, {
      type: 'school_schedule_entry_deleted', title: 'Aula Removida',
      description: `${actor.name} removeu a aula de "${data.subject}" do horário de ${child?.name}.`,
      href: '/dashboard/school-schedule', relatedChildId: data.child_id,
    });
  }
};

// ─── Dreams ───────────────────────────────────────────────────────────────────

export const getDreamsForChild = async (childId: string): Promise<Dream[]> => {
  const { data } = await supabase.from('dreams').select('*').eq('child_id', childId);
  return (data ?? []).map((r: any) => ({
    id: r.id, childId: r.child_id, ownerId: r.owner_id, title: r.title,
    description: r.description, starsGoal: r.stars_goal, currentStarsSaved: r.current_stars_saved,
    isAchieved: r.is_achieved, imageUrl: r.image_url,
    createdAt: r.created_at as any, achievedAt: r.achieved_at as any,
  }));
};

export const addDream = async (dreamData: Omit<Dream, 'id' | 'createdAt' | 'isAchieved' | 'currentStarsSaved'>): Promise<Dream> => {
  const { data, error } = await supabase.from('dreams').insert({
    child_id: dreamData.childId, owner_id: dreamData.ownerId,
    title: dreamData.title, description: dreamData.description ?? '',
    stars_goal: dreamData.starsGoal, current_stars_saved: 0,
    is_achieved: false, image_url: dreamData.imageUrl ?? null,
  }).select().single();
  if (error) throw error;
  return getDreamsForChild(data.child_id).then(d => d.find(x => x.id === data.id)!);
};

export const updateDream = async (dreamId: string, updates: Partial<Dream>): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.starsGoal !== undefined) dbUpdates.stars_goal = updates.starsGoal;
  if (updates.currentStarsSaved !== undefined) dbUpdates.current_stars_saved = updates.currentStarsSaved;
  if (updates.isAchieved !== undefined) dbUpdates.is_achieved = updates.isAchieved;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.isAchieved) dbUpdates.achieved_at = now();
  await supabase.from('dreams').update(dbUpdates).eq('id', dreamId);
};

export const deleteDream = async (dreamId: string): Promise<void> => {
  await supabase.from('dreams').delete().eq('id', dreamId);
};

// ─── Feature Votes (stub — not in schema yet) ─────────────────────────────────

export const getFeatureVoteCount = async (_featureId: string): Promise<number> => 0;
export const getUserFeatureVote = async (_userId: string, _featureId: string): Promise<boolean> => false;
export const toggleUserFeatureVote = async (_userId: string, _featureId: string): Promise<void> => {};
