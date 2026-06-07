import { useEffect, useRef } from 'react'

interface Blob {
  r: number        // radius
  ox: number       // orbit center x (fraction of W)
  oy: number       // orbit center y (fraction of H)
  rx: number       // orbit x-radius (fraction of W)
  ry: number       // orbit y-radius (fraction of H)
  sx: number       // sin speed for x
  sy: number       // cos speed for y
  px: number       // phase x
  py: number       // phase y
  color: string    // rgb(...)
  alpha: number
}

const BLOBS: Blob[] = [
  { r: 0.42, ox: 0.26, oy: 0.34, rx: 0.20, ry: 0.16, sx: 0.000115, sy: 0.000092, px: 0.0, py: 1.2, color: '0,255,136', alpha: 0.24 },
  { r: 0.34, ox: 0.70, oy: 0.52, rx: 0.18, ry: 0.20, sx: 0.000102, sy: 0.000128, px: 2.1, py: 0.5, color: '0,213,255', alpha: 0.18 },
  { r: 0.34, ox: 0.52, oy: 0.24, rx: 0.16, ry: 0.14, sx: 0.000107, sy: 0.000122, px: 4.3, py: 3.1, color: '124,77,255', alpha: 0.19 },
  { r: 0.30, ox: 0.18, oy: 0.72, rx: 0.15, ry: 0.18, sx: 0.000132, sy: 0.000108, px: 1.7, py: 5.0, color: '179,136,255', alpha: 0.15 },
]

export default function AnimatedWaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let W = 0, H = 0, t = 0, last = 0, rafId = 0

    function resize() {
      W = canvas!.width  = window.innerWidth
      H = canvas!.height = window.innerHeight
      if (prefersReducedMotion) requestAnimationFrame(() => paint(0))
    }
    window.addEventListener('resize', resize)
    resize()

    function drawBlob(b: Blob, time: number) {
      const cx = (b.ox + Math.sin(time * b.sx + b.px) * b.rx) * W
      const cy = (b.oy + Math.cos(time * b.sy + b.py) * b.ry) * H
      const r  = b.r * Math.min(W, H)

      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r)
      grad.addColorStop(0,    `rgba(${b.color},${b.alpha})`)
      grad.addColorStop(0.45, `rgba(${b.color},${b.alpha * 0.6})`)
      grad.addColorStop(0.75, `rgba(${b.color},${b.alpha * 0.2})`)
      grad.addColorStop(1,    `rgba(${b.color},0)`)

      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, Math.PI * 2)
      ctx!.fillStyle = grad
      ctx!.fill()
    }

    function drawVignette() {
      const grad = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75)
      grad.addColorStop(0,   'rgba(0,0,0,0)')
      grad.addColorStop(0.6, 'rgba(0,0,0,0)')
      grad.addColorStop(1,   'rgba(0,0,0,0.88)')
      ctx!.fillStyle = grad
      ctx!.fillRect(0, 0, W, H)
    }

    function paint(time: number) {
      ctx!.fillStyle = '#000000'
      ctx!.fillRect(0, 0, W, H)

      ctx!.globalCompositeOperation = 'screen'
      for (const b of BLOBS) drawBlob(b, time)
      ctx!.globalCompositeOperation = 'source-over'

      drawVignette()
    }

    function frame(ts: number) {
      const dt = Math.min(ts - last, 50)
      last = ts
      t += dt

      paint(t)

      rafId = requestAnimationFrame(frame)
    }

    if (prefersReducedMotion) {
      paint(0)
    } else {
      rafId = requestAnimationFrame(frame)
    }

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
        zIndex: 0,
      }}
    />
  )
}
