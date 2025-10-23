#!/bin/bash

# Test script to verify backend API state saving/retrieval
# This tests ONLY the backend, no browser involved

set -e

echo "🧪 Testing Backend API State Persistence"
echo "=========================================="
echo ""

# Use a test session ID
SESSION_ID="test_$(date +%s)"
API_BASE="http://localhost:8888/.netlify/functions"

echo "Test Session ID: $SESSION_ID"
echo ""

# Step 1: Get initial state
echo "1️⃣  Getting initial state..."
INITIAL_STATE=$(curl -s -H "X-Session-ID: $SESSION_ID" "$API_BASE/canvas-state")
echo "Initial state received:"
echo "$INITIAL_STATE" | jq '.styleGuide.userName, .workflow.currentPhase, .settingsCustomized' || echo "$INITIAL_STATE"
echo ""

# Step 2: Update state directly (bypass conversation)
echo "2️⃣  Updating state directly..."
UPDATE_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "updates": {
      "styleGuide": {
        "userName": "TestUser",
        "conversationLanguage": "English"
      },
      "settingsCustomized": true
    },
    "agentId": "test"
  }' \
  "$API_BASE/canvas-state/update")

echo "Update result:"
echo "$UPDATE_RESULT" | jq '.success' || echo "$UPDATE_RESULT"
echo ""

# Step 3: Retrieve state again to verify it saved
echo "3️⃣  Retrieving state to verify persistence..."
UPDATED_STATE=$(curl -s -H "X-Session-ID: $SESSION_ID" "$API_BASE/canvas-state")
echo "Retrieved state:"
echo "$UPDATED_STATE" | jq '.styleGuide.userName, .styleGuide.conversationLanguage, .settingsCustomized' || echo "$UPDATED_STATE"
echo ""

# Step 4: Verify the values match what we set
USER_NAME=$(echo "$UPDATED_STATE" | jq -r '.styleGuide.userName')
CONV_LANG=$(echo "$UPDATED_STATE" | jq -r '.styleGuide.conversationLanguage')
SETTINGS_CUSTOM=$(echo "$UPDATED_STATE" | jq -r '.settingsCustomized')

echo "4️⃣  Verification:"
echo "-------------------"

if [ "$USER_NAME" = "TestUser" ]; then
  echo "✅ userName saved correctly: $USER_NAME"
else
  echo "❌ userName NOT saved. Expected 'TestUser', got: $USER_NAME"
  exit 1
fi

if [ "$CONV_LANG" = "English" ]; then
  echo "✅ conversationLanguage saved correctly: $CONV_LANG"
else
  echo "❌ conversationLanguage NOT saved. Expected 'English', got: $CONV_LANG"
  exit 1
fi

if [ "$SETTINGS_CUSTOM" = "true" ]; then
  echo "✅ settingsCustomized saved correctly: $SETTINGS_CUSTOM"
else
  echo "❌ settingsCustomized NOT saved. Expected 'true', got: $SETTINGS_CUSTOM"
  exit 1
fi

echo ""
echo "5️⃣  Testing conversation endpoint with state agent..."
CONV_RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d '{
    "message": "Spanish",
    "history": [
      {
        "role": "assistant",
        "content": "What language are we translating to?",
        "agent": {"id": "primary"}
      }
    ]
  }' \
  "$API_BASE/conversation")

echo "Conversation response received"
echo "$CONV_RESULT" | jq '.messages[0].content, .canvasState.styleGuide.targetLanguage' 2>/dev/null || echo "Parse error"
echo ""

# Step 6: Check if targetLanguage was saved
FINAL_STATE=$(curl -s -H "X-Session-ID: $SESSION_ID" "$API_BASE/canvas-state")
TARGET_LANG=$(echo "$FINAL_STATE" | jq -r '.styleGuide.targetLanguage')

echo "6️⃣  Final verification:"
echo "-------------------"
if [ "$TARGET_LANG" = "Spanish" ]; then
  echo "✅ targetLanguage saved via conversation: $TARGET_LANG"
else
  echo "❌ targetLanguage NOT saved via conversation. Expected 'Spanish', got: $TARGET_LANG"
  echo ""
  echo "Full final state:"
  echo "$FINAL_STATE" | jq '.styleGuide'
  exit 1
fi

echo ""
echo "🎉 Backend API Tests PASSED"
echo "State is being saved and retrieved correctly"
echo ""

# Cleanup
echo "Cleaning up test session..."
curl -s -X DELETE -H "X-Session-ID: $SESSION_ID" "$API_BASE/canvas-state/session" > /dev/null

echo "✅ Done"
