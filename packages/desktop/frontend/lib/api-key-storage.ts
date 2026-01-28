/**
 * Secure API key storage using Web Crypto API
 *
 * Stores API keys encrypted in localStorage with device-specific encryption.
 * The encryption key is derived from a device-specific ID stored in localStorage.
 */

interface APIKeyData {
  provider: 'fal.ai';
  encryptedKey: string;
  iv: string;
  salt: string;
  lastUsed?: string;
}

const STORAGE_KEY = 'moicad-api-keys';
const DEVICE_ID_KEY = 'moicad-device-id';

/**
 * Get or create a device-specific ID for encryption
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') {
    throw new Error('API key storage only works in browser environment');
  }

  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Derive encryption key from device ID
 */
async function deriveKey(salt: BufferSource): Promise<CryptoKey> {
  const deviceId = getDeviceId();
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Save encrypted API key to localStorage
 */
export async function saveAPIKey(
  provider: 'fal.ai',
  apiKey: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('API key storage only works in browser environment');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive encryption key
  const key = await deriveKey(salt);

  // Encrypt the API key
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Store encrypted data
  const keyData: APIKeyData = {
    provider,
    encryptedKey: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    lastUsed: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(keyData));
}

/**
 * Load and decrypt API key from localStorage
 */
export async function getAPIKey(provider: 'fal.ai'): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const keyData: APIKeyData = JSON.parse(raw);
    if (keyData.provider !== provider) return null;

    // Decode encrypted data
    const salt = new Uint8Array(base64ToArrayBuffer(keyData.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(keyData.iv));
    const encryptedKey = base64ToArrayBuffer(keyData.encryptedKey);

    // Derive decryption key
    const key = await deriveKey(salt);

    // Decrypt the API key
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedKey
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    return null;
  }
}

/**
 * Remove API key from localStorage
 */
export function clearAPIKey(provider: 'fal.ai'): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if API key exists
 */
export async function hasAPIKey(provider: 'fal.ai'): Promise<boolean> {
  const key = await getAPIKey(provider);
  return key !== null && key.length > 0;
}

/**
 * Update last used timestamp
 */
export async function updateAPIKeyUsage(provider: 'fal.ai'): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const keyData: APIKeyData = JSON.parse(raw);
    if (keyData.provider === provider) {
      keyData.lastUsed = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keyData));
    }
  } catch (error) {
    console.error('Failed to update API key usage:', error);
  }
}
