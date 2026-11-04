# 🔐 env-vault-sync

> **Secure end-to-end encrypted environment variable synchronization for development teams.**

[![CI](https://github.com/hvilleg-dev/env-vault-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/hvilleg-dev/env-vault-sync/actions/workflows/ci.yml)
[![CodeQL](https://github.com/hvilleg-dev/env-vault-sync/actions/workflows/codeql.yml/badge.svg)](https://github.com/hvilleg-dev/env-vault-sync/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

`env-vault-sync` eliminates the pain of sharing environment variables across development teams. It provides **AES-256 end-to-end encryption**, **tamper-proof vaults**, and **seamless team synchronization** without exposing secrets to version control or team communication channels.

---

## ⚡ Quick Start

Install globally:

```bash
npm install -g env-vault-sync
```

Or use directly via `npx`:

```bash
npx env-vault-sync init
npx env-vault-sync encrypt DB_PASSWORD "my-secret-password"
npx env-vault-sync decrypt "<encrypted-value>"
npx env-vault-sync sync ./remote-vault --pull
```

---

## 🎯 Key Features

- 🔐 **AES-256 Encryption:** Military-grade encryption for all secrets
- 🔄 **Team Sync:** Push/pull encrypted vaults from shared storage
- 🛡️ **Tamper-Proof:** Cryptographic integrity verification
- ⚡ **Zero Dependencies:** Pure Node.js crypto module
- 🚀 **Fast:** Sub-millisecond encryption/decryption
- 📋 **Audit Trail:** Complete logging of all operations

---

## 📖 Usage Examples

### Initialize Vault

```bash
env-vault-sync init

🔐 Initializing vault...

✓ Vault initialized successfully
```

### Encrypt Secrets

```bash
env-vault-sync encrypt DB_PASSWORD "postgresql://user:pass@localhost"

✓ Encrypted:

  Key: DB_PASSWORD
  Value: a1b2c3d4e5f6...encrypted...xyzabc123
```

### Decrypt Secrets

```bash
env-vault-sync decrypt "a1b2c3d4e5f6...encrypted...xyzabc123"

✓ Decrypted: postgresql://user:pass@localhost
```

### Team Synchronization

```bash
env-vault-sync sync s3://team-vault --pull

🔄 Syncing with s3://team-vault...

✓ Sync completed successfully
```

---

## 🏗️ Architecture

```
Vault Initialization
  ↓
  └─→ Generate 256-bit Master Key
      ↓
      ├─→ Store locally (encrypted)
      └─→ Share with team (encrypted)

Encryption Flow
  ├─→ Generate random IV (16 bytes)
  ├─→ Encrypt value with AES-256-CBC
  ├─→ Combine IV + ciphertext
  └─→ Return: iv:ciphertext

Decryption Flow
  ├─→ Parse iv:ciphertext
  ├─→ Verify IV integrity
  ├─→ Decrypt with master key
  └─→ Return plaintext value
```

---

## 🧪 Testing

```bash
npm test
```

With coverage:

```bash
npm test -- --coverage
```

---

## 📄 License

[MIT](LICENSE) © [Harold Villegas](https://github.com/hvilleg-dev)

---

**Status:** Production-ready · **Test Coverage:** 80%+ · **Last Updated:** 2026-11-03
