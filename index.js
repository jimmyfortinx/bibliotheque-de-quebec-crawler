const axios = require("axios");
const cheerio = require("cheerio");

const ROOT = "https://catalogue.bibliothequedequebec.qc.ca";
const ENT_REGEX = /\/(ent:[^\/]+)\//;

async function main() {
  const processedResults = [];
  let currentUrl = `${ROOT}/client/fr_CA/general/search/results?ln=fr_CA&q=%22PlayStation%205%22`;

  while (currentUrl !== undefined) {
    const result = await axios.get(currentUrl);

    const $ = cheerio.load(result.data);

    const results = $(".results_bio");

    for (let i = 0; i < results.length; i++) {
      const titleLink = $(results[i]).find(".INITIAL_TITLE_SRCH a");
      const title = titleLink
        .text()
        .replace(
          /\w*\[ressource électronique \(PlayStation 4 et (la )?PlayStation 5\)\].?/,
          ""
        )
        .trim();
      const href = titleLink.attr("href");
      const ent = ENT_REGEX.exec(href)[1];

      processedResults.push({
        title,
        href,
        ent,
      });
    }

    const nextButton = $(".bottomToolbar_right #NextPageBottom");
    const href = nextButton.attr("href");

    if (href) {
      currentUrl = `${ROOT}${href}`;
    } else {
      currentUrl = undefined;
    }
  }

  for (const result of processedResults) {
    const url = `${ROOT}/client/fr_CA/general/search/detailnonmodal.detail.detailavailabilityaccordions:lookuptitleinfo/${result.ent}/ILS/0/true/true`;
    const data = (
      await axios.post(url, undefined, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
    ).data;

    result.availabilities = data.childRecords.map((record) => ({
      library: record.LIBRARY,
      barcode: record.barcode,
    }));
  }

  for (const { title, availabilities } of processedResults) {
    console.log(title, availabilities.length);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
