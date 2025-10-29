const XoXoComics = require('./XoXoComics.js')

// Export the source for Paperback
const source = new XoXoComics()

// Export for CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = source
} else if (typeof window !== 'undefined') {
    window.source = source
}

export default source