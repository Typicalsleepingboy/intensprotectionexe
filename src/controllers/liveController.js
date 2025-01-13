const fetchData = require('../utils/showroomdata');
const { uniqueBy } = require('../utils/showroomarray');

const getJKT48Lives = async (req, res) => {
    try {
        const data = await fetchData('https://www.showroom-live.com/api/live/onlives');
        
        const jkt48Lives = uniqueBy(data.onlives.flatMap((genre) =>
            genre.lives.filter((live) => live.room_url_key && live.room_url_key.startsWith('JKT48'))
        ), 'live_id');
        
        if (jkt48Lives.length === 0) {
            return res.status(200).json({ message: "No JKT48 members are live on Showroom" });
        }

        res.json(jkt48Lives);
    } catch (error) {
        console.error('Error fetching live data:', error);
        res.status(500).json({ error: 'Failed to fetch live data' });
    }
};

module.exports = {
    getJKT48Lives
};
