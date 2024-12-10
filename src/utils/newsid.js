const axios = require("axios");
const cheerio = require("cheerio");

const fetchNewsDetail = async (id) => {
  const url = `https://takagi.sousou-no-frieren.workers.dev/news/detail/id/${id}?lang=id`;

  try {
    const response = await axios.get(url);
    return parseNewsDetail(response.data);
  } catch (error) {
    console.error("Error fetching news detail:", error);
    return null;
  }
};

const parseNewsDetail = (html) => {
  const $ = cheerio.load(html);
  const data = {};

  const title = $(".entry-news__detail h3").text();
  const date = $(".metadata2.mb-2").text();

  let content = $(".MsoNormal")
    .map((i, el) => {
      $(el).find('span[style*="mso-tab-count"]').remove();
      return $(el).text().trim();
    })
    .get()
    .join("\n");

  if (!content.trim()) {
    content = $("div").filter((i, el) => {
      return $(el).text().trim() !== '' && 
             !$(el).attr('class') && 
             !$(el).hasClass('sidebar__language') && 
             !$(el).hasClass('MsoNormal');
    }).map((i, el) => $(el).text().trim()).get().join("\n");
  }

  content = content.replace(/INDONESIAN|日本語/g, '').trim();

  const imageUrls = $(".MsoNormal img")
    .map((i, el) => $(el).attr("src"))
    .get();

  data["judul"] = title;
  data["tanggal"] = date;
  data["konten"] = content;
  data["gambar"] = imageUrls.length > 0 ? imageUrls : null;

  return data;
};

module.exports = {
  fetchNewsDetail,
};
