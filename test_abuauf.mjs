import axios from 'axios';
import * as cheerio from 'cheerio';

async function testAbuauf() {
  try {
    const res = await axios.get('https://abuauf.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    console.log('Status code:', res.status);
    console.log('Response length:', res.data.length);

    const $ = cheerio.load(res.data);
    
    const aTags = $('a').length;
    console.log('Total <a> tags:', aTags);

    const fbLinks = $('a').filter((_, el) => {
      const href = $(el).attr('href') || '';
      return href.toLowerCase().includes('facebook.com');
    }).length;

    console.log('Facebook links found:', fbLinks);

    // Let's print out all hrefs from footer if possible to see what's going on
    console.log('\n--- First 20 <a> hrefs ---');
    $('a').slice(0, 20).each((_, el) => {
        console.log($(el).attr('href'));
    });

  } catch(e) {
    console.error('Error fetching abuauf.com:', e.message);
    if(e.response) console.error('Status:', e.response.status);
  }
}

testAbuauf();
