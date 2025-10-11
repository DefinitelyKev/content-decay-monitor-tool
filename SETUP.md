# Content Decay Monitor - Setup & Testing Guide

## ✅ What's Been Built

### Backend Services
1. **DataForSEO Integration** (`src/lib/dataforseo.ts`) - Rank checking service
2. **Decay Detection Algorithm** (`src/lib/decay-detection.ts`) - Detects content decay patterns
3. **Email Alerts** (`src/lib/alerts.ts`) - Sends notifications via Resend
4. **Cron Job** (`src/app/api/cron/check-rankings/route.ts`) - Automated daily rank checks

### Frontend Pages
1. **Dashboard** (`/dashboard`) - Overview with stats, recent alerts, and content
2. **Sites Management** (`/dashboard/sites`) - Add, view, and delete sites
3. **Content Management** (`/dashboard/content`) - List, filter, and manage tracked content
4. **Content Detail** (`/dashboard/content/[id]`) - Detailed view with ranking chart
5. **Alerts** (`/dashboard/alerts`) - View all notifications

### Key Features
- ✅ User authentication (Clerk)
- ✅ Site and content management
- ✅ Ranking position tracking
- ✅ Decay detection (WARNING → DECAYING → RECOVERED)
- ✅ Email notifications
- ✅ Plan limits (FREE: 10, CREATOR: 50, PRO: 200, AGENCY: 500)
- ✅ Manual rank check button for testing
- ✅ Historical ranking charts with Recharts

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Copy `.env.example` to `.env` and fill in:

**Required for basic testing:**
- `DATABASE_URL` - PostgreSQL connection (use Supabase free tier)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk auth
- `CLERK_SECRET_KEY` - Clerk auth
- `CRON_SECRET` - Random string for cron security
- `NEXT_PUBLIC_APP_URL` - http://localhost:3000

**Required for full functionality:**
- `DATAFORSEO_LOGIN` - DataForSEO account
- `DATAFORSEO_PASSWORD` - DataForSEO API password
- `RESEND_API_KEY` - Resend email service

### 3. Set Up Database
```bash
# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## 🧪 Testing the System

### Step 1: Create Your Account
1. Go to http://localhost:3000/sign-in
2. Sign up with email
3. Clerk webhook will create user in database

**Note:** If webhook isn't set up, manually create user in Prisma Studio:
- Open `npx prisma studio`
- Add User with `clerkId` from Clerk dashboard

### Step 2: Add a Site
1. Go to Dashboard → Sites
2. Click "Add Site"
3. Enter your website URL (e.g., https://example.com)

### Step 3: Add Content to Track
1. Go to Sites → Click "View Content" on your site
2. Or go to Content → "Add Content"
3. Fill in:
   - Site: Select your site
   - Content URL: Full URL to a blog post
   - Title: (optional) Article title
   - Target Keyword: Main keyword to track (e.g., "content marketing")

### Step 4: Test Manual Rank Check
1. Go to Content → Click on your content item
2. Click "🔄 Check Rankings Now" button
3. Wait for results (takes 5-10 seconds)
4. Page will refresh showing:
   - Current position
   - Status (HEALTHY/WARNING/DECAYING)
   - Ranking chart

### Step 5: Test Automated Cron Job
```bash
# Trigger manually via curl
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/check-rankings
```

Replace `YOUR_CRON_SECRET` with the value from your `.env` file.

## 📊 Understanding the Decay Algorithm

### Status Levels
- **HEALTHY**: Rankings stable or minor changes (< 3 positions)
- **WARNING**: Dropped 3-4 positions
- **DECAYING**: Dropped 5+ positions OR 10+ from best position
- **RECOVERED**: Improved 3+ positions from WARNING/DECAYING state

### When Alerts Are Sent
- WARNING status → Email alert
- DECAYING status → Email alert
- RECOVERED status → Success email

## 🔧 Common Issues & Solutions

### Issue: "User not found" after sign-up
**Solution:** Clerk webhook not configured. Manually create user in Prisma Studio with matching `clerkId`.

### Issue: "DataForSEO credentials not configured"
**Solution:** Add `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` to `.env`. Sign up at https://dataforseo.com ($1 free credit).

### Issue: Charts not showing
**Solution:** Run rank check multiple times (once per day) to build ranking history.

### Issue: Email alerts not sending
**Solution:**
1. Check `RESEND_API_KEY` is set
2. For testing, emails go to registered user's email only
3. In production, verify domain at https://resend.com

## 📈 DataForSEO Cost Estimates

- **Cost per check:** $0.002
- **Example:** 10 content pieces × 1 keyword × daily = $0.02/day = $0.60/month
- **Free credit:** $1 = 500 checks (good for testing)

## 🎯 Next Steps

1. **Test with real content** - Add 3-5 of your blog posts
2. **Run manual checks** - Use the button to see rankings
3. **Wait for automation** - Set up Vercel cron for daily checks
4. **Monitor alerts** - Check the Alerts page for notifications

## 🚢 Deploying to Production

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Add DATABASE_URL, CLERK_SECRET_KEY, etc.
```

### Set Up Cron Job
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-rankings",
    "schedule": "0 2 * * *"
  }]
}
```

This runs daily at 2 AM UTC.

## 📚 File Structure Reference

```
src/
├── app/
│   ├── api/
│   │   ├── sites/          # Site CRUD
│   │   ├── content/        # Content CRUD + rank checking
│   │   ├── alerts/         # Alert fetching
│   │   ├── webhooks/       # Clerk user sync
│   │   └── cron/           # Automated rank checking
│   ├── dashboard/
│   │   ├── page.tsx        # Dashboard overview
│   │   ├── sites/          # Sites management
│   │   ├── content/        # Content list + detail
│   │   └── alerts/         # Alerts list
│   └── layout.tsx          # Root layout with Clerk
├── lib/
│   ├── dataforseo.ts       # Rank checking API
│   ├── decay-detection.ts  # Algorithm
│   ├── alerts.ts           # Email notifications
│   └── prisma.ts           # Database client
└── prisma/
    └── schema.prisma       # Database schema
```

## 💡 Tips for Success

1. **Start small** - Test with 2-3 content pieces first
2. **Use real keywords** - Pick keywords you actually rank for
3. **Be patient** - Rankings need multiple checks to show trends
4. **Check costs** - Monitor DataForSEO usage in their dashboard
5. **Test alerts** - Use manual check button to trigger notifications

---

**Questions?** Check the README.md for full project documentation.
