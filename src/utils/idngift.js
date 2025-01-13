const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeGiftData(username, slug) {
    const url = `https://www.idn.app/${username}/live/${slug}`;

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

        // Find the active tab content
        const tabContent = $('.tab-content-item[data-show="right-in"]');
        if (!tabContent.length) {
            throw new Error('Tab content not found');
        }

        // Get last update time
        const lastUpdate = tabContent.find('.list-gifter .last-update').text().replace('Update terakhir ', '');

        // Get current time period
        const activeTimePeriod = tabContent.find('.tab-time .tab-time-item[data-active="true"]').text();

        // Process top three
        tabContent.find('.top-three .top-three-item').each((index, element) => {
            const $element = $(element);
            const rankDiv = $element.find('.picture');
            const rank = rankDiv.attr('data-rank');
            
            if (rank) {
                const profilePic = rankDiv.find('img.profile').attr('src') || null;
                const name = $element.find('.bio p.name').text().trim() || '';
                const gold = $element.find('.bio p.gold').text().trim() || '0 Gold';
                
                // Special elements for top ranks
                const crown = rankDiv.find('img.rank-crown').attr('src') || null;
                const rankBadge = rankDiv.find('img.rank-badge').attr('src') || null;
                const rankBorder = rankDiv.find('img.rank-border').attr('src') || null;

                if (name || gold !== '0 Gold') {
                    results.push({
                        rank,
                        name,
                        gold,
                        profile_picture: profilePic,
                        is_top_three: true,
                        crown_image: crown,
                        rank_badge: rankBadge,
                        rank_border: rankBorder
                    });
                }
            }
        });

        // Process top rest
        tabContent.find('.top-rest div[data-rank]').each((index, element) => {
            const $element = $(element);
            const rank = $element.attr('data-rank');
            const profilePic = $element.find('img.picture').attr('src') || null;
            const name = $element.find('.profile .name').text().trim() || '';
            const gold = $element.find('.profile .gold').text().trim() || '0 Gold';
            
            const tierIcon = $element.find('img.tier-icon').attr('src') || null;
            const tierName = $element.find('span.tier-name').text().trim() || null;
            const rankCup = $element.find('p.rank img').attr('src') || null;

            if (name || gold !== '0 Gold') {
                results.push({
                    rank,
                    name,
                    gold,
                    profile_picture: profilePic,
                    is_top_three: false,
                    tier: {
                        name: tierName,
                        icon: tierIcon
                    },
                    rank_cup: rankCup
                });
            }
        });

        // Sort results by rank
        results.sort((a, b) => Number(a.rank) - Number(b.rank));

        // Return structured data
        return {
            time_period: activeTimePeriod,
            last_update: lastUpdate,
            total_gifters: results.length,
            data: results
        };

    } catch (error) {
        console.error('Error during scraping:', error);
        
        if (error.response) {
            const status = error.response.status;
            switch (status) {
                case 404:
                    throw new Error('Live stream not found');
                case 403:
                    throw new Error('Access denied');
                default:
                    throw new Error(`HTTP error! status: ${status}`);
            }
        } else if (error.request) {
            throw new Error('No response received from the server');
        } else {
            throw new Error(`Scraping failed: ${error.message}`);
        }
    }
}

module.exports = { scrapeGiftData };