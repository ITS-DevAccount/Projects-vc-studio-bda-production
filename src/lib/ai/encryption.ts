// LLM API Key Encryption Helper
// Encrypts/decrypts API keys using Node.js crypto (for use before database storage)

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): string {
  const key = process.env.LLM_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('LLM_ENCRYPTION_KEY environment variable is not set');
  }
  return key;
}

/**
 * Encrypt API key for database storage
 * Returns base64-encoded encrypted string
 */
export function encryptApiKey(plainKey: string): string {
  const encryptionKey = getEncryptionKey();
  
  // Derive a 32-byte key from the encryption key using PBKDF2
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainKey, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted data
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt API key from database
 * Takes base64-encoded encrypted string
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const encryptionKey = getEncryptionKey();
    
    if (!encryptedKey || typeof encryptedKey !== 'string') {
      throw new Error('Encrypted key is invalid or empty');
    }
    
    const combined = Buffer.from(encryptedKey, 'base64');
    
    // Validate buffer length
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    if (combined.length < minLength) {
      throw new Error(`Invalid encrypted key format: expected at least ${minLength} bytes, got ${combined.length}`);
    }
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive the same key
    const key = crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error: any) {
    // Provide more context in error message
    if (error.message?.includes('bad decrypt') || error.message?.includes('Unsupported state')) {
      throw new Error(`Decryption failed: Invalid encryption key or corrupted data. Make sure LLM_ENCRYPTION_KEY matches the key used for encryption. Original error: ${error.message}`);
    }
    throw error;
  }
}

