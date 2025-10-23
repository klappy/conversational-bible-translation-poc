#!/bin/bash

# Test canvas-state endpoint WITHOUT jq dependency

set -e

echo "🧪 Testing Canvas State API (Backend Only)"
echo "============================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:8888/.netlify/functions/canvas-state > /dev/null 2>&1; then
  echo "❌ Dev server not running!"
  echo ""
  echo "Start it with: npm run dev:netlify"
  exit 1
fi

SESSION_ID="test_$(date +%s)"
API_URL="http://localhost:8888/.netlify/functions/canvas-state"

echo "📝 Test Session ID: $SESSION_ID"
echo ""

# Step 1: Get initial state
echo "1️⃣  Getting initial state..."
curl -s -H "X-Session-ID: $SESSION_ID" "$API_URL" > /tmp/initial_state.json
echo "Response saved to /tmp/initial_state.json"
echo ""

# Step 2: Update state
echo "2️⃣  Updating state..."
cat > /tmp/update_payload.json <<'EOF'
{
  "updates": {
    "styleGuide": {
      "userName": "TestUser",
      "conversationLanguage": "English",
      "targetLanguage": "Spanish"
    },
    "settingsCustomized": true,
    "workflow": {
      "currentPhase": "understanding"
    }
  },
  "agentId": "test"
}
EOF

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION_ID" \
  -d @/tmp/update_payload.json \
  "$API_URL/update" > /tmp/update_response.json

echo "Update response:"
cat /tmp/update_response.json
echo ""
echo ""

# Step 3: Retrieve state again
echo "3️⃣  Retrieving state to verify persistence..."
curl -s -H "X-Session-ID: $SESSION_ID" "$API_URL" > /tmp/updated_state.json

echo "Updated state:"
cat /tmp/updated_state.json
echo ""
echo ""

# Step 4: Check if values are in the response
echo "4️⃣  Verification (checking if values exist in response):"
echo "   -----------------"

if grep -q '"userName":"TestUser"' /tmp/updated_state.json; then
  echo "   ✅ userName found in response"
else
  echo "   ❌ userName NOT found in response"
  echo "      Full response:"
  cat /tmp/updated_state.json
  exit 1
fi

if grep -q '"conversationLanguage":"English"' /tmp/updated_state.json; then
  echo "   ✅ conversationLanguage found in response"
else
  echo "   ❌ conversationLanguage NOT found"
  exit 1
fi

if grep -q '"targetLanguage":"Spanish"' /tmp/updated_state.json; then
  echo "   ✅ targetLanguage found in response"
else
  echo "   ❌ targetLanguage NOT found"
  exit 1
fi

if grep -q '"settingsCustomized":true' /tmp/updated_state.json; then
  echo "   ✅ settingsCustomized found in response"
else
  echo "   ❌ settingsCustomized NOT found"
  exit 1
fi

if grep -q '"currentPhase":"understanding"' /tmp/updated_state.json; then
  echo "   ✅ currentPhase found in response"
else
  echo "   ❌ currentPhase NOT found"
  exit 1
fi

echo ""
echo "🎉 BACKEND STATE PERSISTENCE: WORKING"
echo ""
echo "All values were saved and retrieved correctly."
echo "The backend is functioning as expected."
echo ""

# Cleanup
echo "Cleaning up..."
curl -s -X DELETE -H "X-Session-ID: $SESSION_ID" "$API_URL/session" > /dev/null
rm -f /tmp/*_state.json /tmp/update_*.json
echo "✅ Done"
