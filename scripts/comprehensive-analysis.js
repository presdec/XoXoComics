const { chromium } = require('playwright')

async function comprehensiveComicAnalysis() {
    console.log('🔍 Starting comprehensive comic site analysis...')
    const browser = await chromium.launch({ 
        headless: false,
        args: [
            '--ignore-certificate-errors', 
            '--ignore-ssl-errors', 
            '--allow-running-insecure-content', 
            '--disable-web-security',
            '--disable-popup-blocking',
            '--disable-features=VizDisplayCompositor'
        ]
    })
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    const page = await context.newPage()
    
    // Block ads and popups
    await page.route('**/*', (route) => {
        const url = route.request().url()
        if (url.includes('ads') || url.includes('popup') || url.includes('banner') || 
            url.includes('doubleclick') || url.includes('googlesyndication') ||
            url.includes('facebook.com/tr') || url.includes('google-analytics')) {
            route.abort()
        } else {
            route.continue()
        }
    })
    
    try {
        console.log('📡 Loading homepage...')
        await page.goto('https://xoxocomic.com', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        })
        
        // Wait for any lazy content and close any immediate popups
        await page.waitForTimeout(3000)
        
        // Try to close any popups/modals
        try {
            await page.click('.close, .modal-close, [aria-label="Close"], .popup-close', { timeout: 2000 })
        } catch (e) {
            console.log('No immediate popups to close')
        }
        
        console.log('✅ Homepage loaded successfully!')
        
        // Phase 1: Analyze homepage structure
        console.log('\n=== 📋 PHASE 1: HOMEPAGE ANALYSIS ===')
        const homepageAnalysis = await page.evaluate(() => {
            const getCleanText = (el) => el?.textContent?.trim().substring(0, 100) || ''
            const getSelector = (el) => {
                if (el.id) return `#${el.id}`
                if (el.className) return `.${el.className.split(' ').slice(0, 2).join('.')}`
                return el.tagName.toLowerCase()
            }
            
            return {
                title: document.title,
                comicLinks: Array.from(document.querySelectorAll('a')).filter(a => {
                    const href = a.href || ''
                    const text = getCleanText(a)
                    return href.includes('comic') && !href.includes('list') && text.length > 3
                }).slice(0, 10).map(a => ({
                    href: a.href,
                    text: getCleanText(a),
                    selector: getSelector(a)
                })),
                images: Array.from(document.querySelectorAll('img')).filter(img => {
                    const alt = img.alt || ''
                    const src = img.src || ''
                    return alt.length > 3 && !alt.toLowerCase().includes('logo') && 
                           !src.includes('logo') && !src.includes('icon')
                }).slice(0, 8).map(img => ({
                    src: img.src,
                    dataSrc: img.getAttribute('data-src') || '',
                    alt: img.alt,
                    className: img.className,
                    selector: getSelector(img)
                }))
            }
        })
        
        console.log(`Homepage: ${homepageAnalysis.title}`)
        console.log(`Found ${homepageAnalysis.comicLinks.length} comic links`)
        console.log(`Found ${homepageAnalysis.images.length} comic images`)
        
        if (homepageAnalysis.comicLinks.length === 0) {
            console.log('❌ No comic links found on homepage. Site structure may be different.')
            await manualInspection(page, 'Homepage analysis')
            return
        }
        
        // Phase 2: Navigate to a specific comic
        console.log('\n=== 📖 PHASE 2: COMIC PAGE ANALYSIS ===')
        const firstComicUrl = homepageAnalysis.comicLinks[0].href
        console.log(`Navigating to: ${firstComicUrl}`)
        console.log(`Comic title: ${homepageAnalysis.comicLinks[0].text}`)
        
        await page.goto(firstComicUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 20000
        })
        
        // Handle potential redirects or ads
        await page.waitForTimeout(2000)
        
        // Check if we were redirected to an ad page
        const currentUrl = page.url()
        if (!currentUrl.includes('xoxocomic.com') || currentUrl.includes('ad')) {
            console.log('🚫 Redirected to ad page, trying another comic...')
            if (homepageAnalysis.comicLinks.length > 1) {
                await page.goto(homepageAnalysis.comicLinks[1].href, { waitUntil: 'domcontentloaded' })
                await page.waitForTimeout(2000)
            }
        }
        
        const comicPageAnalysis = await page.evaluate(() => {
            const getCleanText = (el) => el?.textContent?.trim() || ''
            const getSelector = (el) => {
                if (el.id) return `#${el.id}`
                if (el.className) return `.${el.className.split(' ').slice(0, 2).join('.')}`
                return el.tagName.toLowerCase()
            }
            
            return {
                title: document.title,
                url: window.location.href,
                chapterLinks: Array.from(document.querySelectorAll('a')).filter(a => {
                    const href = a.href || ''
                    const text = getCleanText(a).toLowerCase()
                    return (href.includes('chapter') || href.includes('issue') || href.includes('read') ||
                            text.includes('chapter') || text.includes('issue') || text.includes('read')) &&
                           text.length > 2
                }).slice(0, 15).map(a => ({
                    href: a.href,
                    text: getCleanText(a).substring(0, 50),
                    selector: getSelector(a)
                })),
                readButtons: Array.from(document.querySelectorAll('a, button')).filter(el => {
                    const text = getCleanText(el).toLowerCase()
                    return text.includes('read') && text.length < 20
                }).slice(0, 5).map(el => ({
                    text: getCleanText(el),
                    href: el.href || '',
                    selector: getSelector(el)
                })),
                comicInfo: {
                    description: Array.from(document.querySelectorAll('p, div')).find(el => 
                        getCleanText(el).length > 50 && 
                        (el.className.includes('desc') || el.className.includes('summary') || 
                         el.className.includes('info') || el.className.includes('about'))
                    )?.textContent?.trim().substring(0, 200) || '',
                    coverImage: Array.from(document.querySelectorAll('img')).find(img => 
                        img.alt && img.alt.length > 3 && !img.alt.includes('logo')
                    )?.src || ''
                }
            }
        })
        
        console.log(`Comic page: ${comicPageAnalysis.title}`)
        console.log(`URL: ${comicPageAnalysis.url}`)
        console.log(`Found ${comicPageAnalysis.chapterLinks.length} chapter links`)
        console.log(`Found ${comicPageAnalysis.readButtons.length} read buttons`)
        
        if (comicPageAnalysis.chapterLinks.length === 0 && comicPageAnalysis.readButtons.length === 0) {
            console.log('❌ No chapter/read links found. Trying manual inspection...')
            await manualInspection(page, 'Comic page structure')
            return
        }
        
        // Phase 3: Navigate to reader/chapter page
        console.log('\n=== 📚 PHASE 3: READER PAGE ANALYSIS ===')
        let readerUrl = ''
        
        if (comicPageAnalysis.readButtons.length > 0 && comicPageAnalysis.readButtons[0].href) {
            readerUrl = comicPageAnalysis.readButtons[0].href
            console.log(`Using read button: ${comicPageAnalysis.readButtons[0].text}`)
        } else if (comicPageAnalysis.chapterLinks.length > 0) {
            readerUrl = comicPageAnalysis.chapterLinks[0].href
            console.log(`Using first chapter: ${comicPageAnalysis.chapterLinks[0].text}`)
        }
        
        if (readerUrl) {
            console.log(`Navigating to reader: ${readerUrl}`)
            await page.goto(readerUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 20000
            })
            
            // Wait for images to load
            await page.waitForTimeout(3000)
            
            const readerAnalysis = await page.evaluate(() => {
                const getSelector = (el) => {
                    if (el.id) return `#${el.id}`
                    if (el.className) return `.${el.className.split(' ').slice(0, 2).join('.')}`
                    return el.tagName.toLowerCase()
                }
                
                return {
                    title: document.title,
                    url: window.location.href,
                    comicImages: Array.from(document.querySelectorAll('img')).filter(img => {
                        const src = img.src || ''
                        const dataSrc = img.getAttribute('data-src') || ''
                        const alt = img.alt || ''
                        
                        // Filter for actual comic page images
                        return (src.includes('comic') || src.includes('page') || 
                                dataSrc.includes('comic') || dataSrc.includes('page') ||
                                alt.includes('page') || alt.includes('comic')) &&
                               !src.includes('logo') && !src.includes('icon')
                    }).map(img => ({
                        src: img.src,
                        dataSrc: img.getAttribute('data-src') || '',
                        alt: img.alt,
                        className: img.className,
                        selector: getSelector(img),
                        dimensions: {
                            width: img.naturalWidth || img.width,
                            height: img.naturalHeight || img.height
                        }
                    })),
                    allImages: Array.from(document.querySelectorAll('img')).map(img => ({
                        src: img.src,
                        dataSrc: img.getAttribute('data-src') || '',
                        alt: img.alt,
                        className: img.className,
                        selector: getSelector(img)
                    })),
                    navigationElements: Array.from(document.querySelectorAll('a, button')).filter(el => {
                        const text = (el.textContent || '').toLowerCase()
                        const className = el.className || ''
                        return text.includes('next') || text.includes('prev') || text.includes('previous') ||
                               className.includes('next') || className.includes('prev') || className.includes('navigation')
                    }).map(el => ({
                        text: el.textContent?.trim() || '',
                        href: el.href || '',
                        className: el.className,
                        selector: getSelector(el)
                    }))
                }
            })
            
            console.log(`Reader page: ${readerAnalysis.title}`)
            console.log(`URL: ${readerAnalysis.url}`)
            console.log(`Found ${readerAnalysis.comicImages.length} comic page images`)
            console.log(`Found ${readerAnalysis.allImages.length} total images`)
            console.log(`Found ${readerAnalysis.navigationElements.length} navigation elements`)
            
            // Display detailed results
            console.log('\n=== 🎯 DETAILED ANALYSIS RESULTS ===')
            
            console.log('\n📖 COMIC PAGE IMAGES:')
            readerAnalysis.comicImages.forEach((img, i) => {
                console.log(`${i + 1}. ${img.src || img.dataSrc}`)
                console.log(`   Alt: ${img.alt}`)
                console.log(`   Class: ${img.className}`)
                console.log(`   Selector: ${img.selector}`)
                console.log(`   Size: ${img.dimensions.width}x${img.dimensions.height}`)
                console.log('')
            })
            
            if (readerAnalysis.comicImages.length === 0) {
                console.log('❌ No comic images found with standard selectors. Showing all images:')
                readerAnalysis.allImages.slice(0, 10).forEach((img, i) => {
                    console.log(`${i + 1}. ${img.src || img.dataSrc}`)
                    console.log(`   Alt: ${img.alt}`)
                    console.log(`   Class: ${img.className}`)
                    console.log('')
                })
            }
            
            console.log('\n🧭 NAVIGATION ELEMENTS:')
            readerAnalysis.navigationElements.forEach((nav, i) => {
                console.log(`${i + 1}. ${nav.text} -> ${nav.href}`)
                console.log(`   Selector: ${nav.selector}`)
                console.log('')
            })
            
            // Phase 4: Generate recommendations
            console.log('\n=== 📝 EXTENSION RECOMMENDATIONS ===')
            console.log('Based on analysis, update your extension with these selectors:')
            console.log('')
            console.log('// Comic listing (homepage)')
            homepageAnalysis.comicLinks.slice(0, 3).forEach(link => {
                console.log(`// ${link.text} -> ${link.selector}`)
            })
            console.log('')
            console.log('// Chapter/read links (comic page)')
            comicPageAnalysis.chapterLinks.slice(0, 3).forEach(link => {
                console.log(`// ${link.text} -> ${link.selector}`)
            })
            console.log('')
            console.log('// Comic images (reader page)')
            readerAnalysis.comicImages.slice(0, 3).forEach(img => {
                console.log(`// ${img.alt} -> ${img.selector}`)
            })
            console.log('')
            console.log('// Navigation (reader page)')
            readerAnalysis.navigationElements.slice(0, 2).forEach(nav => {
                console.log(`// ${nav.text} -> ${nav.selector}`)
            })
        }
        
        console.log('\n=== 🔍 MANUAL INSPECTION TIME ===')
        await manualInspection(page, 'Final inspection - explore the site manually')
        
    } catch (error) {
        console.error('❌ Error during analysis:', error.message)
        console.log('Opening browser for manual inspection...')
        await manualInspection(page, 'Error recovery - manual inspection')
    } finally {
        console.log('🔒 Closing browser...')
        await browser.close()
    }
}

async function manualInspection(page, reason) {
    console.log(`\n=== 👀 MANUAL INSPECTION: ${reason.toUpperCase()} ===`)
    console.log('Browser window is open for manual inspection.')
    console.log('Recommended actions:')
    console.log('1. Navigate through the site manually')
    console.log('2. Find a comic and click through to read it')
    console.log('3. Right-click elements to inspect selectors')
    console.log('4. Check browser dev tools (F12) for network requests')
    console.log('5. Look for lazy loading patterns and image structures')
    console.log('\nPress Ctrl+C when done to close the browser...')
    
    // Keep browser open until manually closed
    await new Promise(() => {})
}

console.log('🚀 XoXoComics Comprehensive Analysis')
console.log('===================================')
comprehensiveComicAnalysis().catch(console.error)