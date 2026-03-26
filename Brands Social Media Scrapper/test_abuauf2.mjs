import axios from 'axios';

async function testAbuauf() {
  try {
    const res = await axios.get('https://abuauf.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    const html = res.data;
    const fbMatches = html.match(/https?:\/\/(www\.)?(facebook\.com|fb\.com)[^"'\s>]+/gi);
    const igMatches = html.match(/https?:\/\/(www\.)?instagram\.com[^"'\s>]+/gi);
    
    console.log('FB Matches directly in HTML:', fbMatches ? [...new Set(fbMatches)] : 'None');
    console.log('IG Matches directly in HTML:', igMatches ? [...new Set(igMatches)] : 'None');

  } catch(e) {
    console.error('Error fetching abuauf.com:', e.message);
  }
}

testAbuauf();
