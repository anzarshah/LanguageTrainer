import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getSecret() {
  const hex = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!hex || hex.length < 64) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptApiKey(plaintext) {
  const secret = getSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, secret, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex'),
  };
}

export function decryptApiKey(encryptedWithTag, ivHex) {
  const secret = getSecret();
  const iv = Buffer.from(ivHex, 'hex');
  const [encrypted, authTag] = encryptedWithTag.split(':');

  const decipher = createDecipheriv(ALGORITHM, secret, iv);
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
