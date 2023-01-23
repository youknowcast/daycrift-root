import type { GatsbySSR } from 'gatsby'

export const onRenderBody: GatsbySSR['onRenderBody'] = ({ setHtmlAttributes }: any) => {
  // mdx-mermaid 用のコンフィグ向けに dataset を付与する
  // see: https://github.com/sjwall/mdx-mermaid/blob/5e020a96db2293fca5c64b5631d82abf7d7ca187/src/theme.helper.ts#L19
  setHtmlAttributes({ lang: 'ja', 'data-theme': 'dark' })
}
