/**
 * Apply responsive layout changes to Lux Technical LP
 * Producer: 2-col desktop → 1-col mobile (photo above text)
 * Hero: form in right column desktop, stacked mobile
 */

import { config as dotenvConfig } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { load } from "cheerio";

// Load environment variables
dotenvConfig({ path: ".env.production.local" });
dotenvConfig({ path: ".env.local" });
dotenvConfig();

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL || "";
console.log("Connection string loaded:", connectionString ? "✓" : "✗");
if (!connectionString) {
  console.error("ERROR: No database connection string found");
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString,
});
const prisma = new PrismaClient({ adapter });

const LP_ID = "cmqawyq0q000204l81dr7gdzo";

async function main() {
  // Fetch the LP
  const lp = await prisma.landingPage.findUnique({
    where: { id: LP_ID },
    select: { currentHtml: true },
  });

  if (!lp) {
    console.error("LP not found");
    process.exit(1);
  }

  console.log("✓ Fetched LP, parsing HTML...");
  const $ = load(lp.currentHtml);

  // Add responsive CSS at the end of head or in a style tag
  const styleTag = `<style>
/* Producer section: 2-col desktop, 1-col mobile with image above text */
.lux-producer-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  align-items: center;
}

.lux-producer-photo {
  width: 220px;
  height: 220px;
  object-fit: cover;
  border-radius: 50%;
  margin: 0 auto;
}

/* Hero: copy left + form right on desktop, stacked mobile */
.lux-hero-layout {
  display: grid;
  grid-template-columns: 1fr 460px;
  gap: 28px;
  align-items: start;
}

.lux-hero-form-wrap {
  width: 100%;
}

/* Mobile: single column for both sections */
@media (max-width: 900px) {
  .lux-producer-layout,
  .lux-hero-layout {
    grid-template-columns: 1fr;
  }

  .lux-producer-photo {
    width: 180px;
    height: 180px;
    margin-bottom: 8px;
  }

  .lux-hero-form-wrap {
    margin-top: 10px;
  }
}
</style>`;

  // Find and wrap producer section (Fraser Norton)
  let producerUpdated = false;
  $("section, div[class*='producer'], div[class*='team']").each((i, elem) => {
    const text = $(elem).text();
    if (text.includes("Fraser Norton") && !producerUpdated) {
      console.log("✓ Found producer section");

      // Find the layout container and wrap it
      const container = $(elem).find("[style*='grid'], [style*='flex'], [class*='grid']").first();
      if (container.length === 0) {
        // If no container found, wrap direct children
        const children = $(elem).find("> *");
        if (children.length >= 2) {
          const wrapper = $(`<div class="lux-producer-layout"></div>`);
          const photo = children.filter("img, [class*='photo'], [class*='image']").first();
          const text = children.not(photo);

          if (photo.length) {
            photo.addClass("lux-producer-photo");
            wrapper.append(photo.clone());
            wrapper.append(text.clone());
            children.first().parent().html(wrapper);
            producerUpdated = true;
            console.log("✓ Wrapped producer section with responsive grid");
          }
        }
      } else {
        // Add responsive class to existing container
        container.addClass("lux-producer-layout");
        container.find("img").addClass("lux-producer-photo");
        producerUpdated = true;
        console.log("✓ Applied responsive classes to producer section");
      }
    }
  });

  // Find and wrap hero section with form
  let heroUpdated = false;
  $("section, div[class*='hero']").each((i, elem) => {
    const text = $(elem).text();
    if (
      (text.includes("Callback") ||
        text.includes("Get My") ||
        text.includes("expert") ||
        $(elem).find("form[data-lp-form='true']").length > 0) &&
      !heroUpdated
    ) {
      console.log("✓ Found hero section");

      const form = $(elem).find("form[data-lp-form='true']");
      if (form.length > 0) {
        // Find hero content (everything except the form)
        const allContent = $(elem).find("> *");
        const heroContent = allContent.not(form);

        if (heroContent.length > 0) {
          // Wrap in responsive grid
          const wrapper = $(`<div class="lux-hero-layout"></div>`);
          const contentWrapper = $(`<div></div>`);
          const formWrapper = $(`<div class="lux-hero-form-wrap"></div>`);

          heroContent.clone().each((i, el) => {
            contentWrapper.append($(el).clone());
          });

          formWrapper.append(form.clone());

          wrapper.append(contentWrapper);
          wrapper.append(formWrapper);

          // Replace the section content
          $(elem).html(wrapper);
          heroUpdated = true;
          console.log("✓ Applied responsive grid to hero section");
        }
      }
    }
  });

  // Verify form is still intact
  if (!$.html().includes('data-lp-form="true"')) {
    console.error("ERROR: Form with data-lp-form was lost!");
    process.exit(1);
  }

  console.log("✓ Form integrity verified");

  // Inject CSS before closing body tag
  let html = $.html();
  const bodyEndIndex = html.lastIndexOf("</body>");
  if (bodyEndIndex !== -1) {
    html = html.slice(0, bodyEndIndex) + styleTag + html.slice(bodyEndIndex);
  } else {
    html = html + styleTag;
  }

  // Save back to database
  await prisma.landingPage.update({
    where: { id: LP_ID },
    data: { currentHtml: html },
  });

  console.log("✓ LP updated in database");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
