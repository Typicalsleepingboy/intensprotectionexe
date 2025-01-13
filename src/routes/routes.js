// routes.js
const express = require("express");
const router = express.Router();
const { fetchData, parseData } = require("../utils/theater");
const { fetchNewsData, parseNewsData } = require("../utils/news");
const { fetchNewsDataMerch, parseNewsDataMerch } = require("../utils/merch");
const { scrapeSchedule } = require("../utils/schedule");
const { fetchBirthdayData, parseBirthdayData } = require("../utils/birthday");
const { fetchMemberDataId, parseMemberDataId, fetchMemberSocialMediaId, parseMemberSocialMediaId } = require("../utils/memberid");
const { fetchNewsSearchData, parseNewsSearchData } = require("../utils/news-search");
const { fetchMemberData, parseMemberData } = require("../utils/member");
const { fetchBannerData, parseBannerData } = require("../utils/banner");
const { fetchNewsDetailData } = require("../utils/newsid");
const { fetchScheduleSectionData, parseScheduleSectionData } = require("../utils/schedule-section");
const { fetchHtmlFromJKT48, parseVideoData } = require("../utils/video");
const { sendLogToDiscord } = require("../other/discordLogger");
const { fetchYouTubeVideos } = require("../utils/youtube");
const { scrapeGiftData } = require('../utils/idngift');
const { filterIDNLivesByUsernames } = require("../utils/idnlivesUtils");
const { getJKT48Lives } = require('../controllers/liveController');
const { jkt48Usernames } = require("../roomjkt48/member");

router.get("/idnlive/jkt48", async (req, res) => {
  try {
    const filteredData = await filterIDNLivesByUsernames(jkt48Usernames);

    if (filteredData.length === 0) {
      res.json({
        message: "Tidak ada member yang sedang live",
        memberLive: 0,
        data: [],
      });
    } else {
      res.json({
        status: "success",
        message: "Berhasil mendapatkan member yang sedang live",
        memberLive: filteredData.length,
        data: filteredData,
      });
    }
  } catch (error) {
    console.error("Error fetching IDN lives:", error);
    res.status(500).json({
      message: "Terjadi kesalahan saat mengambil data IDN live",
      error: error.message,
    });
  }
});

router.get("/schedule", async (req, res) => {
  try {
    const htmlData = await fetchData();
    const scheduleData = parseData(htmlData);
    res.json(scheduleData);
  } catch (error) {
    console.error("Error fetching or parsing schedule data:", error);
    const errorMessage = `Scraping schedule failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get('/showroom/jekatepatlapan',async (req, res) => {
  try {
    await getJKT48Lives(req, res);

    await sendLogToDiscord(
      'Successfully fetched live data.',
      'Info',
      { method: req.method, url: req.originalUrl }
    );
  } catch (error) {
    console.error('Error fetching live data:', error.message);
    await sendLogToDiscord(
      `Error fetching live data: ${error.message}`,
      'Error',
      { method: req.method, url: req.originalUrl }
    );

    res.status(500).send({ error: 'Failed to fetch live data.' });
  }
});


router.get('/youtube_jkt48', async (req, res) => {
  try {
    const result = await fetchYouTubeVideos();
    
    if (result.data.length > 0) {
      res.json({
        success: true,
        source: result.source,
        data: result.data,
        fetchedAt: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No YouTube videos found',
        source: result.source
      });
    }
  } catch (error) {
    console.error('YouTube Fetch Error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while fetching YouTube videos',
      source: 'error'
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
  });
});


router.get("/news", async (req, res) => {
  try {
    const htmlData = await fetchNewsData();
    const newsData = parseNewsData(htmlData);
    res.json(newsData);
  } catch (error) {
    console.error("Error fetching or parsing news data:", error);
    const errorMessage = `Scraping news failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/events_jkt48", async (req, res) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year) || today.getFullYear();
    const month = parseInt(req.query.month) || today.getMonth() + 1;

    if (isNaN(year) || isNaN(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year or month parameter',
        message: 'Year and month must be valid integers'
      });
    }

    const events = await scrapeSchedule(year, month); 

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No events found',
        message: `No events found for ${year}-${month}`
      });
    }

    res.status(200).json({
      success: true,
      data: events,
      meta: {
        year,
        month,
        total_events: events.length,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching or parsing calendar data:", error);
    
    const errorMessage = `Scraping JKT48 calendar failed. Error: ${error.message}`;

    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});


router.get("/gift-ranking/:username/:slug", async (req, res) => {
  try {
      const { username, slug } = req.params;

      // Validasi input
      if (!username || !slug) {
          return res.status(400).json({
              success: false,
              error: 'Invalid parameters',
              message: 'Username and slug are required'
          });
      }

      // Scraping data
      const scrapedData = await scrapeGiftData(username, slug);

      // Cek apakah data ditemukan
      if (!scrapedData.data || scrapedData.data.length === 0) {
          return res.status(404).json({
              success: false,
              error: 'No data found',
              message: `No gift ranking data found for ${username}/${slug}`
          });
      }

      // Response sukses
      return res.status(200).json({
          success: true,
          data: scrapedData.data,
          meta: {
              username,
              slug,
              total_gifters: scrapedData.total_gifters,
              time_period: scrapedData.time_period,
              last_update: scrapedData.last_update,
              timestamp: new Date().toISOString()
          }
      });

  } catch (error) {
      // Log error
      console.error("Error fetching gift ranking data:", error);
      
      // Error message untuk logging
      const errorMessage = `Gift ranking data fetch failed for ${username}/${slug}. Error: ${error.message}`;
      
      // Jika menggunakan Discord logging
      // await sendLogToDiscord(errorMessage, "Error");

      // Custom error responses berdasarkan error type
      if (error.message.includes('Live stream not found')) {
          return res.status(404).json({
              success: false,
              error: 'Live Stream Not Found',
              message: 'The requested live stream could not be found'
          });
      }

      if (error.message.includes('Access denied')) {
          return res.status(403).json({
              success: false,
              error: 'Access Denied',
              message: 'Cannot access the live stream data'
          });
      }

      // Default error response
      return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
      });
  }
});


router.get("/events_jkt48/available-months", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = [];
  
    for (let month = 1; month <= 12; month++) {
      const result = await getCalendarByMonth(year, month);
      if (result.success && result.data.some(event => event.have_event)) {
        months.push({
          month,
          totalEvents: result.meta.total_events
        });
      }
    }

    res.status(200).json({
      success: true,
      data: months,
      meta: {
        year,
        totalMonths: months.length,
        totalEvents: months.reduce((sum, month) => sum + month.totalEvents, 0)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching available months:", error);
    const errorMessage = `Fetching available months failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ 
      success: false, 
      error: "Internal Server Error",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
router.get("/birthdays", async (req, res) => {
  try {
    const htmlData = await fetchBirthdayData();
    const birthdayData = parseBirthdayData(htmlData);
    res.json(birthdayData);
  } catch (error) {
    console.error("Error fetching or parsing birthday data:", error);
    const errorMessage = `Scraping birthdays failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/schedule/section", async (req, res) => {
  try {
    const htmlData = await fetchScheduleSectionData();
    const teaterData = parseScheduleSectionData(htmlData);
    res.json(teaterData);
  } catch (error) {
    console.error("Error fetching or parsing schedule section data:", error);
    const errorMessage = `Scraping schedule section failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/video", async (req, res) => {
  try {
    const htmlData = await fetchHtmlFromJKT48();
    const videoData = parseVideoData(htmlData);
    res.json(videoData);
  } catch (error) {
    console.error("Error fetching or parsing video data:", error);
    const errorMessage = `Scraping video data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/member/:id", async (req, res) => {
  const memberId = req.params.id;
  try {
    const memberHtmlData = await fetchMemberDataId(memberId);
    const memberData = parseMemberDataId(memberHtmlData);

    const socialMediaHtmlData = await fetchMemberSocialMediaId(memberId);
    const socialMediaData = parseMemberSocialMediaId(socialMediaHtmlData);

    const combinedData = { ...memberData, socialMedia: socialMediaData };

    res.json(combinedData);
  } catch (error) {
    console.error("Error fetching or parsing member data:", error);
    const errorMessage = `Scraping member data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/news/:page", async (req, res) => {
  const page = req.params.page || 1;

  try {
    const html = await fetchNewsSearchData(page);
    const newsData = parseNewsSearchData(html);
    res.status(200).json({ success: true, data: newsData });
  } catch (error) {
    console.error("Error fetching or parsing news data:", error);
    const errorMessage = `Scraping news data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

router.get("/member", async (req, res) => {
  try {
    const html = await fetchMemberData();
    const members = parseMemberData(html);
    res.json({ members });
  } catch (error) {
    console.error("Error fetching or parsing member data:", error);
    const errorMessage = `Scraping member data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/banners", async (req, res) => {
  try {
    const html = await fetchBannerData("https://jkt48.com");
    const banners = parseBannerData(html);
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching or parsing banner data:", error);
    const errorMessage = `Scraping banners data failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

router.get("/theater", async (req, res) => {
  try {
    const htmlData = await fetchData();
    const scheduleData = parseData(htmlData);
    res.json(scheduleData);
  } catch (error) {
    console.error("Error fetching or parsing theater data:", error);
    const errorMessage = `Scraping theater failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/news/detail/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const newsDetailData = await fetchNewsDetailData(id);

    if (!newsDetailData) {
      throw new Error("News detail data is empty or could not be parsed.");
    }

    res.json(newsDetailData);
  } catch (error) {
    console.error("Error fetching or parsing news detail data:", error);
    const errorMessage = `Scraping news detail failed. ID: ${id}, Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/merch", async (req, res) => {
  try {
    const htmlData = await fetchNewsDataMerch();
    const merchData = parseNewsDataMerch(htmlData);
    res.json(merchData);
  } catch (error) {
    console.error("Error fetching or parsing news data:", error);
    const errorMessage = `Scraping news failed. Error: ${error.message}`;
    sendLogToDiscord(errorMessage, "Error");

    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;