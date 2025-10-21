# Multi-User Architecture for Bible Translation Assistant

## Overview

This document outlines how to scale the Bible Translation Assistant to support multiple concurrent users, particularly for workshop scenarios where attendees work in isolation.

## Current State (Single User)

Currently, the application uses a single global state stored in `/tmp/canvas-state.json`, which doesn't persist in serverless environments.

## Proposed Multi-User Architecture

### Phase 1: Session-Based Isolation (Immediate Need)

**Implementation with Netlify Blobs**

```javascript
// User session management
const sessionId = generateSessionId(); // From URL param or cookie
const userStateKey = `session_${sessionId}`;

// Store user-specific state
await setBlob(userStateKey, {
  styleGuide: {
    /* user's settings */
  },
  glossary: {
    /* user's terms */
  },
  scriptureCanvas: {
    /* user's translations */
  },
  workflow: {
    /* user's progress */
  },
});
```

**Benefits**:

- No user authentication required
- Perfect for workshops
- Each attendee gets unique URL
- State persists for session duration
- No database setup needed

**Capacity**: Easily handles 100+ concurrent workshop users

### Phase 2: Authenticated Users (Future)

**Hybrid Architecture**

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
├─────────────────────────────────────┤
│      Netlify Functions (API)        │
├──────────────┬──────────────────────┤
│ Netlify Blobs│   External DB        │
├──────────────┼──────────────────────┤
│ Session State│  • User Accounts     │
│ Active Trans.│  • Translation History│
│ Temp Data    │  • Shared Resources  │
└──────────────┴──────────────────────┘
```

## Implementation Steps

### 1. Add Session Support (Netlify Blobs)

```javascript
// netlify/functions/canvas-state.js
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const store = getStore({
    name: "translations",
    siteID: context.site.id,
  });

  // Get session from header or query param
  const sessionId = req.headers["x-session-id"] || new URL(req.url).searchParams.get("session");

  const stateKey = sessionId ? `session_${sessionId}` : "default";

  // Operations on user-specific state
  const userState = await store.get(stateKey);
  // ...
};
```

### 2. Frontend Session Management

```javascript
// Generate or retrieve session ID
function getSessionId() {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

// Include in all API calls
fetch("/.netlify/functions/canvas-state", {
  headers: {
    "X-Session-ID": getSessionId(),
  },
});
```

### 3. Workshop Mode Features

**Facilitator Dashboard** (Optional)

- Create workshop session
- Generate unique URLs for attendees
- Monitor progress (anonymous)
- Export all translations

**Attendee Experience**

- Unique URL: `https://site.netlify.app/?session=workshop123_user5`
- Isolated translation environment
- No sign-up required
- Progress saved automatically

## Scalability Limits

### Netlify Blobs (Current Choice)

| Metric           | Capacity  | Notes                       |
| ---------------- | --------- | --------------------------- |
| Concurrent Users | 100-1000+ | Excellent for workshops     |
| Storage per User | ~1-10MB   | JSON state data             |
| Read Performance | Excellent | Optimized for reads         |
| Write Frequency  | Good      | Suitable for periodic saves |
| Total Storage    | GB+       | Included in plan            |
| Cost             | Free tier | Generous limits             |

### When to Migrate to External DB

Consider external database when you need:

- User authentication and profiles
- Translation history/versioning
- Collaborative features
- Complex queries (search translations)
- Real-time collaboration
- > 1000 concurrent users

## Database Options for Future

### 1. Supabase (Recommended for Growth)

- PostgreSQL with real-time
- Built-in authentication
- Row-level security
- Generous free tier
- Easy migration path

### 2. FaunaDB

- Serverless, ACID compliant
- Global distribution
- Good for event sourcing
- Pay-per-use model

### 3. MongoDB Atlas

- Document store (like current JSON)
- Serverless option available
- Good for complex documents
- Free tier available

## Migration Path

### Step 1: Session Support (Now)

- Implement Netlify Blobs
- Add session management
- Test with workshop scenario

### Step 2: Hybrid Model (Next)

- Keep Blobs for active sessions
- Add database for persistence
- User accounts optional

### Step 3: Full Platform (Future)

- User authentication
- Translation management
- Collaboration features
- API for external tools

## Workshop Deployment Guide

### For Workshop Facilitators

1. **Deploy Instance**

   ```bash
   # Clone and deploy your own instance
   netlify deploy --prod
   ```

2. **Configure Workshop**

   ```javascript
   // Set workshop metadata
   const workshopConfig = {
     name: "ETEN Summit 2025",
     maxUsers: 50,
     sessionDuration: "4h",
     sourceText: "Ruth 1",
   };
   ```

3. **Generate Attendee Links**
   ```
   Base URL: https://your-instance.netlify.app
   User 1: ?session=eten2025_user1
   User 2: ?session=eten2025_user2
   ...
   ```

## Cost Analysis

### For 50-User Workshop

**Netlify Blobs**

- Storage: ~50MB (Free)
- Functions: ~10K invocations (Free)
- Bandwidth: ~1GB (Free)
- **Total: $0**

**External Database** (Comparison)

- Supabase: Free tier sufficient
- FaunaDB: Free tier sufficient
- MongoDB Atlas: Free tier sufficient
- **Total: $0** (but more setup)

## Recommendations

### For Immediate Workshop Need

✅ **Use Netlify Blobs with sessions**

- Quick to implement
- No external dependencies
- Sufficient for workshops
- Zero additional cost

### For Long-term Platform

✅ **Plan for hybrid architecture**

- Start with Blobs
- Add database when needed
- Keep architecture flexible
- Monitor usage patterns

## Implementation Timeline

- **Day 1**: Add Netlify Blobs support
- **Day 2**: Implement session management
- **Day 3**: Test multi-user scenarios
- **Week 2**: Add workshop features
- **Month 2**: Evaluate database needs
- **Month 3**: Implement if needed

## Conclusion

Netlify Blobs is perfectly suitable for workshop scenarios with 10-100+ concurrent users. The architecture allows for easy migration to a full database solution when needed, without disrupting the current functionality.
