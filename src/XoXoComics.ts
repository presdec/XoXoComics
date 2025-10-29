import { Source, Manga, Chapter, ChapterDetails, HomeSection, SearchRequest, PagedResults, SourceInfo, TagType, Request, MangaStatus } from './paperback-types'
import * as cheerio from 'cheerio'

const XOXOCOMICS_DOMAIN = 'https://xoxocomic.com'

export const XoXoComicsInfo: SourceInfo = {
    version: '1.0.0',
    name: 'XoXoComics',
    icon: 'icon.png',
    author: 'Private Extension',
    authorWebsite: '',
    description: 'Extension for XoXoComics (Private Use Only)',
    websiteBaseURL: XOXOCOMICS_DOMAIN,
    sourceTags: [
        {
            text: 'Private',
            type: TagType.GREY
        }
    ]
}

export class XoXoComics extends Source {
    constructor() {
        super(XoXoComicsInfo)
    }

    async requestModifier(request: Request): Promise<Request> {
        // Add necessary headers for xoxocomics.com
        request.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': XOXOCOMICS_DOMAIN,
            ...request.headers
        }
        return request
    }

    private async makeRequest(url: string): Promise<string> {
        const request: Request = {
            url,
            method: 'GET',
            headers: {}
        }
        
        const modifiedRequest = await this.requestModifier(request)
        
        // In a real Paperback extension, this would use the built-in request manager
        // For now, we'll use a placeholder that shows the structure
        try {
            const response = await fetch(modifiedRequest.url, {
                method: modifiedRequest.method,
                headers: modifiedRequest.headers
            })
            return await response.text()
        } catch (error) {
            console.error(`Failed to fetch ${url}:`, error)
            throw error
        }
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}`
        const html = await this.makeRequest(url)
        const $ = cheerio.load(html)

        // Updated selectors based on real site analysis
        const title = $('.comic-title, .series-title, h1, h2').first().text().trim() || 'Unknown Title'
        const author = $('.comic-author, .author, .creator').first().text().trim() || 'Unknown'
        const artist = $('.comic-artist, .artist').first().text().trim() || author
        const description = $('.comic-description, .description, .summary, .about').first().text().trim() || ''
        
        // Updated image selector based on lazyOwl finding
        const imageElement = $('.comic-cover img, .lazyOwl, .lazy, img[alt*="cover"]').first()
        let image = imageElement.attr('src') || imageElement.attr('data-src') || ''
        if (image && !image.startsWith('http')) {
            image = `${XOXOCOMICS_DOMAIN}${image}`
        }

        // Extract status
        const statusText = $('.comic-status, .status').first().text().trim().toLowerCase()
        let status = MangaStatus.UNKNOWN
        if (statusText.includes('ongoing') || statusText.includes('continuing')) {
            status = MangaStatus.ONGOING
        } else if (statusText.includes('completed') || statusText.includes('finished')) {
            status = MangaStatus.COMPLETED
        }

        // Extract tags/genres
        const tags = $('.comic-tags .tag, .genres .genre, .tags .tag').map((_, el) => ({
            id: $(el).text().trim(),
            label: $(el).text().trim()
        })).get()

        return {
            id: mangaId,
            titles: [title],
            image,
            status,
            author,
            artist,
            tags,
            desc: description
        }
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}`
        const html = await this.makeRequest(url)
        const $ = cheerio.load(html)

        const chapters: Chapter[] = []
        
        // Updated selectors based on analysis: found "Start Reading" links pointing to issues
        $('a[href*="/issue-"], a[href*="issue"], a:contains("Start Reading"), a:contains("Read"), a:contains("Chapter")').each((index, element) => {
            const $el = $(element)
            const href = $el.attr('href') || ''
            const title = $el.text().trim() || `Issue ${index + 1}`
            
            // Extract chapter ID from URL (pattern: /comic/{title}/issue-{number})
            const issueMatch = href.match(/\/issue-(\d+)|\/(\d+)$/)
            const chapterId = issueMatch ? `issue-${issueMatch[1] || issueMatch[2]}` : `chapter-${index + 1}`
            
            // Extract chapter number
            const numberMatch = title.match(/(?:issue|chapter|ch\.?|episode|ep\.?)\s*[#]?(\d+(?:\.\d+)?)/i) || 
                               href.match(/(?:issue|chapter)-(\d+)/)
            const chapNum = numberMatch ? parseFloat(numberMatch[1]) : index + 1

            if (href.includes('/comic/') && href.includes('issue')) {
                chapters.push({
                    id: chapterId,
                    mangaId,
                    name: title,
                    langCode: 'en',
                    chapNum,
                    time: new Date() // In real implementation, extract actual date
                })
            }
        })

        return chapters.reverse() // Usually want newest first
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const url = `${XOXOCOMICS_DOMAIN}/comic/${mangaId}/${chapterId}`
        const html = await this.makeRequest(url)
        const $ = cheerio.load(html)

        const pages: string[] = []

        // Updated selectors based on analysis: found .single-page.lazy class for comic images
        $('.single-page.lazy, .single-page, .comic-page img, .reader-image img').each((_, element) => {
            const $img = $(element)
            let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || ''
            
            if (src) {
                if (!src.startsWith('http')) {
                    src = `${XOXOCOMICS_DOMAIN}${src}`
                }
                pages.push(src)
            }
        })

        // Alternative: look for images in script tags or data attributes
        if (pages.length === 0) {
            const scriptContent = $('script').text()
            const imageMatches = scriptContent.match(/["'](https?:\/\/[^"']*\.(?:jpg|jpeg|png|gif|webp))["']/gi)
            
            if (imageMatches) {
                imageMatches.forEach(match => {
                    const url = match.replace(/["']/g, '')
                    if (url.includes('xoxocomic') || url.includes('comic') || url.includes('manga')) {
                        pages.push(url)
                    }
                })
            }
        }

        return {
            id: chapterId,
            mangaId,
            pages
        }
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const searchQuery = encodeURIComponent(query.title || '')
        const page = metadata?.page || 1
        
        // Updated search URL based on discovered search form with 'keyword' parameter
        const url = `${XOXOCOMICS_DOMAIN}/search?keyword=${searchQuery}&page=${page}`
        
        const html = await this.makeRequest(url)
        const $ = cheerio.load(html)

        const results: Manga[] = []

        // Updated selectors based on analysis: found .lazyOwl images and comic containers
        $('.lazyOwl').each((_, element) => {
            const $img = $(element)
            const $container = $img.closest('a')
            
            if ($container.length) {
                const href = $container.attr('href') || ''
                const title = $img.attr('alt') || $container.attr('title') || ''
                const image = $img.attr('src') || $img.attr('data-src') || ''
                
                // Extract comic ID from URL
                const mangaId = href.split('/').filter(Boolean).pop() || ''

                if (mangaId && title && href.includes('/comic/') && !title.toLowerCase().includes('logo')) {
                    results.push({
                        id: mangaId,
                        titles: [title],
                        image: image.startsWith('http') ? image : `${XOXOCOMICS_DOMAIN}${image}`,
                        status: MangaStatus.UNKNOWN
                    })
                }
            }
        })

        return {
            results,
            metadata: { page: page + 1 }
        }
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const html = await this.makeRequest(XOXOCOMICS_DOMAIN)
        const $ = cheerio.load(html)

        // Updated selectors based on analysis: found .lazyOwl images and .comic-wrap.Module containers
        const trendingComics: Manga[] = []
        $('.lazyOwl').each((_, element) => {
            const $img = $(element)
            const $container = $img.closest('a')
            
            if ($container.length) {
                const href = $container.attr('href') || ''
                const title = $img.attr('alt') || ''
                const image = $img.attr('src') || ''
                
                const mangaId = href.split('/').filter(Boolean).pop() || ''

                if (mangaId && title && href.includes('/comic/') && !title.toLowerCase().includes('logo')) {
                    trendingComics.push({
                        id: mangaId,
                        titles: [title],
                        image,
                        status: MangaStatus.UNKNOWN
                    })
                }
            }
        })

        if (trendingComics.length > 0) {
            sectionCallback({
                id: 'trending',
                title: 'Trending Comics',
                items: trendingComics,
                view_more: true
            })
        }

        // Hot Comics Section
        const hotComics: Manga[] = []
        $('.hot .item, [class*="hot"] .item, .Module .item').each((_, element) => {
            const $el = $(element)
            const link = $el.find('a').first()
            const href = link.attr('href') || ''
            const title = link.attr('title') || $el.find('img').attr('alt') || link.text().trim()
            
            const imgEl = $el.find('img').first()
            let image = imgEl.attr('data-src') || imgEl.attr('src') || ''
            if (image && !image.startsWith('http') && !image.startsWith('data:')) {
                image = `${XOXOCOMICS_DOMAIN}${image}`
            }

            const mangaId = href.split('/').filter(Boolean).pop() || ''

            if (mangaId && title && !title.toLowerCase().includes('logo')) {
                hotComics.push({
                    id: mangaId,
                    titles: [title],
                    image,
                    status: MangaStatus.UNKNOWN
                })
            }
        })

        if (hotComics.length > 0) {
            sectionCallback({
                id: 'hot',
                title: 'Hot Comics',
                items: hotComics,
                view_more: true
            })
        }
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        const page = metadata?.page || 1
        let url = ''

        switch (homepageSectionId) {
            case 'trending':
                url = `${XOXOCOMICS_DOMAIN}/trending-comic?page=${page}`
                break
            case 'hot':
                url = `${XOXOCOMICS_DOMAIN}/hot-comic?page=${page}`
                break
            default:
                return { results: [], metadata: { page: 1 } }
        }

        const html = await this.makeRequest(url)
        const $ = cheerio.load(html)

        const results: Manga[] = []
        $('.item, .comic-item, .ModuleContent .col-sm-3, [class*="comic"]').each((_, element) => {
            const $el = $(element)
            const link = $el.find('a').first()
            const href = link.attr('href') || ''
            const title = link.attr('title') || $el.find('img').attr('alt') || link.text().trim()
            
            const imgEl = $el.find('img').first()
            let image = imgEl.attr('data-src') || imgEl.attr('src') || ''
            if (image && !image.startsWith('http') && !image.startsWith('data:')) {
                image = `${XOXOCOMICS_DOMAIN}${image}`
            }

            const mangaId = href.split('/').filter(Boolean).pop() || ''

            if (mangaId && title && !title.toLowerCase().includes('logo')) {
                results.push({
                    id: mangaId,
                    titles: [title],
                    image,
                    status: MangaStatus.UNKNOWN
                })
            }
        })

        return {
            results,
            metadata: { page: page + 1 }
        }
    }
}