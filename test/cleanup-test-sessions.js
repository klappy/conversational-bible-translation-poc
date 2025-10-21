/**
 * Cleanup Utility for Orphaned Test Sessions
 * 
 * Removes old test sessions to prevent database bloat
 */

import fetch from 'node-fetch';

/**
 * Get list of all sessions from the server
 */
async function listAllSessions(baseUrl = 'http://localhost:9999') {
  try {
    const response = await fetch(
      `${baseUrl}/.netlify/functions/canvas-state/sessions`,
      {
        method: 'GET',
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to list sessions: ${response.status}`);
    }
    
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Error listing sessions:', error.message);
    return [];
  }
}

/**
 * Delete a specific session
 */
async function deleteSession(baseUrl, sessionKey) {
  try {
    const sessionId = sessionKey.replace('session_', '');
    const response = await fetch(
      `${baseUrl}/.netlify/functions/canvas-state/session`,
      {
        method: 'DELETE',
        headers: {
          'X-Session-ID': sessionId,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting session ${sessionKey}:`, error.message);
    return false;
  }
}

/**
 * Clean up test sessions based on patterns
 */
async function cleanupTestSessions(baseUrl = 'http://localhost:9999', options = {}) {
  const {
    dryRun = false,
    patterns = ['workshop_', 'test_', 'session_workshop_', 'session_test_'],
    maxAge = 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  } = options;
  
  console.log('🧹 Starting Test Session Cleanup');
  console.log('================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'DELETE'}`);
  console.log(`Patterns: ${patterns.join(', ')}`);
  console.log(`Max Age: ${maxAge / (60 * 60 * 1000)} hours\n`);
  
  // Get all sessions
  const sessions = await listAllSessions(baseUrl);
  console.log(`Found ${sessions.length} total sessions\n`);
  
  // Filter test sessions
  const testSessions = sessions.filter(session => {
    const key = session.key || session;
    return patterns.some(pattern => key.includes(pattern));
  });
  
  console.log(`Found ${testSessions.length} test sessions:`);
  
  // Group by pattern for reporting
  const byPattern = {};
  patterns.forEach(pattern => {
    byPattern[pattern] = testSessions.filter(session => {
      const key = session.key || session;
      return key.includes(pattern);
    }).length;
  });
  
  Object.entries(byPattern).forEach(([pattern, count]) => {
    if (count > 0) {
      console.log(`  ${pattern}: ${count} sessions`);
    }
  });
  
  if (testSessions.length === 0) {
    console.log('\n✅ No test sessions to clean up');
    return { cleaned: 0, found: 0 };
  }
  
  // Delete or report sessions
  console.log(`\n${dryRun ? 'Would delete' : 'Deleting'} sessions:`);
  
  let deleted = 0;
  for (const session of testSessions) {
    const key = session.key || session;
    
    // Check age if timestamp is available
    if (session.timestamp) {
      const age = Date.now() - new Date(session.timestamp).getTime();
      if (age < maxAge) {
        console.log(`  ⏭️  Skipping ${key} (too recent)`);
        continue;
      }
    }
    
    if (dryRun) {
      console.log(`  🔍 Would delete: ${key}`);
      deleted++;
    } else {
      const success = await deleteSession(baseUrl, key);
      if (success) {
        console.log(`  ✅ Deleted: ${key}`);
        deleted++;
      } else {
        console.log(`  ❌ Failed: ${key}`);
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total sessions: ${sessions.length}`);
  console.log(`  Test sessions: ${testSessions.length}`);
  console.log(`  ${dryRun ? 'Would delete' : 'Deleted'}: ${deleted}`);
  console.log(`  Remaining: ${sessions.length - deleted}`);
  
  return {
    cleaned: deleted,
    found: testSessions.length,
    total: sessions.length,
  };
}

/**
 * Clean up sessions for a specific test run
 */
export async function cleanupAfterTestRun(baseUrl = 'http://localhost:9999', sessionPrefix) {
  if (!sessionPrefix) {
    console.log('No session prefix provided, skipping cleanup');
    return;
  }
  
  console.log(`\n🧹 Cleaning up sessions with prefix: ${sessionPrefix}`);
  
  const sessions = await listAllSessions(baseUrl);
  const matchingSessions = sessions.filter(session => {
    const key = session.key || session;
    return key.includes(sessionPrefix);
  });
  
  if (matchingSessions.length === 0) {
    console.log('No matching sessions found');
    return;
  }
  
  console.log(`Found ${matchingSessions.length} sessions to clean`);
  
  for (const session of matchingSessions) {
    const key = session.key || session;
    const success = await deleteSession(baseUrl, key);
    if (success) {
      console.log(`  ✅ Cleaned: ${key}`);
    }
  }
}

/**
 * Reset the default session
 */
export async function resetDefaultSession(baseUrl = 'http://localhost:9999') {
  try {
    const response = await fetch(
      `${baseUrl}/.netlify/functions/canvas-state?reset=true`,
      {
        method: 'GET',
        headers: {
          'X-Session-ID': 'default',
        },
      }
    );
    
    if (response.ok) {
      console.log('✅ Default session reset');
      return true;
    }
    
    console.error('❌ Failed to reset default session');
    return false;
  } catch (error) {
    console.error('Error resetting default session:', error.message);
    return false;
  }
}

// Command line interface
if (process.argv[1] === import.meta.url) {
  const mode = process.argv[2] || 'dry';
  const baseUrl = process.argv[3] || 'http://localhost:9999';
  
  switch (mode) {
    case 'clean':
      cleanupTestSessions(baseUrl, { dryRun: false }).then(result => {
        process.exit(result.cleaned > 0 ? 0 : 1);
      });
      break;
      
    case 'dry':
      cleanupTestSessions(baseUrl, { dryRun: true }).then(result => {
        process.exit(0);
      });
      break;
      
    case 'reset':
      resetDefaultSession(baseUrl).then(success => {
        process.exit(success ? 0 : 1);
      });
      break;
      
    case 'all':
      // Clean all test sessions and reset default
      cleanupTestSessions(baseUrl, { dryRun: false }).then(async (result) => {
        await resetDefaultSession(baseUrl);
        process.exit(0);
      });
      break;
      
    default:
      console.log('Usage: node cleanup-test-sessions.js [clean|dry|reset|all] [baseUrl]');
      console.log('  clean - Delete all test sessions');
      console.log('  dry   - Show what would be deleted (default)');
      console.log('  reset - Reset the default session');
      console.log('  all   - Clean test sessions and reset default');
      process.exit(1);
  }
}

export default cleanupTestSessions;
