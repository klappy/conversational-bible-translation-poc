# Session Sharing Guide

## 📤 Share Your Translation Session

The Bible Translation Assistant now supports **seamless session sharing** across devices! You can:
- Continue your translation on your phone
- Share progress with team members
- Switch between devices without losing work
- Collaborate during workshops

## How to Share Your Session

### 1. Click the Share Button
Look for the **📤 Share** button in the top-right corner of the translation interface.

### 2. Choose Your Sharing Method

#### 📱 **QR Code** (Best for Mobile)
- Scan the QR code with your phone's camera
- Opens directly in your mobile browser
- Instant access to your translation session

#### 🔗 **Copy Link** (Best for Sharing)
- Click "Copy" to get the shareable URL
- Send via email, chat, or any messaging app
- Anyone with the link can access your session

#### 🔑 **Session Code** (For Reference)
- Your unique session identifier
- Useful for troubleshooting or support

## Use Cases

### 📱 Continue on Your Phone
1. Start translating on your computer
2. Click Share → Scan QR code with phone
3. Continue exactly where you left off!

### 👥 Workshop Collaboration
**For Facilitators:**
- Generate unique URLs for each attendee
- Format: `yoursite.com?session=workshop_user1`
- Each person works independently

**For Attendees:**
- Open your unique link
- Your work is automatically saved
- Return anytime to continue

### 💻 Switch Between Devices
- Working at office? Share to continue at home
- Moving from desktop to laptop? Take your work with you
- All progress syncs automatically

## How It Works

### Session Persistence
- Every change is saved automatically
- State persists using Netlify Blobs
- No login required - just use your link!

### Privacy & Security
- Each session is completely isolated
- No one can access your session without your link
- Sessions are private by default

### What Gets Saved?
✅ Your translation progress
✅ Style guide settings
✅ Glossary terms
✅ Scripture canvas content
✅ Conversation history
✅ Current workflow phase

## Workshop Scenario

### Setting Up a Workshop

1. **Base URL**: `https://your-site.netlify.app`

2. **Generate Attendee Links**:
```
Attendee 1: ?session=workshop2025_user1
Attendee 2: ?session=workshop2025_user2
Attendee 3: ?session=workshop2025_user3
```

3. **Share Instructions**:
- Each attendee opens their unique URL
- They can bookmark it for later
- Or scan their personal QR code

### During the Workshop
- Everyone works independently
- No cross-contamination of data
- Real-time saving (no "Save" button needed)
- Can pause and resume anytime

## Tips & Best Practices

### 📌 Bookmark Your Session
- Save your unique URL as a bookmark
- Quick access to continue later

### 📲 Mobile-Friendly
- The interface adapts to mobile screens
- Swipe between translation cards
- Touch-optimized controls

### 🔄 Multiple Sessions
- Start fresh with "New Session" button
- Keep multiple translation projects
- Switch between different sessions

## Troubleshooting

### Session Not Loading?
1. Check your internet connection
2. Verify the URL is complete
3. Try refreshing the page
4. Clear browser cache if needed

### Lost Your Link?
- Check browser history
- Look for bookmarks
- Start a new session if needed

### Session Mixing?
- Each URL is unique
- Use incognito/private mode for testing
- Clear cookies if issues persist

## Advanced Features

### Custom Session IDs
You can create meaningful session IDs:
```
?session=spanish_ruth_draft1
?session=team_alpha_ruth
?session=john_personal_translation
```

### Session Management
- View session info with `?debug=true`
- See last saved timestamp
- Monitor session activity

## FAQs

**Q: How long do sessions last?**
A: Sessions persist indefinitely as long as the service is running.

**Q: Can I have multiple sessions?**
A: Yes! Each unique URL is a separate session.

**Q: Is my data secure?**
A: Yes, sessions are private and only accessible via your unique link.

**Q: Can I delete a session?**
A: Yes, use the "New Session" button to start fresh.

**Q: Do I need an account?**
A: No! Sessions work without any login or registration.

## Ready to Share?

Click the **📤 Share** button in your translation interface to get started!

---

**Pro Tip**: During workshops, prepare session URLs in advance and share them via a simple web page or Google Doc for easy access.
