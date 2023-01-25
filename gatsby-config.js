require('dotenv').config({
  path: '.env'
})

const shouldAnalyseBundle = process.env.ANALYSE_BUNDLE

module.exports = {
  siteMetadata: {
    siteTitle: 'CALL ME STUPID',
    siteTitleAlt: 'CALL ME STUPID - Powered by Gatsby ',
    siteDescription: 'engineer blog.',
    author: '@youknowcast',
    siteUrl: 'https://www.daycrift.net',
    siteLanguage: 'ja',
    siteHeadline: 'CALL ME STUPID - Powered by Gatsby ',
    siteImage: '/banner.png'
  },
  plugins: [
    {
      resolve: 'gatsby-plugin-feed',
      options: {
        query: `
          {
            site {
              siteMetadata {
                siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site, allMdx } }) => {
              return allMdx.edges.map(edge => {
                return Object.assign({}, edge.node.frontmatter, {
                  description: edge.node.excerpt,
                  date: edge.node.frontmatter.date,
                  url: encodeURI(site.siteMetadata.siteUrl + edge.node.frontmatter.slug),
                  guid: site.siteMetadata.siteUrl + edge.node.frontmatter.slug,
                  custom_elements: [{ 'content:encoded': edge.node.body}]
                })
              })
            },
            query: `
              {
                allMdx(sort: { frontmatter: { date: DESC }}) {
                  edges {
                    node {
                      excerpt
                      body
                      frontmatter {
                        title
                        date
                        slug
                      }
                    }
                  }
                }
              }
            `,
            output: '/rss.xml',
            title: 'Daycrift.net RSS Feed'
          }
        ]
      }
    },
    {
      resolve: 'gatsby-plugin-mdx',
      options: {
        mdxOptions: {
          remarkPlugins: [
            require('remark-gfm')
          ],
          rehypePlugins: [
          ]
        }
      }
    },
    {
      resolve: '@lekoarts/gatsby-theme-minimal-blog',
      // See the theme's README for all available options
      options: {
        // 自前でプラグインいれていきたいので，theme の mdx は無効化
        mdx: false,
        formatString: 'YYYY/MM/DD',
        navigation: [
          {
            title: 'Blog',
            slug: '/blog'
          },
          {
            title: 'About',
            slug: '/about'
          },
          {
            title: 'useful',
            slug: '/useful'
          }
        ],
        externalLinks: [
          {
            name: 'Twitter',
            url: 'https://twitter.com/youknowcast'
          },
          {
            name: 'github',
            url: 'https://github.com/youknowcast'
          },
          {
            name: 'note',
            url: 'https://note.com/youknowcast'
          },
          {
            name: 'zenn',
            url: 'https://zenn.dev/youknowcast'
          },
          {
            name: 'Qiita',
            url: 'https://qiita.com/youknowcast'
          }
        ]
      }
    },
    'gatsby-plugin-sitemap',
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'CALL ME STUPID',
        description: 'engineer blog',
        start_url: '/',
        background_color: '#fff',
        theme_color: '#6B46C1',
        display: 'standalone',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },
    'gatsby-plugin-offline',
    'gatsby-plugin-twitter',
    'gatsby-remark-embed-video',
    shouldAnalyseBundle && {
      resolve: 'gatsby-plugin-webpack-bundle-analyser-v2',
      options: {
        analyzerMode: 'static',
        reportFilename: '_bundle.html',
        openAnalyzer: false
      }
    }
  ].filter(Boolean)
}
