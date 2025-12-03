# Database Migration Guide

## Overview
This project uses a **hybrid migration strategy** that combines:
- **Automated startup health checks** to verify schema synchronization
- **Manual `db:push`** for actual schema changes (recommended by Replit)

This approach is optimized for Replit's environment while providing automated validation and safe schema updates.

## How It Works

### Automated Startup Check
Every time the application starts, it automatically:
1. Checks if `__drizzle_migrations` table exists
2. Verifies current migration baseline is applied
3. Runs initial migration if database is fresh
4. Emits warnings if schema drift detected
5. **Does NOT block startup** - app starts even if check fails

### Manual Schema Updates
When you make changes to `shared/schema.ts`:
1. Run `npm run db:push` to sync changes to database
2. Review proposed changes carefully
3. Confirm to apply changes
4. Commit migration files to version control

## Migration Workflow

### Development Environment

**When making schema changes:**

1. Edit `shared/schema.ts` with your changes
2. Run the migration command:
   ```bash
   npm run db:push
   ```
3. Review the changes Drizzle will apply
4. Confirm to apply changes to the database

**Force push (skip confirmation):**
```bash
npm run db:push --force
```

### Production Deployment

**Before deploying to production:**

1. Ensure all schema changes are committed to `shared/schema.ts`
2. Run `npm run db:push --force` in production environment
3. Restart the application

### Why Manual Migrations?

- **Environment Compatibility**: Replit's database connections work better with manual push vs. auto-migrations
- **Explicit Control**: Changes are reviewed before applying
- **No Startup Delays**: App starts faster without migration checks
- **Safer Deployments**: Schema changes are deliberate, not automatic

## Schema Files

- **`shared/schema.ts`**: Single source of truth for database schema
- **`drizzle.config.ts`**: Drizzle configuration (connection, output paths)
- **`server/migrate.ts`**: Legacy migration runner (currently unused)

## Important Notes

1. **Never manually edit SQL**: Always update `shared/schema.ts` and use `npm run db:push`
2. **ID Column Types**: Never change existing ID column types (serial ↔ varchar) - this breaks everything
3. **Backup Before Major Changes**: Always backup production database before schema changes
4. **Test Locally First**: Run `npm run db:push` in development before production

## Troubleshooting

**Error: "WebSocket connection failed"**
- Use `npm run db:push` instead of auto-migrations
- Drizzle push uses HTTP connections which work better in Replit

**Error: "Column already exists"**
- Schema is already in sync with database
- No action needed

**Error: "Cannot drop column with data"**
- Manually migrate data first using SQL
- Then update schema and run `npm run db:push --force`

## Account Aggregator Schema

The AA integration includes these tables:
- `aa_consents`: Consent lifecycle tracking
- `aa_consent_events`: Audit trail of consent changes  
- `fi_accounts`: Linked financial accounts
- `fi_holdings`: Holdings data with idempotency keys
- `fi_transactions`: Transaction history with idempotency keys
- `fi_batches`: Raw FI data payloads

### Idempotency Keys

Holdings and transactions use computed `idempotencyKey` fields to prevent duplicates during webhook ingestion:

**Holdings**: `hash(accountId + instrumentId + asOfDate + payload)`
**Transactions**: `hash(accountId + transactionId + date + amount + payload)`

These keys handle cases where FINVU omits `instrumentId` or `transactionId`.
