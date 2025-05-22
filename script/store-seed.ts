import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';


dotenv.config();

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
  // Delete existing seed file if it exists
  if (fs.existsSync(VAULT_PATH)) {
    fs.unlinkSync(VAULT_PATH);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(mnemonic, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]);

  fs.writeFileSync(VAULT_PATH, payload);
  console.log('Seed phrase encrypted and stored successfully.');
}


if (require.main === module) {
  const seed = process.env.SEED_PHRASE;
  if (!seed) {
    throw new Error('SEED_PHRASE env var is not set');
  }
  storeSeedPhrase(seed);
}
