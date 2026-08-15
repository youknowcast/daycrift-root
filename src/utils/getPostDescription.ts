import type { CollectionEntry } from "astro:content";

// Markdown/MDX 本文から簡易プレーンテキストの excerpt を生成する
// (description 未設定記事のメタ・RSS フォールバック用。Gatsby 時代の
//  自動 excerpt 相当の代替)
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPostDescription(
  post: CollectionEntry<"posts">
): string {
  if (post.data.description && post.data.description.trim() !== "") {
    return post.data.description;
  }
  return stripMarkdown(post.body ?? "").slice(0, 160);
}
