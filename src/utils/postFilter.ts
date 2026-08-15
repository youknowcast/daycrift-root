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
 *
 * 判定は astro.config.ts の Vite define で注入されたビルド開始時刻
 * (__BUILD_TIME__) を使う。Date.now() を呼び出しごとに取ると、ビルド中に
 * 公開日時をまたいだ記事の公開状態が成果物間で食い違う。
 */
declare const __BUILD_TIME__: number;

export function postFilter({ data }: CollectionEntry<"posts">) {
  const now = typeof __BUILD_TIME__ === "number" ? __BUILD_TIME__ : Date.now();
  const isPublishTimePassed = now >= new Date(data.pubDatetime).getTime();
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
}
