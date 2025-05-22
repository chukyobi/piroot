import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const VAULT_PATH = path.join(__dirname, 'seed.enc');

const rawKey = process.env.SEED_ENCRYPTION_KEY;
if (!rawKey) {
  throw new Error('SEED_ENCRYPTION_KEY env var is not set');
}

const ENCRYPTION_KEY = Buffer.from(rawKey, 'base64');
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('Decoded SEED_ENCRYPTION_KEY must be 32 bytes');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; 

export function storeSeedPhrase(mnemonic: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(mnemonic, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);

  fs.writeFileSync(VAULT_PATH, payload);
}

export function getSeedPhrase(): string {
  if (!fs.existsSync(VAULT_PATH)) {
    throw new Error('Seed file not found');
  }

  const data = fs.readFileSync(VAULT_PATH);

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted.trim();
}
