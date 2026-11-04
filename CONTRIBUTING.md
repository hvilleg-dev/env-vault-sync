# Contributing to env-vault-sync

## Development Setup

```bash
git clone https://github.com/hvilleg-dev/env-vault-sync.git
cd env-vault-sync
npm install
npm run dev
```

## Making Changes

1. Create a feature branch: `git checkout -b feature/encrypted-sync`
2. Add tests for new features
3. Run: `npm test` (must pass)
4. Commit with conventional messages: `git commit -m "feat: add remote sync"`
5. Push and open a PR

## Testing

- Write tests for all security features
- Maintain >80% coverage
- Run: `npm test -- --coverage`

## Security Guidelines

- Never commit `.env` or `.vault` files
- Use 256-bit keys minimum
- All secrets encrypted at rest
- Run security audits: `npm audit`
