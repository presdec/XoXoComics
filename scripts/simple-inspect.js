const { chromium } = require("playwright");

async function inspectXoXoComics() {
  console.log("Starting browser inspection...");
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--allow-running-insecure-content",
      "--disable-web-security",
    ],
  });

  const page = await browser.newPage();

  // Set user agent properly
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  });

  try {
    console.log("Attempting to load https://xoxocomic.com/...");

    // Try to load the site
    await page.goto("https://xoxocomic.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
      ignoreHTTPSErrors: true,
    });

    console.log("Page loaded! Analyzing structure...");

    // Simple analysis without complex type checking
    const analysis = await page.evaluate(() => {
      // Simple helper to safely get className
      function getClassName(el) {
        try {
          return el.className && typeof el.className === "string"
            ? el.className
            : "";
        } catch (e) {
          return "";
        }
      }

      const results = {
        title: document.title,
        url: window.location.href,
        mainElements: [],
        images: [],
        links: [],
        forms: [],
      };

      // Get all main structural elements
      const mainTags = ["div", "section", "article", "main", "ul", "li"];
      mainTags.forEach((tag) => {
        const elements = document.querySelectorAll(tag);
        Array.from(elements)
          .slice(0, 20)
          .forEach((el) => {
            const className = getClassName(el);
            const id = el.id || "";
            const text = (el.textContent || "").trim().substring(0, 100);

            if (className || id || text.length > 10) {
              results.mainElements.push({
                tag,
                id,
                className,
                text,
                hasImages: el.querySelectorAll("img").length > 0,
                hasLinks: el.querySelectorAll("a").length > 0,
              });
            }
          });
      });

      // Get all images
      const images = document.querySelectorAll("img");
      Array.from(images)
        .slice(0, 10)
        .forEach((img) => {
          results.images.push({
            src: img.src || "",
            alt: img.alt || "",
            className: getClassName(img),
            id: img.id || "",
          });
        });

      // Get all links
      const links = document.querySelectorAll("a");
      Array.from(links)
        .slice(0, 15)
        .forEach((link) => {
          const href = link.href || "";
          const text = (link.textContent || "").trim();
          if (href && text) {
            results.links.push({
              href,
              text: text.substring(0, 50),
              className: getClassName(link),
              id: link.id || "",
            });
          }
        });

      // Get forms and inputs
      const forms = document.querySelectorAll("form, input");
      Array.from(forms).forEach((form) => {
        results.forms.push({
          tag: form.tagName.toLowerCase(),
          type: form.type || "",
          name: form.name || "",
          placeholder: form.placeholder || "",
          className: getClassName(form),
          id: form.id || "",
        });
      });

      return results;
    });

    console.log("\n=== SITE ANALYSIS RESULTS ===");
    console.log(`Title: ${analysis.title}`);
    console.log(`URL: ${analysis.url}`);

    console.log("\n=== MAIN STRUCTURAL ELEMENTS ===");
    analysis.mainElements.forEach((el, i) => {
      if (i < 20) {
        console.log(
          `${i + 1}. <${el.tag}>${el.id ? ` id="${el.id}"` : ""}${el.className ? ` class="${el.className}"` : ""}`
        );
        if (el.text) console.log(`   Text: ${el.text}...`);
        if (el.hasImages) console.log(`   ✓ Contains images`);
        if (el.hasLinks) console.log(`   ✓ Contains links`);
        console.log("");
      }
    });

    console.log("\n=== IMAGES FOUND ===");
    analysis.images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.src}`);
      if (img.alt) console.log(`   Alt: ${img.alt}`);
      if (img.className) console.log(`   Class: ${img.className}`);
      console.log("");
    });

    console.log("\n=== LINKS FOUND ===");
    analysis.links.forEach((link, i) => {
      if (i < 10) {
        console.log(`${i + 1}. ${link.href}`);
        console.log(`   Text: ${link.text}`);
        if (link.className) console.log(`   Class: ${link.className}`);
        console.log("");
      }
    });

    console.log("\n=== FORMS AND INPUTS ===");
    analysis.forms.forEach((form, i) => {
      console.log(
        `${i + 1}. <${form.tag}>${form.type ? ` type="${form.type}"` : ""}${form.name ? ` name="${form.name}"` : ""}`
      );
      if (form.placeholder) console.log(`   Placeholder: ${form.placeholder}`);
      if (form.className) console.log(`   Class: ${form.className}`);
      console.log("");
    });

    console.log("\n=== BROWSER INSPECTION READY ===");
    console.log("The browser window is now open.");
    console.log("You can:");
    console.log("- Right-click elements to inspect them");
    console.log("- Use F12 to open developer tools");
    console.log("- Navigate through the site manually");
    console.log("- Look for comic listings, search boxes, etc.");
    console.log("\nPress Ctrl+C here when done to close the browser.");

    // Keep browser open for manual inspection
    await new Promise(() => {});
  } catch (error) {
    console.error("Error during inspection:", error.message);

    // Try a fallback approach
    console.log("\nTrying fallback approach - opening google.com first...");
    try {
      await page.goto("https://google.com", { timeout: 10000 });
      console.log("Google loaded successfully. Browser is working.");
      console.log(
        "You can manually navigate to https://xoxocomic.com/ in the browser window."
      );

      await new Promise(() => {});
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError.message);
    }
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

console.log("XoXoComics Site Inspector");
console.log("========================");
inspectXoXoComics().catch(console.error);
