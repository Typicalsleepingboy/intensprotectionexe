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

  // Debugging log to check HTML content
  console.log("Loaded HTML snippet:", $.html().slice(0, 500)); // Display first 500 chars for inspection

  const title = $(".entry-news__detail h3").text().trim();
  const date = $(".metadata2.mb-2").text().trim();

  const content = $(".MsoNormal")
    .map((i, el) => $(el).text().trim())
    .get()
    .filter((text) => text !== ""); // Remove empty strings
  const imageUrls = $(".MsoNormal img")
    .map((i, el) => $(el).attr("src"))
    .get()
    .filter((src) => src); // Remove null values

  // Assign parsed data to the result object
  data["judul"] = title || "Judul tidak ditemukan";
  data["tanggal"] = date || "Tanggal tidak ditemukan";
  data["konten"] = content.length > 0 ? content.join("\n") : "Konten tidak ditemukan";
  data["gambar"] = imageUrls.length > 0 ? imageUrls : null;

  return data;
};

module.exports = {
  fetchNewsDetailData,
  parseNewsDetailData,
};
