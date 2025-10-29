const { chromium } = require("playwright");

async function inspectXoXoComics() {
  console.log("Starting browser...");
  const browser = await chromium.launch({
    headless: false, // Set to false to see the browser
    slowMo: 1000, // Slow down for better inspection
    args: [
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--allow-running-insecure-content",
    ],
  });
  const page = await browser.newPage();

  // Ignore SSL errors
  await page.setExtraHTTPHeaders({
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  });

  try {
    console.log("Navigating to xoxocomics.com...");

    // Try both HTTP and HTTPS
    const urls = ["https://xoxocomic.com", "http://xoxocomic.com"];
    let success = false;

    for (const url of urls) {
      try {
        console.log(`Trying ${url}...`);
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 30000,
          ignoreHTTPSErrors: true,
        });
        console.log(`Successfully loaded ${url}`);
        success = true;
        break;
      } catch (e) {
        console.log(`Failed to load ${url}: ${e.message}`);
        continue;
      }
    }

    if (!success) {
      throw new Error(
        "Could not load xoxocomics.com with either HTTP or HTTPS"
      );
    }

    console.log("Page loaded successfully!");

    // Extract page structure automatically
    console.log("\n=== EXTRACTING PAGE STRUCTURE ===");

    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        title: document.title,
        url: window.location.href,
        comicElements: [],
        imageElements: [],
        linkElements: [],
        headings: [],
        searchElements: [],
      };

      // Find potential comic containers
      const allElements = Array.from(document.querySelectorAll("*"));

      // Look for elements with comic-related classes or containing images
      allElements.forEach((el) => {
        const className = el.className || "";
        const tagName = el.tagName.toLowerCase();
        const id = el.id || "";

        // Check for comic-related classes
        if (
          className.includes("comic") ||
          className.includes("manga") ||
          className.includes("chapter") ||
          className.includes("book") ||
          className.includes("story") ||
          className.includes("item") ||
          className.includes("card") ||
          className.includes("post")
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 50) {
            // Only visible elements
            analysis.comicElements.push({
              tagName,
              className,
              id,
              textContent: (el.textContent || "").substring(0, 100),
              selector: id
                ? `#${id}`
                : className
                  ? `.${className.split(" ").join(".")}`
                  : tagName,
            });
          }
        }

        // Find images that might be comic covers
        if (tagName === "img") {
          const src = el.src;
          const alt = el.alt || "";
          if (
            src &&
            !src.includes("logo") &&
            !src.includes("icon") &&
            !src.includes("avatar")
          ) {
            analysis.imageElements.push({
              src,
              alt,
              className,
              id,
              parent: el.parentElement ? el.parentElement.className : "",
            });
          }
        }

        // Find links that might lead to comics
        if (tagName === "a") {
          const href = el.href;
          const text = (el.textContent || "").trim();
          if (
            href &&
            (href.includes("comic") ||
              href.includes("chapter") ||
              href.includes("read") ||
              href.includes("manga") ||
              text.toLowerCase().includes("chapter") ||
              text.toLowerCase().includes("read"))
          ) {
            analysis.linkElements.push({
              href,
              text: text.substring(0, 50),
              className,
              id,
            });
          }
        }

        // Find headings
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
          analysis.headings.push({
            tagName,
            text: (el.textContent || "").substring(0, 100),
            className,
            id,
          });
        }

        // Find search elements
        if (
          tagName === "input" &&
          (el.type === "search" ||
            (el.name && el.name.includes("search")) ||
            (el.placeholder && el.placeholder.toLowerCase().includes("search")))
        ) {
          analysis.searchElements.push({
            type: el.type,
            name: el.name,
            placeholder: el.placeholder,
            className,
            id,
            selector: id
              ? `#${id}`
              : el.name
                ? `input[name="${el.name}"]`
                : `input[type="${el.type}"]`,
          });
        }
      });

      return analysis;
    });

    console.log("\n=== PAGE ANALYSIS RESULTS ===");
    console.log("Title:", pageAnalysis.title);
    console.log("URL:", pageAnalysis.url);

    console.log("\n=== POTENTIAL COMIC ELEMENTS ===");
    if (pageAnalysis.comicElements.length > 0) {
      pageAnalysis.comicElements.slice(0, 15).forEach((el, i) => {
        console.log(
          `${i + 1}. ${el.tagName}${el.id ? `#${el.id}` : ""}.${el.className.split(" ").slice(0, 2).join(".")}`
        );
        console.log(`   Text: ${el.textContent.substring(0, 60)}...`);
        console.log(`   Selector: ${el.selector}`);
        console.log("");
      });
    } else {
      console.log(
        "No obvious comic elements found. Site might use different naming."
      );
    }

    console.log("\n=== COMIC IMAGES (potential covers) ===");
    if (pageAnalysis.imageElements.length > 0) {
      pageAnalysis.imageElements.slice(0, 10).forEach((img, i) => {
        console.log(`${i + 1}. ${img.src}`);
        console.log(`   Alt: ${img.alt}`);
        console.log(`   Parent class: ${img.parent}`);
        console.log(`   Image class: ${img.className}`);
        console.log("");
      });
    } else {
      console.log("No images found");
    }

    console.log("\n=== POTENTIAL COMIC/CHAPTER LINKS ===");
    if (pageAnalysis.linkElements.length > 0) {
      pageAnalysis.linkElements.slice(0, 10).forEach((link, i) => {
        console.log(`${i + 1}. ${link.href}`);
        console.log(`   Text: ${link.text}`);
        console.log(`   Class: ${link.className}`);
        console.log("");
      });
    } else {
      console.log("No obvious comic links found");
    }

    console.log("\n=== PAGE HEADINGS ===");
    if (pageAnalysis.headings.length > 0) {
      pageAnalysis.headings.slice(0, 8).forEach((h, i) => {
        console.log(`${i + 1}. ${h.tagName}: ${h.text}`);
        if (h.className) console.log(`   Class: ${h.className}`);
        console.log("");
      });
    }

    console.log("\n=== SEARCH FUNCTIONALITY ===");
    if (pageAnalysis.searchElements.length > 0) {
      pageAnalysis.searchElements.forEach((search, i) => {
        console.log(`${i + 1}. Search input found!`);
        console.log(`   Selector: ${search.selector}`);
        console.log(`   Placeholder: ${search.placeholder}`);
        console.log(`   Name: ${search.name}`);
        console.log("");
      });
    } else {
      console.log("No search input found with obvious selectors");
    }

    // Try to navigate to a specific comic page for more analysis
    console.log("\n=== TESTING NAVIGATION ===");
    const firstComicLink = pageAnalysis.linkElements.find(
      (link) =>
        link.href.includes("comic") ||
        link.href.includes("chapter") ||
        link.href.includes("read")
    );

    if (firstComicLink) {
      console.log(`Found potential comic link: ${firstComicLink.href}`);
      console.log("Navigating to comic page for deeper analysis...");

      try {
        await page.goto(firstComicLink.href, {
          waitUntil: "networkidle",
          timeout: 15000,
        });

        const comicPageAnalysis = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            chapterLinks: Array.from(document.querySelectorAll("a"))
              .filter(
                (a) =>
                  a.href.includes("chapter") ||
                  a.textContent.toLowerCase().includes("chapter")
              )
              .slice(0, 5)
              .map((a) => ({
                href: a.href,
                text: a.textContent.trim().substring(0, 50),
                className: a.className,
              })),
            images: Array.from(document.querySelectorAll("img"))
              .slice(0, 10)
              .map((img) => ({
                src: img.src,
                alt: img.alt,
                className: img.className,
                parent: img.parentElement ? img.parentElement.className : "",
              })),
          };
        });

        console.log("\n=== COMIC PAGE ANALYSIS ===");
        console.log("Comic page title:", comicPageAnalysis.title);
        console.log("Comic page URL:", comicPageAnalysis.url);

        if (comicPageAnalysis.chapterLinks.length > 0) {
          console.log("\n=== CHAPTER LINKS FOUND ===");
          comicPageAnalysis.chapterLinks.forEach((link, i) => {
            console.log(`${i + 1}. ${link.href}`);
            console.log(`   Text: ${link.text}`);
            console.log(`   Class: ${link.className}`);
            console.log("");
          });
        }

        console.log("\n=== IMAGES ON COMIC PAGE ===");
        comicPageAnalysis.images.forEach((img, i) => {
          console.log(`${i + 1}. ${img.src}`);
          console.log(`   Alt: ${img.alt}`);
          console.log(`   Class: ${img.className}`);
          console.log("");
        });
      } catch (e) {
        console.log("Could not navigate to comic page:", e.message);
      }
    }

    // Keep browser open for manual inspection
    console.log("\n=== MANUAL INSPECTION READY ===");
    console.log("Browser window is open for manual inspection.");
    console.log("You can now:");
    console.log("1. Right-click elements to inspect");
    console.log("2. Use browser dev tools to find selectors");
    console.log("3. Test search functionality");
    console.log("4. Navigate to comic pages and chapters");
    console.log(
      "\nPress Ctrl+C in this terminal when done to close the browser..."
    );

    // Keep browser open until manually closed
    await new Promise(() => {}); // This will run indefinitely until Ctrl+C
  } catch (error) {
    console.error("Error during inspection:", error);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

// Run the inspection
inspectXoXoComics().catch(console.error);
