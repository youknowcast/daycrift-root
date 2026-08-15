import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyStr } from "./slugify";

type Tag = {
  tag: string;
  tagName: string;
};

/**
 * Builds a de-duplicated, sorted tag list from posts.
 *
 * - Drafts and scheduled posts are excluded via `postFilter()`
 * - `tag` is the slug used in URLs; `tagName` is the original label for display
 * - Uniqueness is based on the slug (so differently-cased labels collapse)
 */
export function getUniqueTags(posts: CollectionEntry<"posts">[]) {
  // slug -> 元タグ名。異なるタグ名が同じ slug に正規化されたら
  // 記事が静かに混在するため、ビルドエラーで検出する
  const slugToName = new Map<string, string>();
  for (const post of posts.filter(postFilter)) {
    for (const tag of post.data.tags) {
      const slug = slugifyStr(tag);
      const existing = slugToName.get(slug);
      if (existing !== undefined && existing !== tag) {
        throw new Error(
          `Tag slug collision: "${existing}" and "${tag}" both map to "/tags/${slug}/"`
        );
      }
      slugToName.set(slug, tag);
    }
  }

  const tags: Tag[] = [...slugToName.entries()]
    .map(([tag, tagName]) => ({ tag, tagName }))
    .sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
  return tags;
}
