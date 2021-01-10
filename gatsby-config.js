require(`dotenv`).config({
  path: `.env`,
})

const shouldAnalyseBundle = process.env.ANALYSE_BUNDLE

module.exports = {
  siteMetadata: {
    siteTitle: 'CALL ME STUPID',
    siteTitleAlt: `CALL ME STUPID - Powered by Gatsby `,
    siteDescription: 'engineer blog.',
    author: '@youknowcast',
    siteUrl: 'https://www.daycrift.net',
    siteLanguage: 'ja',
    siteHeadline: `CALL ME STUPID - Powered by Gatsby `,
    siteImage: '/banner.jpg',
  },
  plugins: [
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        gatsbyRemarkPlugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 1035,
            },
          },
          {
            resolve: `gatsby-remark-embed-video`,
            options: {
              width: 800,
            }
          }
        ],
      },
    },
    {
      resolve: `@lekoarts/gatsby-theme-minimal-blog`,
      // See the theme's README for all available options
      options: {
        // 自前でプラグインいれていきたいので，theme の mdx は無効化
        mdx: false,
        formatString: 'YYYY/MM/DD',
        navigation: [
          {
            title: `Blog`,
            slug: `/blog`,
          },
          {
            title: `About`,
            slug: `/about`,
          },
          {
            title: 'useful',
            slug: '/useful'
          },
        ],
        externalLinks: [
          {
            name: `Twitter`,
            url: `https://twitter.com/youknowcast`,
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
          }
        ],
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: process.env.GOOGLE_ANALYTICS_ID,
      },
    },
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `minimal-blog - @lekoarts/gatsby-theme-minimal-blog`,
        short_name: `minimal-blog`,
        description: `Typography driven, feature-rich blogging theme with minimal aesthetics. Includes tags/categories support and extensive features for code blocks such as live preview, line numbers, and code highlighting.`,
        start_url: `/`,
        background_color: `#fff`,
        theme_color: `#6B46C1`,
        display: `standalone`,
        icons: [
          {
            src: `/android-chrome-192x192.png`,
            sizes: `192x192`,
            type: `image/png`,
          },
          {
            src: `/android-chrome-512x512.png`,
            sizes: `512x512`,
            type: `image/png`,
          },
        ],
      },
    },
    `gatsby-plugin-offline`,
    `gatsby-plugin-twitter`,
    `gatsby-remark-embed-video`,
    `gatsby-plugin-netlify`,
    shouldAnalyseBundle && {
      resolve: `gatsby-plugin-webpack-bundle-analyser-v2`,
      options: {
        analyzerMode: `static`,
        reportFilename: `_bundle.html`,
        openAnalyzer: false,
      },
    },
  ].filter(Boolean),
}
