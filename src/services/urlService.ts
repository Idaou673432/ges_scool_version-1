/**
 * SomaSikolo / KalanGest - Service d'URLs Publiques et Résolution Anti-403
 * 
 * Règle le problème du code HTTP 403 Forbidden sur smartphone :
 * L'environnement de développement Google Cloud Run (ais-dev-...) nécessite une authentification
 * interne Google réservée au studio. Pour que les élèves, parents ou surveillants puissent scanner
 * les QR codes avec n'importe quel smartphone sans jamais rencontrer d'erreur 403, ce service
 * convertit automatiquement toute URL privée 'ais-dev-' en l'URL publique partagée 'ais-pre-'.
 */

export const SHARED_APP_URL = 'https://ais-pre-pi2zchn4ib5tq2iwd24whi-184350051384.europe-west2.run.app';

/**
 * Retourne l'origine web publique garantie sans erreur 403
 */
export function getPublicOrigin(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && typeof origin === 'string') {
      // Conversion essentielle ais-dev- vers ais-pre- (supprime le blocage 403 Cloud Run)
      if (origin.includes('ais-dev-')) {
        return origin.replace('ais-dev-', 'ais-pre-');
      }
      if (!origin.startsWith('file:') && origin !== 'null' && origin !== '') {
        return origin;
      }
    }
  }
  return SHARED_APP_URL;
}

/**
 * Retourne l'URL de base complète publique (avec pathname propre)
 */
export function getPublicBaseUrl(customSchoolUrl?: string): string {
  if (customSchoolUrl && customSchoolUrl.trim().startsWith('http')) {
    const clean = customSchoolUrl.trim();
    return clean.endsWith('/') ? clean : `${clean}/`;
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
 * Convertit n'importe quelle URL (y compris locale ou ais-dev-) en URL scannable universelle sans 403
 */
export function sanitizePublicUrl(url: string): string {
  if (!url) return getPublicBaseUrl();
  if (url.includes('ais-dev-')) {
    return url.replace('ais-dev-', 'ais-pre-');
  }
  return url;
}
