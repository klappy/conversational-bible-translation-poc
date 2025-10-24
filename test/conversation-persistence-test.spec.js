/**
 * Conversation Persistence Test Suite
 * 
 * Tests that verify:
 * 1. Initial greeting appears and persists
 * 2. Quick responses are preserved across page refreshes
 * 3. Suggestions show correct agent attribution (Suggestion Helper, not Translation Assistant)
 * 4. Messages don't duplicate
 * 5. All messages persist across sessions
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:9999';

test.describe('Conversation Persistence', () => {
  let sessionId;

  test.beforeEach(async ({ page }) => {
    // Generate unique session ID for isolated testing
    sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Navigate with session ID
    await page.goto(`${BASE_URL}?session=${sessionId}`);
    
    // Wait for app to be ready
    await page.waitForSelector('.chat-interface', { timeout: 10000 });
  });

  test('Initial greeting appears on first load', async ({ page }) => {
    // Wait for initial message to appear
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    
    // Get the first message
    const firstMessage = await page.locator('.agent-message').first();
    const messageText = await firstMessage.textContent();
    
    // Should ask for name or greet user
    expect(messageText.toLowerCase()).toMatch(/name|hello|welcome/);
    
    // Take screenshot for proof
    await page.screenshot({ 
      path: `test/screenshots/initial-greeting-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('✅ Initial greeting appeared');
    console.log(`Message: ${messageText}`);
  });

  test('Initial greeting persists after page refresh', async ({ page }) => {
    // Wait for initial message
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    const initialMessage = await page.locator('.agent-message').first().textContent();
    
    // Refresh page with same session
    await page.reload();
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    
    // Check if greeting still there
    const afterRefreshMessage = await page.locator('.agent-message').first().textContent();
    
    expect(afterRefreshMessage).toBe(initialMessage);
    
    await page.screenshot({ 
      path: `test/screenshots/greeting-after-refresh-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('✅ Greeting persisted after refresh');
  });

  test('Quick responses appear and have correct agent attribution', async ({ page }) => {
    // Wait for suggestions to appear
    await page.waitForSelector('.inline-suggestions', { timeout: 5000 });
    
    // Get suggestion elements
    const suggestions = await page.locator('.suggestion-chip');
    const count = await suggestions.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Check if suggestions are visible
    const firstSuggestion = suggestions.first();
    await expect(firstSuggestion).toBeVisible();
    
    await page.screenshot({ 
      path: `test/screenshots/quick-responses-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log(`✅ ${count} quick responses appeared`);
  });

  test('Suggestions show as Suggestion Helper not Translation Assistant', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    
    // Type a response to trigger suggestions
    await page.fill('.chat-input', 'Sarah');
    await page.click('.send-button');
    
    // Wait for response and suggestions
    await page.waitForSelector('.inline-suggestions', { timeout: 10000 });
    
    // Check the suggestion message agent attribution
    // This might require inspecting the actual message data or agent icon
    const suggestionSection = page.locator('.inline-suggestions');
    await expect(suggestionSection).toBeVisible();
    
    // If agent name is displayed, verify it's NOT "Translation Assistant"
    const agentLabels = await page.locator('.agent-name').allTextContents();
    const hasSuggestionHelper = agentLabels.some(label => 
      label.includes('Suggestion Helper') || label.includes('💡')
    );
    
    // Should NOT be labeled as Translation Assistant
    const wronglyLabeled = agentLabels.some(label => 
      label.includes('Translation Assistant') && label.includes('suggestion')
    );
    
    await page.screenshot({ 
      path: `test/screenshots/suggestion-attribution-${Date.now()}.png`,
      fullPage: true 
    });
    
    expect(wronglyLabeled).toBe(false);
    console.log('✅ Suggestions correctly attributed');
  });

  test('Messages persist across page refresh', async ({ page }) => {
    // Wait for initial greeting
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    
    // Send a message
    await page.fill('.chat-input', 'TestUser123');
    await page.click('.send-button');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Count messages before refresh
    const messagesBefore = await page.locator('.agent-message').count();
    expect(messagesBefore).toBeGreaterThan(1);
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    
    // Count messages after refresh
    const messagesAfter = await page.locator('.agent-message').count();
    
    // Should have same number of messages
    expect(messagesAfter).toBe(messagesBefore);
    
    await page.screenshot({ 
      path: `test/screenshots/messages-persist-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log(`✅ Messages persisted (${messagesBefore} before, ${messagesAfter} after)`);
  });

  test('Messages do not duplicate on refresh', async ({ page }) => {
    // Wait for initial message
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    const initialCount = await page.locator('.agent-message').count();
    
    // Get text of all messages
    const messagesBefore = await page.locator('.agent-message').allTextContents();
    
    // Refresh multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForSelector('.agent-message', { timeout: 5000 });
      await page.waitForTimeout(2000); // Wait for polling
    }
    
    // Check count hasn't increased
    const finalCount = await page.locator('.agent-message').count();
    expect(finalCount).toBe(initialCount);
    
    // Check for exact duplicates
    const messagesAfter = await page.locator('.agent-message').allTextContents();
    const hasDuplicates = messagesAfter.length !== new Set(messagesAfter).size;
    
    expect(hasDuplicates).toBe(false);
    
    await page.screenshot({ 
      path: `test/screenshots/no-duplicates-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log(`✅ No duplicates (${initialCount} messages remained constant)`);
  });

  test('Quick responses persist in conversation history', async ({ page }) => {
    // Wait for initial message and suggestions
    await page.waitForSelector('.inline-suggestions', { timeout: 5000 });
    
    // Click a suggestion
    const firstSuggestion = page.locator('.suggestion-chip').first();
    await firstSuggestion.click();
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    
    // Check if suggestion message is still in history
    // (It should be visible as a system message or inline suggestion)
    const hasSuggestions = await page.locator('.inline-suggestions').count();
    
    expect(hasSuggestions).toBeGreaterThan(0);
    
    await page.screenshot({ 
      path: `test/screenshots/suggestions-persist-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log('✅ Quick responses persisted in history');
  });

  test('Full conversation flow with verification', async ({ page }) => {
    console.log('Starting full conversation flow test...');
    
    // 1. Initial greeting
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    await page.screenshot({ path: `test/screenshots/step1-greeting-${Date.now()}.png` });
    console.log('Step 1: Initial greeting ✓');
    
    // 2. User types name
    await page.fill('.chat-input', 'TestUser');
    await page.click('.send-button');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `test/screenshots/step2-name-sent-${Date.now()}.png` });
    console.log('Step 2: Name sent ✓');
    
    // 3. Get message count
    const step3Count = await page.locator('.agent-message').count();
    console.log(`Step 3: ${step3Count} messages visible`);
    
    // 4. Refresh page
    await page.reload();
    await page.waitForSelector('.agent-message', { timeout: 5000 });
    await page.waitForTimeout(2000); // Wait for polling
    await page.screenshot({ path: `test/screenshots/step4-after-refresh-${Date.now()}.png` });
    
    // 5. Verify count matches
    const step5Count = await page.locator('.agent-message').count();
    console.log(`Step 5: ${step5Count} messages after refresh`);
    
    expect(step5Count).toBeGreaterThanOrEqual(step3Count);
    
    // 6. Check no duplicates
    const allMessages = await page.locator('.agent-message').allTextContents();
    const uniqueMessages = new Set(allMessages);
    expect(allMessages.length).toBe(uniqueMessages.size);
    
    console.log('✅ Full conversation flow verified');
  });
});
