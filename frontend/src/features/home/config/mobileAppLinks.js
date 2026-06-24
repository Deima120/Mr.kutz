/**
 * Enlaces de descarga de la app móvil (Flutter).
 * Configura en Vercel / .env.local:
 *   VITE_MOBILE_APP_IOS_URL
 *   VITE_MOBILE_APP_ANDROID_URL
 *   VITE_MOBILE_APP_DRIVE_URL   — APK en Google Drive (sin Play Store)
 *   VITE_MOBILE_APP_APK_URL
 */

function trimUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Convierte enlace de vista de Drive a descarga directa del APK. */
export function normalizeDriveDownloadUrl(url) {
  const trimmed = trimUrl(url);
  if (!trimmed) return '';

  const fileIdMatch =
    trimmed.match(/\/file\/d\/([^/?]+)/i) ||
    trimmed.match(/[?&]id=([^&]+)/i);

  if (fileIdMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
  }

  return trimmed;
}

export function getMobileAppLinks() {
  const iosUrl = trimUrl(import.meta.env.VITE_MOBILE_APP_IOS_URL);
  const androidUrl = trimUrl(import.meta.env.VITE_MOBILE_APP_ANDROID_URL);
  const driveUrl = normalizeDriveDownloadUrl(import.meta.env.VITE_MOBILE_APP_DRIVE_URL);
  const apkUrl = trimUrl(import.meta.env.VITE_MOBILE_APP_APK_URL);

  return {
    iosUrl,
    androidUrl,
    driveUrl,
    apkUrl,
    hasStoreLinks: Boolean(iosUrl || androidUrl),
    hasAndroidDownload: Boolean(androidUrl || driveUrl || apkUrl),
    hasAnyDownload: Boolean(iosUrl || androidUrl || driveUrl || apkUrl),
  };
}
