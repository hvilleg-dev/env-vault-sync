#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { EnvVaultSync } from './vault';

const vault = new EnvVaultSync();

program
  .name('env-vault-sync')
  .description('Secure end-to-end encrypted environment variable synchronization')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new vault')
  .action(() => {
    console.log(chalk.cyan.bold('\n🔐 Initializing vault...\n'));
    vault.initVault();
    console.log(chalk.green('✓ Vault initialized successfully\n'));
  });

program
  .command('encrypt <key> <value>')
  .description('Encrypt an environment variable')
  .action((key: string, value: string) => {
    try {
      const encrypted = vault.encryptVariable(key, value);
      console.log(chalk.green(`\n✓ Encrypted:\n`));
      console.log(chalk.cyan(`  Key: ${key}`));
      console.log(chalk.yellow(`  Value: ${encrypted}\n`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('decrypt <encrypted>')
  .description('Decrypt an environment variable')
  .action((encrypted: string) => {
    try {
      const decrypted = vault.decryptVariable(encrypted);
      console.log(chalk.green(`\n✓ Decrypted: ${decrypted}\n`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('sync <remoteVault>')
  .description('Synchronize with remote vault')
  .option('--pull', 'Pull from remote')
  .option('--push', 'Push to remote')
  .action(async (remoteVault: string, options) => {
    try {
      console.log(chalk.cyan(`\n🔄 Syncing with ${remoteVault}...\n`));
      await vault.sync(remoteVault, options);
      console.log(chalk.green('✓ Sync completed successfully\n'));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
