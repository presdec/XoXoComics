const { chromium } = require('playwright')

async function getDetailedComicStructure() {
    console.log('Analyzing comic structure in detail...')
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--ignore-certificate-errors', '--ignore-ssl-errors', '--allow-running-insecure-content', '--disable-web-security']
    })
    
    const page = await browser.newPage()
    
    try {
        console.log('Loading xoxocomic.com...')
        await page.goto('https://xoxocomic.com', { 
            waitUntil: 'networkidle',
            timeout: 30000,
            ignoreHTTPSErrors: true
        })
        
        // Wait for lazy loading to trigger
        await page.waitForTimeout(3000)
        
        const detailedAnalysis = await page.evaluate(() => {
            const results = {
                comicContainers: [],
                imageSelectors: [],
                linkPatterns: [],
                searchElements: []
            }
            
            // Look for comic containers by examining structure
            const containers = document.querySelectorAll('div[class*="owl"], .item, .comic, [class*="trending"], [class*="Module"]')
            Array.from(containers).forEach(container => {
                const images = container.querySelectorAll('img')
                const links = container.querySelectorAll('a')
                
                if (images.length > 0 && links.length > 0) {
                    results.comicContainers.push({
                        className: container.className,
                        id: container.id,
                        selector: container.id ? `#${container.id}` : `.${container.className.split(' ').join('.')}`,
                        imageCount: images.length,
                        linkCount: links.length,
                        firstImageAlt: images[0].alt || '',
                        firstLinkText: links[0].textContent?.trim() || '',
                        firstLinkHref: links[0].href || ''
                    })
                }
            })
            
            // Analyze image patterns
            const allImages = document.querySelectorAll('img')
            Array.from(allImages).forEach(img => {
                if (img.alt && !img.alt.includes('logo')) {
                    results.imageSelectors.push({
                        src: img.src,
                        dataSrc: img.getAttribute('data-src') || '',
                        alt: img.alt,
                        className: img.className,
                        parentClass: img.parentElement ? img.parentElement.className : '',
                        lazyLoading: img.className.includes('lazy') || img.hasAttribute('data-src')
                    })
                }
            })
            
            // Analyze link patterns
            const comicLinks = document.querySelectorAll('a')
            Array.from(comicLinks).forEach(link => {
                const href = link.href
                if (href && (href.includes('comic') || href.includes('read') || href.includes('chapter'))) {
                    results.linkPatterns.push({
                        href,
                        text: link.textContent?.trim() || '',
                        className: link.className,
                        parentClass: link.parentElement ? link.parentElement.className : ''
                    })
                }
            })
            
            // Search elements
            const searchInputs = document.querySelectorAll('input[name="keyword"], input[type="search"], input[placeholder*="search"]')
            Array.from(searchInputs).forEach(input => {
                results.searchElements.push({
                    name: input.name,
                    type: input.type,
                    placeholder: input.placeholder,
                    className: input.className,
                    selector: input.name ? `input[name="${input.name}"]` : `input[type="${input.type}"]`
                })
            })
            
            return results
        })
        
        console.log('\n=== DETAILED COMIC STRUCTURE ANALYSIS ===')
        
        console.log('\n=== COMIC CONTAINERS ===')
        detailedAnalysis.comicContainers.forEach((container, i) => {
            console.log(`${i + 1}. ${container.selector}`)
            console.log(`   Images: ${container.imageCount}, Links: ${container.linkCount}`)
            console.log(`   First image alt: ${container.firstImageAlt}`)
            console.log(`   First link: ${container.firstLinkText} -> ${container.firstLinkHref}`)
            console.log('')
        })
        
        console.log('\n=== IMAGE PATTERNS ===')
        detailedAnalysis.imageSelectors.slice(0, 10).forEach((img, i) => {
            console.log(`${i + 1}. ${img.alt}`)
            console.log(`   Class: ${img.className}`)
            console.log(`   Parent: ${img.parentClass}`)
            console.log(`   Lazy loading: ${img.lazyLoading}`)
            if (img.dataSrc) console.log(`   Data-src: ${img.dataSrc}`)
            console.log('')
        })
        
        console.log('\n=== COMIC LINK PATTERNS ===')
        detailedAnalysis.linkPatterns.slice(0, 10).forEach((link, i) => {
            console.log(`${i + 1}. ${link.href}`)
            console.log(`   Text: ${link.text}`)
            console.log(`   Class: ${link.className}`)
            console.log('')
        })
        
        console.log('\n=== SEARCH FUNCTIONALITY ===')
        detailedAnalysis.searchElements.forEach((search, i) => {
            console.log(`${i + 1}. ${search.selector}`)
            console.log(`   Placeholder: ${search.placeholder}`)
            console.log(`   Class: ${search.className}`)
            console.log('')
        })
        
        // Try to navigate to a comic page
        if (detailedAnalysis.linkPatterns.length > 0) {
            const firstComicLink = detailedAnalysis.linkPatterns[0].href
            console.log(`\n=== ANALYZING COMIC PAGE: ${firstComicLink} ===`)
            
            try {
                await page.goto(firstComicLink, { waitUntil: 'networkidle', timeout: 15000 })
                
                const comicPageAnalysis = await page.evaluate(() => {
                    return {
                        title: document.title,
                        chapterElements: Array.from(document.querySelectorAll('a')).filter(a => 
                            a.href.includes('chapter') || a.textContent.toLowerCase().includes('chapter') ||
                            a.textContent.toLowerCase().includes('issue') || a.href.includes('read')
                        ).slice(0, 10).map(a => ({
                            href: a.href,
                            text: a.textContent.trim(),
                            className: a.className
                        })),
                        comicInfo: {
                            description: document.querySelector('.description, .summary, .info, .about')?.textContent?.trim() || '',
                            author: document.querySelector('.author, .creator, .writer')?.textContent?.trim() || '',
                            genres: Array.from(document.querySelectorAll('.genre, .tag, .category')).map(el => el.textContent?.trim()).filter(Boolean)
                        }
                    }
                })
                
                console.log(`Comic page title: ${comicPageAnalysis.title}`)
                console.log(`Description: ${comicPageAnalysis.comicInfo.description.substring(0, 100)}...`)
                console.log(`Author: ${comicPageAnalysis.comicInfo.author}`)
                console.log(`Genres: ${comicPageAnalysis.comicInfo.genres.join(', ')}`)
                
                console.log('\nChapter/Issue links found:')
                comicPageAnalysis.chapterElements.forEach((chapter, i) => {
                    console.log(`${i + 1}. ${chapter.text} -> ${chapter.href}`)
                })
                
            } catch (e) {
                console.log('Could not analyze comic page:', e.message)
            }
        }
        
        console.log('\n=== RECOMMENDED SELECTORS FOR EXTENSION ===')
        console.log('Based on analysis, use these selectors:')
        console.log('')
        console.log('Comic containers: .item, [class*="Module"], [class*="trending"]')
        console.log('Comic images: img.lazyOwl, img[data-src]')
        console.log('Comic links: a[href*="comic"]')
        console.log('Search input: input[name="keyword"]')
        console.log('Chapter links: a[href*="chapter"], a[href*="read"]')
        
        console.log('\nBrowser will stay open for manual inspection...')
        await new Promise(() => {})
        
    } catch (error) {
        console.error('Error:', error.message)
    } finally {
        await browser.close()
    }
}

getDetailedComicStructure().catch(console.error)