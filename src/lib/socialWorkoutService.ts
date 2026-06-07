import { isSupabaseConfigured, supabase } from './supabase'
import { readJson, writeJson } from './storage'
import type { Friend } from './friendsService'

export type WorkoutPostStatus = 'planned' | 'live' | 'completed'
export type WorkoutPostType = 'home' | 'gym' | 'cardio' | 'strength' | 'mobility' | 'custom'
export type WorkoutVisibility = 'friends' | 'selected'
export type WorkoutReactionType = 'like' | 'fire' | 'strong'
export type WorkoutParticipantRole = 'host' | 'participant'
export type WorkoutParticipantState = 'invited' | 'joined' | 'present' | 'completed'
export type JointWorkoutStatus = 'lobby' | 'live' | 'completed' | 'cancelled' | 'paused'

export type WorkoutPostParticipant = {
  completed_at?: string | null
  joined_at?: string | null
  name: string
  role: WorkoutParticipantRole
  state: WorkoutParticipantState
  user_id: string
}

export type WorkoutPostReaction = {
  created_at: string
  type: WorkoutReactionType
  user_id: string
}

export type WorkoutPostComment = {
  body: string
  created_at: string
  id: string
  user_id: string
  user_name: string
}

export type WorkoutPost = {
  calories_estimate: number
  comments: WorkoutPostComment[]
  cover_url?: string | null
  created_at: string
  creator_id: string
  creator_name: string
  duration_min: number
  id: string
  participants: WorkoutPostParticipant[]
  reactions: WorkoutPostReaction[]
  saved_by: string[]
  scheduled_at?: string | null
  stats: Record<string, unknown>
  status: WorkoutPostStatus
  title: string
  type: WorkoutPostType
  visibility: WorkoutVisibility
  workout_id?: string | null
  xp: number
}

export type CreateWorkoutPostInput = {
  caloriesEstimate?: number
  coverUrl?: string
  creatorId: string
  creatorName: string
  durationMin: number
  participants?: Friend[]
  scheduledAt?: string
  stats?: Record<string, unknown>
  status: WorkoutPostStatus
  title: string
  type: WorkoutPostType
  visibility?: WorkoutVisibility
  workoutId?: string
  xp?: number
}

export type JointWorkoutParticipant = {
  completed_at?: string | null
  name: string
  role: WorkoutParticipantRole
  state: WorkoutParticipantState
  user_id: string
}

export type JointWorkoutSession = {
  created_at: string
  device_id?: string | null
  duration_min: number
  ended_at?: string | null
  host_id: string
  host_name: string
  id: string
  participants: JointWorkoutParticipant[]
  plan?: JointWorkoutPlan
  started_at?: string | null
  status: JointWorkoutStatus
  title: string
  type: WorkoutPostType
  workout_id?: string | null
}

export type JointWorkoutPlanExercise = {
  detail: string
  detailHe: string
  name: string
  nameHe: string
}

export type JointWorkoutPlan = {
  difficulty: 'easy' | 'medium' | 'hard'
  exercises: JointWorkoutPlanExercise[]
  source: 'existing' | 'custom'
  summary: string
  summaryHe: string
}

export type JointWorkoutReward = {
  achievements: string[]
  created_at: string
  session_id: string
  streak_awarded: boolean
  user_id: string
  xp_awarded: number
}

const LOCAL_POSTS_KEY = 'smartfit_social_workout_posts'
const LOCAL_SESSIONS_KEY = 'smartfit_joint_workout_sessions'
const LOCAL_REWARDS_KEY = 'smartfit_joint_workout_rewards'
const LOCAL_SAVED_KEY = 'smartfit_saved_social_workouts'
const MAX_LOCAL_POSTS = 80

function createId(prefix: string) {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}_${random}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isWorkoutPost(value: unknown): value is WorkoutPost {
  return isObject(value) && typeof value.id === 'string' && typeof value.title === 'string'
}

function isWorkoutPosts(value: unknown): value is WorkoutPost[] {
  return Array.isArray(value) && value.every(isWorkoutPost)
}

function isJointWorkoutSession(value: unknown): value is JointWorkoutSession {
  return isObject(value) && typeof value.id === 'string' && typeof value.title === 'string'
}

function isJointWorkoutSessions(value: unknown): value is JointWorkoutSession[] {
  return Array.isArray(value) && value.every(isJointWorkoutSession)
}

function getLocalPosts() {
  return readJson<WorkoutPost[]>(LOCAL_POSTS_KEY, [], isWorkoutPosts)
}

function writeLocalPosts(posts: WorkoutPost[]) {
  writeJson(LOCAL_POSTS_KEY, posts.slice(0, MAX_LOCAL_POSTS))
}

function canUserSeePost(post: WorkoutPost, userId: string) {
  if (!userId) return false
  if (post.creator_id === userId) return true
  if (post.participants.some(participant => participant.user_id === userId)) return true
  return post.visibility === 'friends'
}

function getLocalSessions() {
  return readJson<JointWorkoutSession[]>(LOCAL_SESSIONS_KEY, [], isJointWorkoutSessions)
}

function writeLocalSessions(sessions: JointWorkoutSession[]) {
  writeJson(LOCAL_SESSIONS_KEY, sessions.slice(0, 20))
}

function getSavedPostIds() {
  return readJson<string[]>(LOCAL_SAVED_KEY, [], (value): value is string[] =>
    Array.isArray(value) && value.every(item => typeof item === 'string')
  )
}

function buildParticipant(userId: string, name: string, role: WorkoutParticipantRole, state: WorkoutParticipantState): WorkoutPostParticipant {
  const now = new Date().toISOString()
  return {
    completed_at: state === 'completed' ? now : null,
    joined_at: role === 'host' || state !== 'invited' ? now : null,
    name,
    role,
    state,
    user_id: userId,
  }
}

function buildLocalPost(input: CreateWorkoutPostInput): WorkoutPost {
  const now = new Date().toISOString()
  const participantState: WorkoutParticipantState = input.status === 'completed' ? 'completed' : input.status === 'live' ? 'present' : 'joined'
  const participants = [
    buildParticipant(input.creatorId, input.creatorName, 'host', participantState),
    ...(input.participants ?? []).map(friend =>
      buildParticipant(friend.id, friend.name, 'participant', input.status === 'completed' ? 'completed' : 'invited')
    ),
  ]

  return {
    calories_estimate: Math.max(0, Math.round(input.caloriesEstimate ?? input.durationMin * 6)),
    comments: [],
    cover_url: input.coverUrl ?? null,
    created_at: now,
    creator_id: input.creatorId,
    creator_name: input.creatorName,
    duration_min: Math.max(1, Math.round(input.durationMin)),
    id: createId('post'),
    participants,
    reactions: [],
    saved_by: [],
    scheduled_at: input.scheduledAt ?? null,
    stats: input.stats ?? {},
    status: input.status,
    title: input.title.trim(),
    type: input.type,
    visibility: input.visibility ?? 'friends',
    workout_id: input.workoutId ?? null,
    xp: Math.max(0, Math.round(input.xp ?? input.durationMin * 6)),
  }
}

function rowToPost(row: Record<string, unknown>): WorkoutPost {
  return {
    calories_estimate: Number(row.calories_estimate ?? 0),
    comments: [],
    cover_url: (row.cover_url as string | null | undefined) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    creator_id: String(row.creator_id ?? ''),
    creator_name: String(row.creator_name ?? ''),
    duration_min: Number(row.duration_min ?? 0),
    id: String(row.id ?? ''),
    participants: [],
    reactions: [],
    saved_by: [],
    scheduled_at: (row.scheduled_at as string | null | undefined) ?? null,
    stats: isObject(row.stats) ? row.stats : {},
    status: (row.status as WorkoutPostStatus) ?? 'planned',
    title: String(row.title ?? ''),
    type: (row.type as WorkoutPostType) ?? 'custom',
    visibility: (row.visibility as WorkoutVisibility) ?? 'friends',
    workout_id: (row.workout_id as string | null | undefined) ?? null,
    xp: Number(row.xp ?? 0),
  }
}

export async function loadWorkoutFeed(_userId: string): Promise<WorkoutPost[]> {
  const localPosts = getLocalPosts().filter(post => canUserSeePost(post, _userId))
  if (!isSupabaseConfigured) return localPosts

  try {
    const { data: rows, error } = await supabase
      .from('workout_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) throw error

    const posts = ((rows ?? []) as Record<string, unknown>[]).map(rowToPost)
    const postIds = posts.map(post => post.id)
    if (postIds.length === 0) return localPosts

    const [participants, reactions, comments] = await Promise.all([
      supabase.from('workout_post_participants').select('*').in('post_id', postIds),
      supabase.from('workout_post_reactions').select('*').in('post_id', postIds),
      supabase.from('workout_post_comments').select('*').in('post_id', postIds).is('deleted_at', null).order('created_at', { ascending: true }),
    ])

    return posts.map(post => ({
        ...post,
        comments: ((comments.data ?? []) as Record<string, unknown>[])
          .filter(item => item.post_id === post.id)
          .map(item => ({
            body: String(item.body ?? ''),
            created_at: String(item.created_at ?? post.created_at),
            id: String(item.id ?? createId('comment')),
            user_id: String(item.user_id ?? ''),
            user_name: String(item.user_name ?? ''),
          })),
        participants: ((participants.data ?? []) as Record<string, unknown>[])
          .filter(item => item.post_id === post.id)
          .map(item => ({
            completed_at: (item.completed_at as string | null | undefined) ?? null,
            joined_at: (item.joined_at as string | null | undefined) ?? null,
            name: String(item.name ?? ''),
            role: (item.role as WorkoutParticipantRole) ?? 'participant',
            state: (item.state as WorkoutParticipantState) ?? 'invited',
            user_id: String(item.user_id ?? ''),
          })),
        reactions: ((reactions.data ?? []) as Record<string, unknown>[])
          .filter(item => item.post_id === post.id)
          .map(item => ({
            created_at: String(item.created_at ?? post.created_at),
            type: (item.type as WorkoutReactionType) ?? 'like',
            user_id: String(item.user_id ?? ''),
          })),
        saved_by: getSavedPostIds().includes(post.id) ? [_userId] : [],
      }))
      .filter(post => canUserSeePost(post, _userId))
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] feed fallback to local mode', error)
    return localPosts
  }
}

export async function createWorkoutPost(input: CreateWorkoutPostInput): Promise<WorkoutPost> {
  const localPost = buildLocalPost(input)

  if (!isSupabaseConfigured) {
    writeLocalPosts([localPost, ...getLocalPosts()])
    return localPost
  }

  try {
    const { data, error } = await supabase
      .from('workout_posts')
      .insert({
        calories_estimate: localPost.calories_estimate,
        cover_url: localPost.cover_url,
        creator_id: localPost.creator_id,
        creator_name: localPost.creator_name,
        duration_min: localPost.duration_min,
        scheduled_at: localPost.scheduled_at,
        stats: localPost.stats,
        status: localPost.status,
        title: localPost.title,
        type: localPost.type,
        visibility: localPost.visibility,
        workout_id: localPost.workout_id,
        xp: localPost.xp,
      })
      .select('*')
      .single()

    if (error || !data) throw error ?? new Error('Missing workout post')
    const created = rowToPost(data as Record<string, unknown>)
    const participantRows = localPost.participants.map(participant => ({
      completed_at: participant.completed_at,
      joined_at: participant.joined_at,
      name: participant.name,
      post_id: created.id,
      role: participant.role,
      state: participant.state,
      user_id: participant.user_id,
    }))
    const { error: participantError } = await supabase.from('workout_post_participants').insert(participantRows)
    if (participantError) throw participantError
    return { ...created, participants: localPost.participants }
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] create post fallback to local mode', error)
    writeLocalPosts([localPost, ...getLocalPosts()])
    return localPost
  }
}

export async function joinWorkoutPost(postId: string, userId: string, userName: string): Promise<void> {
  const posts = getLocalPosts()
  writeLocalPosts(posts.map(post => {
    if (post.id !== postId) return post
    if (post.participants.some(item => item.user_id === userId)) return post
    return { ...post, participants: [...post.participants, buildParticipant(userId, userName, 'participant', 'joined')] }
  }))

  if (!isSupabaseConfigured) return
  try {
    await supabase.from('workout_post_participants').upsert({
      joined_at: new Date().toISOString(),
      name: userName,
      post_id: postId,
      role: 'participant',
      state: 'joined',
      user_id: userId,
    }, { onConflict: 'post_id,user_id' })
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] join stored locally', error)
  }
}

export async function reactToWorkoutPost(postId: string, userId: string, type: WorkoutReactionType): Promise<void> {
  const posts = getLocalPosts()
  writeLocalPosts(posts.map(post => {
    if (post.id !== postId) return post
    const existing = post.reactions.some(item => item.user_id === userId && item.type === type)
    const reactions = existing
      ? post.reactions.filter(item => !(item.user_id === userId && item.type === type))
      : [...post.reactions, { created_at: new Date().toISOString(), type, user_id: userId }]
    return { ...post, reactions }
  }))

  if (!isSupabaseConfigured) return
  try {
    const { data } = await supabase
      .from('workout_post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle()

    if (data?.id) {
      await supabase.from('workout_post_reactions').delete().eq('id', data.id)
    } else {
      await supabase.from('workout_post_reactions').insert({ post_id: postId, type, user_id: userId })
    }
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] reaction stored locally', error)
  }
}

export async function commentOnWorkoutPost(postId: string, userId: string, userName: string, body: string): Promise<WorkoutPostComment | null> {
  const text = body.trim()
  if (!text) return null

  const comment: WorkoutPostComment = {
    body: text.slice(0, 240),
    created_at: new Date().toISOString(),
    id: createId('comment'),
    user_id: userId,
    user_name: userName,
  }

  const posts = getLocalPosts()
  writeLocalPosts(posts.map(post =>
    post.id === postId ? { ...post, comments: [...post.comments, comment] } : post
  ))

  if (!isSupabaseConfigured) return comment
  try {
    const { data, error } = await supabase
      .from('workout_post_comments')
      .insert({ body: comment.body, post_id: postId, user_id: userId, user_name: userName })
      .select('*')
      .single()
    if (error || !data) throw error ?? new Error('Missing comment')
    return {
      body: String(data.body ?? comment.body),
      created_at: String(data.created_at ?? comment.created_at),
      id: String(data.id ?? comment.id),
      user_id: String(data.user_id ?? userId),
      user_name: String(data.user_name ?? userName),
    }
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] comment stored locally', error)
    return comment
  }
}

export function saveWorkoutPostForMe(postId: string) {
  const saved = getSavedPostIds()
  if (!saved.includes(postId)) writeJson(LOCAL_SAVED_KEY, [postId, ...saved].slice(0, 80))
}

export async function createJointWorkoutSession(input: {
  durationMin: number
  friends: Friend[]
  hostId: string
  hostName: string
  plan?: JointWorkoutPlan
  title: string
  type: WorkoutPostType
  workoutId?: string
}): Promise<JointWorkoutSession> {
  const now = new Date().toISOString()
  const session: JointWorkoutSession = {
    created_at: now,
    device_id: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'unknown',
    duration_min: Math.max(1, Math.round(input.durationMin)),
    host_id: input.hostId,
    host_name: input.hostName,
    id: createId('joint'),
    participants: [
      { name: input.hostName, role: 'host', state: 'present', user_id: input.hostId },
      ...input.friends.map(friend => ({ name: friend.name, role: 'participant' as const, state: 'invited' as const, user_id: friend.id })),
    ],
    plan: input.plan,
    status: 'lobby',
    title: input.title.trim(),
    type: input.type,
    workout_id: input.workoutId ?? null,
  }

  if (!isSupabaseConfigured) {
    writeLocalSessions([session, ...getLocalSessions()])
    return session
  }

  try {
    const { data, error } = await supabase
      .from('joint_workout_sessions')
      .insert({
        device_id: session.device_id,
        duration_min: session.duration_min,
        host_id: session.host_id,
        host_name: session.host_name,
        status: session.status,
        title: session.title,
        type: session.type,
        workout_id: session.workout_id,
      })
      .select('*')
      .single()

    if (error || !data) throw error ?? new Error('Missing joint session')
    const created = { ...session, id: String(data.id), created_at: String(data.created_at ?? session.created_at) }
    await supabase.from('joint_workout_session_participants').insert(created.participants.map(participant => ({
      name: participant.name,
      role: participant.role,
      session_id: created.id,
      state: participant.state,
      user_id: participant.user_id,
    })))
    return created
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] joint session fallback to local mode', error)
    writeLocalSessions([session, ...getLocalSessions()])
    return session
  }
}

function updateLocalSession(sessionId: string, updater: (session: JointWorkoutSession) => JointWorkoutSession) {
  writeLocalSessions(getLocalSessions().map(session => session.id === sessionId ? updater(session) : session))
}

export async function startJointWorkoutSession(sessionId: string): Promise<void> {
  const startedAt = new Date().toISOString()
  updateLocalSession(sessionId, session => ({ ...session, started_at: startedAt, status: 'live' }))
  if (!isSupabaseConfigured) return
  try {
    await supabase.from('joint_workout_sessions').update({ started_at: startedAt, status: 'live' }).eq('id', sessionId)
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] start session stored locally', error)
  }
}

export async function setJointParticipantPresent(sessionId: string, userId: string, present: boolean): Promise<void> {
  const state: WorkoutParticipantState = present ? 'present' : 'invited'
  updateLocalSession(sessionId, session => ({
    ...session,
    participants: session.participants.map(participant =>
      participant.user_id === userId ? { ...participant, state } : participant
    ),
  }))
  if (!isSupabaseConfigured) return
  try {
    await supabase
      .from('joint_workout_session_participants')
      .update({ state })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] presence stored locally', error)
  }
}

export async function completeJointWorkoutSession(session: JointWorkoutSession): Promise<JointWorkoutReward[]> {
  const endedAt = new Date().toISOString()
  const completedParticipants = session.participants
    .filter(participant => participant.state === 'present' || participant.role === 'host')
    .map(participant => ({ ...participant, completed_at: endedAt, state: 'completed' as const }))

  const baseXp = Math.max(60, Math.round(session.duration_min * 6))
  const groupBonus = completedParticipants.length >= 2 ? Math.round(baseXp * 0.1) : 0
  const rewards: JointWorkoutReward[] = completedParticipants.map(participant => ({
    achievements: [
      'אימון משותף',
      ...(completedParticipants.length >= 3 ? ['קבוצה של 3'] : []),
    ],
    created_at: endedAt,
    session_id: session.id,
    streak_awarded: true,
    user_id: participant.user_id,
    xp_awarded: baseXp + groupBonus,
  }))

  updateLocalSession(session.id, existing => ({
    ...existing,
    ended_at: endedAt,
    participants: existing.participants.map(participant =>
      completedParticipants.find(done => done.user_id === participant.user_id) ?? participant
    ),
    status: 'completed',
  }))
  writeJson(LOCAL_REWARDS_KEY, [...rewards, ...readJson<JointWorkoutReward[]>(LOCAL_REWARDS_KEY, [])].slice(0, 100))

  if (!isSupabaseConfigured) return rewards
  try {
    const { error: rpcError } = await supabase.rpc('complete_joint_workout_rewards', {
      p_rewards: rewards,
      p_session_id: session.id,
    })

    if (!rpcError) return rewards
    if (import.meta.env.DEV) console.log('[SocialWorkout] reward RPC unavailable, using client fallback', rpcError)

    await supabase.from('joint_workout_sessions').update({ ended_at: endedAt, status: 'completed' }).eq('id', session.id)
    await supabase.from('joint_workout_session_participants').upsert(completedParticipants.map(participant => ({
      completed_at: endedAt,
      name: participant.name,
      role: participant.role,
      session_id: session.id,
      state: 'completed',
      user_id: participant.user_id,
    })), { onConflict: 'session_id,user_id' })
    await supabase.from('joint_workout_rewards').upsert(rewards, { onConflict: 'session_id,user_id' })
  } catch (error) {
    if (import.meta.env.DEV) console.log('[SocialWorkout] rewards stored locally', error)
  }
  return rewards
}
