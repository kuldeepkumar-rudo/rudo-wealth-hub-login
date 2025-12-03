# NRI Wealth Management Platform

## Overview
The NRI Wealth Management Platform is a comprehensive financial net worth tracking and analytics solution for Non-Resident Indian (NRI) clients. It provides multi-asset tracking, AI-powered investment recommendations, and detailed financial analytics. The platform aims to offer a unified view of an NRI's financial portfolio, enabling informed decision-making and optimized wealth management. Key capabilities include multi-asset tracking (Mutual Funds, Stocks, Bank FDs, RDs, Insurance), integration with India's Account Aggregator framework, mobile app-like onboarding, a web-based dashboard with analytical views, and AI-Powered Recommendations for asset allocation.

## User Preferences
I prefer clear, concise explanations and direct answers. For coding tasks, prioritize security, maintainability, and performance. I expect iterative development with regular updates. Please ask for confirmation before implementing major architectural changes or deleting significant portions of code. I value well-structured code with good comments where necessary, and I appreciate suggestions for best practices.

## System Architecture

**UI/UX Decisions:**
- **Theme:** Premium dark theme (`#08090a` background, `#0a9f83` primary accent) with Be Vietnam Pro font family.
- **Colors:** `#cfd0d0` (primary text), `#a2a2a2` (secondary text).
- **Design Elements:** Multi-layer premium overlay effects for visual depth, fully responsive layouts.
- **Component Library:** Radix UI, Tailwind CSS, and shadcn/ui for consistent and accessible UI components.

**Technical Implementations:**
- **Frontend:** React 18 + TypeScript + Vite, using Wouter for routing and TanStack Query for state management.
- **Backend:** Express + Node.js.
- **Database:** PostgreSQL with Drizzle ORM, manual push-based migrations via `npm run db:push`.
- **Charting:** Recharts for interactive data visualizations (Donut, Line, Area, Grouped Bars).
- **PWA:** Full Progressive Web App capabilities with service worker, offline caching, and installability.
- **Onboarding Flow:** A 10-screen responsive web onboarding experience including phone entry, OTP verification, MPIN creation, biometric setup, PAN collection, Account Aggregator consent, asset selection, and data synchronization.
- **Asset Linking Workspace:** A dedicated workspace (`/connect`) for linking financial accounts via the Account Aggregator framework using a multi-step wizard.
- **Wealth Review Dashboard:** Features a comprehensive analytics engine with portfolio snapshots, 5-year projection scenarios, performance vs. benchmark comparisons, asset allocation analysis, and priority-based action items.
- **Authentication System:** Replit Auth (OpenID Connect) supporting Google, GitHub, X, Apple, and email/password login, with session management using MemoryStore (dev) or PostgreSQL with `connect-pg-simple` (prod). All routes are protected with `isAuthenticated` middleware and ownership verification.
- **Security Posture:** Production-ready with session-based authentication, environment-aware cookie configuration, OAuth token isolation, user validation on every request, sanitized API responses, HTTPS-only callbacks, and per-user data isolation.
- **Recommendation Action Tracking:** Users can accept, defer, or dismiss AI-powered investment recommendations via dedicated API endpoints with authentication and ownership verification, utilizing TanStack Query mutations for frontend interaction.
- **Add Transaction Feature:** Manual transaction entry via dialog form with holding selection, transaction type support (buy, sell, dividend, interest, deposit, withdrawal), quantity/price/fees inputs, date picker, and auto-calculated total amounts. The totalAmount calculation varies by transaction type - buy/deposit/dividend/interest add fees to base amount, while sell/withdrawal subtract fees (enforced server-side for data integrity).

**System Design Choices:**
- **Client/Server Separation:** Clear distinction between frontend (`/client`) and backend (`/server`) with a shared `/shared` directory for common schemas and types.
- **API Structure:** All API routes are prefixed with `/api` and the server runs on port 5000.
- **Development Environment:** Vite manages the frontend development server and build processes.
- **Database Migrations:** Manual push-based approach using `npm run db:push` instead of auto-migrations. See `DATABASE_MIGRATION_GUIDE.md` for details.

**Account Aggregator Schema:**
- **aa_consents**: Consent lifecycle with 22 fields (status, FI types, data ranges, frequency, metadata)
- **aa_consent_events**: Audit trail using `consentHandle` (text) to avoid FINVU ID conflicts
- **fi_accounts**: Linked financial accounts with unique index on (userId, accountId, fiType)
- **fi_holdings**: Holdings data with `idempotencyKey` for deduplication (handles nullable instrumentId)
- **fi_transactions**: Transaction history with `idempotencyKey` for deduplication (handles nullable transactionId)
- **fi_batches**: Raw FI data payloads for ingestion pipeline
- **Idempotency Strategy**: Holdings use `hash(accountId + instrumentId + asOfDate + payload)`, transactions use `hash(accountId + transactionId + date + amount + payload)` to prevent duplicates during FINVU webhook replays

## External Dependencies
- **PostgreSQL:** Primary database.
- **Account Aggregator Framework (India):** Integration for linking financial accounts via Finfactor V2 API. Features include:
  - Finfactor V2 API with Bearer token authentication (login via /User/Login)
  - Consent creation via /ConsentRequests endpoint with mobile@finvu custId format
  - Mandatory mobile number validation (10-digit Indian mobile required)
  - Structured error handling with user-friendly messages for common API errors
  - Institution search, consent management, account discovery, FI data fetching, and webhook handlers
  - Environment secrets: FINFACTOR_USER_ID, FINFACTOR_PASSWORD
- **Pulse Labs (Mutual Fund Data):** Integration for mutual fund scheme search, metadata, NAV history, and analytics. Provides a service layer with caching and authenticated API endpoints, and a comprehensive frontend for search and detail views.
- **Figma:** Used for design assets and guidelines.
- **jose:** JWS signing library for AA API authentication.
- **Passport.js:** For OpenID Connect authentication.
- **connect-pg-simple:** For PostgreSQL session persistence in production.