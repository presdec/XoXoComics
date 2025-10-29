const { chromium } = require('playwright')

async function bypassCloudflareAndAnalyze() {
    console.log('🛡️ Starting Cloudflare-aware comic analysis...')
    const browser = await chromium.launch({ 
        headless: false,
        args: [
            '--ignore-certificate-errors', 
            '--ignore-ssl-errors', 
            '--allow-running-insecure-content', 
            '--disable-web-security',
            '--disable-blink-features=AutomationControlled'
        ]
    })
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    
    const page = await context.newPage()
    
    // Remove automation indicators
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        })
    })
    
    try {
        console.log('📡 Loading homepage and waiting for Cloudflare...')
        await page.goto('https://xoxocomic.com', { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 // Longer timeout for Cloudflare
        })
        
        // Wait for Cloudflare to complete
        console.log('⏳ Detected Cloudflare protection, waiting for bypass...')
        await page.waitForFunction(() => {
            return document.title !== 'Just a moment...' && 
                   !document.body.innerHTML.includes('Checking your browser') &&
                   !document.body.innerHTML.includes('DDoS protection by Cloudflare')
        }, { timeout: 60000 })
        
        console.log('✅ Cloudflare bypassed! Page loaded successfully.')
        
        // Wait for content to fully load
        await page.waitForTimeout(5000)
        
        console.log('\n=== 📋 REAL SITE ANALYSIS ===')
        const realAnalysis = await page.evaluate(() => {
            const getCleanText = (el) => el?.textContent?.trim().substring(0, 100) || ''
            const getSelector = (el) => {
                if (el.id) return `#${el.id}`
                if (el.className && typeof el.className === 'string') {
                    return `.${el.className.split(' ').slice(0, 2).join('.')}`
                }
                return el.tagName.toLowerCase()
            }
            
            return {
                title: document.title,
                url: window.location.href,
                bodyClasses: document.body.className,
                allLinks: Array.from(document.querySelectorAll('a')).map(a => ({
                    href: a.href,
                    text: getCleanText(a),
                    className: a.className
                })).filter(link => link.text.length > 2).slice(0, 20),
                allImages: Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    dataSrc: img.getAttribute('data-src') || '',
                    alt: img.alt || '',
                    className: img.className
                })).slice(0, 15),
                searchElements: Array.from(document.querySelectorAll('input, form')).map(el => ({
                    tag: el.tagName,
                    type: el.type || '',
                    name: el.name || '',
                    placeholder: el.placeholder || '',
                    className: el.className,
                    id: el.id || ''
                })),
                mainContainers: Array.from(document.querySelectorAll('div, section, main')).filter(el => {
                    const className = el.className || ''
                    const id = el.id || ''
                    return className.length > 3 || id.length > 3
                }).slice(0, 15).map(el => ({
                    tag: el.tagName,
                    className: el.className,
                    id: el.id,
                    hasImages: el.querySelectorAll('img').length > 0,
                    hasLinks: el.querySelectorAll('a').length > 0,
                    textPreview: getCleanText(el)
                }))
            }
        })
        
        console.log(`📄 Real page title: ${realAnalysis.title}`)
        console.log(`🔗 URL: ${realAnalysis.url}`)
        console.log(`📦 Body classes: ${realAnalysis.bodyClasses}`)
        
        console.log('\n=== 🔗 ALL LINKS FOUND ===')
        realAnalysis.allLinks.forEach((link, i) => {
            console.log(`${i + 1}. ${link.href}`)
            console.log(`   Text: ${link.text}`)
            if (link.className) console.log(`   Class: ${link.className}`)
            console.log('')
        })
        
        console.log('\n=== 🖼️ ALL IMAGES FOUND ===')
        realAnalysis.allImages.forEach((img, i) => {
            console.log(`${i + 1}. ${img.src || img.dataSrc}`)
            console.log(`   Alt: ${img.alt}`)
            if (img.className) console.log(`   Class: ${img.className}`)
            console.log('')
        })
        
        console.log('\n=== 🔍 SEARCH ELEMENTS ===')
        realAnalysis.searchElements.forEach((el, i) => {
            console.log(`${i + 1}. <${el.tag}>${el.type ? ` type="${el.type}"` : ''}${el.name ? ` name="${el.name}"` : ''}`)
            if (el.placeholder) console.log(`   Placeholder: ${el.placeholder}`)
            if (el.className) console.log(`   Class: ${el.className}`)
            console.log('')
        })
        
        console.log('\n=== 📦 MAIN CONTAINERS ===')
        realAnalysis.mainContainers.forEach((container, i) => {
            console.log(`${i + 1}. <${container.tag}>${container.id ? ` id="${container.id}"` : ''}${container.className ? ` class="${container.className}"` : ''}`)
            console.log(`   Has images: ${container.hasImages}, Has links: ${container.hasLinks}`)
            if (container.textPreview) console.log(`   Text: ${container.textPreview}...`)
            console.log('')
        })
        
        // Now try to find and navigate to comics
        console.log('\n=== 📚 LOOKING FOR COMIC CONTENT ===')
        
        const comicLinks = realAnalysis.allLinks.filter(link => 
            link.href.includes('comic') || 
            link.text.toLowerCase().includes('comic') ||
            link.text.toLowerCase().includes('read') ||
            link.href.includes('chapter')
        )
        
        if (comicLinks.length > 0) {
            console.log(`Found ${comicLinks.length} potential comic links:`)
            comicLinks.slice(0, 5).forEach((link, i) => {
                console.log(`${i + 1}. ${link.text} -> ${link.href}`)
            })
            
            // Try to navigate to first comic
            console.log(`\n📖 Navigating to: ${comicLinks[0].href}`)
            await page.goto(comicLinks[0].href, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000
            })
            
            // Wait for any redirects/ads to settle
            await page.waitForTimeout(3000)
            
            const comicPageAnalysis = await page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    allText: document.body.textContent.substring(0, 500),
                    chapterLinks: Array.from(document.querySelectorAll('a')).filter(a => {
                        const href = a.href || ''
                        const text = a.textContent?.toLowerCase() || ''
                        return href.includes('chapter') || href.includes('read') || 
                               text.includes('chapter') || text.includes('read') ||
                               text.includes('issue')
                    }).slice(0, 10).map(a => ({
                        href: a.href,
                        text: a.textContent?.trim().substring(0, 50) || ''
                    })),
                    images: Array.from(document.querySelectorAll('img')).map(img => ({
                        src: img.src,
                        alt: img.alt,
                        className: img.className
                    })).slice(0, 10)
                }
            })
            
            console.log(`📚 Comic page: ${comicPageAnalysis.title}`)
            console.log(`🔗 URL: ${comicPageAnalysis.url}`)
            
            if (comicPageAnalysis.chapterLinks.length > 0) {
                console.log('\n📑 Chapter/Read links found:')
                comicPageAnalysis.chapterLinks.forEach((link, i) => {
                    console.log(`${i + 1}. ${link.text} -> ${link.href}`)
                })
                
                // Try to navigate to a chapter/reader
                console.log(`\n📖 Navigating to reader: ${comicPageAnalysis.chapterLinks[0].href}`)
                await page.goto(comicPageAnalysis.chapterLinks[0].href, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                })
                
                await page.waitForTimeout(3000)
                
                const readerAnalysis = await page.evaluate(() => {
                    return {
                        title: document.title,
                        url: window.location.href,
                        comicImages: Array.from(document.querySelectorAll('img')).filter(img => {
                            const src = img.src || ''
                            const dataSrc = img.getAttribute('data-src') || ''
                            const alt = img.alt || ''
                            // Look for actual comic page images
                            return (src.length > 20 && !src.includes('logo') && !src.includes('icon')) ||
                                   (dataSrc.length > 20 && !dataSrc.includes('logo'))
                        }).map(img => ({
                            src: img.src,
                            dataSrc: img.getAttribute('data-src') || '',
                            alt: img.alt,
                            className: img.className,
                            width: img.naturalWidth,
                            height: img.naturalHeight
                        })),
                        navigation: Array.from(document.querySelectorAll('a, button')).filter(el => {
                            const text = el.textContent?.toLowerCase() || ''
                            return text.includes('next') || text.includes('prev') || 
                                   text.includes('previous') || text.includes('continue')
                        }).map(el => ({
                            text: el.textContent?.trim() || '',
                            href: el.href || '',
                            className: el.className
                        }))
                    }
                })
                
                console.log(`📖 Reader page: ${readerAnalysis.title}`)
                console.log(`🔗 URL: ${readerAnalysis.url}`)
                console.log(`🖼️ Found ${readerAnalysis.comicImages.length} comic images`)
                
                if (readerAnalysis.comicImages.length > 0) {
                    console.log('\n📸 COMIC IMAGES ANALYSIS:')
                    readerAnalysis.comicImages.forEach((img, i) => {
                        console.log(`${i + 1}. ${img.src || img.dataSrc}`)
                        console.log(`   Alt: ${img.alt}`)
                        console.log(`   Class: ${img.className}`)
                        console.log(`   Size: ${img.width}x${img.height}`)
                        console.log('')
                    })
                } else {
                    console.log('❌ No comic images found on reader page')
                }
                
                if (readerAnalysis.navigation.length > 0) {
                    console.log('\n🧭 NAVIGATION ELEMENTS:')
                    readerAnalysis.navigation.forEach((nav, i) => {
                        console.log(`${i + 1}. ${nav.text} -> ${nav.href}`)
                        console.log(`   Class: ${nav.className}`)
                        console.log('')
                    })
                }
                
                console.log('\n=== 🎯 EXTENSION SELECTOR RECOMMENDATIONS ===')
                console.log('// Homepage comic links')
                comicLinks.slice(0, 3).forEach(link => {
                    console.log(`// "${link.text}" - Look for: a[href*="comic"]`)
                })
                
                console.log('\n// Comic page chapter links')
                comicPageAnalysis.chapterLinks.slice(0, 3).forEach(link => {
                    console.log(`// "${link.text}" - Look for: a[href*="chapter"], a[href*="read"]`)
                })
                
                console.log('\n// Reader page comic images')
                readerAnalysis.comicImages.slice(0, 3).forEach(img => {
                    if (img.className) {
                        console.log(`// ${img.alt} - Look for: img.${img.className.split(' ')[0]}`)
                    } else {
                        console.log(`// ${img.alt} - Look for: img[src*="comic"], img[data-src*="comic"]`)
                    }
                })
                
            } else {
                console.log('❌ No chapter links found on comic page')
            }
        } else {
            console.log('❌ No comic links found on homepage')
        }
        
        console.log('\n=== 🔍 MANUAL INSPECTION READY ===')
        console.log('Browser is ready for manual exploration.')
        console.log('The site has been analyzed through Cloudflare protection.')
        console.log('Explore manually to find any missing selectors.')
        console.log('\nPress Ctrl+C when done...')
        
        await new Promise(() => {})
        
    } catch (error) {
        if (error.message.includes('Timeout')) {
            console.error('⏰ Timeout waiting for Cloudflare bypass')
            console.log('The site may have additional protection. Browser will stay open for manual inspection.')
        } else {
            console.error('❌ Error during analysis:', error.message)
        }
        
        console.log('\n🔍 Manual inspection mode...')
        await new Promise(() => {})
    } finally {
        console.log('🔒 Closing browser...')
        await browser.close()
    }
}

console.log('🛡️ Cloudflare-Aware XoXoComics Analysis')
console.log('========================================')
bypassCloudflareAndAnalyze().catch(console.error)