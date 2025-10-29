// Paperback v0.8+ Extension for XoXoComics
// Private use extension following proper Paperback API

const XOXOCOMICS_DOMAIN = 'https://xoxocomic.com';

// Source Information
const info = {
    version: '1.0.0',
    name: 'XoXoComics',
    icon: 'icon.png',
    author: 'Private Extension',
    authorWebsite: 'https://github.com/presdec/XoXoComics',
    description: 'Extension for XoXoComics (Private Use Only)',
    websiteBaseURL: XOXOCOMICS_DOMAIN,
    contentRating: 'MATURE',
    sourceTags: [
        {
            text: 'Private',
            type: 'grey'
        }
    ],
    intents: 21
};

// Helper function to make HTTP requests
async function request(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': XOXOCOMICS_DOMAIN
    };

    const config = {
        method: 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Request failed for ${url}:`, error);
        throw error;
    }
}

// Get manga details
async function getMangaDetails(mangaId) {
    const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}`;
    const html = await request(url);
    
    // Parse title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : mangaId;
    
    // Parse cover image
    const imageMatch = html.match(/<img[^>]*class="[^"]*lazyOwl[^"]*"[^>]*data-src="([^"]+)"/);
    const image = imageMatch ? imageMatch[1] : '';
    
    // Parse description
    const descMatch = html.match(/<div[^>]*class="[^"]*summary[^"]*"[^>]*>[\s\S]*?<p>([^<]+)<\/p>/);
    const description = descMatch ? descMatch[1].trim() : 'No description available';

    return {
        id: mangaId,
        titles: [title],
        image: image,
        status: 'Ongoing',
        author: 'Unknown',
        artist: 'Unknown',
        desc: description,
        tags: [],
        lastUpdate: new Date()
    };
}

// Get chapters for a manga
async function getChapters(mangaId) {
    const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}`;
    const html = await request(url);
    
    const chapters = [];
    
    // Find chapter links
    const chapterRegex = /<a[^>]*href="([^"]*\/comic\/[^\/]+\/([^"\/]+))"[^>]*>([^<]+)<\/a>/g;
    let match;
    let chapterNum = 1;
    
    while ((match = chapterRegex.exec(html)) !== null) {
        const chapterUrl = match[1];
        const chapterId = match[2];
        const chapterTitle = match[3].trim();
        
        // Skip if it's not a valid chapter link
        if (!chapterId || chapterId.length < 2) continue;
        
        chapters.push({
            id: chapterId,
            mangaId: mangaId,
            name: chapterTitle,
            langCode: 'en',
            chapNum: chapterNum,
            time: new Date(),
            sortingIndex: chapterNum
        });
        
        chapterNum++;
    }
    
    return chapters.reverse(); // Newest first
}

// Get chapter details (pages)
async function getChapterDetails(mangaId, chapterId) {
    const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}/${chapterId}`;
    const html = await request(url);
    
    const pages = [];
    
    // Find image pages
    const pageRegex = /<img[^>]*class="[^"]*single-page[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/g;
    let match;
    
    while ((match = pageRegex.exec(html)) !== null) {
        const imageSrc = match[1];
        
        // Filter out loading placeholders
        if (imageSrc && 
            !imageSrc.includes('loading') && 
            !imageSrc.includes('placeholder') &&
            !imageSrc.includes('data:image')) {
            pages.push(imageSrc);
        }
    }
    
    // Fallback to regular img tags if no lazy loading found
    if (pages.length === 0) {
        const fallbackRegex = /<img[^>]*class="[^"]*single-page[^"]*"[^>]*src="([^"]+)"/g;
        while ((match = fallbackRegex.exec(html)) !== null) {
            const imageSrc = match[1];
            if (imageSrc && !imageSrc.includes('loading') && !imageSrc.includes('placeholder')) {
                pages.push(imageSrc);
            }
        }
    }

    return {
        id: chapterId,
        mangaId: mangaId,
        pages: pages,
        longStrip: false
    };
}

// Search for comics
async function getSearchResults(query) {
    const searchTerm = query.title || '';
    const page = query.page || 1;
    
    const url = `${XOXOCOMICS_DOMAIN}/page/${page}/?s=${encodeURIComponent(searchTerm)}`;
    const html = await request(url);
    
    const results = [];
    
    // Find comic entries
    const comicRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/comic\/([^\/]+)\/?"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
    let match;
    
    while ((match = comicRegex.exec(html)) !== null && results.length < 50) {
        const comicId = match[1];
        const image = match[2];
        const title = match[3].trim();
        
        // Skip duplicates
        if (!results.find(r => r.id === comicId)) {
            results.push({
                id: comicId,
                title: title,
                image: image,
                subtitle: undefined
            });
        }
    }
    
    return {
        results: results,
        metadata: { page: page + 1 }
    };
}

// Get homepage sections
async function getHomePageSections() {
    try {
        const html = await request(XOXOCOMICS_DOMAIN);
        const sections = [];
        
        // Featured comics
        const featured = [];
        const comicRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/comic\/([^\/]+)\/?"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
        let match;
        
        while ((match = comicRegex.exec(html)) !== null && featured.length < 20) {
            const comicId = match[1];
            const image = match[2];
            const title = match[3].trim();
            
            // Skip duplicates
            if (!featured.find(f => f.id === comicId)) {
                featured.push({
                    id: comicId,
                    title: title,
                    image: image,
                    subtitle: undefined
                });
            }
        }
        
        if (featured.length > 0) {
            sections.push({
                id: 'featured',
                title: 'Featured Comics',
                items: featured,
                type: 'featured'
            });
        }
        
        return sections;
    } catch (error) {
        console.error('Error in getHomePageSections:', error);
        return [];
    }
}

// Export functions
const source = {
    info,
    getMangaDetails,
    getChapters,
    getChapterDetails,
    getSearchResults,
    getHomePageSections
};

// Multiple export formats for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = source;
} else if (typeof window !== 'undefined') {
    window.Source = source;
} else if (typeof globalThis !== 'undefined') {
    globalThis.Source = source;
}

// UMD support
if (typeof define === 'function' && define.amd) {
    define(() => source);
}