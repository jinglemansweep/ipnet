module.exports = function(eleventyConfig) {
    // Copy assets directory as-is
    eleventyConfig.addPassthroughCopy("assets");
    
    // Copy sitemap.xml
    eleventyConfig.addPassthroughCopy("sitemap.xml");
    
    // Global data for path prefix
    eleventyConfig.addGlobalData("pathPrefix", process.env.PATH_PREFIX || "");
    
    // Add filter for URL construction
    eleventyConfig.addFilter("url", function(url) {
        const pathPrefix = process.env.PATH_PREFIX || "";
        if (!url.startsWith('/')) {
            url = '/' + url;
        }
        return pathPrefix + url;
    });
    
    // Set directories
    return {
        dir: {
            input: "src",
            includes: "_includes",
            data: "_data",
            output: "_site"
        },
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk",
        pathPrefix: process.env.PATH_PREFIX || ""
    };
};