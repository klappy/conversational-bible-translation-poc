#!/bin/bash

# Simplified test - only tests canvas-state endpoint (doesn't require OpenAI key)
# This will tell us if the STATE PERSISTENCE works at all

set -e

echo "🧪 Testing Canvas State API (Backend Only)"
echo "============================================"
echo ""
echo "⚠️  Note: This test does NOT require OpenAI API key"
echo "   We're only testing state save/retrieve, not the conversation agent"
echo ""

# Check if server is running
if ! curl -s http://localhost:8888/.netlify/functions/canvas-state > /dev/null 2>&1; then
  echo "❌ Dev server not running!"
  echo ""
  echo "Please start it in another terminal:"
  echo "  cd /workspace && npm run dev:netlify"
  echo ""
  exit 1
fi

# Use a test session ID
SESSION_ID="backend_test_$(date +%s)"
API_URL="http://localhost:8888/.netlify/functions/canvas-state"

echo "📝 Test Session ID: $SESSION_ID"
echo ""

# Step 1: Get initial state
echo "1️⃣  Getting initial state (should be defaults)..."
INITIAL=$(curl -s -H "X-Session-ID: $SESSION_ID" "$API_URL")

if [ -z "$INITIAL" ]; then
  echo "❌ No response from server!"
  exit 1
fi

echo "   userName: $(echo "$INITIAL" | jq -r '.styleGuide.userName')"
echo "   currentPhase: $(echo "$INITIAL" | jq -r '.workflow.currentPhase')"
echo "   settingsCustomized: $(echo "$INITIAL" | jq -r '.settingsCustomized')"
echo ""

# Step 2: Update state
echo "2️⃣  Updating state (simulating what Canvas Scribe does)..."
UPDATE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "updates": {
      "styleGuide": {
        "userName": "BackendTestUser",
        "conversationLanguage": "English",
        "targetLanguage": "Spanish"
      },
      "settingsCustomized": true,
      "workflow": {
        "currentPhase": "understanding"
      }
    },
    "agentId": "test"
  }' \
  "$API_URL/update")

SUCCESS=$(echo "$UPDATE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "❌ Update failed!"
  echo "$UPDATE" | jq '.'
  exit 1
fi

echo "   ✅ Update reported success"
echo ""

# Step 3: Retrieve state to verify it persisted
echo "3️⃣  Retrieving state (verifying it actually saved)..."
UPDATED=$(curl -s -H "X-Session-ID: $SESSION_ID" "$API_URL")

USER_NAME=$(echo "$UPDATED" | jq -r '.styleGuide.userName')
CONV_LANG=$(echo "$UPDATED" | jq -r '.styleGuide.conversationLanguage')
TARGET_LANG=$(echo "$UPDATED" | jq -r '.styleGuide.targetLanguage')
SETTINGS=$(echo "$UPDATED" | jq -r '.settingsCustomized')
PHASE=$(echo "$UPDATED" | jq -r '.workflow.currentPhase')

echo "   userName: $USER_NAME"
echo "   conversationLanguage: $CONV_LANG"
echo "   targetLanguage: $TARGET_LANG"
echo "   settingsCustomized: $SETTINGS"
echo "   currentPhase: $PHASE"
echo ""

# Step 4: Verify values match what we set
echo "4️⃣  Verification:"
echo "   -----------------"

FAILED=0

if [ "$USER_NAME" = "BackendTestUser" ]; then
  echo "   ✅ userName persisted correctly"
else
  echo "   ❌ userName NOT persisted. Expected 'BackendTestUser', got: $USER_NAME"
  FAILED=1
fi

if [ "$CONV_LANG" = "English" ]; then
  echo "   ✅ conversationLanguage persisted correctly"
else
  echo "   ❌ conversationLanguage NOT persisted. Expected 'English', got: $CONV_LANG"
  FAILED=1
fi

if [ "$TARGET_LANG" = "Spanish" ]; then
  echo "   ✅ targetLanguage persisted correctly"
else
  echo "   ❌ targetLanguage NOT persisted. Expected 'Spanish', got: $TARGET_LANG"
  FAILED=1
fi

if [ "$SETTINGS" = "true" ]; then
  echo "   ✅ settingsCustomized persisted correctly"
else
  echo "   ❌ settingsCustomized NOT persisted. Expected 'true', got: $SETTINGS"
  FAILED=1
fi

if [ "$PHASE" = "understanding" ]; then
  echo "   ✅ currentPhase persisted correctly"
else
  echo "   ❌ currentPhase NOT persisted. Expected 'understanding', got: $PHASE"
  FAILED=1
fi

echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 BACKEND STATE PERSISTENCE: WORKING"
  echo ""
  echo "✅ The backend IS saving and retrieving state correctly."
  echo "   If the app still doesn't work, the issue is in the frontend."
else
  echo "❌ BACKEND STATE PERSISTENCE: BROKEN"
  echo ""
  echo "The backend is NOT saving state correctly."
  echo "This must be fixed before testing the frontend."
  exit 1
fi

# Cleanup
echo "Cleaning up test session..."
curl -s -X DELETE -H "X-Session-ID: $SESSION_ID" "$API_URL/session" > /dev/null
echo "✅ Done"
