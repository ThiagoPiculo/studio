import { supabase } from './config';
import type { UserProfile, ChildProfile } from '@/lib/types';
import { populateInitialRewardTemplates } from './db';

export const signUpAdmin = async (name: string, email: string, password: string): Promise<UserProfile> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Falha ao criar usuário.');

  await populateInitialRewardTemplates(data.user.id, null);

  return {
    uid: data.user.id,
    email: data.user.email ?? null,
    name,
    createdAt: data.user.created_at as any,
    settings: { rewardMode: 'automatic' },
  };
};

export const signInAdmin = async (email: string, password: string): Promise<UserProfile> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('uid', data.user.id)
    .single();
  if (profileError) throw profileError;

  return { ...profile, uid: profile.uid } as UserProfile;
};

export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw error;
};

export const logout = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
};

export const deleteUserAccount = async (_password: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
};

export const findChildByAccessCode = async (accessCode: string): Promise<ChildProfile | null> => {
  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('access_code', accessCode)
    .single();
  if (error || !data) return null;
  return mapChildRow(data);
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('user_profiles').select('*').eq('uid', user.id).single();
  return data ? (data as unknown as UserProfile) : null;
};

// Helper used by db.ts
export const mapChildRow = (row: any): ChildProfile => ({
  id: row.id,
  ownerId: row.owner_id,
  familyId: row.family_id ?? null,
  name: row.name,
  birthDate: row.birth_date as any,
  gender: row.gender,
  schoolShift: row.school_shift,
  schoolShiftStart: row.school_shift_start,
  schoolShiftEnd: row.school_shift_end,
  avatar: row.avatar,
  color: row.color,
  stars: row.stars,
  totalStars: row.total_stars,
  level: row.level,
  accessCode: row.access_code,
  earnedBadgeIds: row.earned_badge_ids ?? [],
  favoriteRewardIds: row.favorite_reward_ids ?? [],
  createdAt: row.created_at as any,
  updatedAt: row.updated_at as any,
});
