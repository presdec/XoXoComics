# XoXoComics Paperback Extension

A private Paperback v0.6 extension for accessing xoxocomics.com content. This extension is created for personal use only with proper rights to the content.

## ⚠️ Legal Notice

This extension is intended for **personal use only** for content you have legal rights to access. It is **not intended for distribution or publication**. Please ensure you have proper rights to the content before using this extension.

## 🏗️ Project Structure

```
XoXo/
├── src/
│   ├── XoXoComics.ts          # Main extension source
│   ├── paperback-types.ts     # Paperback API types
│   └── index.ts               # Extension entry point
├── scripts/
│   └── inspect-selectors.ts   # Playwright inspection script
├── dist/                      # Compiled extension files
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── webpack.config.js          # Build configuration
└── playwright.config.ts       # Playwright test configuration
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js v18+ 
- npm or yarn
- Paperback v0.6 iOS app

### Installation

1. **Clone/Download this repository**
   ```bash
   git clone <your-repo-url>
   cd XoXo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

## 🔧 Development

### Using Playwright for Site Inspection

Before making changes to the extension, you can use Playwright to inspect xoxocomics.com and identify the correct selectors:

```bash
# Run the inspection script (opens browser for manual inspection)
npx ts-node scripts/inspect-selectors.ts
```

This will:
- Open a browser window with xoxocomics.com
- Allow you to manually inspect elements
- Output potential selectors to the console

### Updating Selectors

The extension uses CSS selectors to extract content. If the website structure changes, you'll need to update the selectors in `src/XoXoComics.ts`:

```typescript
// Example selectors that may need updating:
'.comic-title, .manga-title, h1'           // Title selectors
'.comic-cover img, .manga-cover img'       // Cover image selectors
'.chapter-list .chapter'                   // Chapter list selectors
'.chapter-images img'                      // Reader page selectors
```

### Build Commands

```bash
npm run build    # Production build
npm run dev      # Development build with watch mode
npm test         # Run tests (if any)
```

## 📱 Installation in Paperback

1. **Build the extension** (see above)

2. **Transfer to iOS device**
   - The built extension will be in `dist/bundle.js`
   - Transfer this file to your iOS device

3. **Add to Paperback**
   - Open Paperback app
   - Go to Settings → Sources
   - Add Local Source
   - Select the `bundle.js` file

## 🔍 Extension Features

- **Browse Comics**: View popular and latest comics from the homepage
- **Search**: Search for specific comics by title
- **Read Chapters**: Access and read comic chapters
- **Manga Details**: View comic information, description, and chapter lists

## � Playwright Inspection Results

✅ **Site Successfully Inspected**: `https://xoxocomic.com` (note: singular "comic")

**Key Findings from Playwright Analysis:**
- **Search functionality**: `input[name="keyword"]` with placeholder "Search comics..."
- **Image handling**: Uses lazy loading with `class="lazyOwl"` and `data-src` attributes
- **Site structure**: Bootstrap-based with grid system (`col-sm-3`, `col-sm-12`)
- **Comic titles discovered**: Marvel Zombies, X-Men, Spider-Man, Venom, etc.
- **Navigation URLs**: `/hot-comic`, `/comic-list`, `/trending-comic`

**Updated Selectors Used:**
- Comic containers: `.item`, `.ModuleContent .col-sm-3`, `[class*="trending"]`
- Comic images: `img[data-src]`, `img.lazyOwl` 
- Search input: `input[name="keyword"]`
- Comic links: `a[href*="comic"]`

## 🛠️ Extension Features

### Adding New Sections

To add new homepage sections, modify the `getHomePageSections` method:

```typescript
// Add new section in XoXoComics.ts
const newSection: Manga[] = []
$('.your-selector').each((_, element) => {
    // Extract manga data
})

sectionCallback({
    id: 'your-section-id',
    title: 'Your Section Title',
    items: newSection,
    view_more: true
})
```

### Modifying Request Headers

Update the `requestModifier` method to add or modify HTTP headers:

```typescript
request.headers = {
    'User-Agent': 'Your-User-Agent',
    'Custom-Header': 'Your-Value',
    ...request.headers
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Selectors not working**: Website structure may have changed
   - Use the Playwright inspection script to find new selectors
   - Update selectors in `XoXoComics.ts`

2. **Images not loading**: Image URLs may be relative or blocked
   - Check image URL construction in the code
   - Verify referer headers are set correctly

3. **Network errors**: Site may have anti-bot protection
   - Update User-Agent string
   - Add appropriate headers in `requestModifier`

### Debugging

Enable development mode to see detailed logs:

```bash
npm run dev
```

Check browser dev tools for network requests and errors when using the extension.

## 📁 File Descriptions

- **`src/XoXoComics.ts`**: Main extension logic with all scraping methods
- **`src/paperback-types.ts`**: TypeScript type definitions for Paperback API
- **`src/index.ts`**: Extension entry point and exports
- **`scripts/inspect-selectors.ts`**: Playwright script for manual site inspection
- **`webpack.config.js`**: Build configuration for bundling the extension
- **`playwright.config.ts`**: Configuration for Playwright browser automation

## 🔒 Privacy & Security

- This extension only accesses xoxocomics.com as specified
- No data is collected or transmitted to third parties
- All processing happens locally on your device
- Source code is available for inspection

## 📄 License

This project is private and not licensed for distribution. For personal use only.

---

**Remember**: Only use this extension for content you have legal rights to access. Respect copyright laws and terms of service.