const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSchedule(year, month) {
    const url = `https://takagi.sousou-no-frieren.workers.dev/calendar/list/y/${year}/m/${month}/d/1?lang=id`;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const events = [];

    $('table.table tbody tr').each((_, element) => {
        const dayElement = $(element).find('td:first-child h3').html();
        let dayName = null;
        let dateNumber = '';

        if (dayElement) {
            const parts = dayElement.split('<br>'); 
            dateNumber = parts[0]?.trim(); 
            const rawDayName = parts[1]?.trim(); 
            dayName = rawDayName?.replace(/[()]/g, '') || null;
        }

        const monthName = monthNames[Number(month) - 1]; 
        const dateFull = `${dateNumber}/${year}/${monthName}`; 

        const eventDetails = $(element).find('td:last-child .contents');

        if (eventDetails.length) {
            eventDetails.each((_, eventElement) => {
                const badgeUrl = $(eventElement).find('span.badge img').attr('src') || null;
                const eventLink = $(eventElement).find('p a');
                const eventNameAndTime = eventLink.text().trim();
                const eventTimeMatch = eventNameAndTime.match(/^\d{2}:\d{2}/); 
                const eventTime = eventTimeMatch ? eventTimeMatch[0] : null;
                const eventName = eventTime ? eventNameAndTime.replace(eventTime, '').trim() : eventNameAndTime;
                const eventId = eventLink.attr('href')?.split('/').pop()?.replace('?lang=id', '') || '';

                events.push({
                    hari: dayName,
                    tanggal_full: dateFull,
                    badge_url: badgeUrl,
                    event_time: eventTime,
                    event_name: eventName,
                    event_id: eventId,
                    have_event: true,
                });
            });
        } else {
            events.push({
                hari: dayName,
                tanggal_full: dateFull,
                badge_url: null,
                event_time: null,
                event_name: null,
                event_id: null,
                have_event: false,
            });
        }
    });

    return events;
}

module.exports = { scrapeSchedule };