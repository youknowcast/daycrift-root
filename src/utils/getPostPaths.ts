import { getRelativeLocaleUrl } from "astro:i18n";
import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * 投稿 URL は frontmatter の slug から直接導出する。
 * e.g. slug: "読書ログ-2026" → "/読書ログ-2026"
 *
 * Astro は静的ルート生成時にパラメータを NFC 正規化するため、
 * リンク・検証・OG URL のすべてで同じ値を使うようここで NFC に揃える
 * (分解形 slug だと生成パスとリンク先のバイト列が不一致になり 404 になる)。
 */
export function getPostSlug(post: CollectionEntry<"posts">): string {
  return (post.data.slug ?? post.id).normalize("NFC");
}

export function getPostUrl(
  post: CollectionEntry<"posts">,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, getPostSlug(post));
}
