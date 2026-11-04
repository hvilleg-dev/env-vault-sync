const assert = require('assert');
const {
  encrypt,
  decrypt,
  parseEnvFile,
  serializeEnvFile,
  createVault,
  extractVault,
  listEnvironments
} = require('../src/vault');

function test(description, fn) {
  try {
    fn();
    console.log(`\x1b[32m✓\x1b[0m ${description}`);
  } catch (err) {
    console.error(`\x1b[31m✗ ${description}\x1b[0m`);
    console.error(`  ${err.message}`);
    process.exitCode = 1;
  }
}

// Test encrypt/decrypt
test('encrypt() produces base64-encoded output', () => {
  const result = encrypt('hello world', 'secret123');
  assert(typeof result === 'string');
  assert(result.length > 0);
  // Base64 only contains [A-Za-z0-9+/=]
  assert(/^[A-Za-z0-9+/=]+$/.test(result), 'Output should be valid base64');
});

test('decrypt() reverses encryption with correct passphrase', () => {
  const plaintext = 'DATABASE_URL=postgres://user:pass@localhost/db';
  const secret = 'mysecret123';
  const encrypted = encrypt(plaintext, secret);
  const decrypted = decrypt(encrypted, secret);
  assert.strictEqual(decrypted, plaintext);
});

test('decrypt() throws on wrong passphrase', () => {
  const plaintext = 'SECRET_KEY=abc123';
  const encrypted = encrypt(plaintext, 'correct');
  let threw = false;
  try {
    decrypt(encrypted, 'wrong');
  } catch (err) {
    threw = true;
    assert(err.message.includes('Decryption failed'));
  }
  assert(threw, 'Should have thrown an error');
});

test('decrypt() throws on tampered data', () => {
  const encrypted = encrypt('data', 'secret');
  // Corrupt the base64 by changing a character
  const tampered = encrypted.slice(0, -5) + 'XXXXX';
  let threw = false;
  try {
    decrypt(tampered, 'secret');
  } catch (err) {
    threw = true;
  }
  assert(threw, 'Should have thrown an error on tampered data');
});

// Test parseEnvFile
test('parseEnvFile() parses simple key=value lines', () => {
  const content = 'KEY1=value1\nKEY2=value2';
  const result = parseEnvFile(content);
  assert.deepStrictEqual(result, { KEY1: 'value1', KEY2: 'value2' });
});

test('parseEnvFile() ignores comments', () => {
  const content = '# This is a comment\nKEY=value\n# Another comment';
  const result = parseEnvFile(content);
  assert.deepStrictEqual(result, { KEY: 'value' });
});

test('parseEnvFile() handles quoted values', () => {
  const content = 'KEY1="value with spaces"\nKEY2=\'single quoted\'';
  const result = parseEnvFile(content);
  assert.deepStrictEqual(result, {
    KEY1: 'value with spaces',
    KEY2: 'single quoted'
  });
});

test('parseEnvFile() ignores empty lines', () => {
  const content = 'KEY1=value1\n\n\nKEY2=value2\n';
  const result = parseEnvFile(content);
  assert.deepStrictEqual(result, { KEY1: 'value1', KEY2: 'value2' });
});

test('parseEnvFile() handles empty file', () => {
  const result = parseEnvFile('');
  assert.deepStrictEqual(result, {});
});

test('parseEnvFile() trims whitespace around keys and values', () => {
  const content = '  KEY1  =  value1  \n  KEY2  =  value2  ';
  const result = parseEnvFile(content);
  assert.deepStrictEqual(result, { KEY1: 'value1', KEY2: 'value2' });
});

// Test serializeEnvFile
test('serializeEnvFile() produces valid env format', () => {
  const vars = { KEY1: 'value1', KEY2: 'value2' };
  const result = serializeEnvFile(vars);
  assert.strictEqual(result.includes('KEY1=value1'), true);
  assert.strictEqual(result.includes('KEY2=value2'), true);
  assert.strictEqual(result.endsWith('\n'), true);
});

test('serializeEnvFile() quotes values with spaces', () => {
  const vars = { DESCRIPTION: 'Hello World' };
  const result = serializeEnvFile(vars);
  assert.strictEqual(result.includes('DESCRIPTION="Hello World"'), true);
});

test('serializeEnvFile() handles empty object', () => {
  const result = serializeEnvFile({});
  assert.strictEqual(result, '\n');
});

// Test createVault
test('createVault() creates valid vault structure', () => {
  const envFiles = {
    development: 'KEY=dev_value',
    production: 'KEY=prod_value'
  };
  const vaultJson = createVault(envFiles, 'secret123');
  const vault = JSON.parse(vaultJson);

  assert(vault.version);
  assert(vault.created);
  assert(vault.environments);
  assert(vault.environments.development);
  assert(vault.environments.production);
});

test('createVault() encrypts each environment separately', () => {
  const envFiles = {
    dev: 'API_KEY=dev123',
    prod: 'API_KEY=prod456'
  };
  const vaultJson = createVault(envFiles, 'secret123');
  const vault = JSON.parse(vaultJson);

  // Ciphertexts should be different
  assert.notStrictEqual(vault.environments.dev, vault.environments.prod);
});

// Test extractVault
test('extractVault() decrypts entire vault without environment filter', () => {
  const envFiles = {
    dev: 'DB=dev',
    prod: 'DB=prod'
  };
  const vaultJson = createVault(envFiles, 'secret123');
  const result = extractVault(vaultJson, 'secret123');

  assert(result.dev === 'DB=dev');
  assert(result.prod === 'DB=prod');
});

test('extractVault() decrypts specific environment', () => {
  const envFiles = {
    dev: 'DB=dev',
    prod: 'DB=prod'
  };
  const vaultJson = createVault(envFiles, 'secret123');
  const result = extractVault(vaultJson, 'secret123', 'prod');

  assert.strictEqual(result, 'DB=prod');
});

test('extractVault() throws for non-existent environment', () => {
  const vaultJson = createVault({ dev: 'DB=dev' }, 'secret123');
  let threw = false;
  try {
    extractVault(vaultJson, 'secret123', 'nonexistent');
  } catch (err) {
    threw = true;
    assert(err.message.includes('not found'));
  }
  assert(threw, 'Should have thrown an error');
});

test('extractVault() throws on wrong passphrase', () => {
  const vaultJson = createVault({ dev: 'DB=dev' }, 'secret123');
  let threw = false;
  try {
    extractVault(vaultJson, 'wrongsecret');
  } catch (err) {
    threw = true;
  }
  assert(threw, 'Should have thrown an error');
});

// Test listEnvironments
test('listEnvironments() returns array of environment names', () => {
  const vaultJson = createVault({ dev: 'a=1', staging: 'b=2', prod: 'c=3' }, 'secret');
  const envs = listEnvironments(vaultJson);

  assert(Array.isArray(envs));
  assert(envs.includes('dev'));
  assert(envs.includes('staging'));
  assert(envs.includes('prod'));
  assert.strictEqual(envs.length, 3);
});

test('listEnvironments() returns empty array for empty vault', () => {
  const vault = { version: 1, created: new Date().toISOString(), environments: {} };
  const envs = listEnvironments(JSON.stringify(vault));
  assert.deepStrictEqual(envs, []);
});

// Integration tests
test('Round-trip: encrypt -> decrypt preserves all environments', () => {
  const original = {
    dev: 'API_KEY=dev123\nDB_URL=localhost',
    staging: 'API_KEY=staging456\nDB_URL=staging.db',
    prod: 'API_KEY=prod789\nDB_URL=prod.db'
  };

  const vaultJson = createVault(original, 'mysecret');
  const decrypted = extractVault(vaultJson, 'mysecret');

  for (const [env, content] of Object.entries(original)) {
    assert.strictEqual(decrypted[env], content);
  }
});

test('Complex env file with special characters', () => {
  const content = `
    # Database config
    DB_HOST=localhost
    DB_PORT=5432
    DB_PASSWORD="p@ssw0rd!#$%"
    DB_CONNECTION="postgres://user:pass@localhost:5432/db?sslmode=require"

    # URLs
    APP_URL="https://example.com/api?token=abc123&secret=xyz"
    WEBHOOK_URL="https://webhook.example.com"

    # API Keys
    STRIPE_KEY="sk_live_abc123..."
    JWT_SECRET="very.secret.key-with-dashes_and_underscores"
  `.trim();

  const encrypted = encrypt(content, 'secret');
  const decrypted = decrypt(encrypted, 'secret');
  assert.strictEqual(decrypted, content);
});

test('Large env file (1000+ variables)', () => {
  let vars = {};
  for (let i = 0; i < 1000; i++) {
    vars[`VAR_${i}`] = `value_${i}`;
  }
  const content = serializeEnvFile(vars);
  const encrypted = encrypt(content, 'secret');
  const decrypted = decrypt(encrypted, 'secret');
  const parsed = parseEnvFile(decrypted);

  assert.strictEqual(Object.keys(parsed).length, 1000);
});

console.log('\n\x1b[1m✅ All tests completed!\x1b[0m\n');
