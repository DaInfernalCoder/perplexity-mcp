#!/usr/bin/env node

// Simple test script to verify missing details detection logic
// This tests the detection without needing API calls

// Simulated detection logic (same as in index.ts)
function detectMissingDetails(query) {
  const queryLower = query.toLowerCase();
  const missingDetails = [];

  // Check for error messages, stack traces, or error-related terms
  const hasErrors = /error|exception|failure|crash|traceback|stack trace|failed/i.test(query) ||
                   /Error:|Exception:|at\s+\w+\.\w+/i.test(query);
  
  // Check for code snippets (common patterns)
  const hasCode = /```|function\s+\w+|const\s+\w+|let\s+\w+|var\s+\w+|import\s+|require\(|\.\w+\(/i.test(query) ||
                  /[a-z]\w*\([^)]*\)/i.test(query) || // function calls
                  /\w+\.\w+\s*=/i.test(query); // property assignments

  // Check for version numbers
  const hasVersions = /\d+\.\d+(\.\d+)?/i.test(query) || /version\s*\d+|v\d+/i.test(query);

  // Check for specific API/function names (camelCase, PascalCase, or names with dots)
  const hasSpecificNames = /[A-Z][a-z]+[A-Z]|\.\w+\(|::\w+|api\.|sdk\./i.test(query);

  // Check for logs or console output
  const hasLogs = /log|console|output|print|trace|debug/i.test(query) && 
                  (query.length > 100 || /\n/.test(query));

  // Check for environment/platform details
  const hasEnvironment = /node|python|java|javascript|typescript|react|vue|angular|linux|windows|macos|ubuntu|docker/i.test(queryLower);

  // Determine missing details for technical queries
  if (hasErrors && !hasCode && !hasLogs) {
    missingDetails.push("code snippets showing the error context");
    missingDetails.push("relevant logs or stack traces");
  }
  
  if (!hasVersions && (hasCode || hasEnvironment)) {
    missingDetails.push("version numbers (framework, library, runtime versions)");
  }

  if (!hasSpecificNames && (hasCode || hasErrors)) {
    missingDetails.push("exact function names, API endpoints, or library names");
  }

  if (hasErrors && !hasEnvironment) {
    missingDetails.push("environment details (OS, runtime version, framework)");
  }

  // If query seems technical/problem-solving but lacks specifics
  const seemsTechnical = hasErrors || hasCode || /problem|issue|bug|fix|solution|how to|why|debug/i.test(queryLower);
  
  if (seemsTechnical && missingDetails.length === 0) {
    // Still check if it could be more specific
    if (query.length < 50 && !hasCode && !hasErrors) {
      missingDetails.push("specific error messages or code snippets");
      missingDetails.push("exact terminology and context");
    }
  }

  return missingDetails;
}

// Test cases
const testCases = [
  {
    name: "Vague query (should detect missing details)",
    query: "How do I fix this error?",
    expectedMissing: true
  },
  {
    name: "Query with error but no code/logs",
    query: "I'm getting an error in my code",
    expectedMissing: true
  },
  {
    name: "Query with code snippet (should pass)",
    query: "How do I fix this error?\n```javascript\nfunction test() { console.log('error'); }\n```",
    expectedMissing: false
  },
  {
    name: "Query with error and code",
    query: "Error: Cannot read property 'x' of undefined\n\n```js\nconst obj = null;\nobj.x = 5;\n```",
    expectedMissing: false
  },
  {
    name: "Query with environment but no version",
    query: "My React app is broken on Node.js",
    expectedMissing: true
  },
  {
    name: "Query with versions",
    query: "My React 18.2.0 app is broken on Node.js 20.5.0",
    expectedMissing: false
  },
  {
    name: "Simple factual query (should pass)",
    query: "What is the capital of France?",
    expectedMissing: false
  }
];

console.log("🧪 Testing Missing Details Detection Logic\n");
console.log("=" .repeat(60));

testCases.forEach((testCase, index) => {
  const missing = detectMissingDetails(testCase.query);
  const hasMissing = missing.length > 0;
  const passed = hasMissing === testCase.expectedMissing;
  
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   Query: "${testCase.query.substring(0, 60)}${testCase.query.length > 60 ? '...' : ''}"`);
  console.log(`   Expected: ${testCase.expectedMissing ? 'Should detect missing details' : 'Should pass (no missing)'}`);
  console.log(`   Result: ${hasMissing ? '✅ Missing details detected' : '✅ No missing details'}`);
  
  if (hasMissing) {
    console.log(`   Missing items:`);
    missing.forEach((item, i) => console.log(`     ${i + 1}. ${item}`));
  }
  
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
});

console.log("\n" + "=".repeat(60));
console.log("\n✅ Detection logic test complete!");
console.log("\nTo test with actual API calls, use:");
console.log("  1. Set PERPLEXITY_API_KEY environment variable");
console.log("  2. Run: npm run inspector");
console.log("  3. Use the inspector UI to test the tools");

