const fs = require('fs');
const path = require('path');
const { createVault, extractVault, listEnvironments, parseEnvFile, serializeEnvFile } = require('./vault');

const VAULT_FILE = '.env.vault';

function printUsage() {
  console.log(`
\x1b[1m\x1b[36m🔐 env-vault-sync\x1b[0m — Secure Environment Variable Encryption & Team Sync

\x1b[1mUsage:\x1b[0m
  env-vault-sync <command> [options]

\x1b[1mCommands:\x1b[0m
  encrypt     Encrypt .env file(s) into a git-safe .env.vault
  decrypt     Decrypt .env.vault back into .env file(s)
  list-envs   List environments stored in the vault
  diff        Compare current .env against vault contents

\x1b[1mOptions:\x1b[0m
  --passphrase <secret>   Encryption/decryption passphrase (required)
  --env <name>            Target environment name (default: "default")
  --file <path>           Path to .env file (default: ".env")
  --vault <path>          Path to vault file (default: ".env.vault")
  --help                  Show this help message
`);
}

function parseArgs(argv) {
  const args = { command: null, passphrase: null, env: 'default', file: '.env', vault: VAULT_FILE };
  const rawArgs = argv.slice(2);

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--passphrase' && rawArgs[i + 1]) {
      args.passphrase = rawArgs[++i];
    } else if (arg === '--env' && rawArgs[i + 1]) {
      args.env = rawArgs[++i];
    } else if (arg === '--file' && rawArgs[i + 1]) {
      args.file = rawArgs[++i];
    } else if (arg === '--vault' && rawArgs[i + 1]) {
      args.vault = rawArgs[++i];
    } else if (arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith('-') && !args.command) {
      args.command = arg;
    }
  }
  return args;
}

function cmdEncrypt(args) {
  if (!args.passphrase) {
    console.error('\x1b[31mError: --passphrase is required\x1b[0m');
    process.exit(1);
  }

  const envPath = path.resolve(args.file);
  if (!fs.existsSync(envPath)) {
    console.error(`\x1b[31mError: File not found: ${envPath}\x1b[0m`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const vaultPath = path.resolve(args.vault);

  let existingVault = null;
  if (fs.existsSync(vaultPath)) {
    existingVault = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
  }

  const envFiles = {};
  if (existingVault && existingVault.environments) {
    for (const [name, cipher] of Object.entries(existingVault.environments)) {
      envFiles[name] = cipher;
    }
  }

  const tempVault = { version: 1, created: new Date().toISOString(), environments: {} };

  for (const [name, cipher] of Object.entries(envFiles)) {
    tempVault.environments[name] = cipher;
  }

  const { encrypt } = require('./vault');
  tempVault.environments[args.env] = encrypt(envContent, args.passphrase);

  fs.writeFileSync(vaultPath, JSON.stringify(tempVault, null, 2));

  const vars = parseEnvFile(envContent);
  const varCount = Object.keys(vars).length;
  console.log(`\x1b[32m✔ Encrypted ${varCount} variable(s) from "${args.file}" → "${args.vault}" [env: ${args.env}]\x1b[0m`);
}

function cmdDecrypt(args) {
  if (!args.passphrase) {
    console.error('\x1b[31mError: --passphrase is required\x1b[0m');
    process.exit(1);
  }

  const vaultPath = path.resolve(args.vault);
  if (!fs.existsSync(vaultPath)) {
    console.error(`\x1b[31mError: Vault not found: ${vaultPath}\x1b[0m`);
    process.exit(1);
  }

  const vaultData = fs.readFileSync(vaultPath, 'utf-8');
  const decrypted = extractVault(vaultData, args.passphrase, args.env);

  const outputPath = path.resolve(args.file);
  fs.writeFileSync(outputPath, decrypted);

  const vars = parseEnvFile(decrypted);
  const varCount = Object.keys(vars).length;
  console.log(`\x1b[32m✔ Decrypted ${varCount} variable(s) from "${args.vault}" → "${args.file}" [env: ${args.env}]\x1b[0m`);
}

function cmdListEnvs(args) {
  const vaultPath = path.resolve(args.vault);
  if (!fs.existsSync(vaultPath)) {
    console.error(`\x1b[31mError: Vault not found: ${vaultPath}\x1b[0m`);
    process.exit(1);
  }

  const vaultData = fs.readFileSync(vaultPath, 'utf-8');
  const envs = listEnvironments(vaultData);

  console.log(`\x1b[1m\x1b[36m🔐 Environments in vault:\x1b[0m`);
  if (envs.length === 0) {
    console.log('  (none)');
  } else {
    envs.forEach(e => console.log(`  • ${e}`));
  }
}

function cmdDiff(args) {
  if (!args.passphrase) {
    console.error('\x1b[31mError: --passphrase is required\x1b[0m');
    process.exit(1);
  }

  const envPath = path.resolve(args.file);
  const vaultPath = path.resolve(args.vault);

  if (!fs.existsSync(envPath)) {
    console.error(`\x1b[31mError: File not found: ${envPath}\x1b[0m`);
    process.exit(1);
  }
  if (!fs.existsSync(vaultPath)) {
    console.error(`\x1b[31mError: Vault not found: ${vaultPath}\x1b[0m`);
    process.exit(1);
  }

  const localContent = fs.readFileSync(envPath, 'utf-8');
  const vaultData = fs.readFileSync(vaultPath, 'utf-8');
  const vaultContent = extractVault(vaultData, args.passphrase, args.env);

  const localVars = parseEnvFile(localContent);
  const vaultVars = parseEnvFile(vaultContent);

  const allKeys = new Set([...Object.keys(localVars), ...Object.keys(vaultVars)]);
  let hasChanges = false;

  console.log(`\x1b[1m\x1b[36m🔍 Diff: local "${args.file}" vs vault [env: ${args.env}]\x1b[0m\n`);

  for (const key of [...allKeys].sort()) {
    const local = localVars[key];
    const vault = vaultVars[key];

    if (local !== undefined && vault === undefined) {
      console.log(`  \x1b[32m+ ${key}=${local}\x1b[0m  (local only)`);
      hasChanges = true;
    } else if (local === undefined && vault !== undefined) {
      console.log(`  \x1b[31m- ${key}=${vault}\x1b[0m  (vault only)`);
      hasChanges = true;
    } else if (local !== vault) {
      console.log(`  \x1b[33m~ ${key}: "${vault}" → "${local}"\x1b[0m`);
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    console.log('  \x1b[32m✔ No differences found.\x1b[0m');
  }
}

function run(argv) {
  const args = parseArgs(argv || process.argv);

  if (!args.command) {
    printUsage();
    process.exit(0);
  }

  switch (args.command) {
    case 'encrypt':  cmdEncrypt(args); break;
    case 'decrypt':  cmdDecrypt(args); break;
    case 'list-envs': cmdListEnvs(args); break;
    case 'diff':     cmdDiff(args); break;
    default:
      console.error(`\x1b[31mUnknown command: ${args.command}\x1b[0m`);
      printUsage();
      process.exit(1);
  }
}

module.exports = { run, parseArgs };
