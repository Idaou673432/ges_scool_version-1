/**
 * SomaSikolo / KalanGest - Couche de Chiffrement Sécurisé pour le Stockage Client (Storage Encryption Layer)
 * 
 * Protège les données sensibles (élèves, matricules, finances, notes, identifiants, tokens)
 * contre l'inspection directe en clair dans les outils de développement (DevTools / inspecteur du navigateur).
 * 
 * Caractéristiques :
 * - Chiffrement réversible synchrone adapté à l'accès synchrone localStorage / sessionStorage
 * - Préfixe signature de version (__SKL_ENC_V1__)
 * - Dérivation de flux de clé avec sel aléatoire et somme de contrôle d'intégrité (FNV-1a / Checksum)
 * - Support complet des caractères UTF-8 (accents français, bambara, symboles monétaires FCFA, JSON)
 * - Rétro-compatibilité transparente : lecture automatique des anciennes données non chiffrées
 * - Migration automatique instantanée des clés existantes en clair vers leur version chiffrée
 */

const STORAGE_PREFIX = '__SKL_ENC_V1__:';
const VAULT_SECRET = 'SomaSikolo_Mali_2025_SecureKeyVault_#90070321_BKO';

/**
 * Calcul d'un checksum FNV-1a 32-bit pour valider l'intégrité après déchiffrement
 */
function computeChecksum(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Génération d'un sel pseudo-aléatoire hexadécimal
 */
function generateSalt(length = 8): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint8Array(length);
      window.crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, length * 2);
    }
  } catch {}
  let res = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length * 2; i++) {
    res += chars[Math.floor(Math.random() * chars.length)];
  }
  return res;
}

/**
 * Conversion d'une chaîne UTF-8 en tableau d'octets
 */
function stringToUtf8Bytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const encoded = encodeURIComponent(str);
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const c = encoded.charAt(i);
    if (c === '%') {
      bytes.push(parseInt(encoded.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(c.charCodeAt(0));
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Conversion d'un tableau d'octets UTF-8 en chaîne
 */
function utf8BytesToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  let encoded = '';
  for (let i = 0; i < bytes.length; i++) {
    encoded += '%' + bytes[i].toString(16).padStart(2, '0');
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return String.fromCharCode(...Array.from(bytes));
  }
}

/**
 * Dérivation d'une séquence de flux de clé dynamique
 */
function createKeyStream(salt: string, keyName: string, length: number): Uint8Array {
  const seedString = `${VAULT_SECRET}::${keyName}::${salt}`;
  const stream = new Uint8Array(length);
  let state = 0x5a17;
  
  // Amorce l'état avec la chaîne de graine
  for (let i = 0; i < seedString.length; i++) {
    state = (state * 31 + seedString.charCodeAt(i)) & 0xffffffff;
  }
  
  // Génère le keystream
  for (let i = 0; i < length; i++) {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    const shift = (i % 4) * 8;
    const byte = (state >>> shift) & 0xff;
    stream[i] = byte;
  }
  return stream;
}

/**
 * Encode un tableau d'octets en base64 URL-safe
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary);
  }
  // Fallback si btoa non disponible
  return Buffer.from(bytes).toString('base64');
}

/**
 * Décode une chaîne base64 en tableau d'octets
 */
function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Chiffre une chaîne de caractères
 */
export function encryptData(plainText: string, keyName: string = 'default'): string {
  if (plainText === null || plainText === undefined) return '';
  if (typeof plainText !== 'string') {
    plainText = JSON.stringify(plainText);
  }

  try {
    const checksum = computeChecksum(plainText);
    const salt = generateSalt(8);
    const inputBytes = stringToUtf8Bytes(plainText);
    const keyStream = createKeyStream(salt, keyName, inputBytes.length);
    const outputBytes = new Uint8Array(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i++) {
      outputBytes[i] = inputBytes[i] ^ keyStream[i];
    }

    const cipherBase64 = bytesToBase64(outputBytes);
    return `${STORAGE_PREFIX}${salt}:${checksum}:${cipherBase64}`;
  } catch (err) {
    console.error('[SecureStorage] Erreur chiffrement, sauvegarde en clair sécurisée:', err);
    return plainText;
  }
}

/**
 * Déchiffre une chaîne de caractères avec repli automatique sur le clair si donnée héritée
 */
export function decryptData(cipherText: string | null, keyName: string = 'default'): string | null {
  if (!cipherText) return null;
  
  // Donnée non chiffrée (héritée ou migration en attente)
  if (!cipherText.startsWith(STORAGE_PREFIX)) {
    return cipherText;
  }

  try {
    const payload = cipherText.slice(STORAGE_PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) {
      // Format inattendu, repli gracieux
      return cipherText;
    }

    const [salt, expectedChecksum, cipherBase64] = parts;
    const cipherBytes = base64ToBytes(cipherBase64);
    const keyStream = createKeyStream(salt, keyName, cipherBytes.length);
    const plainBytes = new Uint8Array(cipherBytes.length);

    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keyStream[i];
    }

    const plainText = utf8BytesToString(plainBytes);
    const computed = computeChecksum(plainText);

    if (computed !== expectedChecksum) {
      console.warn(`[SecureStorage] Avertissement: Checksum invalide pour la clé "${keyName}". Donnée potentiellement altérée.`);
    }

    return plainText;
  } catch (err) {
    console.error(`[SecureStorage] Erreur déchiffrement pour la clé "${keyName}":`, err);
    return null;
  }
}

/**
 * Vérifie si une valeur stockée est chiffrée
 */
export function isEncrypted(value: string | null): boolean {
  return typeof value === 'string' && value.startsWith(STORAGE_PREFIX);
}

/**
 * Interface d'accès au stockage sécurisé (implémentation commune pour local et session)
 */
export class SecureStorageEngine {
  private storage: Storage | null = null;
  private name: string;

  constructor(type: 'localStorage' | 'sessionStorage') {
    this.name = type;
    if (typeof window !== 'undefined') {
      try {
        this.storage = window[type];
      } catch (e) {
        console.warn(`[SecureStorage] ${type} non disponible:`, e);
      }
    }
  }

  /**
   * Récupère une valeur brute déchiffrée
   */
  public getItem(key: string): string | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return null;
      return decryptData(raw, key);
    } catch (e) {
      console.error(`[SecureStorage] Erreur getItem(${key}):`, e);
      return null;
    }
  }

  /**
   * Enregistre une valeur sous forme chiffrée
   */
  public setItem(key: string, value: string): void {
    if (!this.storage) return;
    try {
      const strVal = typeof value === 'string' ? value : String(value);
      const encrypted = encryptData(strVal, key);
      this.storage.setItem(key, encrypted);
    } catch (e) {
      console.error(`[SecureStorage] Erreur setItem(${key}):`, e);
    }
  }

  /**
   * Récupère et désérialise un objet JSON stocké sous forme chiffrée
   */
  public getJSON<T>(key: string, defaultValue: T): T {
    const raw = this.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn(`[SecureStorage] Erreur parse JSON pour "${key}":`, e);
      return defaultValue;
    }
  }

  /**
   * Sérialise et enregistre un objet JSON sous forme chiffrée
   */
  public setJSON<T>(key: string, value: T): void {
    try {
      const jsonStr = JSON.stringify(value);
      this.setItem(key, jsonStr);
    } catch (e) {
      console.error(`[SecureStorage] Erreur setJSON pour "${key}":`, e);
    }
  }

  /**
   * Supprime une clé
   */
  public removeItem(key: string): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch (e) {
      console.error(`[SecureStorage] Erreur removeItem(${key}):`, e);
    }
  }

  /**
   * Vide le stockage
   */
  public clear(): void {
    if (!this.storage) return;
    try {
      this.storage.clear();
    } catch (e) {
      console.error('[SecureStorage] Erreur clear:', e);
    }
  }

  /**
   * Vérifie la présence d'une clé
   */
  public hasItem(key: string): boolean {
    if (!this.storage) return false;
    return this.storage.getItem(key) !== null;
  }

  /**
   * Obtient le nombre d'éléments
   */
  public get length(): number {
    return this.storage?.length || 0;
  }

  /**
   * Récupère la clé à un index donné
   */
  public key(index: number): string | null {
    return this.storage?.key(index) || null;
  }
}

// Instances globales
export const secureLocalStorage = new SecureStorageEngine('localStorage');
export const secureSessionStorage = new SecureStorageEngine('sessionStorage');

/**
 * Migration automatique : chiffre toutes les clés en clair existantes dans localStorage
 * pour les préfixes de l'application (somasikolo_, kalangest_, soma_).
 */
export function autoMigrateStorage(): { migrated: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { migrated: 0 };
  }

  let migrated = 0;
  try {
    const keysToCheck: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith('somasikolo_') || k.startsWith('kalangest_') || k.startsWith('soma_'))) {
        keysToCheck.push(k);
      }
    }

    for (const key of keysToCheck) {
      const val = window.localStorage.getItem(key);
      if (val && !isEncrypted(val)) {
        // La donnée est en clair, on la migre vers la version chiffrée
        const encrypted = encryptData(val, key);
        window.localStorage.setItem(key, encrypted);
        migrated++;
      }
    }

    if (migrated > 0) {
      console.info(`[SecureStorage] Migration réussie : ${migrated} élément(s) chiffré(s) dans le stockage local.`);
    }
  } catch (e) {
    console.warn('[SecureStorage] Migration storage interrompue:', e);
  }

  return { migrated };
}

// Exécution automatique immédiate au chargement du module
if (typeof window !== 'undefined') {
  try {
    autoMigrateStorage();
  } catch {}
}
