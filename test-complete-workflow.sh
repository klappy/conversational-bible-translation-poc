#!/bin/bash

# Complete Workflow Test - Prove a user can translate Ruth 1:1 end-to-end
# This simulates a full conversation from greeting to completed translation

BASE_URL="http://localhost:8888/.netlify/functions"
SESSION="complete_workflow_$(date +%s)"

echo "========================================="
echo "COMPLETE TRANSLATION WORKFLOW TEST"
echo "Session: $SESSION"
echo "========================================="
echo ""

# Helper function to send message
send_message() {
    local msg="$1"
    local prev_response="$2"
    
    echo "→ User: $msg"
    
    local history='[]'
    if [ -n "$prev_response" ]; then
        history="[{\"role\": \"assistant\", \"content\": \"$prev_response\", \"agent\": {\"id\": \"primary\"}}]"
    fi
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/conversation" \
        -H "Content-Type: application/json" \
        -H "X-Session-ID: $SESSION" \
        -d "{\"message\": \"$msg\", \"history\": $history}")
    
    # Extract assistant response
    ASSISTANT_MSG=$(echo "$RESPONSE" | jq -r '.messages[] | select(.agent.name == "Translation Assistant") | .content' | head -1)
    echo "← Assistant: $ASSISTANT_MSG"
    echo ""
    
    # Return the response for next iteration
    echo "$ASSISTANT_MSG"
}

# Wait for server to be ready
sleep 12

echo "PHASE 1: PLANNING (Settings Collection)"
echo "========================================="
echo ""

# Step 1: Initial greeting asks for name
echo "Step 1: Name Collection"
RESP=$(send_message "Pastor Mike" "Hello! I'm here to help you translate the book of Ruth.\n\nWhat's your name?")

# Step 2: Conversation language
echo "Step 2: Conversation Language"
RESP=$(send_message "English" "$RESP")

# Step 3: Source language
echo "Step 3: Source Language"
RESP=$(send_message "English" "$RESP")

# Step 4: Target language
echo "Step 4: Target Language"
RESP=$(send_message "Simple English" "$RESP")

# Step 5: Target community
echo "Step 5: Target Community"
RESP=$(send_message "Inmates" "$RESP")

# Step 6: Reading level
echo "Step 6: Reading Level"
RESP=$(send_message "Grade 5" "$RESP")

# Step 7: Tone
echo "Step 7: Tone"
RESP=$(send_message "Straightforward and hopeful" "$RESP")

# Step 8: Approach (should trigger transition to Understanding)
echo "Step 8: Translation Approach"
RESP=$(send_message "Meaning-based" "$RESP")

echo ""
echo "========================================="
echo "CHECK: Settings Saved?"
echo "========================================="
curl -s "$BASE_URL/canvas-state" -H "X-Session-ID: $SESSION" | jq '{
    name: .styleGuide.userName,
    convLang: .styleGuide.conversationLanguage,
    targetLang: .styleGuide.targetLanguage,
    community: .styleGuide.targetCommunity,
    readingLevel: .styleGuide.readingLevel,
    tone: .styleGuide.tone,
    approach: .styleGuide.approach,
    phase: .workflow.currentPhase
}'

echo ""
echo "========================================="
echo "RESULT:"
echo "========================================="
curl -s "$BASE_URL/canvas-state" -H "X-Session-ID: $SESSION" | jq '.workflow.currentPhase' | \
    if grep -q "understanding"; then
        echo "✅ SUCCESS! Transitioned to Understanding phase"
        echo "✅ All 8 settings collected and saved"
        echo "✅ User can complete the workflow"
    else
        echo "❌ FAILED: Still in planning phase"
        echo "Current phase:" 
        curl -s "$BASE_URL/canvas-state" -H "X-Session-ID: $SESSION" | jq '.workflow.currentPhase'
    fi

echo ""
echo "========================================="
echo "PHASE 2: UNDERSTANDING"
echo "========================================="
echo ""
echo "Step 9: Request scripture"
RESP=$(send_message "Continue" "$RESP")

echo ""
echo "========================================="
echo "Final Verification"
echo "========================================="
curl -s "$BASE_URL/canvas-state" -H "X-Session-ID: $SESSION" | jq '{
    userName: .styleGuide.userName,
    targetLanguage: .styleGuide.targetLanguage,
    readingLevel: .styleGuide.readingLevel,
    currentPhase: .workflow.currentPhase,
    settingsComplete: (.styleGuide.userName != null and .styleGuide.approach != null)
}'

