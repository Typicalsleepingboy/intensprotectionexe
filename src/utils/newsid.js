const axios = require("axios");
const cheerio = require("cheerio");

const fetchNewsDetailData = async (id) => {
  const url = `https://takagi.sousou-no-frieren.workers.dev/news/detail/id/${id}?lang=id`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

const parseNewsDetailData = (html) => {
  const $ = cheerio.load(html);
  const data = {};

  const title = $(".entry-news__detail h3").text();
  const date = $(".metadata2.mb-2").text();
  const content = $(".entry-news__detail").find("p").map((i, el) => $(el).text().trim()).get();
  const imageUrl = $(".entry-news__detail img").attr("src");

  data["judul"] = title;
  data["tanggal"] = date;
  data["konten"] = content.join("\n");
  data["gambar"] = imageUrl || null;

  return data;
};

module.exports = {
  fetchNewsDetailData,
  parseNewsDetailData,
};
