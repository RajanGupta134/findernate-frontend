# Business Features Quick Setup Guide

This guide will help you quickly set up and test the 4 integrated business features.

## Prerequisites

- Backend server running on `http://localhost:8000`
- Frontend server running (Next.js)
- MongoDB database set up
- Razorpay test account (for payments)

## Step 1: Backend Configuration

### 1.1 Environment Variables

Add to backend `.env`:
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Subscription Plans (Monthly prices in paise)
SUBSCRIPTION_PLAN_SMALL_BUSINESS_PRICE=99900  # ₹999
SUBSCRIPTION_PLAN_CORPORATE_PRICE=299900      # ₹2999

# Webhook Secret (optional)
RAZORPAY_WEBHOOK_SECRET=xxxxx
```

### 1.2 Start Cron Jobs

The subscription expiry job runs automatically. To manually trigger:
```bash
# In backend directory
node src/jobs/subscriptionExpiry.job.js
```

## Step 2: Frontend Configuration

### 2.1 Environment Variables

Add to frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 2.2 Install Dependencies

Frontend dependencies already include Razorpay and required packages. If needed:
```bash
cd Findernate-frontend
npm install
```

## Step 3: Test Each Feature

### Feature 1: Business Post Priority ✅ (Auto-Enabled)

**Backend handles this automatically.** No frontend action needed.

**Quick Test:**
1. Create a business user with active subscription
2. Create a regular user
3. Both post content
4. Check home feed → Business post appears first (higher feedScore)

---

### Feature 2: Calling Access

**Frontend Integration Complete** ✅

**Quick Test:**

1. **As Free User:**
```bash
# Login as free user
# Navigate to Messages
# Try to initiate call
# Verify UpgradeModal appears
```

2. **Upgrade Flow:**
- Click "Upgrade to Small Business"
- Razorpay modal opens
- Use test card: `4111 1111 1111 1111`
- Verify subscription activated
- Try call again → Should work

**Test API Directly:**
```bash
# Get subscription status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/subscription/status

# Expected response for free user:
{
  "subscription": null,
  "tier": "free",
  "features": {
    "calling": {
      "hasAccess": false
    }
  }
}
```

---

### Feature 3: Paid Plan Badge

**Frontend Integration Complete** ✅

**Where Badges Appear:**
- ✅ User profiles (next to name)
- ✅ Post cards (next to username in header)
- ✅ Comments (next to commenter name)
- ✅ Search results (via backend data)

**Quick Test:**
1. Upgrade user to Small Business or Corporate
2. Navigate to profile → Blue/Gold badge appears
3. Create a post → Badge appears on post card
4. Comment on post → Badge appears on comment
5. Search for user → Badge appears in results

**Verify Badge Data:**
```bash
# Get user profile
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/users/profile

# Response should include:
{
  "subscriptionBadge": {
    "type": "small_business",
    "label": "Small Business",
    "color": "#3B82F6",
    "isPaid": true
  }
}
```

---

### Feature 4: Business Visibility Rules

**Backend handles this automatically** ✅

**Quick Test:**

1. **Create Business Account:**
```bash
POST /api/v1/business/create
{
  "businessName": "Test Business",
  "businessType": "retail",
  "description": "Test"
}
```

2. **Subscribe:**
```bash
# Upgrade to Small Business plan
# Create posts
# Verify posts visible in feed
```

3. **Expire Subscription:**
```javascript
// Manually update in MongoDB or wait for cron
db.businesses.updateOne(
  { userId: ObjectId("USER_ID") },
  {
    $set: {
      subscriptionStatus: "inactive",
      plan: "plan1"
    }
  }
)
```

4. **Verify Posts Hidden:**
- Refresh feed → Business posts should disappear
- Even followers cannot see them

5. **Re-activate:**
- Upgrade again
- Posts immediately reappear

---

## Step 4: Add Subscription Settings Page

### Option 1: Add to Settings Menu

1. Open `src/components/SettingsModal.tsx`
2. Add link to subscription settings:
```tsx
<button onClick={() => router.push('/settings/subscription')}>
  Subscription & Billing
</button>
```

### Option 2: Create Settings Page

Create `src/app/settings/subscription/page.tsx`:
```tsx
import SubscriptionSettings from '@/components/SubscriptionSettings';

export default function SubscriptionPage() {
  return (
    <div className="container mx-auto py-8">
      <SubscriptionSettings />
    </div>
  );
}
```

**Access at:** `http://localhost:3000/settings/subscription`

---

## Step 5: Verify Integration

### Checklist

**Backend:**
- [ ] Subscription middleware working (`/calls/initiate` returns 403 for free users)
- [ ] Badge utility attaching badges to users
- [ ] Business visibility filter working
- [ ] Priority algorithm boosting paid posts
- [ ] Razorpay webhooks receiving events
- [ ] Cron job expiring subscriptions

**Frontend:**
- [ ] UpgradeModal appears when free user tries to call
- [ ] SubscriptionBadge component displays correctly
- [ ] Badge appears on profiles, posts, comments
- [ ] Payment flow completes successfully
- [ ] Subscription settings page works
- [ ] Feed displays prioritized posts

### Quick Verification Script

Run this to check all features:
```bash
# Backend health check
curl http://localhost:8000/api/v1/health

# Check subscription middleware
curl -X POST -H "Authorization: Bearer FREE_USER_TOKEN" \
  http://localhost:8000/api/v1/calls/initiate \
  -d '{"receiverId":"xxx","chatId":"xxx","callType":"voice"}'
# Should return 403 with errorCode: 'CALLING_FEATURE_RESTRICTED'

# Check badge attachment
curl -H "Authorization: Bearer PAID_USER_TOKEN" \
  http://localhost:8000/api/v1/users/profile
# Should include subscriptionBadge field

# Check feed priority
curl -H "Authorization: Bearer ANY_TOKEN" \
  http://localhost:8000/api/v1/feed/home
# Posts should have feedScore field, paid business posts have 200+
```

---

## Troubleshooting Common Issues

### Issue: "Razorpay is not defined"

**Solution:** Razorpay script loads asynchronously. Check UpgradeModal:
```typescript
if (!window.Razorpay) {
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  await new Promise(resolve => { script.onload = resolve; });
}
```

### Issue: Calls work for free users

**Solution:** Backend middleware not applied. Check routes:
```javascript
// In call.routes.js
router.post('/initiate', verifyCallingAccess, initiateCall);
// ↑ verifyCallingAccess MUST be here
```

### Issue: Badge not appearing

**Solution:** Backend not attaching badge. Check controller:
```javascript
// Must call addBadgeToUser or addBadgesToUsers
const user = await User.findById(userId);
const userWithBadge = await addBadgeToUser(user);
res.json({ data: userWithBadge });
```

### Issue: Business posts still visible after expiry

**Solution:** Cache not invalidated. Manually clear:
```javascript
const redis = require('./config/redis');
await redis.del(`fn:user:${userId}:feed:*`);
```

---

## Production Checklist

Before deploying to production:

**Backend:**
- [ ] Switch Razorpay to live mode keys
- [ ] Set up webhook endpoint for production URL
- [ ] Configure cron job for subscription expiry
- [ ] Set up monitoring for failed payments
- [ ] Test subscription cancellation flow
- [ ] Verify cache invalidation on all subscription changes

**Frontend:**
- [ ] Update `NEXT_PUBLIC_API_URL` to production
- [ ] Test payment flow with live Razorpay
- [ ] Verify all badge displays are correct
- [ ] Test upgrade modal on mobile devices
- [ ] Check loading states for all subscription actions
- [ ] Verify error handling for failed payments

**Database:**
- [ ] Create indexes on subscription fields
- [ ] Set up backup for subscription data
- [ ] Monitor query performance

**Testing:**
- [ ] Test with real payment methods
- [ ] Verify email notifications (if implemented)
- [ ] Test subscription renewal flow
- [ ] Verify refund handling
- [ ] Test all features on mobile browsers

---

## API Reference

### Subscription Endpoints

```
GET    /api/v1/subscription/status           - Get current subscription
POST   /api/v1/subscription/create-order     - Create Razorpay order
POST   /api/v1/subscription/verify-payment   - Verify and activate
POST   /api/v1/subscription/cancel           - Cancel subscription
GET    /api/v1/subscription/upgrade-prompt   - Get upgrade info
```

### Call Endpoints (Protected)

```
POST   /api/v1/calls/initiate   - Initiate call (requires subscription)
PATCH  /api/v1/calls/:id/accept - Accept call (requires subscription)
```

### Feed Endpoints (Priority Applied)

```
GET    /api/v1/feed/home    - Home feed with priority
GET    /api/v1/explore      - Explore feed with business posts
GET    /api/v1/search       - Search with filtered business posts
```

---

## Business Logic

### Subscription Lifecycle

```
1. User Upgrades
   ↓
2. Create Razorpay order
   ↓
3. User completes payment
   ↓
4. Verify payment signature
   ↓
5. Create Subscription record
   - status: 'active'
   - startDate: now
   - endDate: now + 30 days
   ↓
6. Badge immediately appears
   ↓
7. Calling features unlocked
   ↓
8. (If business) Posts get priority boost
```

### Subscription Expiry

```
1. Daily cron job (2 AM)
   ↓
2. Find subscriptions where:
   - status === 'active'
   - endDate < now
   ↓
3. Update records:
   - status → 'expired'
   - Business.plan → 'plan1'
   ↓
4. Invalidate feed caches
   ↓
5. Next feed fetch:
   - Business posts filtered out
   - Badge disappears
   - Calling blocked
```

### Re-subscription

```
1. User upgrades again
   ↓
2. New subscription created
   ↓
3. All features instantly restored
   - Badge reappears
   - Posts visible
   - Can call
```


## Support & Documentation

- **Integration Guide:** `INTEGRATION_GUIDE.md`
- **Backend Docs:** Check individual controller files
- **Razorpay Docs:** https://razorpay.com/docs/

**Need Help?**
- Check backend logs: `src/logs/`
- Review webhook logs for payment issues
- Test APIs using Postman collection

---

**Setup Complete!** 🎉

All 4 business features are now integrated and ready for testing.
