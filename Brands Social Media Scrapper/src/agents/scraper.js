/**
 * @file src/agents/scraper.js
 * @description Scraper Engine - Uses the local backend to scrape websites for social media links.
 */

import { SCRAPE_DELAY_MS } from '../constants.js';

/**
 * @typedef {Object} Competitor
 * @property {string} name - Brand name
 * @property {string} url - Website URL
 */

/**
 * @typedef {Object} Result
 * @property {string} name - Brand name
 * @property {string} url - Website URL
 * @property {Object.<string, string>} socials - Map of PlatformName -> URL
 * @property {'ok' | 'no_links' | 'error'} status - Status string
 */

/**
 * Delays execution for a given number of milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Normalizes a URL to ensure it starts with http:// or https://
 * @param {string} url - The URL to normalize
 * @returns {string} - The normalized URL
 */
const normalizeUrl = (url) => {
  if (!url) return '';
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

/**
 * Processes a single competitor by scraping their website for social media links.
 * 
 * @param {Competitor} competitor - The competitor to scrape
 * @param {number} index - For logging: 1-based index of this competitor
 * @param {number} total - For logging: Total number of competitors
 * @param {function(string): void} [addLog] - Optional callback for appending log messages
 * @returns {Promise<Result>} - Structured processing result
 */
export async function scrapeCompetitor(competitor, index = 1, total = 1, addLog = () => {}) {
  const baseResult = {
    name: competitor.name || 'Unknown',
    url: competitor.url || '',
    socials: {},
    status: 'idle'
  };

  try {
    const normUrl = normalizeUrl(competitor.url);
    baseResult.url = normUrl || competitor.url;
    
    let brandName = competitor.name;
    if (!brandName) {
      try {
        brandName = new URL(normUrl).hostname.replace(/^www\./, '');
      } catch (e) {
        brandName = 'Unknown Brand';
      }
    }
    
    addLog(`[${index}/${total}] Scraping ${brandName} at ${baseResult.url}...`);

    if (!normUrl) {
      baseResult.status = 'error';
      addLog(`  -> Invalid: URL is empty.`);
      return baseResult;
    }

    // Direct scrape via local backend
    try {
      const scrapeResponse = await fetch(`/api/scrape?url=${encodeURIComponent(normUrl)}`);
      if (scrapeResponse.ok) {
        const directSocials = await scrapeResponse.json();
        if (Object.keys(directSocials).length > 0) {
          baseResult.socials = directSocials;
          baseResult.status = 'ok';
          addLog(`  -> Success. Found: ${Object.keys(directSocials).join(', ')}`);
          return baseResult;
        }
        baseResult.status = 'no_links';
        addLog(`  -> No social links found on page.`);
        return baseResult;
      } else {
        const errData = await scrapeResponse.json().catch(() => ({}));
        baseResult.status = 'error';
        addLog(`  -> Scrape failed (HTTP ${scrapeResponse.status}): ${errData.error || 'Unknown error'}`);
        return baseResult;
      }
    } catch (err) {
      baseResult.status = 'error';
      addLog(`  -> Network error: ${err.message}`);
      return baseResult;
    }

  } catch (error) {
    baseResult.status = 'error';
    addLog(`  -> Critical Scraper Error: ${error.message}`);
    return baseResult;
  }
}

/**
 * Runner function to sequentially scrape a list of competitors
 * 
 * @param {Competitor[]} competitors - List of competitors to process
 * @param {function(Result): void} [addResult] - Callback triggered for each completed result
 * @param {function(string): void} [addLog] - Callback for log messages
 * @param {AbortSignal} [signal] - Optional standard abort signal to immediately stop processing
 */
export async function scrapeAll(competitors, addResult = () => {}, addLog = () => {}, signal = null) {
  let completedCount = 0;
  for (let i = 0; i < competitors.length; i++) {
    if (signal?.aborted) {
      addLog('Scraping aborted by user.');
      break;
    }
    
    const result = await scrapeCompetitor(competitors[i], i + 1, competitors.length, addLog);
    addResult(result);
    completedCount++;

    if (i < competitors.length - 1 && !signal?.aborted) {
      await delay(SCRAPE_DELAY_MS);
    }
  }
  return completedCount;
}
