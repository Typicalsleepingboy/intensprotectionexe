const axios = require("axios");
const cheerio = require("cheerio");
const { v4: uuidv4 } = require('uuid');  // Import the uuid package

const startingTheaterId = 2776;

const fetchData = async () => {
  const url = "https://jkt48.com/theater/schedule";
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

    const { date } = parseShowInfo(showInfoFull);

    // Filter only the desired show data that has members
    if (showInfoFull.includes("Show") && !showInfoFull.includes("\n")) {
      scheduleData.push({
        setlist,
        members,
        birthdayMembers,
        graduationIcons,
        date // Include the date for sorting
      });
    }
  });

  // Sort by date
  scheduleData.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Reassign theater IDs starting from the earliest show date and add random IDs
  const updatedScheduleData = scheduleData.map((data, index) => ({
    ...data,
    theaterId: startingTheaterId + index,
    intensId: uuidv4()  // Add a random ID
  }));

  return updatedScheduleData;
};

const parseShowInfo = (showInfoFull) => {
  const regex = /(\w+), (\d{1,2})\.(\d{1,2})\.(\d{4})Show (\d{1,2}:\d{2})/;
  const match = showInfoFull.match(regex);
  let date, day, time;

  if (match) {
    day = match[1];
    date = match[3]; // Only take the day part of the date
    const year = match[4];
    time = match[5];
    // Convert date to YYYY-MM-DD format for sorting
    date = `${year}-${date}-01`;
  } else {
    // Handle case where regex does not match
    date = showInfoFull.replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return {
    showInfo: `${day ? day + ', ' : ''}${date ? date + ' ' : ''}${time || ''}`,
    date
  };
};

module.exports = { fetchData, parseData, parseShowInfo };
