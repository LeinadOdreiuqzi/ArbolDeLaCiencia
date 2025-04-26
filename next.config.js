const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/, // This matches .md and .mdx
  options: {
    remarkPlugins: [
      async () => (await import('./lib/remark-wikilink.js')).default
    ],
  },
});

module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
});