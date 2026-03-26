import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from root
app.use(express.static(__dirname));

/**
 * Scraping Endpoint
 * Fetches the URL and extracts social media links from the HTML content.
 */
app.get('/api/scrape', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing' });
  }

  process.stdout.write(`Scraping: ${url}... `);

  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    const $ = cheerio.load(response.data);
    const socials = {};

    const platforms = [
      { name: 'Facebook', patterns: [/facebook\.com/i, /fb\.com/i] },
      { name: 'Instagram', patterns: [/instagram\.com/i] },
      { name: 'Twitter', patterns: [/twitter\.com/i, /x\.com/i] },
      { name: 'LinkedIn', patterns: [/linkedin\.com/i] },
      { name: 'TikTok', patterns: [/tiktok\.com/i] },
      { name: 'YouTube', patterns: [/youtube\.com/i] },
      { name: 'Pinterest', patterns: [/pinterest\.com/i] },
      { name: 'Snapchat', patterns: [/snapchat\.com/i] },
      { name: 'Threads', patterns: [/threads\.net/i] }
    ];

    // Detect Easy Orders Platform
    const isEasyOrders = url.includes('myeasyorders.com') || 
                       response.data.includes('easy-orders.net') || 
                       response.data.includes('Powered By Easyorders');

    if (isEasyOrders) {
      console.log(`Detected Easy Orders platform for ${url}. Fetching from API...`);
      try {
        const eoApiResponse = await axios.get('https://api.easy-orders.net/api/v1/plugins/social-links/public', {
          headers: {
            'Referer': url,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 5000
        });

        if (eoApiResponse.data && typeof eoApiResponse.data === 'object') {
          const data = eoApiResponse.data;
          if (data.facebook) socials['Facebook'] = data.facebook;
          if (data.instagram) socials['Instagram'] = data.instagram;
          if (data.tiktok) socials['TikTok'] = data.tiktok;
          if (data.youtube) socials['YouTube'] = data.youtube;
          if (data.twitter) socials['Twitter'] = data.twitter;
        }
      } catch (eoErr) {
        console.log(`Easy Orders API fetch failed: ${eoErr.message}`);
      }
    }

    // Fallback/General: Search all <a> tags
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      for (const platform of platforms) {
        if (!socials[platform.name] && platform.patterns.some(p => p.test(href))) {
          try {
            const absoluteUrl = new URL(href, url).href;
            socials[platform.name] = absoluteUrl;
          } catch (e) {
            socials[platform.name] = href;
          }
        }
      }
    });

    // Also use Regex on raw HTML for sites that hide links in JS objects or non-anchor tags
    const html = response.data;
    const regexMap = {
      'Facebook': /https?:\/\/(www\.)?(facebook\.com|fb\.com)[^"'\s>\\]+/gi,
      'Instagram': /https?:\/\/(www\.)?instagram\.com[^"'\s>\\]+/gi,
      'Twitter': /https?:\/\/(www\.)?(twitter\.com|x\.com)[^"'\s>\\]+/gi,
      'LinkedIn': /https?:\/\/(www\.)?linkedin\.com[^"'\s>\\]+/gi,
      'TikTok': /https?:\/\/(www\.)?tiktok\.com[^"'\s>\\]+/gi,
      'YouTube': /https?:\/\/(www\.)?youtube\.com[^"'\s>\\]+/gi,
      'Pinterest': /https?:\/\/(www\.)?pinterest\.com[^"'\s>\\]+/gi,
      'Snapchat': /https?:\/\/(www\.)?snapchat\.com[^"'\s>\\]+/gi,
      'Threads': /https?:\/\/(www\.)?threads\.net[^"'\s>\\]+/gi
    };

    const extractFromText = (text) => {
      for (const [platformName, regex] of Object.entries(regexMap)) {
        if (!socials[platformName]) {
          regex.lastIndex = 0;
          const matches = text.match(regex);
          if (matches && matches.length > 0) {
            let cleanUrl = matches[0].replace(/[\\]+$/, '').split(/[#'?]/)[0];
            socials[platformName] = cleanUrl;
          }
        }
      }
    };

    extractFromText(html);

    // SPA FALLBACK: If this looks like a React/Next.js or Vue/Nuxt app shell with no links found,
    // fetch JS bundle chunks and scan them — social URLs are hardcoded as string literals in bundles.
    const isSPAShell = (
      html.includes('id="__next"') || html.includes("id='__next'") ||   // Next.js
      html.includes('id="__nuxt"') || html.includes("id='__nuxt'") ||   // Nuxt / Vue
      html.includes('id="app"') && (html.includes('/_nuxt/') || html.includes('/static/js/')) || // generic Vue/CRA
      html.includes('window.__NUXT__') ||
      html.includes('window.__NEXT_DATA__')
    );

    if (isSPAShell && Object.keys(socials).length === 0) {
      console.log(`  -> SPA detected. Scanning JS bundles...`);
      try {
        const origin = new URL(url).origin;

        // Collect all <script src="..."> that point to the site's own JS chunks
        const scriptUrls = [];
        $('script[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (!src) return;
          try {
            const abs = new URL(src, url).href;
            // Only scan same-origin JS files that look like app chunks (not analytics, ads, etc.)
            if (abs.startsWith(origin) && /\.(js)(\?|$)/.test(abs)) {
              scriptUrls.push(abs);
            }
          } catch (_) {}
        });

        // Fetch up to 10 chunks in parallel (cap to avoid huge bundles like vendor.js being too slow)
        // Prioritise smaller/page-specific chunks by fetching ALL but with strict size & timeout limits
        const MAX_CHUNKS = 10;
        const CHUNK_TIMEOUT = 15000;
        const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk

        const chunkFetches = scriptUrls.slice(0, MAX_CHUNKS).map(async (chunkUrl) => {
          try {
            const chunkRes = await axios.get(chunkUrl, {
              timeout: CHUNK_TIMEOUT,
              responseType: 'text',
              maxContentLength: MAX_CHUNK_SIZE,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            return typeof chunkRes.data === 'string' ? chunkRes.data : '';
          } catch (_) {
            return '';
          }
        });

        const chunkTexts = await Promise.all(chunkFetches);
        for (const text of chunkTexts) {
          if (text) extractFromText(text);
          if (Object.keys(socials).length > 0) break; // Stop once we found something
        }

        if (Object.keys(socials).length > 0) {
          console.log(`  -> Found links in JS bundles.`);
        } else {
          console.log(`  -> No links found in JS bundles either.`);
        }
      } catch (spaErr) {
        console.log(`  -> SPA bundle scan error: ${spaErr.message}`);
      }
    }

    console.log(`Success! Found ${Object.keys(socials).length} links.`);
    res.json(socials);

  } catch (error) {
    console.log(`Failed. Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`Competitor Social Scraper is running!`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
