/**
 * capacitorInit.ts
 *
 * Initialises native Capacitor features: StatusBar colour, safe-area CSS
 * variables, and the Android hardware back-button handler.
 *
 * All imports are dynamic so this file is safe to include in the web build —
 * Capacitor plugins silently no-op when the app is running in a browser.
 */

export async function initCapacitor() {
  try {
    const { Capacitor } = await import('@capacitor/core')

    if (!Capacitor.isNativePlatform()) return

    // ── StatusBar ────────────────────────────────────────────────────────────
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar')
      await StatusBar.setStyle({ style: Style.Dark })
      await StatusBar.setBackgroundColor({ color: '#0f172a' })
    } catch {
      // StatusBar plugin might not be available on all devices — ignore
    }

    // ── Safe-area CSS variables ──────────────────────────────────────────────
    // Exposes Capacitor safe-area insets so CSS can use
    // var(--safe-area-inset-top) etc. without a separate plugin.
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty(
        '--safe-area-inset-top',
        'env(safe-area-inset-top, 0px)'
      )
      document.documentElement.style.setProperty(
        '--safe-area-inset-bottom',
        'env(safe-area-inset-bottom, 0px)'
      )
    }

    // ── Android hardware back button ─────────────────────────────────────────
    try {
      const { App } = await import('@capacitor/app')
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          // On the root screen, exit the app
          App.exitApp()
        }
      })
    } catch {
      // App plugin not available — ignore
    }
  } catch {
    // Running in browser without Capacitor — safe to ignore everything
  }
}
