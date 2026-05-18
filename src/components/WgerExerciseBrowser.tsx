import { useState, useEffect, useRef } from 'react'
import {
  fetchWgerExercises,
  WGER_CATEGORIES,
  type WgerExercise,
} from '../lib/wgerService'

const CSS = `
.wger-browser { display:flex; flex-direction:column; gap:14px; }

.wger-cats {
  display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;
  scrollbar-width:none;
}
.wger-cats::-webkit-scrollbar { display:none; }
.wger-cat-btn {
  flex-shrink:0; padding:7px 15px; border-radius:20px; border:1px solid rgba(139,92,246,0.35);
  background:rgba(139,92,246,0.08); color:rgba(255,255,255,0.65);
  font-size:13px; font-weight:600; cursor:pointer; transition:all 0.18s;
  white-space:nowrap;
}
.wger-cat-btn:hover { background:rgba(139,92,246,0.2); color:#fff; }
.wger-cat-btn.active {
  background:linear-gradient(135deg,rgba(139,92,246,0.55),rgba(99,102,241,0.55));
  border-color:rgba(139,92,246,0.7); color:#fff;
}

.wger-grid {
  display:grid; grid-template-columns:1fr 1fr; gap:10px;
}

.wger-card {
  background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
  border-radius:12px; overflow:hidden; cursor:pointer;
  transition:border-color 0.18s, background 0.18s;
  display:flex; flex-direction:column;
}
.wger-card:hover { border-color:rgba(139,92,246,0.4); background:rgba(139,92,246,0.07); }
.wger-card.open { border-color:rgba(139,92,246,0.6); background:rgba(139,92,246,0.1); }

.wger-card-img {
  width:100%; aspect-ratio:4/3; object-fit:cover;
  background:rgba(255,255,255,0.04);
  display:block;
}
.wger-card-img-placeholder {
  width:100%; aspect-ratio:4/3; display:flex; align-items:center; justify-content:center;
  font-size:34px; background:rgba(139,92,246,0.07);
  border-bottom:1px solid rgba(255,255,255,0.06);
}
.wger-card-body { padding:10px; display:flex; flex-direction:column; gap:5px; }
.wger-card-name { font-size:12.5px; font-weight:700; color:rgba(255,255,255,0.92); line-height:1.3; margin:0; }
.wger-card-muscle {
  font-size:11px; color:rgba(167,139,250,0.9); font-weight:600;
  background:rgba(139,92,246,0.15); border-radius:10px; padding:2px 8px;
  display:inline-block; align-self:flex-start;
}
.wger-card-instructions {
  font-size:11.5px; color:rgba(255,255,255,0.6); line-height:1.5;
  margin:4px 0 0; padding-top:6px; border-top:1px solid rgba(255,255,255,0.07);
}

.wger-status {
  text-align:center; padding:24px 0; color:rgba(255,255,255,0.45); font-size:14px;
}
.wger-error { color:#f87171; font-size:13px; text-align:center; padding:12px; }
.wger-load-more {
  width:100%; padding:11px; border-radius:10px; border:1px solid rgba(139,92,246,0.35);
  background:rgba(139,92,246,0.1); color:rgba(255,255,255,0.75);
  font-size:14px; font-weight:600; cursor:pointer; transition:all 0.18s;
}
.wger-load-more:hover:not(:disabled) { background:rgba(139,92,246,0.25); color:#fff; }
.wger-load-more:disabled { opacity:0.5; cursor:not-allowed; }
.wger-count { font-size:12px; color:rgba(255,255,255,0.35); text-align:center; }
`

interface Props {
  defaultCategoryId?: number
}

export function WgerExerciseBrowser({ defaultCategoryId }: Props) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? WGER_CATEGORIES[0].id)
  const [exercises, setExercises] = useState<WgerExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)
  const loadedCategoryRef = useRef<number | null>(null)

  async function load(catId: number, off: number, append: boolean) {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)
    try {
      const { exercises: fetched, hasMore: hm, total: tot } = await fetchWgerExercises(catId, off)
      setExercises(prev => append ? [...prev, ...fetched] : fetched)
      setHasMore(hm)
      setTotal(tot)
      loadedCategoryRef.current = catId
    } catch {
      setError('Failed to load exercises. Check your connection and try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    setOffset(0)
    setExpanded(null)
    setExercises([])
    load(categoryId, 0, false)
  }, [categoryId])

  function handleLoadMore() {
    const next = offset + 20
    setOffset(next)
    load(categoryId, next, true)
  }

  function toggleCard(id: number) {
    setExpanded(prev => prev === id ? null : id)
  }

  return (
    <div className="wger-browser">
      <style>{CSS}</style>

      {/* Category pills */}
      <div className="wger-cats">
        {WGER_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`wger-cat-btn${categoryId === cat.id ? ' active' : ''}`}
            onClick={() => setCategoryId(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <div className="wger-status">Loading exercises…</div>}
      {!loading && error && <div className="wger-error">{error}</div>}

      {/* Grid */}
      {!loading && exercises.length > 0 && (
        <>
          <div className="wger-grid">
            {exercises.map(ex => (
              <div
                key={ex.id}
                className={`wger-card${expanded === ex.id ? ' open' : ''}`}
                onClick={() => toggleCard(ex.id)}
              >
                {ex.imageUrl ? (
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="wger-card-img"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="wger-card-img-placeholder">💪</div>
                )}
                <div className="wger-card-body">
                  <p className="wger-card-name">{ex.name}</p>
                  {ex.primaryMuscles.length > 0 && (
                    <span className="wger-card-muscle">
                      {ex.primaryMuscles.join(', ')}
                    </span>
                  )}
                  {expanded === ex.id && ex.instructions && (
                    <p className="wger-card-instructions">{ex.instructions}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="wger-count">
            Showing {exercises.length} of {total} exercises
          </p>

          {hasMore && (
            <button
              className="wger-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load more exercises'}
            </button>
          )}
        </>
      )}

      {!loading && !error && exercises.length === 0 && (
        <div className="wger-status">No exercises found.</div>
      )}
    </div>
  )
}
