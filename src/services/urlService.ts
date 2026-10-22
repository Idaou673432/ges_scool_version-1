/**
 * SomaSikolo / KalanGest - Service d'URLs Publiques et Résolution QR Code
 * 
 * Permet aux QR codes scannés depuis n'importe quel smartphone d'ouvrir directement
 * l'application sans erreur 404 ("L'URL demandée est introuvable sur ce serveur").
 */

export const ACTIVE_DEV_URL = 'https://ais-dev-t3bwkuf7xfcmisnwi6hxoa-678055252721.europe-west2.run.app';

/**
 * Retourne l'origine web active et joignable
 */
export function getPublicOrigin(customSchoolUrl?: string): string {
  if (customSchoolUrl && customSchoolUrl.trim().startsWith('http')) {
    return customSchoolUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && typeof origin === 'string' && !origin.startsWith('file:') && origin !== 'null' && origin !== '') {
      return origin;
    }
  }

  return ACTIVE_DEV_URL;
}

/**
 * Retourne l'URL de base complète publique (avec pathname propre)
 */
export function getPublicBaseUrl(customSchoolUrl?: string): string {
  if (customSchoolUrl && customSchoolUrl.trim().startsWith('http')) {
    const clean = customSchoolUrl.trim().replace(/\/+$/, '');
    return `${clean}/`;
  }

  const origin = getPublicOrigin();
  let pathname = '/';
  if (typeof window !== 'undefined' && window.location && window.location.pathname) {
    pathname = window.location.pathname;
  }
  const cleanPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return `${origin}${cleanPath}`;
}

/**
 * Nettoie une URL publique
 */
export function sanitizePublicUrl(url: string): string {
  if (!url) return getPublicBaseUrl();
  return url;
}

