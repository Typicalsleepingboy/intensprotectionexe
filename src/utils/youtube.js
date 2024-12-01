const axios = require('axios');
require('dotenv').config();

const cache = {
    data: new Map(),

    set: function (key, value, durationInSeconds) {
        const expiryTime = Date.now() + durationInSeconds * 1000;
        this.data.set(key, {
            value,
            expiryTime,
        });
    },

    get: function (key) {
        const data = this.data.get(key);
        if (!data) return null;

        if (Date.now() > data.expiryTime) {
            this.data.delete(key);
            return null;
        }

        return data.value;
    },

    clear: function () {
        this.data.clear();
    },
};

let ongoingFetch = null;
const CACHE_DURATION = 600;
const REQUEST_TIMEOUT = 30000;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

const jkt48TVChannelId = 'UCadv-UfEyjjwOPcZHc2QvIQ';
const jkt48ChannelId = 'UCaIbbu5Xg3DpHsn_3Zw2m9w';


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const youtubeAxios = axios.create({
    timeout: 10000,
});

youtubeAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const message = error?.response?.data?.error?.message || error.message;

        console.error(`YouTube API Error: Status ${status}, Message: ${message}`);

        error.customData = {
            status,
            message,
            timestamp: new Date().toISOString(),
        };

        return Promise.reject(error);
    }
);

async function makeRequestWithRetry(requestFn, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            const isLastAttempt = i === retries - 1;
            const status = error?.response?.status;

            if (status === 401 || status === 403) {
                throw new Error(
                    `Authentication error: Please check your YouTube API key (Status: ${status})`
                );
            }

            if (status === 404) {
                throw new Error('Resource not found');
            }

            if (status === 429) {
                throw new Error('YouTube API quota exceeded. Please try again later.');
            }

            if (isLastAttempt) {
                throw error;
            }

            await delay(RETRY_DELAY * (i + 1));
            console.log(`Retrying request, attempt ${i + 2}/${retries}`);
        }
    }
}

async function fetchYouTubeVideos() {
    try {
        const cachedData = cache.get('youtube_videos');
        if (cachedData) {
            console.log('Returning cached data');
            return {
                success: true,
                data: cachedData,
                source: 'cache',
            };
        }

        if (ongoingFetch) {
            console.log('Waiting for ongoing fetch to complete');
            try {
                const result = await Promise.race([
                    ongoingFetch,
                    new Promise((_, reject) =>
                        setTimeout(
                            () =>
                                reject(
                                    new Error('Waiting for ongoing fetch timed out')
                                ),
                            REQUEST_TIMEOUT
                        )
                    ),
                ]);
                return {
                    success: true,
                    data: result,
                    source: 'batch',
                };
            } catch (error) {
                console.error('Error waiting for ongoing fetch:', error);
                ongoingFetch = null;
                throw error;
            }
        }

        ongoingFetch = fetchFreshData();

        try {
            const freshData = await ongoingFetch;
            cache.set('youtube_videos', freshData, CACHE_DURATION);
            return {
                success: true,
                data: freshData,
                source: 'fresh',
            };
        } finally {
            ongoingFetch = null;
        }
    } catch (error) {
        const cachedData = cache.get('youtube_videos');
        if (cachedData) {
            console.log('Returning stale cached data due to error');
            return {
                success: true,
                data: cachedData,
                source: 'stale_cache',
                error: error.message,
            };
        }
        throw error;
    }
}

async function fetchFreshData() {
    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error(
                'YouTube API key is not configured. Please set YOUTUBE_API_KEY in your environment variables.'
            );
        }

        const results = await Promise.allSettled([
            fetchRecentVideos(jkt48TVChannelId, apiKey),
            fetchRecentVideos(jkt48ChannelId, apiKey),
        ]);

        const allVideos = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                allVideos.push(...result.value);
            } else {
                console.error('Failed to fetch videos:', result.reason);
            }
        });

        if (allVideos.length === 0) {
            throw new Error('No videos could be fetched from any channel');
        }

        allVideos.sort(
            (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
        );

        const limitedVideos = allVideos.slice(0, 6);

        if (limitedVideos.length < 3) {
            const cachedVideos = cache.get('youtube_videos') || [];
            limitedVideos.push(...cachedVideos.slice(0, 6 - limitedVideos.length));
        }

        cache.set('youtube_videos', limitedVideos, CACHE_DURATION);
        return limitedVideos;
    } catch (error) {
        console.error('Error fetching fresh data:', error);
        throw error;
    }
}


async function fetchRecentVideos(channelId, apiKey) {
    const response = await makeRequestWithRetry(() =>
        youtubeAxios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                channelId,
                maxResults: 25,
                order: 'date',
                key: apiKey,
            },
        })
    );

    return response.data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
    }));
}


module.exports = {
    fetchYouTubeVideos,
    cache,
};
