import { useState } from 'react'
import { useI18n } from '../context/I18nContext'
import { useAuth } from '../context/AuthContext'

const DISCLAIMER_KEY = 'smartfit_disclaimer_v1'

function hasAccepted() {
  try { return localStorage.getItem(DISCLAIMER_KEY) === 'true' } catch { return false }
}

function markAccepted() {
  try { localStorage.setItem(DISCLAIMER_KEY, 'true') } catch {}
}

export default function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(hasAccepted)
  const [checked, setChecked] = useState(false)
  const { language } = useI18n()
  const { user, loading } = useAuth()
  const he = language === 'he'

  // Already accepted, still loading auth, or already logged in — skip disclaimer
  if (accepted || loading || user) return <>{children}</>

  const handleContinue = () => {
    markAccepted()
    setAccepted(true)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg, #070c18)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      overflowY: 'auto',
    }}>
      <div style={{
        maxWidth: 480, width: '100%',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18, padding: '32px 24px',
        direction: he ? 'rtl' : 'ltr',
        textAlign: he ? 'right' : 'left',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💪</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #eef2ff)', letterSpacing: 0.5 }}>
            Ascend AI
          </h1>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 17, fontWeight: 700,
          color: '#f97316', marginBottom: 16,
          textAlign: 'center',
        }}>
          {he ? '⚠️ הצהרת אחריות' : '⚠️ Disclaimer'}
        </h2>

        {/* Body */}
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
          {he ? (
            <>
              <p style={{ marginBottom: 12 }}>
                האפליקציה Ascend AI מספקת מידע כללי בלבד לצורכי פעילות גופנית ותזונה ו<strong style={{ color: '#fff' }}>אינה מהווה ייעוץ רפואי, תזונתי או מקצועי מכל סוג שהוא.</strong>
              </p>
              <ul style={{ paddingRight: 18, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li>האפליקציה <strong style={{ color: '#fff' }}>אינה אחראית לכל פציעה, נזק בריאותי, אובדן או תוצאה</strong> שעלולים להיגרם כתוצאה מהשימוש בתכנים שלה.</li>
                <li>תוצאות מחושבות (קלוריות, מאקרו, עצימות) הן הערכות בלבד ועשויות לא להתאים לכל אדם.</li>
                <li>אם אתה חש בכאב, אי-נוחות, קוצר נשימה או סחרחורת בזמן אימון — הפסק מיד ופנה לעזרה רפואית.</li>
                <li>השימוש באפליקציה הוא באחריותך המלאה.</li>
              </ul>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                המשך השימוש מהווה הסכמה לתנאים אלו.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 12 }}>
                Ascend AI provides general information for fitness and nutrition purposes only and <strong style={{ color: '#fff' }}>does not constitute medical, nutritional, or professional advice of any kind.</strong>
              </p>
              <ul style={{ paddingLeft: 18, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li>Ascend AI <strong style={{ color: '#fff' }}>accepts no responsibility for injuries, health damage, loss, or outcomes</strong> resulting from use of its content.</li>
                <li>Calculated values (calories, macros, intensity) are estimates and may not suit every individual.</li>
                <li>If you experience pain, discomfort, shortness of breath, or dizziness during exercise — stop immediately and seek medical help.</li>
                <li>You use this app entirely at your own risk.</li>
              </ul>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Continuing to use the app constitutes acceptance of these terms.
              </p>
            </>
          )}
        </div>

        {/* Checkbox */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          marginTop: 20, marginBottom: 20,
          cursor: 'pointer', fontSize: 14,
          color: 'rgba(255,255,255,0.85)',
          flexDirection: he ? 'row-reverse' : 'row',
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: '#3b82f6', cursor: 'pointer' }}
          />
          <span>
            {he
              ? 'קראתי והבנתי את הצהרת האחריות, ואני מסכים/ה להמשיך על אחריותי בלבד.'
              : 'I have read and understood this disclaimer, and I agree to proceed at my own risk.'}
          </span>
        </label>

        {/* Button */}
        <button
          onClick={handleContinue}
          disabled={!checked}
          style={{
            width: '100%', padding: '14px 0',
            borderRadius: 12, border: 'none',
            fontWeight: 700, fontSize: 16,
            cursor: checked ? 'pointer' : 'not-allowed',
            background: checked ? '#3b82f6' : 'rgba(255,255,255,0.1)',
            color: checked ? '#fff' : 'rgba(255,255,255,0.35)',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {he ? 'כניסה לאפליקציה ›' : 'Enter Ascend AI ›'}
        </button>
      </div>
    </div>
  )
}
