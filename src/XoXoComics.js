// Simple Paperback v0.6 extension for XoXoComics
// Using minimal implementation compatible with Paperback v0.6

const XOXOCOMICS_DOMAIN = 'https://xoxocomic.com'

// Extension info object
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
    ]
}

// Simple HTTP request function
async function makeRequest(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': XOXOCOMICS_DOMAIN
            }
        })
        return await response.text()
    } catch (error) {
        throw new Error(`Failed to fetch ${url}: ${error}`)
    }
}

// Extension class
class XoXoComics {
    constructor() {
        this.info = info
    }

    async getMangaDetails(mangaId) {
        const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}`
        const html = await makeRequest(url)
        
        // Parse title
        const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([^<]+)<\/h1>/)
        const title = titleMatch ? titleMatch[1].trim() : mangaId
        
        // Parse cover image
        const imageMatch = html.match(/<img[^>]*class="[^"]*lazyOwl[^"]*"[^>]*data-src="([^"]+)"/)
        const image = imageMatch ? imageMatch[1] : ''
        
        // Parse description
        const descMatch = html.match(/<div[^>]*class="[^"]*summary[^"]*"[^>]*>[\s\S]*?<p>([^<]+)<\/p>/)
        const description = descMatch ? descMatch[1].trim() : 'No description available'

        return {
            id: mangaId,
            titles: [title],
            image: image,
            status: 'Ongoing',
            author: 'Unknown',
            artist: 'Unknown',
            desc: description,
            tags: []
        }
    }

    async getChapters(mangaId) {
        const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}`
        const html = await makeRequest(url)
        
        const chapters = []
        
        // Find chapter links
        const chapterRegex = /<a[^>]*href="([^"]*\/comic\/[^\/]+\/[^"]*)"[^>]*>([^<]+)<\/a>/g
        let match
        let chapterNum = 1
        
        while ((match = chapterRegex.exec(html)) !== null) {
            const chapterUrl = match[1]
            const chapterTitle = match[2].trim()
            
            // Extract chapter ID from URL
            const chapterIdMatch = chapterUrl.match(/\/comic\/[^\/]+\/(.+)\/?$/)
            const chapterId = chapterIdMatch ? chapterIdMatch[1] : `chapter-${chapterNum}`
            
            chapters.push({
                id: chapterId,
                mangaId: mangaId,
                name: chapterTitle,
                langCode: 'en',
                chapNum: chapterNum,
                time: new Date()
            })
            
            chapterNum++
        }
        
        return chapters.reverse() // Newest first
    }

    async getChapterDetails(mangaId, chapterId) {
        const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}/${chapterId}`
        const html = await makeRequest(url)
        
        const pages = []
        
        // Find image pages using the selector we discovered
        const pageRegex = /<img[^>]*class="[^"]*single-page[^"]*lazy[^"]*"[^>]*data-src="([^"]+)"/g
        let match
        
        while ((match = pageRegex.exec(html)) !== null) {
            const imageSrc = match[1]
            if (imageSrc && !imageSrc.includes('loading') && !imageSrc.includes('placeholder')) {
                pages.push(imageSrc)
            }
        }
        
        return {
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
            longStrip: false
        }
    }

    async getSearchResults(query, metadata) {
        const searchTerm = query.title || ''
        const page = metadata?.page || 1
        
        const url = `${XOXOCOMICS_DOMAIN}/page/${page}/?s=${encodeURIComponent(searchTerm)}`
        const html = await makeRequest(url)
        
        const results = []
        
        // Find comic entries in search results
        const comicRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/comic\/([^\/]+)\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g
        let match
        
        while ((match = comicRegex.exec(html)) !== null) {
            const comicId = match[2]
            const image = match[3]
            const title = match[4].trim()
            
            results.push({
                id: comicId,
                title: title,
                image: image,
                subtitle: undefined
            })
        }
        
        return {
            results: results,
            metadata: { page: page + 1 }
        }
    }

    async getHomePageSections(sectionCallback) {
        try {
            const html = await makeRequest(XOXOCOMICS_DOMAIN)
            const featured = []
            
            // Find featured/recent comics on homepage
            const comicRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/comic\/([^\/]+)\/[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g
            let match
            
            while ((match = comicRegex.exec(html)) !== null) {
                const comicId = match[2]
                const image = match[3]
                const title = match[4].trim()
                
                featured.push({
                    id: comicId,
                    title: title,
                    image: image,
                    subtitle: undefined
                })
                
                if (featured.length >= 20) break // Limit to 20 items
            }
            
            const section = {
                id: 'featured',
                title: 'Featured Comics',
                items: featured,
                type: 'singleRowNormal'
            }
            
            sectionCallback(section)
        } catch (error) {
            console.log('Error in getHomePageSections:', error)
        }
    }
}

// Export for Paperback v0.6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = XoXoComics
} else if (typeof window !== 'undefined') {
    window.XoXoComics = XoXoComics
}