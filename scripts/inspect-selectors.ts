const { chromium } = require("playwright");

async function inspectXoXoComics() {
  const browser = await chromium.launch({ headless: false }); // Set to false to see the browser
  const page = await browser.newPage();

  try {
    console.log("Navigating to xoxocomics.com...");
    await page.goto("https://xoxocomics.com", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log("Page loaded successfully!");

    // Extract page structure automatically
    console.log("\nExtracting page structure...");

    const pageAnalysis = await page.evaluate(() => {
      const analysis: any = {
        title: document.title,
        url: window.location.href,
        comicElements: [],
        imageElements: [],
        linkElements: [],
        headings: [],
      };

      // Find potential comic containers
      const allElements = Array.from(document.querySelectorAll("*"));

      // Look for elements with comic-related classes or containing images
      allElements.forEach((el) => {
        const className = el.className || "";
        const tagName = el.tagName.toLowerCase();

        // Check for comic-related classes
        if (
          className.includes("comic") ||
          className.includes("manga") ||
          className.includes("chapter") ||
          className.includes("book") ||
          className.includes("story")
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 50) {
            // Only visible elements
            analysis.comicElements.push({
              tagName,
              className,
              id: el.id || "",
              textContent: el.textContent?.substring(0, 100) || "",
              selector: el.id
                ? `#${el.id}`
                : `.${className.split(" ").join(".")}`,
            });
          }
        }

        // Find images
        if (tagName === "img") {
          const src = (el as HTMLImageElement).src;
          if (src && !src.includes("logo") && !src.includes("icon")) {
            analysis.imageElements.push({
              src,
              alt: (el as HTMLImageElement).alt || "",
              className,
              parent: el.parentElement?.className || "",
            });
          }
        }

        // Find important links
        if (tagName === "a") {
          const href = (el as HTMLAnchorElement).href;
          if (
            href &&
            (href.includes("comic") ||
              href.includes("chapter") ||
              href.includes("read"))
          ) {
            analysis.linkElements.push({
              href,
              text: el.textContent?.substring(0, 50) || "",
              className,
            });
          }
        }

        // Find headings
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
          analysis.headings.push({
            tagName,
            text: el.textContent?.substring(0, 100) || "",
            className,
          });
        }
      });

      return analysis;
    });

    console.log("\n=== PAGE ANALYSIS ===");
    console.log("Title:", pageAnalysis.title);
    console.log("URL:", pageAnalysis.url);

    console.log("\n=== POTENTIAL COMIC ELEMENTS ===");
    pageAnalysis.comicElements.slice(0, 10).forEach((el: any, i: number) => {
      console.log(`${i + 1}. ${el.tagName} - ${el.selector}`);
      console.log(`   Class: ${el.className}`);
      console.log(`   Text: ${el.textContent.substring(0, 50)}...`);
      console.log("");
    });

    console.log("\n=== COMIC IMAGES ===");
    pageAnalysis.imageElements.slice(0, 5).forEach((img: any, i: number) => {
      console.log(`${i + 1}. ${img.src}`);
      console.log(`   Alt: ${img.alt}`);
      console.log(`   Parent class: ${img.parent}`);
      console.log("");
    });

    console.log("\n=== COMIC LINKS ===");
    pageAnalysis.linkElements.slice(0, 10).forEach((link: any, i: number) => {
      console.log(`${i + 1}. ${link.href}`);
      console.log(`   Text: ${link.text}`);
      console.log(`   Class: ${link.className}`);
      console.log("");
    });

    console.log("\n=== HEADINGS ===");
    pageAnalysis.headings.slice(0, 5).forEach((h: any, i: number) => {
      console.log(`${i + 1}. ${h.tagName}: ${h.text}`);
      console.log(`   Class: ${h.className}`);
      console.log("");
    });

    // Test search functionality
    console.log("\n=== TESTING SEARCH ===");
    try {
      const searchInput = await page.$(
        'input[type="search"], input[name*="search"], input[placeholder*="search"]'
      );
      if (searchInput) {
        console.log("Found search input!");
        const searchSelector = await page.evaluate((el: HTMLInputElement) => {
          return el.id ? `#${el.id}` : `input[name="${el.name}"]`;
        }, searchInput);
        console.log("Search selector:", searchSelector);
      } else {
        console.log("No search input found");
      }
    } catch (e) {
      console.log("Error testing search:", e);
    }

    // Keep browser open for manual inspection
    console.log("\n=== MANUAL INSPECTION ===");
    console.log("Browser is open for manual inspection.");
    console.log("Check the page structure and identify:");
    console.log("1. Comic/manga listing containers");
    console.log("2. Individual comic links and images");
    console.log("3. Search functionality");
    console.log("4. Navigation elements");
    console.log("Press Ctrl+C when done...");

    // Keep running for manual inspection
    await new Promise(() => {}); // Keep running until manually stopped
  } catch (error) {
    console.error("Error inspecting site:", error);
  } finally {
    await browser.close();
  }
}

inspectXoXoComics().catch(console.error);
