const { chromium } = require('playwright')

async function manualCloudflareInspection() {
    console.log('🛡️ Manual Cloudflare Inspection Tool')
    console.log('====================================')
    console.log('This tool opens a browser for manual Cloudflare bypass and site inspection.')
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500, // Slower for manual interaction
        args: [
            '--ignore-certificate-errors', 
            '--ignore-ssl-errors',
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
    
    console.log('\n📖 MANUAL INSPECTION GUIDE:')
    console.log('1. Browser will open to xoxocomic.com')
    console.log('2. Wait for/complete Cloudflare challenge manually')
    console.log('3. Once on the real site, explore:')
    console.log('   - Find comic listings on homepage')
    console.log('   - Click on a comic to see details page')
    console.log('   - Find chapter/read buttons')
    console.log('   - Navigate to reader page')
    console.log('   - Check how images are loaded')
    console.log('4. Use F12 developer tools to inspect elements')
    console.log('5. Right-click elements to copy selectors')
    console.log('6. Check Network tab for image loading patterns')
    
    try {
        console.log('\n🌐 Opening browser to xoxocomic.com...')
        await page.goto('https://xoxocomic.com', { 
            waitUntil: 'domcontentloaded',
            timeout: 60000
        })
        
        console.log('\n⚡ AUTOMATION HELPERS READY:')
        console.log('While you manually explore, you can run these in the browser console:')
        console.log('')
        console.log('// Find all comic links:')
        console.log('Array.from(document.querySelectorAll("a")).filter(a => a.href.includes("comic")).map(a => ({href: a.href, text: a.textContent.trim()}))')
        console.log('')
        console.log('// Find all images:')
        console.log('Array.from(document.querySelectorAll("img")).map(img => ({src: img.src, dataSrc: img.getAttribute("data-src"), alt: img.alt, class: img.className}))')
        console.log('')
        console.log('// Find chapter/read links:')
        console.log('Array.from(document.querySelectorAll("a")).filter(a => a.textContent.toLowerCase().includes("read") || a.textContent.toLowerCase().includes("chapter")).map(a => ({href: a.href, text: a.textContent.trim()}))')
        console.log('')
        console.log('// Find navigation elements:')
        console.log('Array.from(document.querySelectorAll("a, button")).filter(el => el.textContent.toLowerCase().includes("next") || el.textContent.toLowerCase().includes("prev")).map(el => ({text: el.textContent.trim(), href: el.href || "button"}))')
        
        // Add helper functions to the page
        await page.addInitScript(() => {
            window.analyzeComics = () => {
                console.log('=== COMIC ANALYSIS ===')
                
                const comicLinks = Array.from(document.querySelectorAll('a')).filter(a => 
                    a.href.includes('comic') || 
                    a.textContent.toLowerCase().includes('comic') ||
                    a.textContent.toLowerCase().includes('read')
                )
                console.log('Comic links found:', comicLinks.length)
                comicLinks.slice(0, 10).forEach((link, i) => {
                    console.log(`${i + 1}. ${link.textContent.trim()} -> ${link.href}`)
                })
                
                const images = Array.from(document.querySelectorAll('img')).filter(img => 
                    img.alt && !img.alt.includes('logo') && !img.src.includes('logo')
                )
                console.log('Comic images found:', images.length)
                images.slice(0, 5).forEach((img, i) => {
                    console.log(`${i + 1}. ${img.alt} -> ${img.src || img.getAttribute('data-src')}`)
                })
                
                return { comicLinks: comicLinks.length, images: images.length }
            }
            
            window.findSelectors = (element) => {
                if (!element) {
                    console.log('Usage: findSelectors(element) - right click an element and "Store as global variable", then use findSelectors(temp1)')
                    return
                }
                
                const selectors = []
                if (element.id) selectors.push(`#${element.id}`)
                if (element.className) {
                    const classes = element.className.split(' ').filter(c => c.length > 0)
                    if (classes.length > 0) selectors.push(`.${classes.join('.')}`)
                }
                selectors.push(element.tagName.toLowerCase())
                
                console.log('Possible selectors for this element:')
                selectors.forEach(sel => console.log(`  ${sel}`))
                
                return selectors
            }
            
            console.log('Helper functions loaded:')
            console.log('- analyzeComics() - Find all comic-related elements')
            console.log('- findSelectors(element) - Get CSS selectors for an element')
        })
        
        console.log('\n🔧 HELPER FUNCTIONS INJECTED:')
        console.log('You can now use these in the browser console:')
        console.log('- analyzeComics() - Automatically find comic elements')
        console.log('- findSelectors(element) - Get CSS selectors for any element')
        console.log('')
        console.log('Example workflow:')
        console.log('1. Complete Cloudflare challenge')
        console.log('2. Run: analyzeComics()')
        console.log('3. Right-click any element -> Inspect')
        console.log('4. In console: findSelectors($0)')
        
        console.log('\n⏳ Waiting for manual exploration...')
        console.log('Press Ctrl+C when done to close the browser.')
        
        // Keep browser open indefinitely for manual inspection
        await new Promise(() => {})
        
    } catch (error) {
        console.error('❌ Error:', error.message)
        console.log('Browser will stay open for manual inspection anyway.')
        await new Promise(() => {})
    } finally {
        console.log('🔒 Closing browser...')
        await browser.close()
    }
}

manualCloudflareInspection().catch(console.error)