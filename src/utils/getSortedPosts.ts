import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";

/**
 * Returns posts that are eligible to be shown to users, sorted by published
 * date (`pubDatetime`) descending.
 *
 * Note: filtering respects drafts and scheduled posts via `postFilter()`.
 * Sorting uses `pubDatetime` (not `modDatetime`) so that feed order and
 * `pubDate` stay consistent — an updated post does not re-surface as new.
 */
export function comparePostsByPubDatetimeDesc(
  a: CollectionEntry<"posts">,
  b: CollectionEntry<"posts">
) {
  return (
    Math.floor(new Date(b.data.pubDatetime).getTime() / 1000) -
      Math.floor(new Date(a.data.pubDatetime).getTime() / 1000) ||
    // 同時刻の記事は id で決定的に順序付ける (ビルド再現性のため)
    a.id.localeCompare(b.id)
  );
}

export function getSortedPosts(posts: CollectionEntry<"posts">[]) {
  return posts.filter(postFilter).sort(comparePostsByPubDatetimeDesc);
}
