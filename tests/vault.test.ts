import { EnvVaultSync } from '../src/vault';

describe('EnvVaultSync', () => {
  let vault: EnvVaultSync;

  beforeEach(() => {
    vault = new EnvVaultSync();
    vault.initVault();
  });

  test('should initialize vault', () => {
    expect(vault).toBeDefined();
  });

  test('should encrypt and decrypt variables', () => {
    const key = 'DB_PASSWORD';
    const value = 'super-secret-password-123';

    const encrypted = vault.encryptVariable(key, value);
    expect(encrypted).toContain(':');

    const decrypted = vault.decryptVariable(encrypted);
    expect(decrypted).toBe(value);
  });

  test('should throw error when decrypting invalid format', () => {
    expect(() => vault.decryptVariable('invalid')).toThrow();
  });

  test('should store encrypted data', () => {
    vault.encryptVariable('API_KEY', 'test-api-key');
    vault.encryptVariable('DB_URL', 'postgres://localhost');

    const data = vault.getVaultData();
    expect(data.size).toBe(2);
    expect(data.has('API_KEY')).toBe(true);
    expect(data.has('DB_URL')).toBe(true);
  });

  test('should throw error when not initialized', () => {
    const newVault = new EnvVaultSync();
    expect(() => newVault.encryptVariable('KEY', 'value')).toThrow(
      'Vault not initialized'
    );
  });
});
