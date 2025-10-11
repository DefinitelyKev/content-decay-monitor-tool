# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ContentDecay.io is a SaaS tool that monitors ranking drops on existing content and alerts users when posts need refreshing. It targets content publishers, bloggers, affiliate marketers, and SEO agencies managing 50-500+ content pieces.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Payments**: Stripe
- **Email**: Resend
- **External APIs**: DataForSEO (rank tracking), Google Search Console API (planned)

## Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma generate           # Generate Prisma client after schema changes
npx prisma db push            # Push schema changes to database (development)
npx prisma migrate dev        # Create and apply migrations (development)
npx prisma migrate deploy     # Apply migrations (production)
npx prisma studio             # Open Prisma Studio GUI to view/edit data
```

## Database Architecture

### Core Models & Relationships

The database uses a hierarchical structure:
- **User** → has many **Sites** → each has many **Content** pieces
- **Content** → has many **Keywords** → each has many **Rankings** (time series)
- **Alerts** connect Users to Content for notifications

### Key Schema Design Decisions

1. **Cascade Deletes**: All models use `onDelete: Cascade` - deleting a User removes all their Sites, Content, Keywords, Rankings, and Alerts.

2. **Unique Constraints**:
   - `userId_domain` ensures users can't add the same site twice
   - `siteId_url` ensures content URLs are unique per site
   - `contentId_keyword` prevents duplicate keyword tracking

3. **Status Enums**:
   - `ContentStatus`: HEALTHY, WARNING, DECAYING, RECOVERED (tracks content health)
   - `SiteStatus`: ACTIVE, PAUSED, ERROR (site monitoring state)
   - `PlanTier`: FREE, CREATOR, PRO, AGENCY (subscription tiers)

4. **JSONB Fields**:
   - `Keyword.historicalPositions`: Stores time-series ranking data
   - `Ranking.serpFeatures`: Stores SERP feature data (featured snippets, PAA boxes, etc.)

### Plan Limits
Content tracking limits enforced in src/app/api/content/route.ts:104-137:
- FREE: 10 pages
- CREATOR: 50 pages
- PRO: 200 pages
- AGENCY: 500 pages

## Authentication Flow

Uses Clerk for authentication with webhook sync:
1. User signs up via Clerk → Clerk webhook fires → User created in database (src/app/api/webhooks/clerk/route.ts)
2. All API routes use `auth()` from `@clerk/nextjs/server` to get `userId`
3. User lookup pattern: Get `clerkId` from auth, find User in database, verify ownership
4. Protected pages use `currentUser()` and redirect if not authenticated

## API Routes Structure

All API routes follow this pattern:
1. Get authenticated `userId` from Clerk
2. Look up User in database by `clerkId`
3. Verify resource ownership (site/content belongs to user)
4. Validate input with Zod schemas
5. Check plan limits for resource creation
6. Return JSON responses with proper error codes

### Key Endpoints
- `GET/POST /api/sites` - Site management (src/app/api/sites/route.ts)
- `GET/POST /api/content` - Content tracking (src/app/api/content/route.ts)
- `POST /api/webhooks/clerk` - User sync (src/app/api/webhooks/clerk/route.ts)

## Prisma Client Singleton

The project uses a singleton pattern for Prisma Client (src/lib/prisma.ts:1-15) to prevent multiple instances in development (Next.js hot reload issue). Always import from `@/lib/prisma` rather than creating new PrismaClient instances.

## Content Decay Detection Algorithm

From README.md, the decay detection logic to implement:
```
IF current_position > (previous_position + 3) THEN status = "WARNING"
IF current_position > (previous_position + 5) OR current_position > (highest_position + 10)
  THEN status = "DECAYING" + trigger_alert()
IF position improved by 3+ after previous alert
  THEN status = "RECOVERED" + send_success_notification()
```

## Environment Variables

Required environment variables (see .env.example):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` - Clerk auth
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe payments
- `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` - Rank tracking API
- `RESEND_API_KEY` - Email notifications

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── sites/        # Site management endpoints
│   │   ├── content/      # Content tracking endpoints
│   │   └── webhooks/     # Clerk webhook handlers
│   ├── dashboard/        # Protected dashboard pages
│   ├── sign-in/          # Clerk sign-in page
│   ├── sign-up/          # Clerk sign-up page
│   ├── layout.tsx        # Root layout with ClerkProvider
│   └── page.tsx          # Landing page
└── lib/
    ├── prisma.ts         # Prisma client singleton
    └── utils.ts          # Utility functions

prisma/
└── schema.prisma         # Database schema
```

## Product Roadmap Context

Per README.md, the project is implementing MVP features (Weeks 1-6):
- ✅ User authentication (Clerk)
- ✅ Add sites and content URLs
- ✅ Database schema with Prisma
- 🚧 Daily rank checking (DataForSEO API) - Not yet implemented
- 🚧 Decay detection algorithm - Not yet implemented
- 🚧 Email alerts - Not yet implemented
- 🚧 Dashboard with ranking charts - Basic version exists

V1.0 features (Weeks 7-12) include GSC integration, multi-keyword tracking, bulk import, and Stripe payments.

## Important Implementation Notes

1. **Always check plan limits** when creating new content (see src/app/api/content/route.ts:118-137)
2. **User lookup pattern**: Never trust `userId` from client - always look up User by `clerkId` from Clerk auth
3. **Resource ownership**: Always verify that sites/content belong to the authenticated user before operations
4. **Zod validation**: All API routes validate input with Zod schemas before database operations
5. **Error handling**: Return proper HTTP status codes (401 Unauthorized, 403 Forbidden, 404 Not Found, 400 Bad Request, 500 Internal Server Error)
6. **TypeScript**: Use strict TypeScript - all files use `.ts` or `.tsx` extensions
