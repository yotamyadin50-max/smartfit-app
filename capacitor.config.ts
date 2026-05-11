import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.smartfit.app',
  appName: 'SmartFit',
  webDir: 'dist',
  server: {
    // Use https scheme on Android for secure cookies and modern web APIs
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
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
