# Application Logging Guide

Comprehensive logging has been added throughout the application to help you track what's happening at every step.

## What You'll See in the Console

### 🎯 Rank Check Logs
```
🎯 [RANK CHECK] Starting rank check { domain: 'example.com', keywords: ['seo'], locationCode: 2840 }
ℹ️  [INFO] Sending request to DataForSEO API { taskCount: 1 }
🎯 [RANK CHECK] Keyword "seo" - Position: 15
✅ [SUCCESS] Rank check completed { resultsCount: 1 }
```

### 📉 Decay Detection Logs
```
📉 [DECAY DETECTION] Checking content decay { currentPosition: 15, previousPosition: 10, highestPosition: 8 }
📉 [DECAY DETECTION] Position analysis { positionDrop: 5, dropFromBest: 7, change: 'dropped' }
⚠️  [WARN] Content is DECAYING { reason: 'dropped 5 positions', positionDrop: 5, dropFromBest: 7 }
```

### 🔔 Alert Logs
```
🔔 [ALERT] Sending decay alert { contentTitle: 'My Blog Post', userEmail: 'you@example.com', currentPosition: 15, previousPosition: 10 }
ℹ️  [INFO] Alert saved to database
ℹ️  [INFO] Sending email via Resend { to: 'you@example.com' }
✅ [SUCCESS] Email sent successfully { emailId: 'abc123' }
```

### ➡️ API Request Logs
```
✅ [API] POST /api/content/clxxx123/check - 200
ℹ️  [INFO] Manual rank check initiated { contentId: 'clxxx123', userId: 'user_abc' }
✅ [SUCCESS] Manual rank check completed { contentId: 'clxxx123', duration: '5234ms', keywordsChecked: 1, alertSent: true }
```

## Log Levels

- **ℹ️ INFO** - General information flow
- **⚠️ WARN** - Warning conditions (decaying, position drops)
- **❌ ERROR** - Error conditions with stack traces
- **✅ SUCCESS** - Successful operations
- **🔍 DEBUG** - Detailed debugging (development only)

## Where to Find Logs

### Development Server
All logs appear in the terminal where you ran `npm run dev`:

```bash
npm run dev
# Watch the console output here
```

### What to Look For

#### When Clicking "Check Rankings Now"

You'll see this sequence:
1. `[API] POST /api/content/[id]/check` - Request received
2. `Manual rank check initiated` - Starting check
3. `[RANK CHECK] Starting rank check` - Calling DataForSEO
4. `Sending request to DataForSEO API` - API call started
5. `Keyword "..." - Position: #` - Results for each keyword
6. `[DECAY DETECTION] Checking content decay` - Running algorithm
7. `Content is HEALTHY/WARNING/DECAYING` - Status determined
8. `[ALERT] Sending decay alert` - (if status changed)
9. `Manual rank check completed` - Done (shows duration)

#### Expected Timing
- **Fast check** (position found): 3-6 seconds
- **Slow check** (not found in top 100): 8-12 seconds
- **Total duration**: Shown in completion log

## Troubleshooting with Logs

### Problem: "DataForSEO credentials not configured"
**Look for:**
```
❌ [ERROR] DataForSEO credentials not configured
```
**Fix:** Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to .env

### Problem: "No rankings found"
**Look for:**
```
⚠️ [WARN] No results found for keyword: your-keyword
🎯 [RANK CHECK] Keyword "your-keyword" - Position: Not found
```
**Means:** Domain doesn't rank in top 100 for this keyword

### Problem: Status not changing
**Look for:**
```
📉 [DECAY DETECTION] Position analysis { positionDrop: 2, ... }
ℹ️  [INFO] Content is HEALTHY (dropped) { positionDrop: 2 }
```
**Means:** Position change < 3, so status stays HEALTHY

### Problem: Email not sending
**Look for:**
```
⚠️ [WARN] RESEND_API_KEY not configured - skipping email
```
**Fix:** Add RESEND_API_KEY to .env

### Problem: Alert sent but no email received
**Look for:**
```
✅ [SUCCESS] Email sent successfully { emailId: 'abc123' }
```
**Means:** Email was sent, check spam folder or Resend dashboard

## Monitoring Costs

DataForSEO charges $0.002 per check. Watch for:
```
🎯 [RANK CHECK] Starting rank check { domain: '...', keywords: ['a', 'b', 'c'] }
```
Count = keywords × checks. Example: 3 keywords = $0.006 per check.

## Log Structure

Each log entry includes:
- **Emoji** - Quick visual identifier
- **Timestamp** - ISO 8601 format
- **Level** - INFO/WARN/ERROR/SUCCESS/DEBUG
- **Message** - Human-readable description
- **Data** - JSON object with details (when relevant)

## Tips

1. **Keep the terminal visible** while testing to see real-time logs
2. **Search for emoji** to filter specific log types:
   - Search `🎯` for rank checks
   - Search `❌` for errors
   - Search `✅` for successes
3. **Check duration** in completion logs to track performance
4. **Save logs** for debugging: `npm run dev > app.log 2>&1`

## Example Full Flow

```bash
# 1. Manual check initiated
➡️ [API] POST /api/content/clxxx/check
ℹ️  Manual rank check initiated { contentId: 'clxxx', userId: 'user_abc' }

# 2. Rank checking
🎯 [RANK CHECK] Starting rank check { domain: 'example.com', keywords: ['seo'] }
ℹ️  Sending request to DataForSEO API { taskCount: 1 }
🎯 [RANK CHECK] Keyword "seo" - Position: 12
✅ [SUCCESS] Rank check completed { resultsCount: 1 }

# 3. Decay detection
📉 [DECAY DETECTION] Checking content decay { currentPosition: 12, previousPosition: 8 }
📉 [DECAY DETECTION] Position analysis { positionDrop: 4, dropFromBest: 4, change: 'dropped' }
⚠️  [WARN] Content has WARNING status { positionDrop: 4 }

# 4. Alert sent
🔔 [ALERT] Sending decay alert { contentTitle: 'SEO Guide', userEmail: 'you@example.com' }
ℹ️  Alert saved to database
ℹ️  Sending email via Resend { to: 'you@example.com' }
✅ [SUCCESS] Email sent successfully { emailId: 're_abc123' }

# 5. Completed
✅ [SUCCESS] Manual rank check completed { duration: '4532ms', keywordsChecked: 1, alertSent: true }
```

---

Now you can see exactly what's happening at every step! 🎉
