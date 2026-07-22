import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartfit.app',
  appName: 'FITNESS AI',
  webDir: 'dist',
  server: {
    // Use https scheme on Android for secure cookies and modern web APIs
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      // Hidden manually from App.tsx once the first route has painted, instead
      // of a blind timer — on a slow device a >2s JS boot used to leave a
      // blank screen after the timer-based auto-hide fired.
      launchAutoHide: false,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#6366f1',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f172a',
    },
  },
}

export default config
