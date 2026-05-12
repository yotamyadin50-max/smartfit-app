/**
 * friendsService.ts
 * Friends system: invite links, friendships, notifications, sharing.
 * Local-first where possible; Supabase for persistence.
 */

import { isSupabaseConfigured, supabase } from './supabase'
import { readJson, writeJson } from './storage'

// ── Types ────────────────────────────────────────────────────────────────────

export type Friend = {
  id: string
  name: string
  email: string
  streak: number
  xp: number
  level: number
  badges: string[]
}

export type FriendNotification = {
  id: string
  from_user_id: string
  from_name: string
  to_user_id: string
  type: 'friend_added' | 'friend_removed' | 'share_achievement' | 'share_workout'
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

// ── Local storage keys ───────────────────────────────────────────────────────

const PENDING_INVITE_KEY = 'smartfit_pending_invite'

export function savePendingInvite(code: string) {
  writeJson(PENDING_INVITE_KEY, code)
}

export function getPendingInvite(): string | null {
  return readJson<string | null>(PENDING_INVITE_KEY, null)
}

export function clearPendingInvite() {
  localStorage.removeItem(PENDING_INVITE_KEY)
}

// ── Invite links ─────────────────────────────────────────────────────────────

export async function createInviteLink(userId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    return `${window.location.origin}/?invite=demo-${userId.slice(0, 8)}`
  }

  const { data, error } = await supabase
    .from('friend_invites')
    .insert({ creator_id: userId })
    .select('id')
    .single()

  if (error || !data) throw new Error('Failed to create invite')
  return `${window.location.origin}/?invite=${data.id}`
}

export async function acceptInvite(inviteCode: string, userId: string): Promise<'ok' | 'self' | 'already' | 'invalid'> {
  if (!isSupabaseConfigured) return 'ok'

  const { data: invite } = await supabase
    .from('friend_invites')
    .select('creator_id')
    .eq('id', inviteCode)
    .maybeSingle()

  if (!invite) return 'invalid'
  if (invite.creator_id === userId) return 'self'

  // Check if already friends
  const { data: existing } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(user_a_id.eq.${userId},user_b_id.eq.${invite.creator_id}),and(user_a_id.eq.${invite.creator_id},user_b_id.eq.${userId})`)
    .maybeSingle()

  if (existing) return 'already'

  // Create friendship
  await supabase.from('friendships').insert({
    user_a_id: userId,
    user_b_id: invite.creator_id,
  })

  // Notify creator
  const myProfile = await supabase
    .from('profiles')
    .select('profile')
    .eq('id', userId)
    .maybeSingle()

  const myName = (myProfile.data?.profile as Record<string, unknown>)?.name as string ?? 'חבר חדש'

  await supabase.from('friend_notifications').insert({
    from_user_id: userId,
    to_user_id: invite.creator_id,
    type: 'friend_added',
    data: { name: myName },
  })

  return 'ok'
}

// ── Friends list ─────────────────────────────────────────────────────────────

export async function loadFriends(userId: string): Promise<Friend[]> {
  if (!isSupabaseConfigured) return []

  const { data: friendships } = await supabase
    .from('friendships')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

  if (!friendships?.length) return []

  const friendIds = friendships.map(f =>
    f.user_a_id === userId ? f.user_b_id : f.user_a_id
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, profile, stats')
    .in('id', friendIds)

  return (profiles ?? []).map(p => {
    const prof = (p.profile ?? {}) as Record<string, unknown>
    const s = (p.stats ?? {}) as Record<string, unknown>
    return {
      id: p.id,
      name: (prof.name as string) ?? 'משתמש',
      email: '',
      streak: (s.streak as number) ?? 0,
      xp: (s.xp as number) ?? 0,
      level: (s.level as number) ?? 1,
      badges: (prof.earnedBadges as string[]) ?? [],
    }
  })
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  await supabase
    .from('friendships')
    .delete()
    .or(`and(user_a_id.eq.${userId},user_b_id.eq.${friendId}),and(user_a_id.eq.${friendId},user_b_id.eq.${userId})`)

  await supabase.from('friend_notifications').insert({
    from_user_id: userId,
    to_user_id: friendId,
    type: 'friend_removed',
    data: {},
  })
}

// ── Notifications ────────────────────────────────────────────────────────────

export async function loadUnreadNotifications(userId: string): Promise<FriendNotification[]> {
  if (!isSupabaseConfigured) return []

  const { data } = await supabase
    .from('friend_notifications')
    .select('*')
    .eq('to_user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(30)

  return (data ?? []) as FriendNotification[]
}

export async function markAllRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase
    .from('friend_notifications')
    .update({ read: true })
    .eq('to_user_id', userId)
    .eq('read', false)
}

// ── Sharing ───────────────────────────────────────────────────────────────────

export async function shareWithFriend(
  fromUserId: string,
  fromName: string,
  toUserId: string,
  type: 'share_achievement' | 'share_workout',
  data: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured) return
  await supabase.from('friend_notifications').insert({
    from_user_id: fromUserId,
    from_name: fromName,
    to_user_id: toUserId,
    type,
    data,
  })
}
