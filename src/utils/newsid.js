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

  const title = $(".entry-news__detail h3").text().trim();
  const date = $(".metadata2.mb-2").text().trim();

  const content = $(".MsoNormal")
    .map((i, el) => $(el).text().trim())
    .get()
    .filter((text) => text !== "");
  const imageUrls = $(".MsoNormal img")
    .map((i, el) => $(el).attr("src"))
    .get()
    .filter((src) => src); 

 data["judul"] = title;
  data["tanggal"] = date;
  data["konten"] = content.join("\n");
  data["gambar"] = imageUrls.length > 0 ? imageUrls : null;  

  return data;
};

module.exports = {
  fetchNewsDetailData,
  parseNewsDetailData,
};
