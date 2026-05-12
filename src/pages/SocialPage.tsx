import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useUser } from '../context/UserContext'
import { useI18n } from '../context/I18nContext'
import BottomNav from '../components/layout/BottomNav'
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

type Tab = 'friends' | 'notifications'

export default function SocialPage() {
  const { user } = useAuth()
  const { profile, stats, addXP } = useUser()
  const { isHebrew } = useI18n()

  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<FriendNotification[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadingLink, setLoadingLink] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<Friend | null>(null)
  const [shareType, setShareType] = useState<'achievement' | 'workout' | null>(null)
  const [shareSuccess, setShareSuccess] = useState(false)

  const t = (en: string, he: string) => isHebrew ? he : en

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
    setShareType(null)
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
      <div className="page-content">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            👥 {t('Friends', 'חברים')}
          </h1>
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

            {/* My stats mini card */}
            <div style={{ ...card }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {t('My profile', 'הפרופיל שלי')}
              </p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 36 }}>🐯</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{profile.name || user?.email?.split('@')[0]}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    Lv.{stats.level} · {stats.streak}🔥 · {stats.xp} XP
                  </p>
                </div>
              </div>
            </div>

            {/* Friends list */}
            {friends.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 32 }}>
                <p style={{ fontSize: 40, margin: '0 0 10px' }}>👥</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>
                  {t('No friends yet. Send your invite link!', 'אין חברים עדיין. שלח את קישור ההזמנה!')}
                </p>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 38 }}>🐯</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{friend.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                      Lv.{friend.level} · {friend.streak}🔥 · {friend.xp} XP
                    </p>
                    {friend.badges.length > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 16 }}>
                        {friend.badges.slice(0, 5).join(' ')}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      onClick={() => { setShareTarget(friend); setShareType('achievement') }}
                      style={{
                        padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {t('Share', 'שתף')}
                    </button>
                    <button
                      onClick={() => handleRemove(friend)}
                      disabled={removingId === friend.id}
                      style={{
                        padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {removingId === friend.id ? '...' : t('Remove', 'הסר')}
                    </button>
                  </div>
                </div>
              ))
            )}
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
      <BottomNav />
    </div>
  )
}
