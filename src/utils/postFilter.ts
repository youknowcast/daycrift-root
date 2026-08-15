import type { CollectionEntry } from "astro:content";

/**
 * Determines whether a post is eligible to be listed/rendered.
 *
 * - Excludes drafts always
 * - In production, excludes scheduled posts until `pubDatetime` (no early
 *   publication — a scheduled post must not be visible before its datetime;
 *   the scheduled deploy builds every 15 minutes, so publication is at most
 *   15 minutes late, never early)
 * - In dev, always shows non-draft posts to make authoring easier
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  const isPublishTimePassed =
    Date.now() >= new Date(data.pubDatetime).getTime();
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
}
