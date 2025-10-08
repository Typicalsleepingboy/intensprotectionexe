const axios = require("axios");
const cheerio = require("cheerio");
const { v4: uuidv4 } = require('uuid');
const moment = require("moment-timezone");

const fetchData = async () => {
    const url = "https://takagi.sousou-no-frieren.workers.dev/theater/schedule";
    const result = await axios.get(url);
    return result.data;
};

const parseData = (html) => {
    const $ = cheerio.load(html);
    const table = $(".table");
    const scheduleData = [];
    
    table.find("tbody tr").each((index, element) => {
        const rowspan = $(element).find("td:first-child").attr("rowspan");
        
        // Hanya proses baris pertama dari setiap grup (yang punya rowspan)
        if (rowspan) {
            const showInfoCell = $(element).find("td:nth-child(1)");
            const showInfoHTML = showInfoCell.html();
            const setlistCell = $(element).find("td:nth-child(2)");
            const setlistHTML = setlistCell.html();
            
            // Parse setlist (nama + icon team)
            const setlistText = setlistCell.text().trim();
            const teamIcon = setlistCell.find("img").attr("src");
            
            // Parse show info dengan mempertimbangkan <br> dan <font>
            const { showInfo, date, time } = parseShowInfo(showInfoHTML);
            
            if (date && time) {
                scheduleData.push({
                    _ids: uuidv4(),
                    showInfo,
                    setlist: setlistText,
                    teamIcon: teamIcon || null,
                    date,
                    time
                });
            }
        }
    });
    
    const currentTime = moment.tz("Asia/Jakarta");
    const filteredScheduleData = scheduleData.filter(item => {
        const showDateTime = moment.tz(`${item.date} ${item.time}`, "YYYY-MM-DD HH:mm", "Asia/Jakarta");
        return showDateTime.clone().add(4, 'hours').isAfter(currentTime);
    });
    
    filteredScheduleData.sort((a, b) => 
        moment(`${a.date} ${a.time}`, "YYYY-MM-DD HH:mm")
        .diff(moment(`${b.date} ${b.time}`, "YYYY-MM-DD HH:mm"))
    );
    
    return filteredScheduleData;
};

const parseShowInfo = (showInfoHTML) => {
    // Remove HTML tags dan ambil text
    const text = showInfoHTML
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<font[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Regex untuk match: "Minggu, 12.10.2025 Show 19:00"
    const regex = /(\w+),\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*Show\s*(\d{1,2}:\d{2})/;
    const match = text.match(regex);
    
    if (match) {
        const day = match[1];
        const dateStr = match[2];
        const time = match[3];
        const date = dateStr.split('.').reverse().join('-'); // 2025-10-12
        
        return {
            showInfo: `${day}, ${date} ${time}`,
            date,
            time
        };
    }
    
    return {
        showInfo: text,
        date: null,
        time: null
    };
};

module.exports = { fetchData, parseData, parseShowInfo };
