import PageHeader from '../components/layout/PageHeader'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'

import {
  createInviteLink,
  loadFriends,
  removeFriend,
  loadUnreadNotifications,
  markAllRead,
  shareWithFriend,
  type Friend,
  type FriendNotification,
} from '../lib/friendsService'
import { getAnimalName, getAnimalProgress, getAnimalRankForLevel } from '../lib/animalRanks'

type Tab = 'friends' | 'notifications'

export default function SocialPage() {
  const { user } = useAuth()
  const { profile, stats } = useUser()
  const { isHebrew } = useI18n()

  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<FriendNotification[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<Friend | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)

  const t = (en: string, he: string) => isHebrew ? he : en
  const myAnimalProgress = getAnimalProgress(stats)
  const streakType = t('Workout streak', 'רצף אימונים')
  const leaderboardRows = [
    {
      animal: myAnimalProgress.current,
      friend: null,
      id: 'me',
      isMe: true,
      level: myAnimalProgress.level,
      name: profile.name || user?.email?.split('@')[0] || t('Me', 'אני'),
      streak: stats.streak,
      xp: stats.xp,
    },
    ...friends.map(friend => ({
      animal: getAnimalRankForLevel(friend.level),
      friend,
      id: friend.id,
      isMe: false,
      level: friend.level,
      name: friend.name,
      streak: friend.streak,
      xp: friend.xp,
    })),
  ].sort((a, b) => b.level - a.level || b.xp - a.xp || b.streak - a.streak)

  const unreadCount = notifications.length

  // Load data
  useEffect(() => {
    if (!user) return
    loadFriends(user.id).then(setFriends)
    loadUnreadNotifications(user.id).then(setNotifications)
  }, [user])

  const handleGetInviteLink = async () => {
    if (!user) return
    setLoadingLink(true)
    try {
      const link = await createInviteLink(user.id)
      setInviteLink(link)
    } catch {
      setInviteLink(`${window.location.origin}/?invite=error`)
    } finally {
      setLoadingLink(false)
    }
  }

  const handleCopy = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleRemove = async (friend: Friend) => {
    if (!user) return
    if (!confirm(t(`Remove ${friend.name} from friends?`, `להסיר את ${friend.name} מהחברים?`))) return
    setRemovingId(friend.id)
    await removeFriend(user.id, friend.id)
    setFriends(prev => prev.filter(f => f.id !== friend.id))
    setRemovingId(null)
  }

  const handleShare = async (type: 'achievement' | 'workout') => {
    if (!shareTarget || !user) return
    const data =
      type === 'achievement'
        ? { badge: stats.level >= 5 ? '🏆' : '⭐', xp: stats.xp, streak: stats.streak }
        : { message: t('Completed a workout!', 'סיים אימון!') }

    await shareWithFriend(
      user.id,
      profile.name || user.email,
      shareTarget.id,
      `share_${type}` as 'share_achievement' | 'share_workout',
      data
    )
    setShareTarget(null)
    setShareSuccess(true)
    setTimeout(() => setShareSuccess(false), 2500)
  }

  const handleOpenNotifications = useCallback(async () => {
    setTab('notifications')
    if (!user || notifications.length === 0) return
    await markAllRead(user.id)
    setNotifications([])
  }, [user, notifications.length])

  const card = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: '14px 16px',
  } as const

  return (
    <div className="app-layout">
      <PageHeader title={`👥 ${t('Friends', 'חברים')}`} />
      <div className="page-content" style={{ paddingTop: 0 }}>

        {/* Tab buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTab('friends')}
              style={{
                padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                background: tab === 'friends' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            >
              {t('Friends', 'חברים')} {friends.length > 0 && `(${friends.length})`}
            </button>
            <button
              onClick={handleOpenNotifications}
              style={{
                padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, position: 'relative',
                background: tab === 'notifications' ? '#22c55e' : 'rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ef4444', color: '#fff', borderRadius: '50%',
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900,
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Friends tab ── */}
        {tab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Invite card */}
            <div style={{ ...card, border: '1.5px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
                ➕ {t('Add a friend', 'הוסף חבר')}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                {t('Send a unique link — when your friend clicks it, you become friends automatically.',
                   'שלח קישור ייחודי — כשחברך לוחץ עליו אתם חברים אוטומטית.')}
              </p>

              {!inviteLink ? (
                <button
                  className="btn-primary"
                  onClick={handleGetInviteLink}
                  disabled={loadingLink}
                  style={{ width: '100%' }}
                >
                  {loadingLink ? '...' : t('Generate my invite link', 'צור קישור הזמנה')}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    readOnly
                    value={inviteLink}
                    style={{
                      flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.3)', color: '#fff', padding: '8px 10px',
                      fontSize: 11, direction: 'ltr',
                    }}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleCopy}
                    style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
                  >
                    {copied ? '✅' : t('Copy', 'העתק')}
                  </button>
                </div>
              )}
            </div>

            {/* Share success */}
            {shareSuccess && (
              <div style={{ ...card, border: '1.5px solid #22c55e', background: 'rgba(34,197,94,0.1)', textAlign: 'center' }}>
                ✅ {t('Shared successfully!', 'שותף בהצלחה!')}
              </div>
            )}

            <div style={{ ...card, border: '1.5px solid rgba(34,197,94,0.22)' }}>
              <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 15 }}>
                {t('Animal leaderboard', 'דירוג חיות')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaderboardRows.map((row, index) => (
                  <div
                    key={`animal-rank-${row.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span style={{ width: 24, color: '#22c55e', fontWeight: 900, fontSize: 13 }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontSize: 36, lineHeight: 1 }} aria-label={getAnimalName(row.animal, isHebrew)}>
                      {row.animal.imageUrl
                        ? <img src={row.animal.imageUrl} alt={getAnimalName(row.animal, isHebrew)} style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover' }} />
                        : row.animal.emoji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.name}{row.isMe ? ` · ${t('You', 'אתה')}` : ''}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        {getAnimalName(row.animal, isHebrew)} · Lv.{row.level}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <strong style={{ display: 'block', fontSize: 16 }}>{row.streak}</strong>
                      <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                        {streakType}
                      </span>
                    </div>
                    {!row.isMe && row.friend && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          onClick={() => setShareTarget(row.friend)}
                          style={{
                            padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, fontWeight: 700,
                          }}
                        >
                          {t('Share', 'שתף')}
                        </button>
                        <button
                          onClick={() => handleRemove(row.friend)}
                          disabled={removingId === row.friend.id}
                          style={{
                            padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 11, fontWeight: 700,
                          }}
                        >
                          {removingId === row.friend.id ? '...' : t('Remove', 'הסר')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {friends.length === 0 && (
                <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>
                  {t('No friends yet. Your profile is ready for the animal ranking.', 'אין חברים עדיין. הפרופיל שלך כבר מופיע בדירוג החיות.')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Notifications tab ── */}
        {tab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notifications.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 32 }}>
                <p style={{ fontSize: 40, margin: '0 0 10px' }}>🔔</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
                  {t('No new notifications', 'אין התראות חדשות')}
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 28 }}>
                    {n.type === 'friend_added' ? '🤝'
                     : n.type === 'friend_removed' ? '💔'
                     : n.type === 'share_achievement' ? '🏆'
                     : '💪'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                      {n.type === 'friend_added'
                        ? t(`${n.from_name} added you as a friend!`, `${n.from_name} הוסיף אותך כחבר!`)
                        : n.type === 'friend_removed'
                        ? t('A friend removed you', 'חבר הסיר אותך')
                        : n.type === 'share_achievement'
                        ? t(`${n.from_name} shared an achievement`, `${n.from_name} שיתף הישג`)
                        : t(`${n.from_name} shared a workout`, `${n.from_name} שיתף אימון`)}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Share modal ── */}
        {shareTarget && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', zIndex: 100,
          }} onClick={() => setShareTarget(null)}>
            <div
              style={{
                background: '#1a1a2e', borderRadius: '20px 20px 0 0',
                padding: 24, width: '100%', maxWidth: 500, margin: '0 auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 17 }}>
                {t(`Share with ${shareTarget.name}`, `שתף עם ${shareTarget.name}`)}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn-primary" onClick={() => handleShare('achievement')}>
                  🏆 {t('Share my achievement (streak + XP)', 'שתף הישג (רצף + XP)')}
                </button>
                <button className="btn-secondary" onClick={() => handleShare('workout')}>
                  💪 {t('Share a workout', 'שתף אימון')}
                </button>
                <button
                  onClick={() => setShareTarget(null)}
                  style={{ padding: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                >
                  {t('Cancel', 'ביטול')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
