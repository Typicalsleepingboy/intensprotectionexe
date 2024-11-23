const axios = require("axios");
const cheerio = require("cheerio");

const fetchCalendarByMonth = async (year, month) => {
  const url = `https://jkt48.com/calendar/list/y/${year}/m/${month}/d/1?lang=id`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

const parseCalendarData = (html) => {
  const $ = cheerio.load(html);

  const tableBody = $("tbody");
  const rows = tableBody.find("tr");

  const bulan_tahun = $(".entry-schedule__header--center").text().trim();

  const lists = [];
  const size = rows.length;
  let x = 0;

  while (x < size) {
    const list_td = rows.eq(x).find("td");

    const tanggal_mentah = list_td.eq(0).find("h3").text();
    const tanggal_rplc = tanggal_mentah.replace(")", "");
    const tanggal_spl = tanggal_rplc.split("(");

    const tanggal = tanggal_spl[0]?.trim() || "-";
    const hari = tanggal_spl[1]?.trim() || "-";

    const list_event = list_td.eq(1).find(".contents");
    const size_of_event = list_event.length;
    let position_event = 0;

    while (position_event < size_of_event) {
      const event = list_event.eq(position_event);
      const model = {};

      const tanggal_parts = tanggal.split(" ");
      const formattedDate = `${tanggal_parts[0]}/${bulan_tahun.split(" ")[1]}/${bulan_tahun.split(" ")[0]}`;

      model["hari"] = `${hari}`;
      model["tanggal_full"] = formattedDate;

      const badge_img = event.find("span img");
      model["badge_url"] = badge_img.attr("src") || null;

      const event_name_full = event.find("p").text().trim();
      
      const event_time = event_name_full.slice(0, 5).trim();
      let event_name = event_name_full.slice(6).trim();

      if (event_time.match(/^\d{2}:\d{2}$/)) {
        model["event_time"] = event_time;
        model["event_name"] = event_name || "-";
      } else {
        model["event_time"] = "";
        model["event_name"] = event_name_full || "-";
      }

      const url_event_full = event.find("a").attr("href") || "";
      const url_event_full_rplc = url_event_full.replace("?lang=id", "");
      const url_event_full_rplc_2 = url_event_full_rplc.replace("/theater/schedule/id/", "");

      model["event_id"] = url_event_full_rplc_2 || null;
      model["have_event"] = true;

      lists.push(model);

      position_event += 1;
    }

    if (size_of_event === 0) {
      const tanggal_parts = tanggal.split(" ");
      const formattedDate = `${tanggal_parts[0]}/${bulan_tahun.split(" ")[1]}/${bulan_tahun.split(" ")[0]}`;

      const model = {
        hari: `${hari}`,
        tanggal_full: formattedDate,
        badge_url: null,
        event_name: null,
        event_time: null,
        event_id: null,
        have_event: false,
      };
      lists.push(model);
    }

    x += 1;
  }

  return lists;
};


const validateDate = (year, month) => {
  const currentYear = new Date().getFullYear();
  
  if (isNaN(year) || isNaN(month)) {
    throw new Error("Year and month must be numbers");
  }
  
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12");
  }
  
  if (year < 2000 || year > currentYear + 1) {
    throw new Error(`Year must be between 2000 and ${currentYear + 1}`);
  }
  
  return true;
};

const getCalendarByMonth = async (year, month) => {
  try {
    validateDate(year, month);
    
    const paddedMonth = month.toString().padStart(2, '0');
    
    const html = await fetchCalendarByMonth(year, paddedMonth);
    const parsedData = parseCalendarData(html);
    
    return {
      success: true,
      data: parsedData,
      meta: {
        year: year,
        month: paddedMonth,
        total_events: parsedData.filter(item => item.have_event).length,
        total_days: parsedData.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      meta: {
        year: year,
        month: month
      }
    };
  }
};

module.exports = {
  getCalendarByMonth,
  fetchCalendarByMonth,
  parseCalendarData,
};
