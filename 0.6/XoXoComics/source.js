// Paperback v0.6 Extension for XoXoComics
// Private use extension

(function() {
    'use strict';

    const XOXOCOMICS_DOMAIN = 'https://xoxocomic.com';

    // Extension Source object for Paperback v0.6
    const XoXoComicsSource = {
        // Source information
        info: {
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
        },

        // Helper function to make HTTP requests
        makeRequest: async function(url) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Referer': XOXOCOMICS_DOMAIN
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.text();
            } catch (error) {
                console.error('Request failed for ' + url + ':', error);
                throw error;
            }
        },

        // Get manga details
        getMangaDetails: async function(mangaId) {
            const url = XOXOCOMICS_DOMAIN + '/comic/' + mangaId;
            const html = await this.makeRequest(url);
            
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
                tags: []
            };
        },

        // Get chapters for a manga
        getChapters: async function(mangaId) {
            const url = XOXOCOMICS_DOMAIN + '/comic/' + mangaId;
            const html = await this.makeRequest(url);
            
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
                    time: new Date()
                });
                
                chapterNum++;
            }
            
            return chapters.reverse(); // Newest first
        },

        // Get chapter details (pages)
        getChapterDetails: async function(mangaId, chapterId) {
            const url = XOXOCOMICS_DOMAIN + '/comic/' + mangaId + '/' + chapterId;
            const html = await this.makeRequest(url);
            
            const pages = [];
            
            // Find image pages using the selector we discovered
            const pageRegex = /<img[^>]*class="[^"]*single-page[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/g;
            let match;
            
            while ((match = pageRegex.exec(html)) !== null) {
                const imageSrc = match[1];
                if (imageSrc && imageSrc.indexOf('loading') === -1 && imageSrc.indexOf('placeholder') === -1) {
                    pages.push(imageSrc);
                }
            }
            
            // Fallback to regular img tags if no lazy loading found
            if (pages.length === 0) {
                const fallbackRegex = /<img[^>]*class="[^"]*single-page[^"]*"[^>]*src="([^"]+)"/g;
                while ((match = fallbackRegex.exec(html)) !== null) {
                    const imageSrc = match[1];
                    if (imageSrc && imageSrc.indexOf('loading') === -1 && imageSrc.indexOf('placeholder') === -1) {
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
        },

        // Search for comics
        getSearchResults: async function(query, metadata) {
            const searchTerm = query.title || '';
            const page = (metadata && metadata.page) || 1;
            
            const url = XOXOCOMICS_DOMAIN + '/page/' + page + '/?s=' + encodeURIComponent(searchTerm);
            const html = await this.makeRequest(url);
            
            const results = [];
            
            // Find comic entries in search results
            const comicRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/comic\/([^\/]+)\/?"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
            let match;
            
            while ((match = comicRegex.exec(html)) !== null && results.length < 50) {
                const comicId = match[1];
                const image = match[2];
                const title = match[3].trim();
                
                // Skip duplicates
                if (!results.find(function(r) { return r.id === comicId; })) {
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
        },

        // Get homepage sections - simplified for v0.6
        getHomePageSections: async function() {
            try {
                const html = await this.makeRequest(XOXOCOMICS_DOMAIN);
                const featured = [];
                
                // Find featured/recent comics on homepage
                const comicRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="[^"]*\/comic\/([^\/]+)\/?"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
                let match;
                
                while ((match = comicRegex.exec(html)) !== null && featured.length < 20) {
                    const comicId = match[1];
                    const image = match[2];
                    const title = match[3].trim();
                    
                    // Skip duplicates
                    if (!featured.find(function(f) { return f.id === comicId; })) {
                        featured.push({
                            id: comicId,
                            title: title,
                            image: image,
                            subtitle: undefined
                        });
                    }
                }
                
                return [
                    {
                        id: 'featured',
                        title: 'Featured Comics',
                        items: featured,
                        type: 'singleRowNormal'
                    }
                ];
            } catch (error) {
                console.log('Error in getHomePageSections:', error);
                return [];
            }
        }
    };

    // Export for different module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = XoXoComicsSource;
    } else if (typeof window !== 'undefined') {
        window.XoXoComicsSource = XoXoComicsSource;
    }

    // Also try to export as UMD
    if (typeof define === 'function' && define.amd) {
        define(function() { return XoXoComicsSource; });
    }

    // Paperback specific export
    if (typeof globalThis !== 'undefined') {
        globalThis.Source = XoXoComicsSource;
    }

})();