# Frontend Integration Guide: Driver Request Fixes

## 🎯 Overview
Two backend improvements have been implemented for driver requests:
1. **Request Persistence** - Pending requests are restored when customer reconnects
2. **30-Second Auto-Decline** - Requests automatically expire after 30 seconds

---

## 📱 Changes Required for Customer App

### ✅ Issue 1: Request Persistence (No Changes Required)

**What Changed:**
- When customers reconnect via `customer:connect`, the server automatically sends all pending driver requests

**Existing Code Works:**
Your existing `request:new` event listener will automatically handle reconnected requests.

**Optional Enhancement:**
Add a visual indicator for restored requests:

```javascript
socket.on('request:new', (data) => {
  const { fare, request, message } = data;
  
  // Check if this is a restored request
  const isRestored = message === 'Pending request from reconnection';
  
  // Display the request (your existing code)
  displayDriverRequest(request, fare, isRestored);
});
```

---

### ⚠️ Issue 2: 30-Second Auto-Decline

**What Changed:**
- Driver requests now automatically expire after 30 seconds
- No notification is sent to customers (silent decline)
- Requests just disappear from the UI after 30 seconds

**Option A: Let Requests Disappear (Minimal Changes)**

The backend handles everything automatically. Requests will simply stop being valid after 30 seconds.

**Recommended - Option B: Show Countdown Timer**

Show customers how much time they have to respond:

```javascript
// Store request timers
const requestTimers = new Map();

socket.on('request:new', (data) => {
  const { request } = data;
  
  // Display request
  displayDriverRequest(request);
  
  // Start 30-second countdown
  let remainingSeconds = 30;
  
  const timerId = setInterval(() => {
    remainingSeconds--;
    updateRequestTimer(request._id, remainingSeconds);
    
    if (remainingSeconds <= 0) {
      clearInterval(timerId);
      removeExpiredRequest(request._id);
      requestTimers.delete(request._id);
    }
  }, 1000);
  
  requestTimers.set(request._id, timerId);
});

// Clear timer when request is accepted/declined
function handleRequestAction(requestId) {
  if (requestTimers.has(requestId)) {
    clearInterval(requestTimers.get(requestId));
    requestTimers.delete(requestId);
  }
}

socket.on('request:accept', (data) => {
  handleRequestAction(data.requestId);
  // ... rest of your accept logic
});

socket.on('request:decline', (data) => {
  handleRequestAction(data.requestId);
  // ... rest of your decline logic
});
```

**UI Example:**
```
┌─────────────────────────────────────┐
│ Driver Request                      │
│ Fare: ₹250                         │
│ Vehicle: Honda City                │
│                                    │
│ ⏱️ Expires in: 28s                │
│                                    │
│ [Accept]  [Decline]                │
└─────────────────────────────────────┘
```

---

## 🚗 Changes Required for Driver App

### ✅ No Changes Required!

**What Changed:**
- When requests auto-expire after 30 seconds, drivers receive the existing `request:declined` event
- The decline reason will be: "Request expired after 30 seconds - no customer response"

**Your Existing Code Works:**
Your current `request:declined` event listener will automatically handle expired requests:

```javascript
// Your existing code already handles this!
socket.on('request:declined', (data) => {
  const { requestId, rideId, reason } = data;
  
  // This will work for both:
  // 1. Manual declines by customer
  // 2. Auto-expired requests (reason will indicate it expired)
  
  // Your existing decline handling...
});
```

**Optional Enhancement:**
If you want to show different UI for expired vs manually declined requests:

```javascript
socket.on('request:declined', (data) => {
  const { requestId, rideId, reason } = data;
  
  // Check if it was auto-expired
  const isExpired = reason?.includes('expired after 30 seconds');
  
  if (isExpired) {
    showNotification({
      title: 'Request Expired',
      message: 'Customer did not respond within 30 seconds',
      type: 'info'
    });
  } else {
    showNotification({
      title: 'Request Declined',
      message: reason || 'Customer declined your request',
      type: 'warning'
    });
  }
  
  // Remove from UI (same for both)
  removeRequestFromUI(requestId);
});
```

---

## 🧪 Testing Scenarios

### Test 1: Request Persistence
1. Customer creates a ride
2. Driver raises a request
3. Customer sees request ✅
4. Customer **completely closes app**
5. Customer reopens app
6. **Expected:** Request reappears immediately ✅

### Test 2: Request Persistence (Multiple Requests)
1. Customer creates a ride
2. Driver A raises request
3. Driver B raises request
4. Customer closes app
5. Customer reopens app
6. **Expected:** Both requests reappear ✅

### Test 3: 30-Second Auto-Decline
1. Driver raises request
2. Customer receives request
3. Customer does NOT respond
4. **Wait 30 seconds**
5. **Expected:** 
   - Customer: Request disappears (no notification)
   - Driver: Receives `request:declined` event with reason "Request expired after 30 seconds - no customer response"

### Test 4: Manual Action Prevents Auto-Decline
1. Driver raises request
2. Customer accepts within 15 seconds
3. **Expected:** Request accepted, no expiration

### Test 5: Multiple Requests Auto-Decline
1. Driver A raises request
2. Driver B raises request
3. Customer closes app
4. **Wait 31+ seconds**
5. Customer reopens app
6. **Expected:** No requests appear (all expired)

---

## 📊 Event Reference Sheet

### Events Customer App Listens To:
| Event | When | Action Required |
|-------|------|-----------------|
| `request:new` | New or restored request | Display request (existing code works) |

### Events Driver App Listens To:
| Event | When | Action Required |
|-------|------|-----------------|
| `request:declined` | Customer manually declined OR auto-expired after 30s | Existing code works! Check `reason` field to differentiate |

### Events No Longer Useful:
None - all existing events still work as before.

---

## 💡 Optional Enhancements

### 1. Visual Warning at 10 Seconds
```javascript
if (remainingSeconds === 10) {
  highlightRequestAsUrgent(request._id);
  playWarningSound();
}
```

### 2. Request Statistics for Drivers
Track expiration rate:
```javascript
const stats = {
  totalRequests: 0,
  accepted: 0,
  declined: 0,
  expired: 0
};

socket.on('request:declined', (data) => {
  const isExpired = data.reason?.includes('expired after 30 seconds');
  
  if (isExpired) {
    stats.expired++;
  } else {
    stats.declined++;
  }
  
  // Show: "Response rate: 85% (3 expired out of 20 requests)"
});
```

### 3. Batch Notification for Multiple Expired Requests
If multiple requests expire while app is closed:
```javascript
let expiredCount = 0;
socket.on('request:declined', (data) => {
  if (data.reason?.includes('expired after 30 seconds')) {
    expiredCount++;
    // After 2 seconds, show: "3 requests expired while you were offline"
  }
});
```

---

## 🐛 Common Issues & Solutions

### Issue: Requests appear briefly then disappear
**Cause:** Customer reconnected after 30 seconds  
**Solution:** Backend only sends PENDING requests, so this shouldn't happen

### Issue: Timer shows wrong time on reconnect
**Cause:** No way to know exact remaining time  
**Solution:** Either:
- Always show 30s on reconnect (consistent)
- Don't show timer for restored requests (simpler)

### Issue: Multiple timers for same request
**Cause:** Request received multiple times  
**Solution:** Check if timer already exists:
```javascript
if (requestTimers.has(request._id)) {
  clearInterval(requestTimers.get(request._id));
}

// Then create new timer
```

---

## 🔄 Migration Checklist

**Customer App:**
- [ ] Test request restoration on app restart
- [ ] (Optional) Add countdown timer UI
- [ ] Test with multiple simultaneous requests
- [ ] Update notification permissions if needed

**Driver App:**
- [ ] Test that existing `request:declined` handler works for expired requests
- [ ] (Optional) Add different UI for expired vs declined requests
- [ ] Verify expired requests are removed from UI
- [ ] Test notification when app is in background

**Both Apps:**
- [ ] Update WebSocket connection handling
- [ ] Test on slow networks
- [ ] Test with app in background vs closed
- [ ] Verify existing accept/decline flow still works

---

## ❓ FAQ

**Q: What if customer's app is closed for 40 seconds?**  
A: No requests will appear when they reconnect (all expired).

**Q: Does this affect ACCEPTED or ONGOING rides?**  
A: No, only affects PENDING requests for PENDING rides.

**Q: Can we customize the 30-second timeout?**  
A: Yes, ask backend team to adjust the timeout value (currently hardcoded).

**Q: What happens if network is slow?**  
A: Timer starts from when backend creates request, not when customer receives it.

**Q: Should we show expired requests in history?**  
A: Optional - backend marks them as DECLINED with reason "Auto-declined after 30 seconds".

---

## 📞 Need Help?

- Backend endpoint: `customer:connect` (auto-sends pending requests)
- Event for expired requests: `request:declined` (same as manual decline)
- Decline reason for expired: "Request expired after 30 seconds - no customer response"
- Timeout duration: **30 seconds** (fixed)
- Status on expiry: `DECLINED`

For questions or issues, contact the backend team.
