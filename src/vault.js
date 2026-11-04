const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const VAULT_VERSION = 1;

function deriveKey(passphrase, salt) {
  return crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
}

function encrypt(plaintext, passphrase) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([salt, iv, authTag, encrypted]);
  return payload.toString('base64');
}

function decrypt(ciphertext, passphrase) {
  const payload = Buffer.from(ciphertext, 'base64');

  if (payload.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Malformed vault payload: data too short');
  }

  let offset = 0;
  const salt = payload.subarray(offset, offset += SALT_LENGTH);
  const iv = payload.subarray(offset, offset += IV_LENGTH);
  const authTag = payload.subarray(offset, offset += TAG_LENGTH);
  const encrypted = payload.subarray(offset);

  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch (err) {
    throw new Error('Decryption failed: wrong passphrase or tampered data');
  }
}

function parseEnvFile(content) {
  const vars = {};
  if (!content || !content.trim()) return vars;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}

function serializeEnvFile(vars) {
  return Object.entries(vars)
    .map(([key, value]) => {
      const needsQuotes = value.includes(' ') || value.includes('#') || value.includes('\n');
      return needsQuotes ? `${key}="${value}"` : `${key}=${value}`;
    })
    .join('\n') + '\n';
}

function createVault(envFiles, passphrase) {
  const vault = {
    version: VAULT_VERSION,
    created: new Date().toISOString(),
    environments: {}
  };

  for (const [envName, content] of Object.entries(envFiles)) {
    vault.environments[envName] = encrypt(content, passphrase);
  }

  return JSON.stringify(vault, null, 2);
}

function extractVault(vaultData, passphrase, environment) {
  const vault = typeof vaultData === 'string' ? JSON.parse(vaultData) : vaultData;

  if (!vault.environments) {
    throw new Error('Invalid vault format: missing environments');
  }

  if (environment) {
    if (!vault.environments[environment]) {
      throw new Error(`Environment '${environment}' not found in vault. Available: ${Object.keys(vault.environments).join(', ')}`);
    }
    return decrypt(vault.environments[environment], passphrase);
  }

  const result = {};
  for (const [envName, ciphertext] of Object.entries(vault.environments)) {
    result[envName] = decrypt(ciphertext, passphrase);
  }
  return result;
}

function listEnvironments(vaultData) {
  const vault = typeof vaultData === 'string' ? JSON.parse(vaultData) : vaultData;
  if (!vault.environments) return [];
  return Object.keys(vault.environments);
}

module.exports = {
  encrypt,
  decrypt,
  parseEnvFile,
  serializeEnvFile,
  createVault,
  extractVault,
  listEnvironments
};
