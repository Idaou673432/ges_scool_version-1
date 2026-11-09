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

const EXPIRY_ENVELOPE_PREFIX = '{"__skl_exp":true,';

/**
 * Liste blanche des clés permanentes et critiques qui ne doivent JAMAIS être supprimées
 * lors des nettoyages automatiques ou d'urgence.
 */
export const PROTECTED_STORAGE_KEYS = new Set<string>([
  'somasikolo_settings',
  'somasikolo_users',
  'somasikolo_students',
  'somasikolo_classes',
  'somasikolo_subjects',
  'somasikolo_teachers',
  'somasikolo_grades',
  'somasikolo_payments',
  'somasikolo_attendance',
  'somasikolo_audit_logs',
  'somasikolo_active_user',
  'somasikolo_active_user_id',
  'kalangest_cloud_school_code',
  'kalangest_sidebar_collapsed',
  'kalangest_qr_autoprint',
  'kalangest_cash_closures',
  'soma_expenses',
  'soma_pending_offline_payments',
  'kalangest_offline_queue_v1',
  'somasikolo_scan_history_v1',
  'soma_exam_sessions',
  'soma_exam_slots'
]);

/**
 * Motifs identifiant les données de travail temporaires, tampons d'impression et caches éphémères
 */
export const TEMPORARY_KEY_PATTERNS = [
  /^(tmp|temp|cache)_/i,
  /_(tmp|temp|cache)_/i,
  /_(tmp|temp|cache)$/i,
  /^soma_(temp|cache|preview|draft)_/i,
  /^kalangest_(temp|cache|preview|buffer|draft)_/i,
  /^somasikolo_(temp|cache|preview|draft|buffer)_/i,
  /_export_buffer_/i,
  /_ticket_draft_/i,
  /_print_buffer_/i
];

/**
 * Vérifie si une clé est de nature temporaire ou éphémère
 */
export function isTemporaryStorageKey(key: string): boolean {
  if (PROTECTED_STORAGE_KEYS.has(key)) return false;
  return TEMPORARY_KEY_PATTERNS.some(pattern => pattern.test(key));
}

export interface StorageCleanOptions {
  forceAllTemps?: boolean;
  maxTempAgeMs?: number;
}

export interface StorageCleanResult {
  success: boolean;
  deletedKeys: string[];
  freedBytes: number;
  totalStorageBytes: number;
  remainingKeysCount: number;
}

export interface StorageUsageInfo {
  usedBytes: number;
  usedKb: number;
  keysCount: number;
  temporaryKeysCount: number;
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
   * Récupère une valeur brute déchiffrée avec gestion automatique de l'expiration TTL
   */
  public getItem(key: string): string | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return null;
      const decrypted = decryptData(raw, key);
      if (!decrypted) return null;

      // Gestion transparente des clés à durée de vie limitée (TTL)
      if (decrypted.startsWith(EXPIRY_ENVELOPE_PREFIX)) {
        try {
          const envelope = JSON.parse(decrypted);
          if (envelope.__skl_exp) {
            if (Date.now() > envelope.expiresAt) {
              // La clé a expiré, suppression immédiate
              this.removeItem(key);
              return null;
            }
            return envelope.data;
          }
        } catch {
          return decrypted;
        }
      }

      return decrypted;
    } catch (e) {
      console.error(`[SecureStorage] Erreur getItem(${key}):`, e);
      return null;
    }
  }

  /**
   * Enregistre une valeur sous forme chiffrée avec protection automatique contre la saturation du quota
   */
  public setItem(key: string, value: string): void {
    if (!this.storage) return;
    try {
      const strVal = typeof value === 'string' ? value : String(value);
      const encrypted = encryptData(strVal, key);
      this.storage.setItem(key, encrypted);
    } catch (e: any) {
      // Déclenchement automatique du nettoyage d'urgence si le quota du navigateur est saturé
      if (
        e?.name === 'QuotaExceededError' ||
        e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e?.code === 22 ||
        e?.code === 1014
      ) {
        console.warn(`[SecureStorage] Quota de stockage local saturé ! Déclenchement du nettoyage automatique d'urgence...`);
        this.cleanTemporaryData({ forceAllTemps: true });
        try {
          const strVal = typeof value === 'string' ? value : String(value);
          const encrypted = encryptData(strVal, key);
          this.storage.setItem(key, encrypted);
          console.info(`[SecureStorage] Enregistrement réussi après nettoyage d'urgence.`);
          return;
        } catch (retryErr) {
          console.error(`[SecureStorage] Échec persistant après nettoyage:`, retryErr);
        }
      }
      console.error(`[SecureStorage] Erreur setItem(${key}):`, e);
    }
  }

  /**
   * Enregistre une valeur temporaire avec une durée de validité (TTL en millisecondes)
   */
  public setItemWithExpiry(key: string, value: string, ttlMs: number): void {
    const envelope = {
      __skl_exp: true,
      expiresAt: Date.now() + Math.max(1, ttlMs),
      createdAt: Date.now(),
      data: String(value)
    };
    this.setItem(key, JSON.stringify(envelope));
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
   * Sérialise et enregistre un objet JSON avec durée d'expiration (TTL)
   */
  public setJSONWithExpiry<T>(key: string, value: T, ttlMs: number): void {
    try {
      const jsonStr = JSON.stringify(value);
      this.setItemWithExpiry(key, jsonStr, ttlMs);
    } catch (e) {
      console.error(`[SecureStorage] Erreur setJSONWithExpiry pour "${key}":`, e);
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
   * Nettoie automatiquement les données temporaires, expirées ou tampons obsolètes
   * pour libérer de l'espace sans toucher aux données protégées.
   */
  public cleanTemporaryData(options: StorageCleanOptions = {}): StorageCleanResult {
    if (!this.storage) {
      return {
        success: false,
        deletedKeys: [],
        freedBytes: 0,
        totalStorageBytes: 0,
        remainingKeysCount: 0
      };
    }

    const { forceAllTemps = false, maxTempAgeMs = 24 * 60 * 60 * 1000 } = options;
    const deletedKeys: string[] = [];
    let freedBytes = 0;
    const now = Date.now();

    try {
      const keysToExamine: string[] = [];
      let totalBytes = 0;

      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i);
        if (k) {
          keysToExamine.push(k);
          const val = this.storage.getItem(k) || '';
          totalBytes += (k.length + val.length) * 2;
        }
      }

      for (const k of keysToExamine) {
        // Règle absolue : Ne jamais toucher aux données protégées
        if (PROTECTED_STORAGE_KEYS.has(k)) {
          continue;
        }

        const rawVal = this.storage.getItem(k);
        if (rawVal === null) continue;
        const keyBytes = (k.length + rawVal.length) * 2;

        // 1. Clé vide ou corrompue
        if (rawVal === '') {
          this.storage.removeItem(k);
          deletedKeys.push(k);
          freedBytes += keyBytes;
          continue;
        }

        // 2. Clé avec enveloppe d'expiration TTL
        const decrypted = decryptData(rawVal, k);
        if (decrypted && decrypted.startsWith(EXPIRY_ENVELOPE_PREFIX)) {
          try {
            const envelope = JSON.parse(decrypted);
            if (envelope.__skl_exp) {
              const isExpired = now > envelope.expiresAt;
              const isOld = now - (envelope.createdAt || 0) > maxTempAgeMs;
              if (isExpired || forceAllTemps || isOld) {
                this.storage.removeItem(k);
                deletedKeys.push(k);
                freedBytes += keyBytes;
                continue;
              }
            }
          } catch {
            if (forceAllTemps || isTemporaryStorageKey(k)) {
              this.storage.removeItem(k);
              deletedKeys.push(k);
              freedBytes += keyBytes;
              continue;
            }
          }
        }

        // 3. Clé correspondant aux préfixes de tampons / caches éphémères
        if (isTemporaryStorageKey(k)) {
          this.storage.removeItem(k);
          deletedKeys.push(k);
          freedBytes += keyBytes;
          continue;
        }
      }

      const remainingKeysCount = this.storage.length;
      const totalStorageBytes = Math.max(0, totalBytes - freedBytes);

      if (deletedKeys.length > 0) {
        console.info(
          `[SecureStorage] Nettoyage automatique : ${deletedKeys.length} clé(s) temporaire(s) supprimée(s), ${(freedBytes / 1024).toFixed(2)} Ko libérés.`
        );
      }

      return {
        success: true,
        deletedKeys,
        freedBytes,
        totalStorageBytes,
        remainingKeysCount
      };
    } catch (e) {
      console.error('[SecureStorage] Erreur lors du nettoyage automatique:', e);
      return {
        success: false,
        deletedKeys,
        freedBytes,
        totalStorageBytes: 0,
        remainingKeysCount: this.storage.length
      };
    }
  }

  /**
   * Calcule les métriques d'utilisation de l'espace de stockage
   */
  public getStorageUsage(): StorageUsageInfo {
    if (!this.storage) {
      return { usedBytes: 0, usedKb: 0, keysCount: 0, temporaryKeysCount: 0 };
    }

    let usedBytes = 0;
    let temporaryKeysCount = 0;
    const keysCount = this.storage.length;

    for (let i = 0; i < keysCount; i++) {
      const k = this.storage.key(i);
      if (k) {
        const val = this.storage.getItem(k) || '';
        usedBytes += (k.length + val.length) * 2;
        if (isTemporaryStorageKey(k)) {
          temporaryKeysCount++;
        }
      }
    }

    return {
      usedBytes,
      usedKb: Math.round(usedBytes / 1024),
      keysCount,
      temporaryKeysCount
    };
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
 * Déclencheur global de nettoyage automatique du stockage local
 */
export function autoCleanupStorage(options?: StorageCleanOptions): StorageCleanResult {
  return secureLocalStorage.cleanTemporaryData(options);
}

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
    
    // Déclenchement automatique du nettoyage des anciennes clés temporaires
    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(() => {
        autoCleanupStorage();
      });
    } else {
      setTimeout(() => {
        autoCleanupStorage();
      }, 1500);
    }
  } catch {}
}
