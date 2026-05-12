import { useEffect, useRef } from 'react'

const WAVES = [
  { amp: 0.13, freq: 1.7, speed: 0.0000013, phase: 0.0, thick: 0.28, alpha: 1.0  },
  { amp: 0.10, freq: 2.3, speed: 0.0000020, phase: 1.2, thick: 0.20, alpha: 0.75 },
  { amp: 0.08, freq: 3.1, speed: 0.0000016, phase: 2.5, thick: 0.14, alpha: 0.55 },
  { amp: 0.06, freq: 1.3, speed: 0.0000010, phase: 4.0, thick: 0.10, alpha: 0.40 },
  { amp: 0.05, freq: 4.0, speed: 0.0000025, phase: 0.7, thick: 0.08, alpha: 0.30 },
]

export default function AnimatedWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const canvasElement: HTMLCanvasElement = canvas
    const ctx: CanvasRenderingContext2D = context

    let W = 0, H = 0, t = 0, last = 0, rafId = 0

    function resize() {
      W = canvasElement.width  = window.innerWidth
      H = canvasElement.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    function drawWave(w: typeof WAVES[0]) {
      const angle = Math.PI / 4
      const cx = W / 2, cy = H / 2
      const len = Math.sqrt(W * W + H * H)

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)

      const spread = len * w.thick
      const steps  = Math.ceil(len / 2) + 50

      const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0)
      grad.addColorStop(0.00, `rgba(20,10,180,0)`)
      grad.addColorStop(0.15, `rgba(50,30,220,${w.alpha})`)
      grad.addColorStop(0.35, `rgba(80,20,255,${w.alpha})`)
      grad.addColorStop(0.50, `rgba(140,0,255,${w.alpha})`)
      grad.addColorStop(0.65, `rgba(180,50,255,${w.alpha})`)
      grad.addColorStop(0.85, `rgba(100,20,220,${w.alpha})`)
      grad.addColorStop(1.00, `rgba(20,10,180,0)`)

      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const x = -len / 2 + (len * i) / steps
        const y = Math.sin(x * w.freq * 0.003 + t * w.speed * 1000 + w.phase) * H * w.amp
        if (i === 0) ctx.moveTo(x, y - spread / 2)
        else         ctx.lineTo(x, y - spread / 2)
      }
      for (let i = steps; i >= 0; i--) {
        const x = -len / 2 + (len * i) / steps
        const y = Math.sin(x * w.freq * 0.003 + t * w.speed * 1000 + w.phase) * H * w.amp
        ctx.lineTo(x, y + spread / 2)
      }
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()
    }

    function drawVignette() {
      const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.75)
      grad.addColorStop(0,   'rgba(0,0,0,0)')
      grad.addColorStop(0.5, 'rgba(0,0,0,0)')
      grad.addColorStop(1,   'rgba(0,0,0,0.92)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    }

    function drawGlow() {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const angle = Math.PI / 4
      const cx = W / 2, cy = H / 2
      const grad = ctx.createLinearGradient(
        cx - Math.cos(angle) * W * 0.5, cy - Math.sin(angle) * H * 0.5,
        cx + Math.cos(angle) * W * 0.5, cy + Math.sin(angle) * H * 0.5
      )
      grad.addColorStop(0,   'rgba(0,0,0,0)')
      grad.addColorStop(0.2, 'rgba(60,0,160,0.06)')
      grad.addColorStop(0.5, 'rgba(120,0,255,0.10)')
      grad.addColorStop(0.8, 'rgba(60,0,160,0.06)')
      grad.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    function frame(ts: number) {
      const dt = Math.min(ts - last, 50)
      last = ts
      t += dt

      ctx.clearRect(0, 0, W, H)
      for (let i = WAVES.length - 1; i >= 0; i--) drawWave(WAVES[i])
      drawGlow()
      drawVignette()

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  )
}
