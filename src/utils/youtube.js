const NodeCache = require('node-cache');
const axios = require('axios');
const cron = require('node-cron');


const globalYouTubeCache = new NodeCache({
    stdTTL: 3600, // 1 jam
    checkperiod: 3620 
});

const CACHE_KEY = 'jkt48_youtube_videos';
const CACHE_UPDATE_INTERVAL = '0 */1 * * *'; 

async function fetchYouTubeVideos() {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;

        const channels = [
            'UCadv-UfEyjjwOPcZHc2QvIQ', // JKT48 TV Channel
            'UCaIbbu5Xg3DpHsn_3Zw2m9w'   // JKT48 Channel
        ];

        const allVideos = [];

        for (const channelId of channels) {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    channelId,
                    maxResults: 10,
                    order: 'date',
                    key: apiKey
                }
            });

            const channelVideos = response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                publishedAt: item.snippet.publishedAt,
                thumbnails: item.snippet.thumbnails,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            }));

            allVideos.push(...channelVideos);
        }

        const sortedVideos = allVideos.sort((a, b) =>
            new Date(b.publishedAt) - new Date(a.publishedAt)
        ).slice(0, 3);

        globalYouTubeCache.set(CACHE_KEY, sortedVideos);
        
        console.log('YouTube cache updated successfully');
        return { source: 'fresh', data: sortedVideos };

    } catch (error) {
        console.error('Error updating YouTube cache:', error.message);

        const cachedVideos = globalYouTubeCache.get(CACHE_KEY);
        console.log(JSON.stringify(cachedVideos, null, 2));
        if (cachedVideos) {
            return { source: 'cache', data: cachedVideos };
        }

        return { source: 'error', data: [] };
    }
}


cron.schedule(CACHE_UPDATE_INTERVAL, fetchYouTubeVideos);

function getYouTubeVideos() {
    const cachedVideos = globalYouTubeCache.get(CACHE_KEY);

    console.log('Cache status:', cachedVideos ? 'Hit' : 'Miss');

    if (cachedVideos) {
        return {
            source: 'cache',
            data: cachedVideos,
            cachedAt: new Date().toISOString()
        };
    }

    return fetchYouTubeVideos();
}


module.exports = {
    getYouTubeVideos,
    fetchYouTubeVideos
};