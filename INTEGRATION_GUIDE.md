# FinderNate Business Features Integration Guide

This document provides a comprehensive guide for the 4 business features integrated between the backend and frontend.

## Table of Contents
1. [Overview](#overview)
2. [Feature 1: Business Post Priority System](#feature-1-business-post-priority-system)
3. [Feature 2: Paid vs Free User Calling Features](#feature-2-paid-vs-free-user-calling-features)
4. [Feature 3: Paid Plan Badge](#feature-3-paid-plan-badge)
5. [Feature 4: Business Account Visibility Rule](#feature-4-business-account-visibility-rule)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The FinderNate platform now includes 4 premium business features that provide monetization capabilities and enhanced user experience for paid subscribers:

1. **Business Post Priority System** - Paid business posts appear with higher priority in feeds
2. **Paid vs Free Calling** - Only paid users can access audio/video calling features
3. **Paid Plan Badge** - Visual badges distinguish paid users across the platform
4. **Business Visibility Rules** - Business content from inactive subscriptions is hidden

---

## Feature 1: Business Post Priority System

### Backend Implementation

**Priority Algorithm** (`src/controllers/homeFeed.controllers.js`):
- Paid business posts: **+200 priority points** (HIGHEST)
- Followed users: +100 points
- Recent posts (24h): +20 points
- Engagement boost: +1-30 points
- Content type boost: +8-15 points

**Key Files:**
- `src/utlis/businessPlan.utils.js` - Contains priority calculation logic
- `src/controllers/homeFeed.controllers.js` - Home feed with priority sorting
- `src/controllers/explore.controllers.js` - Explore feed with business post interspersing

**How It Works:**
1. Backend checks if user has `isBusinessProfile: true` and active subscription
2. Business posts from users with `subscriptionStatus === 'active'` and `plan !== 'plan1'` get priority boost
3. Posts are sorted by `feedScore` (descending), then by `createdAt`
4. In explore feed, 1 paid business post appears every 4 regular posts

### Frontend Integration

**Already Integrated:** ✅
- Feed components automatically receive posts sorted by priority from backend
- No additional frontend changes needed - backend handles all priority logic

**API Endpoints:**
```typescript
GET /api/v1/feed/home - Returns prioritized feed
GET /api/v1/explore - Returns explore feed with interspersed business posts
```

---

## Feature 2: Paid vs Free User Calling Features

### Backend Implementation

**Subscription Plans:**
- **Free**: No calling access
- **Small Business (₹999/month)**: Unlimited audio + video calls
- **Corporate (₹2999/month)**: Unlimited calls + premium features

**Middleware** (`src/middlewares/subscription.middleware.js`):
```javascript
verifyCallingAccess(req, res, next)
// Blocks free users with 403 error
// Returns: { errorCode: 'CALLING_FEATURE_RESTRICTED', requiresUpgrade: true }
```

**Protected Endpoints:**
```
POST /api/v1/calls/initiate - Requires verifyCallingAccess
PATCH /api/v1/calls/:callId/accept - Requires verifyCallingAccess
```

### Frontend Integration

**Files Created:**
1. `src/api/subscription.ts` - Subscription API client
2. `src/hooks/useSubscription.ts` - Subscription state hook
3. `src/components/ui/UpgradeModal.tsx` - Upgrade prompt modal
4. `src/hooks/useVideoCall.ts` - Updated with subscription check

**How It Works:**

1. **User initiates call** → Frontend calls `callAPI.initiateCall()`
2. **Backend checks subscription** → Returns 403 if user is free tier
3. **Frontend handles error** → Detects `errorCode: 'CALLING_FEATURE_RESTRICTED'`
4. **Show upgrade modal** → Displays `UpgradeModal` with subscription options
5. **User upgrades** → Razorpay payment flow → Backend activates subscription
6. **Call succeeds** → User can now make calls

**Implementation in useVideoCall.ts:**
```typescript
try {
  const call = await callAPI.initiateCall({ receiverId, chatId, callType });
  // Success - open call modal
} catch (error: any) {
  if (error?.isSubscriptionError) {
    onSubscriptionRequired?.(); // Show upgrade modal
  }
}
```

**Usage in MessagePanel:**
```typescript
const { initiateCall } = useVideoCall({
  user,
  onSubscriptionRequired: () => setShowUpgradeModal(true)
});
```

**API Endpoints:**
```typescript
GET /api/v1/subscription/status - Get current subscription status
POST /api/v1/subscription/create-order - Create Razorpay order
POST /api/v1/subscription/verify-payment - Verify and activate subscription
```

---

## Feature 3: Paid Plan Badge

### Backend Implementation

**Badge Types:**
- **Corporate Badge** (Business profiles): Gold (#F59E0B)
- **Small Business Badge**: Blue (#3B82F6)
- **Free Users**: No badge (null)

**Badge Object Structure:**
```javascript
{
  type: 'corporate' | 'small_business',
  label: 'Corporate' | 'Small Business',
  color: '#F59E0B' | '#3B82F6',
  isPaid: true
}
```

**Badge Attachment** (`src/utlis/userBadge.utils.js`):
- `addBadgeToUser(user)` - Single user
- `addBadgesToUsers(users)` - Bulk users (optimized)
- `addBadgesToNestedUsers(items)` - Users in posts/comments

### Frontend Integration

**Files Created:**
1. `src/components/ui/SubscriptionBadge.tsx` - Badge component
2. Updated `src/types.ts` - Added `subscriptionBadge` field to user types

**Badge Component:**
```typescript
import SubscriptionBadge from '@/components/ui/SubscriptionBadge';

<SubscriptionBadge
  badge={user.subscriptionBadge}
  size="sm" | "md" | "lg"
/>
```

**Integrated In:**
- ✅ User profiles (`UserProfile.tsx`)
- ✅ Post cards (`PostCard.tsx`) - appears next to username
- ✅ Comments (`CommentItem.tsx`) - appears next to commenter name
- ✅ Search results (via backend types)

**Example Usage:**
```tsx
// In PostCard.tsx
<h3 className="font-semibold">
  {post.username}
</h3>
<SubscriptionBadge badge={post.userId?.subscriptionBadge} size="sm" />
```

---

## Feature 4: Business Account Visibility Rule

### Backend Implementation

**Core Rule:**
> Business posts from accounts **without active subscriptions are hidden from ALL users**, including followers.

**Implementation:**
1. **Home Feed** (`homeFeed.controllers.js`):
   - Filters out posts where `isBusinessAccount === true` AND user NOT in `activePlanUserIds`

2. **Explore Feed** (`explore.controllers.js`):
   - Calls `filterBusinessPostsByPaymentPlan(posts)` to remove unpaid business posts

3. **Search Results** (`searchAllContent.controllers.js`):
   - Filters business posts without active subscriptions

**Subscription Status Check:**
```javascript
Business.find({
  subscriptionStatus: 'active',
  plan: { $ne: 'plan1' } // plan1 is free
})
```

**Cache Invalidation:**
When subscription changes, caches are invalidated:
```javascript
FeedCacheManager.invalidateUserFeed(userId)
FeedCacheManager.invalidateExploreFeed()
FeedCacheManager.invalidateTrendingFeed()
```

### Frontend Integration

**Already Integrated:** ✅
- Backend filters posts before sending to frontend
- Frontend receives only visible posts
- No additional frontend logic needed

**How It Works:**
1. User's subscription expires → Backend cron job runs daily at 2 AM
2. Subscription status updated to `'expired'`, plan downgraded to `'plan1'`
3. Feed caches invalidated
4. Next time user fetches feed → Their business posts are excluded
5. User upgrades → Posts immediately become visible again

---

## Testing Guide

### Test Feature 1: Business Post Priority

**Test Steps:**
1. Create 2 users: one free, one paid business account
2. Both users post about same topic (e.g., "watches")
3. Check home feed → Paid business post should appear first
4. Check explore feed → Paid business posts interspersed every 4 posts

**Expected Result:**
- Paid business posts have higher `feedScore` (200+)
- Free user posts have lower score
- Explore feed shows 1 business post per 4 regular posts

### Test Feature 2: Calling Access

**Test Steps:**
1. **Free User:**
   - Login as free user
   - Try to initiate voice/video call
   - Verify upgrade modal appears
   - Complete upgrade flow
   - Try call again → Should succeed

2. **Paid User:**
   - Login as paid user
   - Initiate call → Should work immediately

**Expected Results:**
- Free users see upgrade modal when attempting calls
- Paid users can call without restrictions
- Upgrade flow completes successfully via Razorpay

### Test Feature 3: Paid Plan Badge

**Test Steps:**
1. Upgrade user to Small Business plan
2. Check badge appears on:
   - User profile (next to name)
   - Posts (next to username)
   - Comments (next to commenter name)
   - Search results

**Expected Results:**
- **Small Business**: Blue badge with star icon
- **Corporate**: Gold badge with star icon
- **Free**: No badge

### Test Feature 4: Business Visibility

**Test Steps:**
1. Create business account with active subscription
2. Create multiple posts
3. Verify posts visible in:
   - Home feed
   - Explore feed
   - Search results
   - Profile page
4. Cancel/expire subscription
5. Verify posts are now hidden from ALL users
6. Re-activate subscription
7. Verify posts immediately reappear

**Expected Results:**
- Active subscription → Posts visible
- Inactive subscription → Posts hidden from everyone
- Instant restoration upon re-activation

---

## Troubleshooting

### Issue: Badge Not Showing

**Cause:** Backend might not be attaching badge to user object

**Fix:**
1. Check backend response includes `subscriptionBadge` field
2. Verify `addBadgeToUser()` is called in controllers
3. Check browser console for TypeScript errors

```typescript
// Expected response structure
{
  userId: {
    _id: "...",
    username: "...",
    subscriptionBadge: {
      type: "corporate",
      label: "Corporate",
      color: "#F59E0B",
      isPaid: true
    }
  }
}
```

### Issue: Upgrade Modal Not Appearing

**Cause:** Error handling not catching subscription error correctly

**Fix:**
1. Check backend returns correct error format:
```json
{
  "success": false,
  "data": {
    "errorCode": "CALLING_FEATURE_RESTRICTED",
    "requiresUpgrade": true
  }
}
```

2. Verify frontend `callAPI.initiateCall()` catches and transforms error:
```typescript
if (error.response?.data?.data?.errorCode === 'CALLING_FEATURE_RESTRICTED') {
  throw { isSubscriptionError: true, ...error.response.data.data };
}
```

### Issue: Business Posts Still Visible After Subscription Expires

**Cause:** Cache not invalidated or subscription status not updated

**Fix:**
1. Check subscription expiry cron job is running:
```bash
# Backend logs should show daily at 2 AM
"Subscription Expiry Job: Found X expired subscriptions"
```

2. Manually invalidate cache:
```javascript
await FeedCacheManager.invalidateUserFeed(userId);
```

3. Verify business model:
```javascript
{
  subscriptionStatus: 'expired', // Should be 'expired' not 'active'
  plan: 'plan1' // Should downgrade to plan1
}
```

### Issue: Priority Not Working

**Cause:** `feedScore` not calculated correctly

**Fix:**
1. Check backend logs for priority calculation
2. Verify business has active subscription:
```javascript
{
  isBusinessProfile: true,
  subscriptionStatus: 'active',
  plan: 'plan2' // or plan3/plan4, NOT plan1
}
```

3. Check `getBusinessPriorityBoost()` is called:
```javascript
const boost = getBusinessPriorityBoost(post, businessUserIds, activePlanUserIds);
// Should return 200 for paid business, 0 for others
```

### Issue: Razorpay Payment Not Working

**Cause:** Razorpay script not loaded or keys incorrect

**Fix:**
1. Check Razorpay script loaded:
```javascript
if (!window.Razorpay) {
  // Load script
}
```

2. Verify Razorpay key in backend `.env`:
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

3. Check network tab for Razorpay API calls

---

## Additional Notes

### Subscription Lifecycle

1. **User Upgrades:**
   - Frontend → `createSubscriptionOrder()` → Backend creates Razorpay order
   - Razorpay modal opens → User completes payment
   - `verifySubscriptionPayment()` → Backend verifies signature
   - Subscription created with `status: 'active'`
   - Badge immediately appears

2. **Subscription Expires:**
   - Cron job runs daily at 2 AM (Asia/Kolkata)
   - Finds subscriptions where `endDate < now` and `status === 'active'`
   - Updates `status: 'expired'`, downgrades business to `plan: 'plan1'`
   - Invalidates all feed caches
   - Posts hidden on next feed fetch

3. **User Renews:**
   - Same as upgrade flow
   - Subscription reactivated
   - Posts immediately visible again

### Performance Considerations

- **Badge Loading:** Badges are loaded with user data in single query (no N+1 queries)
- **Priority Calculation:** Calculated in aggregation pipeline (database-level)
- **Cache Strategy:** Feed results cached for 5 minutes, invalidated on subscription changes
- **Bulk Operations:** `addBadgesToUsers()` uses single DB query for multiple users

### Security

- **Calling Access:** Enforced at middleware level (cannot be bypassed)
- **Payment Verification:** Razorpay signature verified server-side
- **Subscription Status:** Checked on every protected endpoint
- **Business Visibility:** Enforced in database queries (not client-side)

---

## Support

For issues or questions:
1. Check backend logs in `src/logs/`
2. Verify subscription status via API: `GET /api/v1/subscription/status`
3. Check webhook logs for payment events
4. Review error responses in browser DevTools

---

**Last Updated:** January 2026
**Version:** 1.0.0
