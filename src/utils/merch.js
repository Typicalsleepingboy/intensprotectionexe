const axios = require("axios");
const cheerio = require("cheerio");

const fetchNewsDataMerch = async () => {
    const url = "https://takagi.sousou-no-frieren.workers.dev";

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw new Error(`Error fetching data: ${error.message}`);
    }
};

const parseNewsDataMerch = (html) => {
    const $ = cheerio.load(html);
    const newsItems = [];

    $(".card-goods .row .col-6").each((_, element) => {
        const titleElement = $(element).find(".card-goods__title h3");
        const title = titleElement.text().trim();
        const link = titleElement.parent().attr("href");
        const imageUrl = $(element).find("a img").attr("src");

        newsItems.push({
            title,
            link: `https://jkt48.com${link}`,
            imageUrl
        });
    });

    return newsItems;
};

module.exports = { fetchNewsDataMerch, parseNewsDataMerch };
