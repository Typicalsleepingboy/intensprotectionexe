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
        const showInfoFull = $(element).find("td:nth-child(1)").text().trim();
        const setlist = $(element).find("td:nth-child(2)").text().trim();
        const members = $(element)
            .find("td:nth-child(3) a")
            .map((i, el) => $(el).text().trim())
            .get();

        const birthdayMembers = [];
        const graduationIcons = [];

        // Check for birthday members
        $(element).find("td:nth-child(3)").children().each((i, el) => {
            if ($(el).is('br') && $(el).next().is('img') && $(el).next().attr('src').includes('cat5.png')) {
                $(el).next().nextAll('a').each((index, member) => {
                    birthdayMembers.push($(member).text().trim());
                });
            }
            if ($(el).is('img') && $(el).attr('src').includes('cat7.png')) {
                graduationIcons.push($(el).next('a').text().trim());
            }
        });

        const { showInfo, date, time } = parseShowInfo(showInfoFull);

        if (showInfoFull.includes("Show") && !showInfoFull.includes("\n")) {
            scheduleData.push({
                _ids: uuidv4(),
                showInfo,
                setlist,
                members,
                birthdayMembers,
                graduationIcons,
                date,
                time
            });
        }
    });

    const currentTime = moment.tz("Asia/Jakarta");
    const filteredScheduleData = scheduleData.filter(item => {
        const showDateTime = moment.tz(`${item.date} ${item.time}`, "YYYY-MM-DD HH:mm", "Asia/Jakarta");
        const cutoffTime = showDateTime.add(4, 'hours');

        return currentTime.isBefore(cutoffTime);
    });

    filteredScheduleData.sort((a, b) => moment(`${a.date} ${a.time}`, "YYYY-MM-DD HH:mm").diff(moment(`${b.date} ${b.time}`, "YYYY-MM-DD HH:mm")));

    return filteredScheduleData;
};

const parseShowInfo = (showInfoFull) => {
    const regex = /(\w+), (\d{1,2}\.\d{1,2}\.\d{4})Show (\d{1,2}:\d{2})/;
    const match = showInfoFull.match(regex);
    let date, day, time;

    if (match) {
        day = match[1];
        date = match[2];
        time = match[3];
        date = date.split('.').reverse().join('-');
    } else {
        date = showInfoFull.replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    return {
        showInfo: `${day ? day + ', ' : ''}${date ? date + ' ' : ''}${time || ''}`,
        date,
        time
    };
};

module.exports = { fetchData, parseData, parseShowInfo };