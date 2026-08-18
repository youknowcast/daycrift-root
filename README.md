# daycrift-root

youknow's web blog, titled "call me stupid", since 2003 (maybe).

## Tech Stack

- [Astro](https://astro.build) (based on the [AstroPaper](https://github.com/satnaing/astro-paper) template)
- Content: MDX posts under `src/content/posts/` with frontmatter (`pubDatetime`, `title`, `description`, `tags`, `slug`)
- Static pages: `src/content/pages/` (`about`, `favorite`, `newscast`, `resume`)
- Styling: Tailwind CSS v4
- Features: RSS (`/rss.xml`), sitemap, tags, Pagefind search, PWA manifest, OGP image generation (satori), dark mode, mermaid / video / twitter embeds

### URL design

Posts are published at the root level — `/<slug>/` (e.g. `https://www.daycrift.net/20201022/`) — to keep the URLs from the previous Gatsby blog unchanged. Blog listing is at `/blog/`, tag pages at `/tags/<tag>/`, and static pages at `/<page>/`.

## Getting Started

```bash
npm install
npm run dev        # start dev server (http://localhost:4321)
npm run build      # typecheck + build + generate Pagefind search index
npm run preview    # preview the built site locally
npm run lint       # eslint
```

## Deployment

GitHub Actions (`s3-deploy.yml`) builds the site and syncs `dist/` to an S3 bucket, then invalidates the CloudFront distribution. The `generate-github-graph.yml` workflow updates the GitHub contribution graph image on the home page.
