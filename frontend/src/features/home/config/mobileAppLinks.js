/**
 * Enlaces de descarga de la app móvil (Flutter).
 * Configura en Vercel / .env.local:
 *   VITE_MOBILE_APP_IOS_URL
 *   VITE_MOBILE_APP_ANDROID_URL
 *   VITE_MOBILE_APP_APK_URL
 */

function trimUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getMobileAppLinks() {
  const iosUrl = trimUrl(import.meta.env.VITE_MOBILE_APP_IOS_URL);
  const androidUrl = trimUrl(import.meta.env.VITE_MOBILE_APP_ANDROID_URL);
  const apkUrl = trimUrl(import.meta.env.VITE_MOBILE_APP_APK_URL);

  return {
    iosUrl,
    androidUrl,
    apkUrl,
    hasStoreLinks: Boolean(iosUrl || androidUrl),
    hasAnyDownload: Boolean(iosUrl || androidUrl || apkUrl),
  };
}
