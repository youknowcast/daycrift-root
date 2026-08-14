import { getRelativeLocaleUrl } from "astro:i18n";
import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * 投稿 URL は frontmatter の slug から直接導出する。
 * e.g. slug: "読書ログ-2026" → "/読書ログ-2026"
 */
export function getPostSlug(post: CollectionEntry<"posts">): string {
  return post.data.slug ?? post.id;
}

export function getPostUrl(
  post: CollectionEntry<"posts">,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, getPostSlug(post));
}
