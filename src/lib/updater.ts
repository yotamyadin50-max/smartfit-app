import { Capacitor } from '@capacitor/core'

// URL של ה-APK העדכני — מתעדכן בכל גרסה
export const LATEST_APK_URL = 'https://gofile.io/d/MIbE12'

// גרסה נוכחית של האפליקציה
export const CURRENT_VERSION = '1.1.0'

export async function installLatestUpdate(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Native: open download URL in the system browser.
    // User downloads the APK and installs it manually.
    window.open(LATEST_APK_URL, '_system')
  } else {
    // Web: open in same tab
    window.open(LATEST_APK_URL, '_blank')
  }
}
