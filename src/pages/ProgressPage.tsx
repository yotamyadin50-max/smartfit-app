import { useState } from 'react'
import {
  mockWorkoutHistory,
  mockAchievements,
  mockMeasurements,
  mockMonthlySummary,
  mockAIProgressInsight,
} from '../data/mockProgress'
import BottomNav from '../components/layout/BottomNav'

function GraphPlaceholder({ label }: { label: string }) {
  return (
    <div className="graph-placeholder">
      <div className="graph-bars">
        {[60, 80, 45, 90, 70, 85, 55].map((h, i) => (
          <div key={i} className="graph-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="graph-label">{label}</p>
    </div>
  )
}

function MeasurementsSection() {
  const latest = mockMeasurements[mockMeasurements.length - 1]
  const prev = mockMeasurements[mockMeasurements.length - 2]
  const weightDiff = (latest.weight - prev.weight).toFixed(1)

  return (
    <div className="measurements-card">
      <h3 className="section-title">Body Measurements</h3>
      <div className="measurements-grid">
        <div className="measurement-item">
          <span className="measurement-label">Weight</span>
          <span className="measurement-value">{latest.weight} kg</span>
          <span className={`measurement-delta ${Number(weightDiff) < 0 ? 'positive' : 'negative'}`}>
            {weightDiff} kg
          </span>
        </div>
        {latest.bodyFat && (
          <div className="measurement-item">
            <span className="measurement-label">Body Fat</span>
            <span className="measurement-value">{latest.bodyFat}%</span>
          </div>
        )}
        {latest.chest && (
          <div className="measurement-item">
            <span className="measurement-label">Chest</span>
            <span className="measurement-value">{latest.chest} cm</span>
          </div>
        )}
        {latest.waist && (
          <div className="measurement-item">
            <span className="measurement-label">Waist</span>
            <span className="measurement-value">{latest.waist} cm</span>
          </div>
        )}
      </div>
      <p className="measurement-note">📷 Photo progress: <span className="badge-coming-soon">Coming soon</span></p>
      {/* TODO: connect to Supabase body_measurements table */}
    </div>
  )
}

export default function ProgressPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'achievements'>('overview')

  return (
    <div className="app-layout">
      <div className="page-content">
        <h1 className="page-title">Progress 📊</h1>

        <div className="insight-card">
          <div className="insight-tag">🤖 AI Insight · Demo</div>
          <p className="insight-text">{mockAIProgressInsight}</p>
          {/* TODO: replace with generateProgressInsight() from src/lib/ai.ts */}
        </div>

        <div className="section-tabs">
          {(['overview', 'history', 'achievements'] as const).map(s => (
            <button
              key={s}
              className={`section-tab-btn${activeSection === s ? ' active' : ''}`}
              onClick={() => setActiveSection(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {activeSection === 'overview' && (
          <>
            <div className="graphs-row">
              <GraphPlaceholder label="Workouts per week" />
              <GraphPlaceholder label="Weight over time" />
            </div>
            <MeasurementsSection />
            <div className="monthly-summary-card">
              <h3 className="section-title">Monthly Summary · {mockMonthlySummary.month}</h3>
              <div className="monthly-stats">
                <div className="monthly-stat"><span>{mockMonthlySummary.totalWorkouts}</span><p>Workouts</p></div>
                <div className="monthly-stat"><span>{mockMonthlySummary.totalMinutes}</span><p>Minutes</p></div>
                <div className="monthly-stat"><span>{mockMonthlySummary.totalXP}</span><p>XP Earned</p></div>
                <div className="monthly-stat"><span>{mockMonthlySummary.weightChange} kg</span><p>Weight Δ</p></div>
              </div>
              <div className="insight-card" style={{ marginTop: 12 }}>
                <div className="insight-tag">📝 Monthly insight</div>
                <p className="insight-text">{mockMonthlySummary.aiInsight}</p>
              </div>
            </div>
          </>
        )}

        {activeSection === 'history' && (
          <div className="history-list">
            {mockWorkoutHistory.map(h => (
              <div key={h.id} className="history-item">
                <div className="history-item-left">
                  <span className="history-date">{h.date}</span>
                  <span className="history-name">{h.workoutName}</span>
                  <span className="history-meta">⏱ {h.durationMinutes} min · {h.feeling}</span>
                </div>
                <div className="history-item-right">
                  <span className="history-xp">+{h.xpEarned} XP</span>
                  <span className={`difficulty-badge ${h.difficulty}`}>{h.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'achievements' && (
          <div className="achievements-grid">
            {mockAchievements.map(a => (
              <div key={a.id} className={`achievement-card${a.unlockedAt ? ' unlocked' : ' locked'}`}>
                <span className="achievement-emoji">{a.emoji}</span>
                <span className="achievement-title">{a.title}</span>
                <span className="achievement-desc">{a.description}</span>
                {a.unlockedAt
                  ? <span className="achievement-date">✅ {a.unlockedAt}</span>
                  : <span className="achievement-locked">🔒 Locked</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
