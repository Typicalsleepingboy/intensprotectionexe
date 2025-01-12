const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeGiftData(username, slug) {
    const url = `https://idn.app/${username}/live/${slug}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            }
        });

        const $ = cheerio.load(response.data);
        const results = [];
        $('div[data-rank]').each((index, element) => {
            if ($(element).closest('.top-three').length > 0) return;

            const rank = $(element).attr('data-rank');
            const name = $(element).find('div.profile > div.name-wrapper > p.name').text().trim() || 'Unknown';
            const gold = $(element).find('div.profile > p.gold').text().trim() || '0 Gold';

            results.push({ rank, name, gold });
            if (results.length >= 10) return false;
        });
        return results.slice(0, 10);

    } catch (error) {
        if (error.response) {
            throw new Error(`HTTP error! status: ${error.response.status}`);
        } else if (error.request) {
            throw new Error('No response received from the server');
        } else {
            throw new Error(`Error occurred: ${error.message}`);
        }
    }
}

module.exports = { scrapeGiftData };