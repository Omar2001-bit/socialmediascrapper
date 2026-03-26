import { scrapeCompetitor } from './src/agents/scraper.js';

const originalFetch = global.fetch;
let passedAll = true;

async function runTests() {
  console.log('Running Scraper Engine Tests...\n');

  // Test 1: Successful parse
  let logs = [];
  global.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('/api/scrape')) {
      return { ok: true, json: async () => ({}) };
    }
    return {
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: 'Here are the links:\n```json\n{"Facebook": "https://facebook.com/acme", "Twitter": "https://x.com/acme"}\n```' }
        ]
      })
    };
  };
  let res = await scrapeCompetitor({ name: 'Acme Corp', url: 'acme.com' }, 1, 5, l => logs.push(l));
  let passed = res.status === 'ok' && res.socials.Facebook === 'https://facebook.com/acme' && res.url === 'https://acme.com';
  console.log(`Test 1 (Success): ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed) { passedAll = false; console.dir(res); }

  // Test 2: Unreachable
  logs = [];
  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('/api/scrape')) return { ok: true, json: async () => ({}) };
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '```json\n{"error": "unreachable"}\n```' }]
      })
    };
  };
  res = await scrapeCompetitor({ name: 'Blocked', url: 'https://blocked.com' }, 2, 5, l => logs.push(l));
  passed = res.status === 'unreachable' && Object.keys(res.socials).length === 0;
  console.log(`Test 2 (Unreachable): ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed) { passedAll = false; console.dir(res); }

  // Test 3: Parse Error
  logs = [];
  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('/api/scrape')) return { ok: true, json: async () => ({}) };
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'I could not find anything.' }] // No JSON
      })
    };
  };
  res = await scrapeCompetitor({ name: 'Bad JSON', url: 'bad.com' }, 3, 5, l => logs.push(l));
  passed = res.status === 'parse_error';
  console.log(`Test 3 (Parse Error): ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed) { passedAll = false; console.dir(res); }

  // Test 4: Network Error
  logs = [];
  global.fetch = async () => { throw new Error("Failed to fetch"); };
  res = await scrapeCompetitor({ name: 'Network Fail', url: 'offline.com' }, 4, 5, l => logs.push(l));
  passed = res.status === 'error';
  console.log(`Test 4 (Network Error): ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed) { passedAll = false; console.dir(res); }
  
  // Test 5: Empty Socials
  logs = [];
  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('/api/scrape')) return { ok: true, json: async () => ({}) };
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '```json\n{}\n```' }]
      })
    };
  };
  res = await scrapeCompetitor({ name: 'No Links', url: 'nolinks.com' }, 5, 5, l => logs.push(l));
  passed = res.status === 'no_links' && Object.keys(res.socials).length === 0;
  console.log(`Test 5 (No Links): ${passed ? 'PASS ✅' : 'FAIL ❌'}`);
  if (!passed) { passedAll = false; console.dir(res); }

  global.fetch = originalFetch; // restore
  
  console.log(`\nOverall Result: ${passedAll ? 'SUCCESS! 🎉' : 'FAILURE 💥'}`);
  if (!passedAll) process.exit(1);
}

runTests().catch(e => {
  console.error('Test Suite Crashed:', e);
  process.exit(1);
});
