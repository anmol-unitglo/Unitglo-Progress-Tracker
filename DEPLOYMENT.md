# DevTrack Production Deployment Guide

This document outlines the strict procedure for deploying DevTrack MVP to a production environment.

## 1. Hosting Requirements
- **Node.js Environment**: Minimum Node 20+ required for Next.js 16 (Turbopack).
- **Database**: A remote MySQL provider is required (e.g., AWS RDS, PlanetScale, DigitalOcean Managed Databases). The application does not bundle a database.
- **Recommended Free Hosting**: **Vercel** for the Next.js frontend/API layer, combined with **Aiven** or **TiDB** for a free-tier remote MySQL instance.

## 2. Required Environment Variables
You must configure the following exact environment variables in your production hosting provider. Do not commit these to source control.

```env
# The connection string to your remote MySQL instance.
# Example: mysql://user:password@host.provider.com:3306/devtrack_prod?sslaccept=strict
DATABASE_URL="mysql://[user]:[password]@[host]:[port]/[database]"

# A secure random string used to encrypt JWT sessions. 
# Generate via: openssl rand -base64 32
NEXTAUTH_SECRET="your-secure-random-string"

# The canonical URL of your production deployment.
NEXTAUTH_URL="https://your-production-domain.com"

# Setup credentials for the initial CEO account during database initialization
INITIAL_ADMIN_EMAIL="ceo@yourcompany.com"
INITIAL_ADMIN_PASSWORD="SecureInitialPassword123!"
```

## 3. Remote MySQL Setup & Migration Status
Do NOT use `npx prisma db push` in production.
Instead, ensure your database accepts remote connections and run:

```bash
# Deploys the generated migrations safely
npx prisma migrate deploy
```

**Migration Status**: The project currently relies on the initial schema. If you have not created an initial migration yet, run `npx prisma migrate dev --name init` locally *before* deploying, and commit the `prisma/migrations` folder to Git.

## 4. Production Seed Strategy
The existing `prisma/seed.ts` is highly destructive and generates fake test data. It MUST NOT be run in production.

A safe production seed script has been created at `prisma/seed-prod.ts`.
To initialize your production database with a single Admin (CEO) account:

```bash
# Run via tsx or ts-node against the production database
npx tsx prisma/seed-prod.ts
```
This script will safely exit if users already exist, preventing accidental data destruction.

## 5. Production Build & Start Command
In the production environment, the CI/CD pipeline (e.g. Vercel) should run:

```bash
# Compiles the production bundle
npm run build

# Starts the production server
npm start
```
Do NOT use `npm run dev` in production.

## 6. Security Status
- **Authentication**: Sessions are protected by HTTP-only secure cookies automatically handled by NextAuth in production (`__Secure-next-auth.session-token`).
- **RBAC**: All mutations are validated strictly Server-Side.
- **Data Integrity**: Foreign keys, enums, and unique index constraints are strongly typed and enforced at the database level.

## 7. Backup & Recovery
DevTrack does not handle automated database backups natively.
- **Responsibility**: You must configure automated daily/weekly snapshots directly within your MySQL provider's control panel.
- **Restoration**: Restoration is performed via the provider's Point-in-Time Recovery (PITR) tools or by importing a `.sql` dump. The application code does not contain restoration endpoints for security reasons.

## 8. Deployment Steps
1. Push your code to your Git provider (GitHub/GitLab).
2. Connect your repository to your hosting provider (e.g., Vercel).
3. Input the Required Environment Variables into the provider's dashboard.
4. Trigger the deployment. The provider will automatically run `npm run build`.
5. Connect to the build terminal (or run locally via a direct DB connection) and execute `npx prisma migrate deploy` followed by `npx tsx prisma/seed-prod.ts`.
6. Navigate to your production URL and log in with the `INITIAL_ADMIN_EMAIL`.

## 9. Rollback Plan
- **Application Rollback**: Use your hosting provider's instant rollback feature (e.g., Vercel's "Redeploy Previous Deployment") to revert to the last working commit.
- **Database Rollback**: Do not attempt to run destructive Prisma "down" migrations manually. If a severe data corruption occurs, restore the MySQL snapshot from your hosting provider's backup panel.
- **Environment Rollback**: If a bad environment variable is deployed, revert the variable in the dashboard and trigger a zero-downtime redeploy.

## 10. Smoke Testing
After deployment, verify the following manually:
1. Log in as CEO and verify the dashboard loads without SQL errors.
2. The initial CEO cannot mutate data.
3. The PM, Developer, and Tester dashboards load cleanly.

## 11. Known Blockers
- None. The application is completely ready for a production launch upon your authorization.
